/* پاک‌سازی کاربر تست */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  const email = process.argv[2];
  if (!email) { console.log("usage: node cleanup-test-user.js <email>"); return; }
  const u = await prisma.appUser.findUnique({ where: { email } });
  if (!u) { console.log("not found:", email); return; }
  await prisma.workerEvent.deleteMany({ where: { userId: u.id } });
  await prisma.workerTab.deleteMany({ where: { worker: { userId: u.id } } });
  await prisma.agentTask.deleteMany({ where: { userId: u.id } });
  await prisma.pairingCode.deleteMany({ where: { userId: u.id } });
  await prisma.browserWorker.deleteMany({ where: { userId: u.id } });
  await prisma.session.deleteMany({ where: { userId: u.id } });
  await prisma.workspace.deleteMany({ where: { userId: u.id } });
  await prisma.appUser.delete({ where: { id: u.id } });
  console.log("✅ cleaned:", email);
})().finally(() => prisma.$disconnect());
