/* RasaWeb Agent — Side Panel */
const $ = (id) => document.getElementById(id);

const CHAT_TYPE_LABEL = {
  private: "گفتگوی خصوصی",
  group: "گروه",
  channel: "کانال",
  bot: "بات",
  business: "حساب تجاری",
  unknown: "ناشناخته",
};

async function refresh() {
  const status = await chrome.runtime.sendMessage({ type: "RW_STATUS" }).catch(() => null);
  if (!status) return;

  const line = $("status-line");
  if (!status.paired) {
    line.textContent = "⚪ جفت‌سازی نشده — از Popup افزونه";
  } else if (status.online) {
    /* (v1.2.7) نسخهٔ افزونه در خط وضعیت — کاربر همیشه ببیند چه نسخه‌ای اجرا شده */
    const verSuffix = status.extVersion ? " — v" + status.extVersion : "";
    line.textContent = "🟢 متصل — Worker #" + String(status.workerNo ?? 0).padStart(3, "0") + verSuffix;
  } else {
    line.textContent = "🔴 قطع اتصال";
  }

  /* Context جاری از storage.session (گزارش content scriptها) */
  const { rw_current_context: ctx } = await chrome.storage.session.get("rw_current_context");
  const supported = ctx && ctx.platform !== "other" && ctx.platformLabel !== "Unknown";

  $("ctx-empty").classList.toggle("hidden", !!supported);
  $("ctx").classList.toggle("hidden", !supported);

  if (supported) {
    $("c-platform").textContent = ctx.platformLabel;
    $("c-chat").textContent = ctx.chatName || "—";
    $("c-chattype").textContent = CHAT_TYPE_LABEL[ctx.chatType] || ctx.chatType;
    $("c-status").textContent = ctx.working ? "🟡 در حال اجرای وظیفه" : "🟢 Ready";
    const ses = { active: "🟢 فعال", expiring: "🟡 نزدیک انقضا", expired: "🔴 منقضی" }[ctx.session] || ctx.session;
    $("c-session").textContent = ses;
  }

  /* اکانت‌ها و صف از پنل — سریع‌ترین مسیر: وضعیت SW */
}

/* ═══ اجرای Action از Side Panel ═══
   وظیفه از طریق Service Worker به API پنل گزارش نمی‌شود؛
   برای تست محلی، مستقیم روی تب جاری اجرا می‌شود. */
document.querySelectorAll(".act").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const action = btn.dataset.action;
    const note = $("act-note");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    const payload = action === "SEND_TEXT" ? { text: "سلام! این پیام از طریق RasaWeb Agent ارسال شد." } :
      action === "SEND_IMAGE" ? { image: "photo.jpg" } :
      action === "SEND_FILE" ? { file: "document.pdf" } :
      action === "SEND_IMAGE_WITH_CAPTION" ? { image: "photo.jpg", caption: "کپشن نمونه" } :
      action === "CREATE_GROUP" ? { groupName: "گروه جدید", members: [] } : {};

    btn.disabled = true;
    note.classList.remove("hidden");
    note.textContent = "⏳ در حال اجرای " + action + " …";
    try {
      const reply = await chrome.tabs.sendMessage(tab.id, {
        type: "RW_TASK",
        task: { id: "sidepanel-" + Date.now(), refNo: 0, action, platform: guessPlatform(tab.url), target: "", payload },
      });
      if (reply?.status === "success") {
        note.textContent = "✅ موفق — " + (reply.result || "انجام شد");
        logLine("ok", action + " — موفق");
      } else {
        note.textContent = "❌ " + (reply?.error || "ناموفق");
        logLine("err", action + " — " + (reply?.error || "ناموفق"));
      }
    } catch {
      note.textContent = "❌ ارتباط با صفحه برقرار نشد — صفحه پیام‌رسان را باز کنید و رفرش بزنید.";
      logLine("err", "ارتباط با تب برقرار نشد");
    }
    btn.disabled = false;
  });
});

function guessPlatform(url) {
  const u = (url || "").toLowerCase();
  if (u.includes("whatsapp")) return "whatsapp";
  if (u.includes("telegram")) return "telegram";
  if (u.includes("rubika")) return "rubika";
  if (u.includes("bale")) return "bale";
  if (u.includes("eitaa")) return "eitaa";
  if (u.includes("soroush")) return "soroush";
  return "other";
}

function logLine(kind, text) {
  const box = $("activity");
  box.querySelector(".muted")?.remove();
  const div = document.createElement("div");
  div.className = "act-line " + kind;
  div.textContent = new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }) + " — " + text;
  box.prepend(div);
}

$("refresh-btn").addEventListener("click", refresh);

$("panel-link").addEventListener("click", async () => {
  const status = await chrome.runtime.sendMessage({ type: "RW_STATUS" });
  if (status?.panelUrl) chrome.tabs.create({ url: status.panelUrl });
});

/* گوش‌دادن به تغییر Context از content scriptها */
chrome.storage.session.onChanged?.addListener((changes) => {
  if (changes.rw_current_context) refresh();
});

refresh();
setInterval(refresh, 3000);
