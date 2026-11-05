/* بررسی وضعیت واقعی وظایف و رویدادهای Worker کاربر */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const user = await prisma.appUser.findUnique({ where: { email: "arefeamini9@gmail.com" } });
  if (!user) { console.log("USER NOT FOUND"); return; }
  console.log("USER:", user.id, user.email);

  const workers = await prisma.browserWorker.findMany({ where: { userId: user.id } });
  for (const w of workers) {
    console.log("WORKER:", w.id, "|", w.name, "| status:", w.status, "| simulated:", w.simulated, "| lastHB:", w.lastHeartbeat ? new Date(w.lastHeartbeat).toISOString() : null, "(", w.lastHeartbeat ? Math.round((Date.now() - new Date(w.lastHeartbeat).getTime()) / 1000) + "s ago" : "-", ")");
  }

  const tasks = await prisma.agentTask.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  for (const t of tasks) {
    console.log("─────");
    console.log("TASK", t.refNo, "|", t.action, "| platform:", t.platform, "| status:", t.status);
    console.log("  target:", t.target, "| workerId:", t.workerId, "| createdAt:", new Date(t.createdAt).toISOString());
    if (t.error) console.log("  error:", t.errorKind, "|", (t.error || "").slice(0, 160));
    if (t.steps) {
      try {
        const steps = JSON.parse(t.steps);
        console.log("  steps:", steps.map((s) => `${s.label}:${s.state}`).join(" → "));
      } catch {}
    }
  }

  const events = await prisma.workerEvent.findMany({
    where: { worker: { userId: user.id } },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  console.log("\n═══ EVENTS (12 اخیر) ═══");
  for (const e of events) {
    console.log(new Date(e.createdAt).toISOString(), "|", e.type, "|", (e.title || "").slice(0, 80), "|", (e.detail || "").slice(0, 80));
  }
})().finally(() => prisma.$disconnect());
