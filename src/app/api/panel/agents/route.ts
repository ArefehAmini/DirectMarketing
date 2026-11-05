import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  authenticateWorker, effectiveStatus, PAIRING_TTL_MS, makePairingCode, logEvent,
} from "@/lib/agent-server";

/* ─── API پنل مرکزی برای Browser Workers ───
   GET    /api/panel/agents                → workers + tasks + events + pairing codes
   POST   /api/panel/agents                → ساخت کد جفت‌سازی { workerName }
   DELETE /api/panel/agents?workerId=...   → ابطال Worker */

const activeStatuses = ["queued", "received", "running", "verifying"];

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req.cookies.get("rw_session")?.value);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [workers, tasks, events, pairings, supportOpen] = await Promise.all([
    db.browserWorker.findMany({
      where: { userId: user.id },
      orderBy: { workerNo: "asc" },
      include: { tabs: true, _count: { select: { tasks: true } } },
    }),
    db.agentTask.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 300 }),
    db.workerEvent.findMany({ where: { userId: user.id }, orderBy: { at: "desc" }, take: 150 }),
    db.pairingCode.findMany({ where: { userId: user.id, used: false, expiresAt: { gte: new Date() } }, orderBy: { createdAt: "desc" } }),
    /* شمارندهٔ تیکت فعال برای نشان سایدبار — مالک: همهٔ تیکت‌ها، کاربر: تیکت‌های خودش */
    db.ticket.count({
      where: {
        status: { in: ["open", "in_progress", "waiting"] },
        ...(user.role === "owner" || user.role === "admin" ? {} : { userId: user.id }),
      },
    }),
  ]);

  const taskCounter = (wid: string, inStatuses: string[]) =>
    tasks.filter((t) => t.workerId === wid && inStatuses.includes(t.status)).length;

  return NextResponse.json({
    workers: workers.map((w) => ({
      id: w.id,
      workerNo: w.workerNo,
      name: w.name,
      status: effectiveStatus(w.status, w.lastHeartbeat),
      chromeVersion: w.chromeVersion,
      extVersion: w.extVersion,
      profileLabel: w.profileLabel,
      simulated: w.simulated,
      lastHeartbeat: w.lastHeartbeat?.toISOString() ?? null,
      createdAt: w.createdAt.toISOString(),
      tabs: w.tabs.map((t) => ({
        platform: t.platform, url: t.url, title: t.title,
        status: t.status, chatName: t.chatName, chatType: t.chatType, session: t.session,
      })),
      activeTasks: taskCounter(w.id, activeStatuses),
      errorTasks: taskCounter(w.id, ["failed"]),
      pendingCount: taskCounter(w.id, ["queued", "received", "paused"]),
    })),
    tasks: tasks.map((t) => ({
      id: t.id, refNo: t.refNo, workerId: t.workerId, action: t.action, platform: t.platform,
      accountId: t.accountId, accountName: t.accountName, target: t.target,
      payload: JSON.parse(t.payload || "{}"),
      status: t.status, steps: JSON.parse(t.steps || "[]"),
      result: t.result, error: t.error, errorKind: t.errorKind,
      createdAt: t.createdAt.toISOString(),
      startedAt: t.startedAt?.toISOString() ?? null,
      finishedAt: t.finishedAt?.toISOString() ?? null,
    })),
    events: events.map((e) => ({
      id: e.id, workerId: e.workerId, type: e.type, title: e.title, detail: e.detail, at: e.at.toISOString(),
    })),
    pairing: pairings.map((p) => ({
      id: p.id, code: p.code, workerName: p.workerName, expiresAt: p.expiresAt.toISOString(), used: p.used,
    })),
    supportOpen,
    serverTime: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req.cookies.get("rw_session")?.value);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body?.action !== "new-pairing") return NextResponse.json({ error: "bad_action" }, { status: 400 });

  await db.pairingCode.deleteMany({
    where: { userId: user.id, OR: [{ expiresAt: { lt: new Date() } }, { used: true }] },
  }).catch(() => {});

  let code = makePairingCode();
  for (let i = 0; i < 5; i++) {
    const exists = await db.pairingCode.findUnique({ where: { code } });
    if (!exists) break;
    code = makePairingCode();
  }

  const pc = await db.pairingCode.create({
    data: {
      userId: user.id,
      code,
      workerName: String(body?.workerName ?? "").slice(0, 60),
      expiresAt: new Date(Date.now() + PAIRING_TTL_MS),
    },
  });
  await logEvent(user.id, null, "pairing", `کد جفت‌سازی ${code} صادر شد`, body?.workerName ? `برای Worker «${body.workerName}»` : "");

  return NextResponse.json({
    id: pc.id, code: pc.code, workerName: pc.workerName, expiresAt: pc.expiresAt.toISOString(),
  });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req.cookies.get("rw_session")?.value);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const workerId = req.nextUrl.searchParams.get("workerId");
  if (!workerId) return NextResponse.json({ error: "workerId الزامی است" }, { status: 400 });

  /* فقط Worker خود کاربر */
  const ok = await authenticateWorker(workerId, undefined).catch(() => null);
  void ok;
  const worker = await db.browserWorker.findFirst({ where: { id: workerId, userId: user.id } });
  if (!worker) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.browserWorker.delete({ where: { id: worker.id } });
  await logEvent(user.id, null, "disconnected", `Worker #${String(worker.workerNo).padStart(3, "0")} ابطال شد`, "دسترسی افزونه لغو و Worker حذف شد");
  return NextResponse.json({ ok: true });
}
