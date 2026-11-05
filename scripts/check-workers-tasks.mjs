/* وضعیت Workerها و وظایف معلق */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const workers = await db.browserWorker.findMany({
  orderBy: { lastHeartbeat: "desc" },
  select: { id: true, name: true, workerNo: true, status: true, simulated: true, extVersion: true, lastHeartbeat: true },
});
console.log("══ Workerها ══");
for (const w of workers) {
  console.log(`  #${w.workerNo} «${w.name}» status=${w.status} ext=${w.extVersion || "—"} simulated=${w.simulated} hb=${w.lastHeartbeat?.toISOString?.() ?? "—"}`);
}

const byStatus = await db.agentTask.groupBy({ by: ["status"], _count: { _all: true } });
console.log("\n══ وظایف بر اساس وضعیت ══");
for (const s of byStatus) console.log(`  ${s.status}: ${s._count._all}`);

const stuck = await db.agentTask.findMany({
  where: { status: { in: ["received", "running", "verifying"] } },
  orderBy: { createdAt: "desc" },
  take: 10,
  select: { refNo: true, status: true, workerId: true, createdAt: true, platform: true, target: true },
});
console.log("\n══ وظایف در-flight ══");
for (const t of stuck) console.log(`  TASK-${t.refNo} ${t.platform} «${t.target}» status=${t.status} worker=${t.workerId ?? "null"} at=${t.createdAt.toISOString()}`);

const users = await db.appUser.findMany({ select: { id: true, email: true, name: true, role: true } });
console.log("\n══ کاربران پنل ══");
for (const u of users) console.log(`  ${u.email} «${u.name}» role=${u.role}`);

await db.$disconnect();
