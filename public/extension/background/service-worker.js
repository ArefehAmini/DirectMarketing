/* ═══════════════════════════════════════════════════════════
   RasaWeb Agent — Service Worker (Manifest V3)
   Central Panel = مغز | این Worker = عامل اجرایی مرورگر

   وظایف:
   - جفت‌سازی با پنل (Pairing با کد RX-XXXXX)
   - Heartbeat + دریافت وظایف (Pull از /api/agent/sync)
   - توزیع وظیفه به تب پلتفرم مناسب (یا باز کردن تب)
   - انتقال نتیجه به پنل (/api/agent/task-update)
   - مدیریت وضعیت آفلاین و بازیابی پس از Restart (§۳۸/§۳۹)
   ═══════════════════════════════════════════════════════════ */

const SYNC_INTERVAL_MS = 8000;
const ALARM_NAME = "rw-sync";
const EXT_VERSION = chrome.runtime.getManifest().version;

/* ── وضعیت در حافظه + بازیابی از storage.session (§۳۹) ── */
let state = {
  paired: false,
  workerId: null,
  token: null,
  panelUrl: null,
  workerNo: null,
  workspaceName: null,
  runningTasks: new Map(), // taskId → { platform, status }
  lastSyncAt: null,
  online: false,
};

async function loadState() {
  const local = await chrome.storage.local.get(["rw_pairing"]);
  const p = local.rw_pairing;
  if (p && p.workerId && p.token && p.panelUrl) {
    state.paired = true;
    state.workerId = p.workerId;
    state.token = p.token;
    state.panelUrl = p.panelUrl.replace(/\/+$/, "");
    state.workerNo = p.workerNo;
    state.workspaceName = p.workspaceName;
  }
  const sess = await chrome.storage.session.get(["rw_running"]);
  if (sess.rw_running) {
    /* خودترمیمی: اگر SW وسط وظیفه مرده باشد، رکورد کهنهٔ اجرا نباید همیشه بماند */
    const now = Date.now();
    state.runningTasks = new Map(sess.rw_running.filter(([, v]) => now - (v.startedAt ?? 0) < 5 * 60 * 1000));
  }
  updateBadge();
}

async function persistRunning() {
  const obj = Array.from(state.runningTasks.entries());
  await chrome.storage.session.set({ rw_running: obj });
}

