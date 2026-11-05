import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateWorker, logEvent } from "@/lib/agent-server";

/* ─── Heartbeat + دریافت وظایف (Pull Model) ───
   POST /api/agent/sync
   { workerId, tabs: [...], session? }  →  { tasks, serverTime }
   افزونه هر چند ثانیه sync می‌کند؛ وظایف در صف با فراخوانی این مسیر
   تحویل داده می‌شوند و بلافاصله «دریافت شد» (Ack) ثبت می‌گردد. */

interface IncomingTab {
  platform?: string;
  url?: string;
  title?: string;
  status?: string;
  chatName?: string;
  chatType?: string;
  session?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const worker = await authenticateWorker(body?.workerId, body?.token);
    if (!worker) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    /* Snapshot تب‌ها جایگزین می‌شود — آخرین وضعیت مرورگر */
    const tabs: IncomingTab[] = Array.isArray(body?.tabs) ? body.tabs.slice(0, 24) : [];
    await db.workerTab.deleteMany({ where: { workerId: worker.id } });
    if (tabs.length) {
      await db.workerTab.createMany({
        data: tabs.map((t) => ({
          workerId: worker.id,
          platform: String(t.platform ?? "other").slice(0, 20),
          url: String(t.url ?? "").slice(0, 500),
          title: String(t.title ?? "").slice(0, 200),
          status: String(t.status ?? "ready").slice(0, 20),
          chatName: String(t.chatName ?? "").slice(0, 120),
          chatType: String(t.chatType ?? "unknown").slice(0, 20),
          session: String(t.session ?? "active").slice(0, 20),
        })),
      });
    }

    /* Worker با هر sync زنده است — مگر در نیاز به اقدام */
    if (worker.status === "offline") {
      await db.browserWorker.update({ where: { id: worker.id }, data: { status: "online" } });
      await logEvent(worker.userId, worker.id, "connected", `Worker #${String(worker.workerNo).padStart(3, "0")} دوباره متصل شد`);
    }

    const now = new Date();
    /* ── Patch نسخهٔ افزونه در هر Heartbeat (باگ «نسخه رو نشون نمیده») ──
       افزونه از v1.2.7 به بعد در هر sync نسخهٔ خودش و کروم را می‌فرستد؛
       اگر با ردیف DB فرق داشت (مثلاً Worker با نسخهٔ قدیمی جفت شده و بعد
       افزونه آپدیت شده) همین‌جا آپدیت می‌شود + یک Event — فقط در تغییر، بدون اسپم */
    const extVersion = String(body?.extVersion ?? "").slice(0, 20);
    const chromeVersion = String(body?.chrome ?? "").slice(0, 40);
    const verPatch: { extVersion?: string; chromeVersion?: string } = {};
    if (extVersion && extVersion !== worker.extVersion) verPatch.extVersion = extVersion;
    if (chromeVersion && chromeVersion !== worker.chromeVersion) verPatch.chromeVersion = chromeVersion;
    await db.browserWorker.update({
      where: { id: worker.id },
      data: { lastHeartbeat: now, ...verPatch },
    });
    if (verPatch.extVersion) {
      await logEvent(
        worker.userId,
        worker.id,
        "connected",
        `افزونهٔ Worker #${String(worker.workerNo).padStart(3, "0")} به نسخهٔ ${verPatch.extVersion} بروزرسانی شد`
      );
    }

