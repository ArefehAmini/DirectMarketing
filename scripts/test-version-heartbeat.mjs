/* ─────────────────────────────────────────────────────────────
   test-version-heartbeat.mjs — E2E زنجیرهٔ نسخه در heartbeat
   سناریوها:
   ① sync با extVersion → ردیف Worker پر می‌شود + Event ساخته می‌شود
   ② sync دوباره با همان نسخه → Event تکراری ساخته نمی‌شود (بدون اسپم)
   ③ sync بدون extVersion → نسخهٔ قبلی پاک نمی‌شود
   ④ sync بدون توکن → 401
   ───────────────────────────────────────────────────────────── */
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const db = new PrismaClient();
const BASE = "http://localhost:3000";
const sha = (s) => createHash("sha256").update(s).digest("hex");

const EMAIL = `verhb-${Date.now()}@test.local`;
const TOKEN = "vh-" + Math.random().toString(36).slice(2) + "tok";
let userId = null;
let failed = 0;

function check(cond, okMsg, errMsg) {
  if (cond) console.log("✅", okMsg);
  else { console.error("❌ FAIL:", errMsg); failed++; }
}

try {
  const user = await db.appUser.create({ data: { email: EMAIL, name: "VerHB Test", role: "admin", passwordHash: "x" } });
  userId = user.id;
  const worker = await db.browserWorker.create({
    data: { userId, workerNo: 98, name: "VerHB", status: "online", tokenHash: sha(TOKEN), extVersion: "", chromeVersion: "" },
  });

  const sync = async (body) => {
    const res = await fetch(`${BASE}/api/agent/sync`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workerId: worker.id, token: TOKEN, tabs: [], ...body }),
    });
    return { status: res.status, json: res.ok ? await res.json() : null };
  };

  /* ① heartbeat با نسخه */
  await sync({ extVersion: "1.2.7", chrome: "Chrome 141" });
  const w1 = await db.browserWorker.findUnique({ where: { id: worker.id } });
  check(w1.extVersion === "1.2.7", `① extVersion در DB = ${w1.extVersion}`, `extVersion = ${w1.extVersion}`);
  check(w1.chromeVersion === "Chrome 141", `① chromeVersion در DB = ${w1.chromeVersion}`, `chromeVersion = ${w1.chromeVersion}`);
  const ev1 = await db.workerEvent.count({ where: { userId, type: "connected", title: { contains: "1.2.7" } } });
  check(ev1 === 1, "① Event بروزرسانی نسخه ثبت شد", `Event count = ${ev1}`);

  /* ② همان نسخه دوباره → Event جدید ممنوع */
  await sync({ extVersion: "1.2.7", chrome: "Chrome 141" });
  const ev2 = await db.workerEvent.count({ where: { userId, type: "connected", title: { contains: "1.2.7" } } });
  check(ev2 === 1, "② sync تکراری Event اسپم نساخت", `Event count = ${ev2}`);

  /* ③ بدون extVersion → نسخه حفظ می‌شود */
  await sync({});
  const w3 = await db.browserWorker.findUnique({ where: { id: worker.id } });
  check(w3.extVersion === "1.2.7", `③ بدون extVersion، نسخه پاک نشد (${w3.extVersion})`, `extVersion = ${w3.extVersion}`);

  /* ④ بدون توکن → 401 */
  const res401 = await fetch(`${BASE}/api/agent/sync`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workerId: worker.id }),
  });
  check(res401.status === 401, "④ بدون توکن → 401", `status = ${res401.status}`);
} catch (e) {
  console.error("❌ FAIL:", e.message);
  failed++;
} finally {
  /* ترتیب مهم: وظایف/رویدادها cascade کامل ندارند — جدا حذف شوند */
  if (userId) {
    await db.agentTask.deleteMany({ where: { userId } }).catch(() => {});
    await db.workerEvent.deleteMany({ where: { userId } }).catch(() => {});
    await db.browserWorker.deleteMany({ where: { userId } }).catch(() => {});
    await db.appUser.delete({ where: { id: userId } }).catch(() => {});
  }
  console.log("🧹 cleanup انجام شد");
  await db.$disconnect();
  process.exit(failed ? 1 : 0);
}
