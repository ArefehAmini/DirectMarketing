/* ─────────────────────────────────────────────────────────────
   test-stale-orphan-guard.mjs — E2E گارد وظایف یتیم کهنه
   سناریو: Worker تازه جفت می‌شود؛ یک وظیفهٔ یتیمِ >۲۴ ساعت و یک
   وظیفهٔ یتیمِ تازه (<۲۴ ساعت) در صف هستند.
   انتظار: قدیمی → canceled (stale_canceled) و تحویل نمی‌شود؛
           تازه → عادی claim و تحویل می‌شود.
   ───────────────────────────────────────────────────────────── */
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const db = new PrismaClient();
const BASE = "http://localhost:3000";
const sha = (s) => createHash("sha256").update(s).digest("hex");

const EMAIL = `staleguard-${Date.now()}@test.local`;
const TOKEN = "stg-" + Math.random().toString(36).slice(2) + "tok";
let userId = null;

function fail(msg) { console.error("❌ FAIL:", msg); process.exitCode = 1; }
function pass(msg) { console.log("✅", msg); }

try {
  /* ۱) ساخت کاربر + Worker تستی */
  const user = await db.appUser.create({
    data: { email: EMAIL, name: "StaleGuard Test", role: "admin", passwordHash: "x" },
  });
  userId = user.id;
  const worker = await db.browserWorker.create({
    data: {
      userId, workerNo: 99, name: "GuardTest", status: "online",
      tokenHash: sha(TOKEN), extVersion: "1.2.7", lastHeartbeat: new Date(),
    },
  });

  /* ۲) دو وظیفهٔ یتیم: کهنه (۲۵ ساعت پیش) و تازه (الان) */
  const oldTask = await db.agentTask.create({
    data: {
      userId, refNo: 9901, action: "SEND_TEXT", platform: "rubika",
      target: "مخاطب قدیمی", payload: JSON.stringify({ text: "قدیمی — نباید ارسال شود" }),
      status: "queued", createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    },
  });
  const youngTask = await db.agentTask.create({
    data: {
      userId, refNo: 9902, action: "SEND_TEXT", platform: "rubika",
      target: "مخاطب تازه", payload: JSON.stringify({ text: "تازه — باید تحویل شود" }),
      status: "queued", createdAt: new Date(),
    },
  });

  /* ۳) sync با Worker تازه‌جفت‌شده */
  const res = await fetch(`${BASE}/api/agent/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workerId: worker.id, token: TOKEN, tabs: [] }),
  });
  if (!res.ok) { fail(`sync HTTP ${res.status}`); process.exit(1); }
  const data = await res.json();
  const delivered = (data.tasks || []).map((t) => t.refNo);

  /* ۴) راستی‌آزمایی */
  const oldAfter = await db.agentTask.findUnique({ where: { id: oldTask.id } });
  const youngAfter = await db.agentTask.findUnique({ where: { id: youngTask.id } });

  console.log(`   قدیمی #9901 → status=${oldAfter.status} errKind=${oldAfter.errorKind}`);
  console.log(`   تازه   #9902 → status=${youngAfter.status} workerId=${youngAfter.workerId === worker.id ? "همین Worker" : youngAfter.workerId}`);
  console.log(`   تحویل‌شده در پاسخ: [${delivered.join(", ")}]`);

  if (oldAfter.status === "canceled" && oldAfter.errorKind === "stale_canceled") pass("وظیفهٔ کهنه خودکار لغو شد (stale_canceled)");
  else fail("وظیفهٔ کهنه لغو نشده! status=" + oldAfter.status);
  if (oldAfter.workerId === null) pass("وظیفهٔ کهنه به Worker واگذار نشد");
  else fail("وظیفهٔ کهنه به Worker واگذار شده!");
  if (!delivered.includes(9901)) pass("وظیفهٔ کهنه در پاسخ sync نبود");
  else fail("وظیفهٔ کهنه تحویل شده!");
  if (youngAfter.workerId === worker.id && delivered.includes(9902)) pass("وظیفهٔ تازه عادی claim و تحویل شد");
  else fail("وظیفهٔ تازه تحویل نشده! status=" + youngAfter.status);

  /* ۵) رویداد لغو ثبت شده؟ */
  const ev = await db.workerEvent.findFirst({
    where: { userId, type: "task_failed", detail: { contains: "stale_canceled" } },
  });
  if (ev) pass("رویداد لغو خودکار در WorkerEvent ثبت شد");
  else console.log("⚠️ رویداد stale_canceled در WorkerEvent پیدا نشد (غیربحرانی)");
} catch (e) {
  fail(e.message);
} finally {
  /* ترتیب مهم: وظایف رابطهٔ user ندارند (onDelete cascade نمی‌شوند) — جدا حذف شوند */
  if (userId) {
    await db.agentTask.deleteMany({ where: { userId } }).catch(() => {});
    await db.workerEvent.deleteMany({ where: { userId } }).catch(() => {});
    await db.browserWorker.deleteMany({ where: { userId } }).catch(() => {});
    await db.appUser.delete({ where: { id: userId } }).catch(() => {});
  }
  console.log("🧹 cleanup انجام شد");
  await db.$disconnect();
}
