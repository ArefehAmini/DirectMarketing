import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateWorker, logEvent } from "@/lib/agent-server";

/* ─── گزارش وضعیت وظیفه از افزونه/شبیه‌ساز به پنل ───
   POST /api/agent/task-update
   { workerId, taskId, status, steps?, result?, error?, errorKind?, chatType? }
   چرخه: received → running → verifying → success/failed
   حالت‌های خاص: paused | human_action
   پروتکل انقضای نشست (§۳۴): وظایف دیگر همان Worker متوقف می‌شوند. */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const worker = await authenticateWorker(body?.workerId, body?.token);
    if (!worker) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const task = await db.agentTask.findUnique({ where: { id: String(body?.taskId ?? "") } });
    if (!task || task.userId !== worker.userId) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const nextStatus = String(body?.status ?? "");
    const allowed = ["received", "running", "verifying", "success", "failed", "paused", "human_action"];
    if (!allowed.includes(nextStatus)) return NextResponse.json({ error: "bad_status" }, { status: 400 });

    const now = new Date();
    const patch: Record<string, unknown> = { status: nextStatus };
    if (Array.isArray(body?.steps)) patch.steps = JSON.stringify(body.steps.slice(0, 8));
    if (typeof body?.result === "string") patch.result = body.result.slice(0, 1000);
    if (typeof body?.error === "string") patch.error = body.error.slice(0, 1000);
    if (typeof body?.errorKind === "string") patch.errorKind = body.errorKind.slice(0, 40);
    if (typeof body?.chatType === "string") patch.result = (typeof body?.result === "string" ? body.result : "");
    if (nextStatus === "running" && !task.startedAt) patch.startedAt = now;
    if (nextStatus === "success" || nextStatus === "failed") patch.finishedAt = now;

    const updated = await db.agentTask.update({ where: { id: task.id }, data: patch });

    /* ── رویدادها و اثرهای جانبی ── */
    if (nextStatus === "running" && task.status !== "running") {
      await logEvent(worker.userId, worker.id, "task_started", `وظیفه TASK-${task.refNo} شروع شد`, `${task.action} → ${task.target || task.platform}`);
    }
    if (nextStatus === "success") {
      const isSend = task.action.startsWith("SEND_");
      await logEvent(
        worker.userId, worker.id,
        isSend ? "message_sent" : "task_started",
        isSend ? `پیام TASK-${task.refNo} با موفقیت ارسال و تأیید شد` : `وظیفه TASK-${task.refNo} با موفقیت انجام شد`,
        `${task.action} → ${task.target || task.platform}`
      );
    }
    if (nextStatus === "failed") {
      await logEvent(worker.userId, worker.id, "task_failed", `وظیفه TASK-${task.refNo} ناموفق بود`, String(body?.error ?? "").slice(0, 300));
      if (body?.errorKind === "platform_ui_changed") {
        await logEvent(worker.userId, worker.id, "adapter_error", `خطای Adapter ${task.platform}`, "ساختار UI سرویس تغییر کرده و Adapter نیازمند به‌روزرسانی است");
      }
    }

    /* ── پروتکل انقضای نشست: توقف وظایف دیگر + Worker needs_action ── */
    if (nextStatus === "failed" && (body?.errorKind === "session_expired" || body?.errorKind === "auth_required")) {
      const others = await db.agentTask.findMany({
        where: { workerId: worker.id, id: { not: task.id }, status: { in: ["queued", "received", "running", "verifying"] } },
        select: { id: true },
      });
      if (others.length) {
        await db.agentTask.updateMany({
          where: { id: { in: others.map((o) => o.id) } },
          data: { status: "paused", error: "توقف خودکار — نشست اکانت منقضی است؛ پس از ورود مجدد ادامه می‌یابد", errorKind: "session_expired" },
        });
      }
      await db.browserWorker.update({ where: { id: worker.id }, data: { status: "needs_action" } });
      await logEvent(worker.userId, worker.id, "session_expired", "نشست اکانت منقضی شد", "وظایف این Worker متوقف شدند — نیاز به ورود مجدد در مرورگر");
    }

    /* ── مانع امنیتی: PAUSE + Human Action Required (§۳۳) ── */
    if (nextStatus === "human_action") {
      await db.browserWorker.update({ where: { id: worker.id }, data: { status: "needs_action" } });
      await logEvent(worker.userId, worker.id, "human_action_required", `وظیفه TASK-${task.refNo} منتظر اقدام انسانی است`, "مانع امنیتی در سرویس مقصد — عامل متوقف شد");
    }

    return NextResponse.json({ ok: true, status: updated.status });
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
