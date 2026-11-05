import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { nextTaskRefNo, freshSteps, logEvent } from "@/lib/agent-server";

/* ─── مدیریت وظایف عامل از پنل ───
   POST  /api/panel/agents/task   → ایجاد وظیفه { workerId, action, platform, ... }
   PATCH /api/panel/agents/task   → عملیات گروهی { ids[], op } | { op: "worker-online", workerId } */

const ACTIONS = new Set([
  "OPEN_CHAT", "SEND_TEXT", "SEND_IMAGE", "SEND_FILE",
  "SEND_IMAGE_WITH_CAPTION", "CREATE_GROUP", "READ_CHAT_CONTEXT", "GET_CHAT_TYPE",
]);

/* وقتی Worker مشخصی انتخاب نشده، بهترین Worker آنلاین کاربر را برمی‌گردانیم —
   وظیفه بدون Worker هرگز توسط sync تحویل نمی‌شود و «پلتفرم باز نمی‌شود» */
async function pickOnlineWorker(userId: string) {
  return db.browserWorker.findFirst({
    where: { userId, status: "online" },
    orderBy: { lastHeartbeat: "desc" },
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req.cookies.get("rw_session")?.value);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");
  const platform = String(body?.platform ?? "");

  if (!ACTIONS.has(action)) return NextResponse.json({ error: "Action نامعتبر است" }, { status: 400 });
  if (!platform) return NextResponse.json({ error: "پلتفرم الزامی است" }, { status: 400 });

  /* Worker باید متعلق به همین کاربر باشد؛ اگر انتخاب نشده → بهترین Worker آنلاین */
  let workerId = body?.workerId ? String(body.workerId) : null;
  if (workerId) {
    const worker = await db.browserWorker.findFirst({ where: { id: workerId, userId: user.id } });
    if (!worker) return NextResponse.json({ error: "Worker یافت نشد" }, { status: 404 });
  } else {
    const auto = await pickOnlineWorker(user.id);
    if (auto) workerId = auto.id;
  }

  const refNo = await nextTaskRefNo(user.id);
  const task = await db.agentTask.create({
    data: {
      userId: user.id,
      workerId,
      refNo,
      action,
      platform,
      accountId: String(body?.accountId ?? ""),
      accountName: String(body?.accountName ?? ""),
      target: String(body?.target ?? "").slice(0, 120),
      payload: JSON.stringify(body?.payload ?? {}),
      steps: JSON.stringify(freshSteps()),
    },
  });

  await logEvent(user.id, workerId, "task_received", `وظیفه TASK-${refNo} در صف قرار گرفت`, `${action} روی ${platform}`);

  return NextResponse.json({ id: task.id, refNo });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser(req.cookies.get("rw_session")?.value);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const op = String(body?.op ?? "");

  const findReplacementWorker = () =>
    db.browserWorker.findFirst({
      where: { userId: user.id, status: "online" },
      orderBy: { lastHeartbeat: "desc" },
    });

  /* Worker مناسب برای بازگشت وظیفه به صف: اگر Worker فعلی آنلاین و متعلق به کاربر است
     همین نگه داشته می‌شود؛ در غیر این صورت بهترین Worker آنلاین انتخاب می‌شود و اگر
     هیچ Worker آنلاین نیست، workerId برابر null می‌ماند تا در sync بعدی به‌صورت اتمیک
     توسط اولین Worker آنلاین claim شود (وظیفه یتیم ماندگار نمی‌شود). */
  const resolveOnlineWorkerFor = async (currentWorkerId: string | null): Promise<string | null> => {
    if (currentWorkerId) {
      const cur = await db.browserWorker.findFirst({
        where: { id: currentWorkerId, userId: user.id, status: "online" },
      });
      if (cur) return currentWorkerId;
    }
    const rep = await findReplacementWorker();
    return rep?.id ?? null;
  };

  /* ورود مجدد انجام شد — Worker دوباره آنلاین و وظایف متوقف‌شده آزاد می‌شوند (§۳۲/§۳۴) */
  if (op === "worker-online") {
    const workerId = String(body?.workerId ?? "");
    const worker = await db.browserWorker.findFirst({ where: { id: workerId, userId: user.id } });
    if (!worker) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await db.browserWorker.update({ where: { id: worker.id }, data: { status: "online" } });
    const resumed = await db.agentTask.updateMany({
      where: { workerId: worker.id, userId: user.id, status: "paused" },
      data: { status: "queued", error: "", errorKind: "" },
    });
    await logEvent(user.id, worker.id, "connected", `Worker #${String(worker.workerNo).padStart(3, "0")} دوباره فعال شد`, `${resumed.count} وظیفه متوقف‌شده به صف بازگشت`);
    return NextResponse.json({ ok: true, resumed: resumed.count });
  }

  const ids: string[] = Array.isArray(body?.ids) ? body.ids.map(String) : [];
  if (!ids.length) return NextResponse.json({ error: "هیچ وظیفه‌ای انتخاب نشده" }, { status: 400 });

  const owned = await db.agentTask.findMany({ where: { id: { in: ids }, userId: user.id } });
  if (!owned.length) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let changed = 0;
  for (const t of owned) {
    let patch: Record<string, unknown> | null = null;
    if (op === "pause" && ["queued", "received", "running", "verifying"].includes(t.status)) {
      patch = { status: "paused", error: "توقف دستی توسط اپراتور" };
    } else if (op === "resume" && ["paused", "human_action"].includes(t.status)) {
      patch = { status: "queued", workerId: await resolveOnlineWorkerFor(t.workerId), error: "", errorKind: "" };
    } else if (op === "cancel" && ["queued", "received", "paused"].includes(t.status)) {
      patch = { status: "canceled", finishedAt: new Date(), error: "لغو توسط اپراتور" };
    } else if (op === "retry" && ["failed", "canceled"].includes(t.status)) {
      /* اگر وظیفه Worker ندارد (یتیم) یا Worker آن آفلاین است → Worker آنلاین اختصاص یابد
         وگرنه بعد از Retry هم هیچ‌وقت اجرا نمی‌شود */
      patch = { status: "queued", workerId: await resolveOnlineWorkerFor(t.workerId), error: "", errorKind: "", result: "", steps: JSON.stringify(freshSteps()), finishedAt: null, startedAt: null };
    }
    if (patch) {
      await db.agentTask.update({ where: { id: t.id }, data: patch });
      changed++;
    }
  }

  return NextResponse.json({ ok: true, changed });
}
