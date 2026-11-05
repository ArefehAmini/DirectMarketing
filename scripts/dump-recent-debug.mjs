/* دامپ وظایف اخیر با جزئیات کامل برای دیباگ مخاطب ذخیره‌نشده */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const tasks = await db.agentTask.findMany({
  orderBy: { createdAt: "desc" },
  take: 8,
  select: {
    refNo: true, action: true, status: true, errorKind: true, error: true,
    workerId: true, platform: true, target: true, payload: true, result: true,
    steps: true, createdAt: true, finishedAt: true,
  },
});

console.log("══ وظایف اخیر (۸ مورد) ══");
for (const t of tasks) {
  console.log(`\n▶ TASK-${t.refNo} [${t.action}] ${t.platform} → «${t.target}» status=${t.status} err=${t.errorKind || "—"}`);
  console.log(`   زمان: ${t.createdAt.toISOString()} → ${t.finishedAt?.toISOString?.() ?? "ناتمام"}`);
  let payload = {};
  try { payload = JSON.parse(t.payload || "{}"); } catch {}
  console.log(`   payload: ${JSON.stringify(payload).slice(0, 300)}`);
  if (t.error) console.log(`   error: ${t.error.slice(0, 600)}`);
  if (t.result) {
    let r = t.result;
    try { r = JSON.stringify(JSON.parse(r)).slice(0, 3000); } catch { r = r.slice(0, 3000); }
    console.log(`   result: ${r}`);
  }
  try {
    const steps = JSON.parse(t.steps || "[]");
    for (const s of steps) console.log(`   · step: ${typeof s === "string" ? s : JSON.stringify(s).slice(0, 400)}`);
  } catch {}
}
await db.$disconnect();
