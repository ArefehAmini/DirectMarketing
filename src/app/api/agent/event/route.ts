import { NextRequest, NextResponse } from "next/server";
import { authenticateWorker, logEvent } from "@/lib/agent-server";

/* ─── ثبت رویداد از افزونه/شبیه‌ساز — Event Log (§۴۲) ───
   POST /api/agent/event  { workerId, token, type, title, detail } */

const ALLOWED = new Set([
  "connected", "disconnected", "account_detected", "task_received", "task_started",
  "message_sent", "task_failed", "session_expired", "worker_offline",
  "adapter_error", "human_action_required", "pairing",
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const worker = await authenticateWorker(body?.workerId, body?.token);
    if (!worker) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const type = String(body?.type ?? "");
    if (!ALLOWED.has(type)) return NextResponse.json({ error: "bad_type" }, { status: 400 });

    await logEvent(
      worker.userId,
      worker.id,
      type,
      String(body?.title ?? "").slice(0, 200) || type,
      String(body?.detail ?? "").slice(0, 500)
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
