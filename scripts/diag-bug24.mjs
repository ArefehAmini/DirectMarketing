// ─────────────────────────────────────────────────────────────
// diag-bug24.mjs — تشخیص کامل باگ ۲۴ «هیچ پیامی ارسال نمی‌شود»
// تصویر کامل: وظایف، خطاها، Workerها، رویدادها، کالبدشکافی chat_not_found
// ─────────────────────────────────────────────────────────────
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const fa = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
const t = (d) => (d ? d.toISOString().replace("T", " ").slice(0, 16) : "—");

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  تشخیص باگ ۲۴ — زنجیرهٔ ارسال پیام            ║");
  console.log("╚══════════════════════════════════════════════╝");

  // ۱) Workerها
  const workers = await db.browserWorker.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tasks: true } } },
  });
  console.log(`\n━━ ۱) Workerها: ${fa(workers.length)} عدد ━━`);
  for (const w of workers) {
    console.log(
      `  #${String(w.workerNo).padStart(3, "0")} ${w.name} ` +
      `ext=${w.extVersion || "—"} hb=${t(w.lastHeartbeat)} tasks=${w._count.tasks}`
    );
  }
  if (!workers.length) console.log("  ⚠️ هیچ BrowserWorkerی در DB نیست — افزونه اصلاً جفت نشده یا حذف شده!");

  // ۲) وظایف بر اساس وضعیت
  const tasks = await db.agentTask.findMany({ orderBy: { createdAt: "desc" } });
  const byStatus = {};
  for (const k of tasks) byStatus[k.status] = (byStatus[k.status] || 0) + 1;
  console.log(`\n━━ ۲) وظایف: مجموع ${fa(tasks.length)} ━━`);
  console.log("  " + Object.entries(byStatus).map(([s, c]) => `${s}=${fa(c)}`).join("  "));

  // ۳) توزیع errorKind
  const failed = tasks.filter((k) => k.status === "failed");
  const errDist = {};
  for (const k of failed) errDist[k.errorKind || "(بی‌نام)"] = (errDist[k.errorKind || "(بی‌نام)"] || 0) + 1;
  console.log(`\n━━ ۳) توزیع خطاها در ${fa(failed.length)} وظیفهٔ failed ━━`);
  for (const [e, c] of Object.entries(errDist).sort((a, b) => b[1] - a[1]))
    console.log(`  ${e}: ${fa(c)}`);

  // ۴) کالبدشکافی chat_not_found
  const cnf = tasks.filter((k) => k.errorKind === "chat_not_found");
  console.log(`\n━━ ۴) کالبدشکافی chat_not_found (${fa(cnf.length)} مورد) ━━`);
  const byPlat = {};
  for (const k of cnf) byPlat[k.platform] = (byPlat[k.platform] || 0) + 1;
  console.log("  بر اساس پلتفرم: " + JSON.stringify(byPlat));
  const byDay = {};
  for (const k of cnf) byDay[t(k.createdAt).slice(0, 10)] = (byDay[t(k.createdAt).slice(0, 10)] || 0) + 1;
  console.log("  بر اساس روز: " + JSON.stringify(byDay));
  console.log("  ── ۸ نمونهٔ اخیر ──");
  for (const k of cnf.slice(0, 8))
    console.log(
      `  #${k.refNo} [${k.platform}] target=«${k.target}» account=«${k.accountName}»\n` +
      `      ${t(k.createdAt)}→${t(k.finishedAt)} خطا: ${k.error.slice(0, 110)}`
    );

  // ۵) وظایف فعال (در-flight)
  const inflight = tasks.filter((k) => ["queued", "received", "running", "verifying"].includes(k.status));
  console.log(`\n━━ ۵) وظایف فعال: ${fa(inflight.length)} ━━`);
  for (const k of inflight)
    console.log(
      `  #${k.refNo} [${k.platform}] «${k.target}» status=${k.status} workerId=${k.workerId ? "بله" : "null"} ${t(k.createdAt)}`
    );
  const orphans = inflight.filter((k) => !k.workerId);
  if (orphans.length)
    console.log(`  ⚠️ ${fa(orphans.length)} وظیفهٔ یتیم — با اولین Workerِ تازه‌جفت‌شده ناگهان claim می‌شوند!`);

  // ۶) رویدادهای Worker اخیر
  const events = await db.workerEvent.findMany({ orderBy: { at: "desc" }, take: 12 });
  console.log(`\n━━ ۶) ۱۲ رویداد اخیر ━━`);
  for (const e of events)
    console.log(`  [${t(e.at)}] ${e.type}: ${e.title} — ${e.detail.slice(0, 70)}`);
  if (!events.length) console.log("  (هیچ رویدادی نیست — افزونه هرگز وصل نشده)");

  console.log("\n✅ پایان تشخیص");
}

main()
  .catch((e) => { console.error("❌", e); process.exit(1); })
  .finally(() => db.$disconnect());
