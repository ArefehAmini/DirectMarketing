/* RasaWeb Agent — Popup */
const $ = (id) => document.getElementById(id);

/* آدرس پیش‌فرض پنل مرکزی — همان پنلی که این افزونه از آن دانلود شده */
const DEFAULT_PANEL_URL = "https://preview-08c1f1b5-52bc-4da4-b385-5757ef401ddc.space-z.ai";

/* نرمال‌سازی آدرس: حذف فاصله + افزودن https:// در صورت نبود + حذف / انتهایی */
function normalizeUrl(raw) {
  let u = (raw || "").trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u.replace(/\/+$/, "");
}

const isWelcome = new URLSearchParams(location.search).has("welcome");

async function refresh() {
  const status = await chrome.runtime.sendMessage({ type: "RW_STATUS" });
  render(status);
}

function render(status) {
  const welcome = isWelcome || !status.paired;
  $("welcome").classList.toggle("hidden", !(isWelcome && !status.paired));
  $("main").classList.toggle("hidden", isWelcome && !status.paired);
  $("pairing").classList.toggle("hidden", status.paired);
  $("connected").classList.toggle("hidden", !status.paired);
  $("ext-version").textContent = "v" + (status.extVersion ?? "1.0.0");

  const line = $("status-line");
  if (status.paired) {
    if (status.online) {
      line.textContent = "🟢 متصل به پنل";
      line.className = "status online";
    } else {
      line.textContent = "🔴 قطع اتصال — تلاش مجدد خودکار";
      line.className = "status error";
    }
    $("st-workspace").textContent = status.workspaceName || "—";
    $("st-worker").textContent = "Worker #" + String(status.workerNo ?? 0).padStart(3, "0");
    $("st-tasks").textContent = String(status.runningTasks ?? 0);
    const d = status.lastSyncAt ? Math.max(0, Math.round((Date.now() - status.lastSyncAt) / 1000)) : null;
    $("sync-line").textContent = "آخرین همگام‌سازی: " + (d === null ? "—" : d < 5 ? "همین حالا" : d + " ثانیه پیش");
  }
}

/* ═══ صفحه خوش‌آمد ═══ */

/* دکمه کپی آدرس پنل — قبلاً بدون هندلر بود (دکمه مرده) */
$("welcome-open-panel")?.addEventListener("click", async () => {
  const url = normalizeUrl($("panel-url").value) || DEFAULT_PANEL_URL;
  try {
    await navigator.clipboard.writeText(url);
    const btn = $("welcome-open-panel");
    const old = btn.textContent;
    btn.textContent = "✓ کپی شد";
    setTimeout(() => (btn.textContent = old), 2000);
  } catch {
    /* فال‌بک: انتخاب متن اینپوت برای کپی دستی */
    $("panel-url").select();
  }
});

/* ═══ جفت‌سازی ═══ */
$("pair-btn")?.addEventListener("click", async () => {
  const url = normalizeUrl($("pair-url").value);
  const code = $("pair-code").value.trim().toUpperCase();
  const errBox = $("pair-error");
  errBox.classList.add("hidden");
  if (!url || !code) {
    errBox.textContent = "آدرس پنل و کد اتصال الزامی است.";
    errBox.classList.remove("hidden");
    return;
  }
  if (!/^https:\/\//i.test(url)) {
    errBox.textContent = "آدرس پنل باید با https:// شروع شود.";
    errBox.classList.remove("hidden");
    return;
  }
  $("pair-url").value = url;
  $("pair-btn").disabled = true;
  $("pair-btn").textContent = "در حال اتصال…";
  let res = null;
  try {
    res = await chrome.runtime.sendMessage({ type: "RW_PAIR", code, panelUrl: url });
  } catch (e) {
    res = { ok: false, error: "ارتباط با افزونه برقرار نشد — پنجره را بسته و دوباره باز کنید." };
  }
  $("pair-btn").disabled = false;
  $("pair-btn").textContent = "اتصال به پنل";
  if (res?.ok) {
    refresh();
  } else {
    const raw = res?.error || "اتصال ناموفق بود.";
    errBox.textContent =
      /api_error_40[134]/.test(raw) ? "کد اتصال نامعتبر یا منقضی شده — از پنل کد جدید بگیرید." :
      /api_error_/.test(raw) ? "پنل در دسترس نیست یا آدرس اشتباه است — آدرس پنل را بررسی کنید." :
      raw;
    errBox.classList.remove("hidden");
  }
});

$("welcome-continue")?.addEventListener("click", () => {
  /* انتقال آدرس واردشده به فرم جفت‌سازی (قبلاً انجام نمی‌شد) */
  const url = normalizeUrl($("panel-url").value) || DEFAULT_PANEL_URL;
  $("pair-url").value = url;
  $("welcome").classList.add("hidden");
  $("main").classList.remove("hidden");
  refresh();
});

/* ═══ اقدام‌ها ═══ */
$("open-panel")?.addEventListener("click", async () => {
  const status = await chrome.runtime.sendMessage({ type: "RW_STATUS" });
  if (status?.panelUrl) chrome.tabs.create({ url: status.panelUrl });
});

$("open-sidepanel")?.addEventListener("click", async () => {
  /* باز کردن Side Panel در تب جاری */
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.sidePanel.open({ tabId: tab.id });
    window.close();
  } catch (e) {
    /* فال‌بک: در برخی نسخه‌ها فقط از اکشن باز می‌شود */
  }
});

$("unpair")?.addEventListener("click", async () => {
  if (confirm("اتصال با پنل قطع شود؟ وظایف در حال اجرا متوقف می‌شوند.")) {
    await chrome.runtime.sendMessage({ type: "RW_UNPAIR" });
    refresh();
  }
});

/* پیش‌پر کردن آدرس پنل: پنل ذخیره‌شده ← آدرس پیش‌فرض */
chrome.runtime.sendMessage({ type: "RW_STATUS" }).then((s) => {
  const prefill = s?.panelUrl || DEFAULT_PANEL_URL;
  if (!$("pair-url").value) $("pair-url").value = prefill;
  if (!$("panel-url").value) $("panel-url").value = prefill;
});

refresh();
setInterval(refresh, 3000);
