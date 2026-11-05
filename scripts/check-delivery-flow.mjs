/* بررسی وضعیت واقعی فلوی تحویل وظیفه: وظایف، Workerها و رویدادهای اخیر */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const recentEvents = await db.workerEvent.findMany({
  orderBy: { at: "desc" },
  take: 8,
  include: { worker: { select: { name: true, workerNo: true, status: true } } },
});

const workers = await db.browserWorker.findMany({
  orderBy: { lastHeartbeat: "desc" },
  select: { id: true, name: true, workerNo: true, status: true, simulated: true, lastHeartbeat: true },
});

const tasks = await db.agentTask.findMany({
  orderBy: { createdAt: "desc" },
  take: 6,
  select: {
    refNo: true, action: true, status: true, errorKind: true, error: true,
    workerId: true, platform: true, target: true, createdAt: true, ackAt: true,
  },
});

console.log("══ Workerها ══");
for (const w of workers) {
  console.log(`  #${w.workerNo} «${w.name}» status=${w.status} simulated=${w.simulated} heartbeat=${w.lastHeartbeat?.toISOString?.() ?? w.lastHeartbeat}`);
}
console.log("\n══ وظایف اخیر ══");
for (const t of tasks) {
  console.log(`  TASK-${t.refNo} [${t.action}] status=${t.status} errorKind=${t.errorKind || "—"} workerId=${t.workerId ?? "null(یتیم)"} platform=${t.platform} target=${t.target} ackAt=${t.ackAt?.toISOString?.() ?? "—"}`);
}
console.log("\n══ رویدادهای اخیر ══");
for (const e of recentEvents) {
  console.log(`  [${e.at.toISOString()}] ${e.type} — ${e.title}${e.worker ? ` (Worker: ${e.worker.name})` : ""} | ${e.detail}`);
}
await db.$disconnect();
