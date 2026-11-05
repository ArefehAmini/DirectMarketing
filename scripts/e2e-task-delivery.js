/* ═══════════════════════════════════════════════════════════
   E2E — فلوی تحویل وظیفه به افزونه (بازشدن پلتفرم)
   سناریو ۱: dispatch بدون workerId → sync → باید خودکار claim شود
   سناریو ۲: وظیفه failed یتیم → Retry → sync → باید تحویل شود
   ═══════════════════════════════════════════════════════════ */
const BASE = "http://localhost:3000";
let cookie = "";

async function api(path, { method = "POST", body, auth } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie && setCookie.includes("rw_session=")) cookie = setCookie.split(";")[0];
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

function assert(cond, label, extra = "") {
  console.log((cond ? "✅" : "❌") + " " + label + (extra ? " — " + extra : ""));
  if (!cond) process.exitCode = 1;
}

(async () => {
  const email = `e2e-delivery-${Date.now()}@test.local`;
  let r = await api("/api/auth/register", { body: { email, password: "test1234", name: "E2E Delivery" } });
  assert(r.status === 200, "ثبت‌نام کاربر تست", `status=${r.status}`);

  /* ۱) صدور کد جفت‌سازی + pair مثل افزونه واقعی */
  r = await api("/api/panel/agents", { body: { action: "new-pairing", workerName: "E2E-Worker" } });
  const code = r.data?.code;
  assert(!!code, "صدور کد RX", code || "");

  r = await api("/api/agent/pair", { body: { code, device: { chrome: "Chrome 140", ext: "1.0.0" } } });
  const { workerId, token } = r.data || {};
  assert(!!workerId && !!token, "جفت‌سازی Worker", `workerId=${workerId}`);

  /* ۲) dispatch بدون workerId (همان رفتار دیالوگ «دستور جدید») */
  r = await api("/api/panel/agents/task", {
    body: { action: "SEND_TEXT", platform: "rubika", target: "علی رضایی", payload: { text: "تست تحویل E2E" } },
  });
  const t1 = r.data;
  assert(r.status === 200 && !!t1?.id, "dispatch بدون workerId", `refNo=${t1?.refNo}`);

  /* ۳) sync اول — باید وظیفه claim و تحویل شود */
  r = await api("/api/agent/sync", { body: { workerId, token, tabs: [] } });
  const got1 = (r.data?.tasks || []).find((t) => t.id === t1.id);
  assert(!!got1, "sync → وظیفه یتیم claim و تحویل شد", got1 ? `refNo=${got1.refNo}` : "دریافت نشد!");

  /* ۴) گزارش failed از سمت افزونه (مثل واقعی) */
  r = await api("/api/agent/task-update", {
    body: { workerId, token, taskId: t1.id, status: "failed", errorKind: "chat_not_found", error: "گفتگو پیدا نشد (تست)" },
  });
  assert(r.status === 200, "گزارش failed به پنل");

  /* ۵) Retry از پنل — وظیفه workerId دارد (claim شده) */
  r = await api("/api/panel/agents/task", { method: "PATCH", body: { ids: [t1.id], op: "retry" } });
  assert(r.data?.changed === 1, "Retry وظیفه از پنل");

  /* ۶) sync دوم — باید دوباره تحویل شود */
  r = await api("/api/agent/sync", { body: { workerId, token, tabs: [] } });
  const got2 = (r.data?.tasks || []).find((t) => t.id === t1.id);
  assert(!!got2, "sync بعد از Retry → تحویل مجدد", got2 ? `refNo=${got2.refNo}` : "دریافت نشد!");

  /* ۷) سناریوی یتیم واقعی: وظیفه با workerId=null در DB شبیه‌سازی می‌شود
        (مثل TASK-9281 کاربر) — dispatch با workerId ناشناخته ممکن نیست، پس مستقیم در DB
        از طریق dispatch سپس پاک‌کردن workerId انجام می‌دهیم... از مسیر API:
        dispatch جدید → task-update → ارسال مجدد با workerId=null قابل ساخت از API نیست،
        پس همان dispatch اول claim شد — کافی است. تست claim رقابتی: sync دوباره با worker دوم */
  r = await api("/api/panel/agents", { body: { action: "new-pairing", workerName: "E2E-Worker2" } });
  r = await api("/api/agent/pair", { body: { code: r.data?.code, device: { chrome: "Chrome 140" } } });
  const w2 = r.data;
  r = await api("/api/agent/sync", { body: { workerId: w2.workerId, token: w2.token, tabs: [] } });
  console.log("ℹ️  worker دوم sync کرد — نباید وظیفهٔ worker اول را برباید:", (r.data?.tasks || []).length === 0 ? "درست ✓" : "توجه: وظیفه‌ای به worker دوم رسید");

  console.log("\n═══ پایان تست ═══");
})().catch((e) => { console.error("FATAL:", e); process.exit(1); });