    /* ── گارد وظایف یتیم کهنه (Stale Orphan Guard) ──
       وظایفِ بدون Worker که بیش از ۲۴ ساعت معلق مانده‌اند هرگز نباید با
       جفت‌شدن Worker تازه ناگهان ارسال شوند (پیام‌های آزمایشی/منقضیِ قدیمی —
       بازتاب مستقیم باگ «۱۱ وظیفهٔ یتیم ناگهان claim شدند»). خودکار لغو می‌شوند؛
       وظایف جدیدتر (<۲۴ ساعت) عادی claim می‌شوند تا قطع‌وصلی Worker آسیب نزند */
    const staleOrphanBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const staleOrphans = await db.agentTask.updateMany({
      where: {
        userId: worker.userId,
        workerId: null,
        status: { in: ["queued", "received", "paused", "running", "verifying"] },
        createdAt: { lt: staleOrphanBefore },
      },
      data: {
        status: "canceled",
        errorKind: "stale_canceled",
        error: "بیش از ۲۴ ساعت بدون Worker ماند و خودکار لغو شد (Stale Orphan Guard)",
        finishedAt: now,
      },
    });
    if (staleOrphans.count > 0) {
      await logEvent(
        worker.userId,
        worker.id,
        "task_failed",
        `${staleOrphans.count} وظیفهٔ کهنهٔ بدون Worker خودکار لغو شد (بیش از ۲۴ ساعت معلق)`,
        "stale_canceled"
      );
    }

    /* ── احیای وظایف زامبی (Stale Reclaim) ──
       اگر Worker وسط اجرا ری‌استارت شود یا content script پاسخ ندهد، وظایف در
       received/running/verifying گیر می‌کنند و هیچ‌وقت تمام نمی‌شوند. بعد از
       ۵ دقیقه بی‌تحرکی به صف برمی‌گردند تا دوباره اجرا شوند. (TASK-9335..9338) */
    const staleBefore = new Date(now.getTime() - 5 * 60 * 1000);
    await db.agentTask.updateMany({
      where: {
        userId: worker.userId,
        status: { in: ["received", "running", "verifying"] },
        OR: [
          { ackAt: { lt: staleBefore } },
          { startedAt: { lt: staleBefore } },
          { AND: [{ ackAt: null }, { startedAt: null }, { createdAt: { lt: staleBefore } }] },
        ],
      },
      data: { status: "queued" },
    });

    /* ── تحویل وظایف: queued → received (Acknowledgement §۲۷) ──
       وظایف یتیم (workerId=null — مثلاً بعد از Retry یا dispatch بدون Worker)
       هم قابل دریافت‌اند و به‌صورت اتمیک به همین Worker واگذار می‌شوند؛
       در غیر این صورت برای همیشه در صف می‌مانند و هیچ‌وقت اجرا نمی‌شوند. */
    const pending = await db.agentTask.findMany({
      where: {
        userId: worker.userId,
        OR: [{ workerId: worker.id }, { workerId: null }],
        status: { in: ["queued", "received", "paused"] },
      },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    /* واگذاری اتمیک وظایف یتیم — فقط یکی برنده می‌شود (atomic claim) */
    type PendingTask = Awaited<ReturnType<typeof db.agentTask.findMany>>[number];
    const deliverable: PendingTask[] = [];
    for (const t of pending) {
      if (t.workerId === worker.id) { deliverable.push(t); continue; }
      const claimed = await db.agentTask.updateMany({
        where: { id: t.id, workerId: null },
        data: { workerId: worker.id },
      });
      if (claimed.count === 1) {
        deliverable.push({ ...t, workerId: worker.id });
        await logEvent(worker.userId, worker.id, "task_received", `وظیفه TASK-${t.refNo} به این Worker واگذار شد`, `${t.action} روی ${t.platform}`);
      }
    }

    const deliver = deliverable.filter((t) => t.status === "queued" || t.status === "received");
    if (deliver.length) {
      await db.agentTask.updateMany({
        where: { id: { in: deliver.map((t) => t.id), }, status: "queued" },
        data: { status: "received", ackAt: now },
      });
      for (const t of deliver) {
        if (t.status === "queued") {
          await logEvent(worker.userId, worker.id, "task_received", `وظیفه TASK-${t.refNo} دریافت شد`, `${t.action} روی ${t.platform}`);
        }
      }
    }

    return NextResponse.json({
      serverTime: now.toISOString(),
      tasks: deliver.map((t) => ({
        id: t.id,
        refNo: t.refNo,
        action: t.action,
        platform: t.platform,
        accountId: t.accountId,
        accountName: t.accountName,
        target: t.target,
        payload: t.payload,
        status: t.status,
      })),
    });
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