/* ── Badge — کاربر همیشه بداند چه چیزی در حال اجراست (§۵۸) ── */
function updateBadge() {
  const n = state.runningTasks.size;
  chrome.action.setBadgeText({ text: n > 0 ? String(n) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#0d9488" });
}

/* ═══════ اتصال امن به پنل ═══════ */
async function api(path, body) {
  const res = await fetch(state.panelUrl + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = new Error("api_error_" + res.status);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function logEvent(type, title, detail = "") {
  if (!state.paired) return;
  api("/api/agent/event", { workerId: state.workerId, token: state.token, type, title, detail }).catch(() => {});
}

/* ═══════ جفت‌سازی با پنل (§۴) ═══════ */
async function pairWithPanel(code, panelUrl) {
  const url = panelUrl.replace(/\/+$/, "");
  const res = await fetch(url + "/api/agent/pair", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      device: {
        chrome: (navigator.userAgentData?.brands?.[1]?.version ? "Chrome " + navigator.userAgentData.brands[1].version : "Chrome"),
        ext: EXT_VERSION,
        profile: "Profile-1",
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "خطا در جفت‌سازی");

  state.paired = true;
  state.workerId = data.workerId;
  state.token = data.token;
  state.workerNo = data.workerNo;
  state.workspaceName = data.workspace;
  state.panelUrl = url;

  /* ذخیره امن — توکن فقط در storage.local مرورگر خود کاربر (§۳۵) */
  await chrome.storage.local.set({
    rw_pairing: {
      workerId: data.workerId,
      token: data.token,
      panelUrl: url,
      workerNo: data.workerNo,
      workspaceName: data.workspace,
      pairedAt: Date.now(),
    },
  });
  logEvent("connected", `Worker #${String(data.workerNo).padStart(3, "0")} متصل شد`, "Chrome Extension");
  updateBadge();
  startSyncLoop();
  return data;
}

async function unpair() {
  await chrome.storage.local.remove("rw_pairing");
  state.paired = false;
  state.workerId = null;
  state.token = null;
  state.online = false;
  state.runningTasks = new Map();
  await chrome.storage.session.remove("rw_running");
  updateBadge();
  stopSyncLoop();
}

/* ═══════ جمع‌کردن Context تب‌ها (§۲۳/§۱۱) ═══════ */
async function collectTabContexts() {
  const tabs = await chrome.tabs.query({ url: getHostPatterns() });
  const contexts = [];
  for (const tab of tabs) {
    try {
      const reply = await chrome.tabs.sendMessage(tab.id, { type: "RW_GET_CONTEXT" });
      if (reply && reply.ok) {
        contexts.push({
          platform: reply.platform,
          url: reply.url,
          title: reply.title,
          status: reply.working ? "working" : "ready",
          chatName: reply.chatName || "",
          chatType: reply.chatType || "unknown",
          session: reply.session || "active",
        });
        continue;
      }
    } catch {
      /* content script هنوز آماده نیست */
    }
    /* context پایه از URL */
    const platform = platformFromUrl(tab.url);
    contexts.push({
      platform,
      url: tab.url,
      title: tab.title || "",
      status: "ready",
      chatName: "",
      chatType: "unknown",
      session: "active",
    });
  }
  return contexts;
}

function getHostPatterns() {
  return chrome.runtime.getManifest().content_scripts[0].matches;
}

function platformFromUrl(url) {
  if (!url) return "other";
  const u = url.toLowerCase();
  if (u.includes("whatsapp")) return "whatsapp";
  if (u.includes("telegram")) return "telegram";
  if (u.includes("rubika")) return "rubika";
  if (u.includes("bale")) return "bale";
  if (u.includes("eitaa")) return "eitaa";
  if (u.includes("soroush")) return "soroush";
  return "other";
}

const PLATFORM_WEB_URL = {
  whatsapp: "https://web.whatsapp.com",
  telegram: "https://web.telegram.org",
  rubika: "https://web.rubika.ir",
  bale: "https://web.bale.ai",
  eitaa: "https://web.eitaa.com",
  soroush: "https://web.soroush.plus",
};

/* ═══════ اجرای وظیفه روی تب مناسب (§۱۴/§۱۵) ═══════ */
async function executeTask(task) {
  const platform = task.platform;
  state.runningTasks.set(task.id, { platform, status: "running", refNo: task.refNo, startedAt: Date.now() });
  updateBadge();
  await persistRunning();

  try {
    /* ۱) پیدا کردن یا باز کردن تب پلتفرم — همیشه «قابل مشاهده» تا کاربر ببیند عامل کجا کار می‌کند */
    const found = await findPlatformTab(platform);
    let tab = found?.tab ?? null;
    if (!tab) {
      const url = PLATFORM_WEB_URL[platform];
      if (!url) return taskResult(task, "failed", { errorKind: "unsupported_action", error: "پلتفرم پشتیبانی نمی‌شود" });
      const created = await chrome.tabs.create({ url, active: true });
      tab = created;
      await waitForTabLoad(tab.id, 25000);
      await sleep(3500); /* زمان برای بارگذاری SPA */
    } else if (found?.navigated) {
      /* تب از سایت اصلی به اپ وب هدایت شده — صبر تا پایان بارگذاری واقعی */
      await waitForTabLoad(tab.id, 25000);
      await sleep(3500);
    }

    /* جلوی چشم کاربر: تب و پنجره فعال شوند */
    try {
      await chrome.tabs.update(tab.id, { active: true });
      if (tab.windowId) await chrome.windows.update(tab.windowId, { focused: true });
    } catch { /* پنجره بسته شده */ }

    /* ۲) اطمینان از تزریق content script — با retry چون document_idle ممکن است تأخیر داشته باشد */
    await ensureInjected(tab.id, 10000);

    /* ۳) ارسال Task به Agent داخل تب — نتیجه با Reply برمی‌گردد
       ⚠️ تایم‌اوت ۱۴۰ ثانیه: اگر content script پاسخ ندهد (تعلیق صفحه/ناوبری)،
       promise مربوط به sendMessage برای همیشه معلق می‌ماند و زنجیرهٔ سریالی
       وظایف قفل می‌شود (دقیقاً عامل TASK-9335..9338 که زامبی شدند) */
    /* retry اتصال (v1.2.7): وقتی sendMessage THROW می‌کند یعنی «گیرنده‌ای در تب
       نیست» (Receiving end does not exist) — وظیفه اصلاً شروع نشده، پس به‌جای
       شکست فوری (باگ تلگرام: platform_ui_changed×۱۱)، دوباره تزریق و دوباره
       ارسال می‌کنیم؛ ۳ تلاش با تزریق مجدد بین هر تلاش */
    let reply = null;
    let connectErr = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        reply = await Promise.race([
          chrome.tabs.sendMessage(tab.id, { type: "RW_TASK", task }),
          sleep(140000).then(() => null),
        ]);
        break;
      } catch (e) {
        connectErr = e;
        if (attempt === 3) break;
        /* گیرنده نیست → تزریق مجدد content script و تلاش دوباره */
        try {
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content/adapters.js", "content/agent.js"] });
        } catch { /* صفحه هنوز آماده نیست */ }
        await ensureInjected(tab.id, 12000);
        try { await chrome.tabs.update(tab.id, { active: true }); } catch { /* بسته شده */ }
        await sleep(1500);
      }
    }
    if (!reply && connectErr) {
      return taskResult(task, "failed", { errorKind: "platform_ui_changed", error: "ارتباط با صفحه برقرار نشد — صفحهٔ پیام‌رسان را باز و یک بار رفرش کنید (۳ تلاش اتصال ناموفق بود)" });
    }

    if (!reply) {
      return taskResult(task, "failed", { errorKind: "network", error: "پاسخی از صفحه دریافت نشد (مهلت ۱۴۰ ثانیه تمام شد یا صفحه بسته شد)" });
    }
    return reply;
  } catch (e) {
    return taskResult(task, "failed", { errorKind: "network", error: "خطای نامشخص اجرای وظیفه" });
  }
}

function taskResult(task, status, extra = {}) {
  state.runningTasks.delete(task.id);
  updateBadge();
  persistRunning();
  return { taskId: task.id, refNo: task.refNo, status, ...extra };
}

async function findPlatformTab(platform) {
  const pattern = getHostPatterns().filter((p) => {
    const key = platform;
    return (
      (key === "whatsapp" && p.includes("whatsapp")) ||
      (key === "telegram" && p.includes("telegram")) ||
      (key === "rubika" && p.includes("rubika")) ||
      (key === "bale" && p.includes("bale")) ||
      (key === "eitaa" && p.includes("eitaa")) ||
      (key === "soroush" && p.includes("soroush"))
    );
  });
  const tabs = await chrome.tabs.query({ url: pattern });
  if (!tabs.length) return { tab: null, navigated: false };
  /* اولویت: تب خودِ اپ وب — نه سایت اصلی (مثلاً rubika.ir به‌جای web.rubika.ir
     UI چت ندارد و باعث خطای بی‌دلیل می‌شد) */
  const webUrl = PLATFORM_WEB_URL[platform];
  const appTab = webUrl ? tabs.find((t) => (t.url || "").startsWith(webUrl)) : null;
  const tab = appTab || tabs[0];
  let navigated = false;
  if (webUrl && !(tab.url || "").startsWith(webUrl)) {
    /* تب روی سایت اصلی است → به اپ وب هدایت کن و منتظر بارگذاری بمان */
    try { await chrome.tabs.update(tab.id, { url: webUrl }); navigated = true; } catch { /* تب بسته شده */ }
  }
  return { tab, navigated };
}

async function ensureInjected(tabId, timeoutMs = 10000) {
  /* content script روی document_idle تزریق می‌شود — بعد از redirect/SPA چند لحظه تأخیر دارد؛
     تا رسیدن PING با فاصله کوتاه retry می‌کنیم */
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      await chrome.tabs.sendMessage(tabId, { type: "RW_PING" });
      return;
    } catch {
      try {
        await chrome.scripting.executeScript({ target: { tabId }, files: ["content/adapters.js", "content/agent.js"] });
      } catch {
        /* صفحه هنوز آماده تزریق نیست — دوباره تلاش می‌کنیم */
      }
      await sleep(700);
    }
  }
}

function waitForTabLoad(tabId, timeoutMs = 20000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(), timeoutMs);
    chrome.tabs.get(tabId).then((tab) => {
      if (tab.status === "complete") { clearTimeout(timer); resolve(); return; }
    }).catch(() => { clearTimeout(timer); resolve(); });
    const listener = (id, changeInfo) => {
      if (id === tabId && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        clearTimeout(timer);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* صف اجرای «سریالی» وظایف — فقط یک وظیفه هر بار روی تب اجرا می‌شود.
   قبلاً وظایفِ یک دسته به‌صورت موازی شلیک می‌شدند و عامل داخل صفحه
   وظیفه دوم را با «عامل هم‌اکنون مشغول وظیفه دیگری است» رد می‌کرد. */
let taskChain = Promise.resolve();
const pendingChain = new Set();

/* ═══════ حلقه Sync — Heartbeat + Pull وظایف (§۲۶/§۱۴) ═══════ */
let syncing = false;
async function syncOnce() {
  if (!state.paired || syncing) return;
  syncing = true;
  try {
    const contexts = await collectTabContexts();
    /* (v1.2.7) نسخهٔ افزونه + کروم در هر heartbeat — پنل همیشه نسخهٔ واقعیِ
       نصب‌شده را می‌بیند حتی اگر Worker با نسخهٔ قدیمی جفت شده باشد */
    const uaBrands = navigator.userAgentData?.brands;
    const chromeVer = uaBrands?.[1]?.version ? "Chrome " + uaBrands[1].version : "Chrome";
    const data = await api("/api/agent/sync", {
      workerId: state.workerId,
      token: state.token,
      tabs: contexts,
      extVersion: EXT_VERSION,
      chrome: chromeVer,
    });
    state.online = true;
    state.lastSyncAt = Date.now();

    const tasks = data?.tasks ?? [];
    for (const t of tasks) {
      if (state.runningTasks.has(t.id) || pendingChain.has(t.id)) continue;
      pendingChain.add(t.id);
      logEvent("task_started", `وظیفه TASK-${t.refNo} به افزونه رسید`, `${t.action} روی ${t.platform}`);
      /* زنجیره خارج از قفل sync است تا heartbeat در اجرای طولانی متوقف نشود.
         ⚠️ سقف ۱۵۰ ثانیه برای کل اجرای هر وظیفه — اگر executeTask معلق بماند،
         زنجیره با خطا آزاد می‌شود و وظایف بعدی قربانی یک وظیفهٔ خراب نمی‌شوند */
      taskChain = taskChain
        .then(() => Promise.race([
          executeTask(t),
          sleep(150000).then(() => null),
        ]))
        .then(async (result) => {
          if (!result) {
            result = taskResult(t, "failed", { errorKind: "network", error: "مهلت کل اجرای وظیفه (۱۵۰ ثانیه) تمام شد — زنجیره آزاد شد" });
          }
          await api("/api/agent/task-update", {
            workerId: state.workerId,
            token: state.token,
            taskId: result.taskId,
            status: result.status,
            steps: result.steps,
            result: result.result,
            error: result.error,
            errorKind: result.errorKind,
            chatType: result.chatType,
          });
          if (result.status === "success") {
            const isSend = t.action.startsWith("SEND_");
            logEvent(isSend ? "message_sent" : "task_started", isSend ? `پیام TASK-${result.refNo} ارسال و تأیید شد` : `وظیفه TASK-${result.refNo} موفق بود`, "");
          } else if (result.status === "failed") {
            logEvent("task_failed", `وظیفه TASK-${result.refNo} ناموفق بود`, result.error || "");
          }
        })
        .catch(() => {})
        .finally(() => pendingChain.delete(t.id));
    }
  } catch (e) {
    if (e.status === 401) {
      /* توکن نامعتبر — جفت‌سازی باطل شده */
      await unpair();
    }
    state.online = false;
  } finally {
    syncing = false;
  }
}

let syncTimer = null;
function startSyncLoop() {
  if (syncTimer) return;
  syncTimer = setInterval(syncOnce, SYNC_INTERVAL_MS);
  syncOnce();
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 0.5 });
}

function stopSyncLoop() {
  if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
  chrome.alarms.clear(ALARM_NAME);
}

/* ═══════ کلیک «مورد اعتماد مرورگر» (chrome.debugger) ═══════
   برخی UIها (مثل روبیکا) رویدادهای سینتتیک content script (isTrusted=false) را
   رد می‌کنند؛ اینجا از debugger API رویداد ماوس واقعی در مختصات خواسته‌شده
   تزریق می‌شود. پس از هر کلیک، session بلافاصله detach می‌شود. */
async function trustedClick(tabId, x, y) {
  const debuggee = { tabId };
  try {
    await chrome.debugger.attach(debuggee, "1.3");
    await chrome.debugger.sendCommand(debuggee, "Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    await chrome.debugger.sendCommand(debuggee, "Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
    await chrome.debugger.sendCommand(debuggee, "Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
    return true;
  } catch (e) {
    console.warn("[RW] trustedClick failed:", e?.message || e);
    return false;
  } finally {
    try { await chrome.debugger.detach(debuggee); } catch {}
  }
}

/* ═══════ پیام‌ها از Popup / Side Panel / Content Script ═══════ */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg?.type) {
      case "RW_PAIR": {
        try {
          const data = await pairWithPanel(msg.code, msg.panelUrl);
          sendResponse({ ok: true, workerNo: data.workerNo, workspace: data.workspace });
        } catch (e) {
          sendResponse({ ok: false, error: e.message });
        }
        break;
      }
      case "RW_UNPAIR": {
        await unpair();
        sendResponse({ ok: true });
        break;
      }
      case "RW_STATUS": {
        sendResponse({
          ok: true,
          paired: state.paired,
          online: state.online,
          workerNo: state.workerNo,
          workspaceName: state.workspaceName,
          panelUrl: state.panelUrl,
          extVersion: EXT_VERSION,
          runningTasks: state.runningTasks.size,
          lastSyncAt: state.lastSyncAt,
        });
        break;
      }
      case "RW_PING": {
        sendResponse({ ok: true });
        break;
      }
      case "RW_CONTEXT_UPDATE": {
        /* از content script — وضعیت تب جاری برای side panel */
        await chrome.storage.session.set({ rw_current_context: { ...msg.context, tabId: sender?.tab?.id ?? null } });
        sendResponse({ ok: true });
        break;
      }
      case "RW_TRUSTED_CLICK": {
        /* از content script — کلیک واقعی مرورگر روی مختصات عنصر (chrome.debugger) */
        try {
          const tabId = sender?.tab?.id;
          if (!tabId || typeof msg.x !== "number" || typeof msg.y !== "number") {
            sendResponse({ ok: false, error: "bad_request" });
            break;
          }
          const ok = await trustedClick(tabId, msg.x, msg.y);
          sendResponse({ ok });
        } catch (e) {
          sendResponse({ ok: false, error: e?.message || "trusted_click_failed" });
        }
        break;
      }
      default:
        sendResponse({ ok: false, error: "unknown_message" });
    }
  })();
  return true; /* async response */
});

/* ═══════ چرخه حیات MV3 ═══════ */
chrome.runtime.onInstalled.addListener(async (details) => {
  await loadState();
  if (state.paired) startSyncLoop();
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("popup/popup.html") + "?welcome=1" });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await loadState();
  if (state.paired) startSyncLoop();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) syncOnce();
});

/* شروع */
loadState().then(() => {
  if (state.paired) startSyncLoop();
});
