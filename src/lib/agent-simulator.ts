/* ═══════════════════════════════════════════════════════════
   Browser Worker Simulator — شبیه‌ساز عامل مرورگر
   دقیقاً همان پروتکل افزونه کروم را اجرا می‌کند:
   Heartbeat → دریافت Task (Pull) → Ack → Agent Loop
   (Observe → Understand → Decide → Act → Verify → Report)
   همه گزارش‌ها از همان API واقعی افزونه عبور می‌کنند.
   ═══════════════════════════════════════════════════════════ */

import { AgentLoopStep, AGENT_LOOP_STEPS } from "@/lib/types";

interface SimWorker {
  workerId: string;
  token: string;
  platforms: string[];
  timer: ReturnType<typeof setInterval> | null;
  executing: Set<string>; // taskId هایی که در جریان‌اند
  offlineUntil: number | null; // برای سناریوی K
  humanActionDone: Set<string>; // وظایفی که بعد از اقدام انسانی ادامه می‌گیرند
  tick: number;
}

const registry = new Map<string, SimWorker>();
const SYNC_INTERVAL = 2600;

function stepsWith(overrides: Partial<Record<AgentLoopStep["key"], Partial<AgentLoopStep>>>): AgentLoopStep[] {
  return AGENT_LOOP_STEPS.map((s) => ({
    key: s.key,
    label: s.label,
    state: "pending",
    ...(overrides[s.key] ?? {}),
  }));
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function report(worker: SimWorker, taskId: string, patch: Record<string, unknown>) {
  try {
    await fetch("/api/agent/task-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workerId: worker.workerId, token: worker.token, taskId, ...patch }),
    });
  } catch {
    /* شبکه — تلاش بعدی */
  }
}

async function logEvent(worker: SimWorker, type: string, title: string, detail = "") {
  try {
    await fetch("/api/agent/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workerId: worker.workerId, token: worker.token, type, title, detail }),
    });
  } catch {
    /* بی‌اهمیت */
  }
}

/* ساخت تب‌های شبیه‌سازی‌شده بر اساس پلتفرم‌های Worker */
function buildTabs(worker: SimWorker, workingPlatform: string | null, sessionOverride?: string) {
  const base = worker.platforms.length ? worker.platforms : ["telegram", "whatsapp", "rubika"];
  return base.slice(0, 5).map((p, i) => {
    const session = sessionOverride ?? (i === 0 && worker.tick % 9 === 4 ? "expiring" : "active");
    return {
      platform: p,
      url: `https://${p === "other" ? "app" : p}.example/web`,
      title:
        p === "whatsapp" ? "WhatsApp Web" :
        p === "telegram" ? "Telegram Web" :
        p === "rubika" ? "Rubika Web" :
        p === "bale" ? "Bale Web" :
        p === "eitaa" ? "Eitaa Web" : "Soroush Web",
      status: p === workingPlatform ? "working" : i === 3 ? "disconnected" : "ready",
      chatName: ["علی رضایی", "گروه فروش ماه", "کانال اطلاع‌رسانی", "پشتیبانی روبیکا", "سارا محمدی"][i] ?? "",
      chatType: ["private", "group", "channel", "bot", "private"][i] ?? "unknown",
      session,
    };
  });
}

/* ═══════ اجرای یک وظیفه با Agent Loop کامل ═══════ */
async function executeTask(worker: SimWorker, task: SimTask) {
  const payload = safePayload(task.payload);
  const scenario = payload.scenario ?? "";
  const isResumedHumanAction = worker.humanActionDone.has(task.id);

  worker.executing.add(task.id);
  const chatTypeFor = (): string => {
    if (scenario === "chat_group") return "group";
    return "private";
  };

  try {
    /* Ack گزارش شد — شروع */
    const stepObserve = stepsWith({ observe: { state: "active" } });
    await report(worker, task.id, { status: "running", steps: stepObserve });
    await sleep(1100);

    /* ── سناریو H: انقضای نشست — در همان مشاهده صفحه ── */
    if (scenario === "session_expired") {
      await report(worker, task.id, {
        status: "failed",
        steps: stepsWith({ observe: { state: "failed", detail: "صفحه ورود سرویس مقصد نمایش داده می‌شود" } }),
        errorKind: "session_expired",
        error: "نشست اکانت در سرویس مقصد منقضی شده است",
      });
      await logEvent(worker, "session_expired", "نشست اکانت منقضی شد", `وظیفه TASK-${task.refNo} و وظایف صف این Worker متوقف شدند`);
      return;
    }

    /* Observe */
    await report(worker, task.id, {
      status: "running",
      steps: stepsWith({
        observe: { state: "done", detail: "چت مخاطب باز است" },
        understand: { state: "active" },
      }),
    });
    await sleep(900);

    /* ── سناریو I: ساختار UI تغییر کرده — Adapter عنصر را پیدا نمی‌کند ── */
    if (scenario === "ui_changed") {
      await report(worker, task.id, {
        status: "failed",
        steps: stepsWith({
          observe: { state: "done", detail: "صفحه بارگذاری شد" },
          understand: { state: "done", detail: "تشخیص پلتفرم و نوع چت" },
          decide: { state: "active" },
        }),
      });
      await sleep(900);
      await report(worker, task.id, {
        status: "failed",
        steps: stepsWith({
          observe: { state: "done" },
          understand: { state: "done" },
          decide: { state: "failed", detail: "عنصر هدف در DOM یافت نشد" },
        }),
        errorKind: "platform_ui_changed",
        error: "ساختار UI سرویس تغییر کرده و Adapter نتوانست کادر پیام را پیدا کند",
      });
      await logEvent(worker, "adapter_error", `خطای Adapter ${task.platform}`, "ساختار UI سرویس تغییر کرده است — نیازمند به‌روزرسانی Adapter");
      return;
    }

    /* Understand + Decide */
    const understandDetail =
      task.action === "READ_CHAT_CONTEXT" || task.action === "GET_CHAT_TYPE"
        ? `نوع چت: ${chatTypeFor() === "group" ? "گروه" : "گفتگوی خصوصی"}`
        : `چت ${task.target || "مخاطب"} آماده است`;
    await report(worker, task.id, {
      status: "running",
      steps: stepsWith({
        observe: { state: "done" },
        understand: { state: "done", detail: understandDetail },
        decide: { state: "done", detail: `اجرای ${task.action}` },
        act: { state: "active" },
      }),
    });
    await sleep(1000);

    /* ── سناریو J: مانع امنیتی → Human Action Required (فقط بار اول) ── */
    if (scenario === "human_action" && !isResumedHumanAction) {
      await report(worker, task.id, {
        status: "human_action",
        steps: stepsWith({
          observe: { state: "done" },
          understand: { state: "done" },
          decide: { state: "done" },
          act: { state: "active", detail: "بررسی امنیتی ظاهر شد" },
        }),
        errorKind: "human_action",
        error: "مانع امنیتی (بررسی امنیتی/کد تأیید) ظاهر شد — عامل متوقف شد",
      });
      await logEvent(worker, "human_action_required", "نیاز به اقدام انسانی", `وظیفه TASK-${task.refNo} — در تب مرورگر اقدام کنید و سپس ادامه دهید`);
      /* ثبت: پس از «ادامه وظیفه» از پنل، این بار مسیر موفق اجرا می‌شود */
      worker.humanActionDone.add(task.id);
      persistSims();
      worker.executing.delete(task.id);
      return; // پس از «ادامه وظیفه» از پنل، دوباره دریافت و این‌بار موفق می‌شود
    }

    /* ── سناریو L: خطای اجرا (کادر پیام پیدا نشد) ── */
    if (scenario === "task_failed") {
      await report(worker, task.id, {
        status: "failed",
        steps: stepsWith({
          observe: { state: "done" },
          understand: { state: "done" },
          decide: { state: "done" },
          act: { state: "failed", detail: "کادر پیام در صفحه یافت نشد" },
        }),
        errorKind: "input_not_found",
        error: "نتوانستیم کادر نوشتن پیام را پیدا کنیم",
      });
      return;
    }

    /* Act — بسته به نوع Action */
    const actDetail =
      task.action === "SEND_TEXT" ? "پیام در کادر نوشته و ارسال شد" :
      task.action === "SEND_IMAGE" ? "تصویر آپلود و ارسال شد" :
      task.action === "SEND_FILE" ? "فایل آپلود و ارسال شد" :
      task.action === "SEND_IMAGE_WITH_CAPTION" ? "تصویر + کپشن در Preview ثبت و ارسال شد" :
      task.action === "CREATE_GROUP" ? `گروه «${payload.groupName ?? "گروه جدید"}» با ${((payload.members as string[] | undefined) ?? []).length} عضو ساخته شد` :
      task.action === "OPEN_CHAT" ? `گفتگوی ${task.target} باز شد` :
      "Context صفحه خوانده شد";

    await report(worker, task.id, {
      status: "verifying",
      steps: stepsWith({
        observe: { state: "done" },
        understand: { state: "done" },
        decide: { state: "done" },
        act: { state: "done", detail: actDetail },
        verify: { state: "active" },
      }),
    });
    await sleep(1200);

    /* Verify */
    const verifyDetail =
      task.action === "SEND_TEXT" ? "پیام در تاریخچه چت دیده شد" :
      task.action === "CREATE_GROUP" ? "گروه در لیست چت‌ها ثبت شد" :
      task.action.startsWith("SEND_") ? "آیتم ارسالی در چت دیده شد" :
      "اطلاعات استخراج شد";
    const result =
      task.action === "READ_CHAT_CONTEXT" || task.action === "GET_CHAT_TYPE"
        ? `Platform: ${task.platform} | Chat Type: ${chatTypeFor() === "group" ? "گروه" : "گفتگوی خصوصی"} | Chat: ${task.target || "علی رضایی"}`
        : `${actDetail} — ${verifyDetail}`;

    await report(worker, task.id, {
      status: "success",
      steps: stepsWith({
        observe: { state: "done" },
        understand: { state: "done" },
        decide: { state: "done" },
        act: { state: "done", detail: actDetail },
        verify: { state: "done", detail: verifyDetail },
        report: { state: "done" },
      }),
      result,
      chatType: task.action === "READ_CHAT_CONTEXT" || task.action === "GET_CHAT_TYPE" ? chatTypeFor() : undefined,
    });

    if (task.action.startsWith("SEND_")) {
      await logEvent(worker, "message_sent", `پیام TASK-${task.refNo} ارسال و تأیید شد`, `${task.platform} → ${task.target}`);
    }
  } finally {
    worker.executing.delete(task.id);
  }
}

interface SimTask {
  id: string;
  refNo: number;
  action: string;
  platform: string;
  target: string;
  payload: string;
  status: string;
}

function safePayload(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

/* ═══════ حلقه Sync هر Worker شبیه‌ساز ═══════ */
async function syncOnce(worker: SimWorker) {
  worker.tick++;
  const now = Date.now();

  /* سناریو K — قطع اتصال موقت: Heartbeat ارسال نمی‌شود */
  if (worker.offlineUntil && now < worker.offlineUntil) return;
  if (worker.offlineUntil && now >= worker.offlineUntil) {
    worker.offlineUntil = null;
    await logEvent(worker, "connected", "اتصال Worker برقرار شد", "Heartbeat از سر گرفته شد");
  }

  const workingPlatform = worker.executing.size > 0 ? worker.platforms[0] ?? null : null;
  const hasSessionIssue = worker.platforms.length === 0;

  try {
    const res = await fetch("/api/agent/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workerId: worker.workerId,
        token: worker.token,
        tabs: buildTabs(worker, workingPlatform, hasSessionIssue ? "expired" : undefined),
      }),
    });
    if (!res.ok) return;
    const data = await res.json();
    const tasks: SimTask[] = data?.tasks ?? [];

    for (const t of tasks) {
      if (worker.executing.has(t.id)) continue;
      if (t.status === "received" || t.status === "paused") {
        /* وظایف متوقف‌شده بعد از اقدام انسانی → ادامه */
        if (t.status === "paused") {
          const p = safePayload(t.payload);
          if (p.scenario === "human_action") {
            worker.humanActionDone.add(t.id);
          } else {
            continue; // ماندن در صف تا رفع مشکل
          }
        }
        executeTask(worker, t).catch(() => worker.executing.delete(t.id));
      }
    }
  } catch {
    /* شبکه قطع — تیک بعدی */
  }
}

/* ═══════ API عمومی شبیه‌ساز ═══════ */

export function startSimWorker(input: { workerId: string; token: string; platforms?: string[] }) {
  const existing = registry.get(input.workerId);
  if (existing?.timer) return;

  const worker: SimWorker = existing ?? {
    workerId: input.workerId,
    token: input.token,
    platforms: input.platforms ?? [],
    timer: null,
    executing: new Set(),
    offlineUntil: null,
    humanActionDone: new Set(),
    tick: 0,
  };
  if (input.platforms?.length) worker.platforms = input.platforms;
  worker.offlineUntil = null;

  const timer = setInterval(() => syncOnce(worker).catch(() => {}), SYNC_INTERVAL);
  worker.timer = timer;
  registry.set(input.workerId, worker);

  /* اولین sync فوری */
  syncOnce(worker).catch(() => {});
}

export function stopSimWorker(workerId: string) {
  const worker = registry.get(workerId);
  if (worker?.timer) clearInterval(worker.timer);
  registry.delete(workerId);
}

export function setSimOffline(workerId: string, durationMs: number) {
  const worker = registry.get(workerId);
  if (worker) worker.offlineUntil = Date.now() + durationMs;
}

export function isSimRunning(workerId: string): boolean {
  return registry.has(workerId);
}

/* راه‌اندازی مجدد همه شبیه‌سازها بعد از رفرش صفحه — توکن‌ها در sessionStorage */
export function restoreSimWorkers() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem("rasaweb-sim-workers");
    if (!raw) return;
    const list: { workerId: string; token: string; platforms?: string[]; humanActionDone?: string[] }[] = JSON.parse(raw);
    list.forEach((w) => {
      startSimWorker(w);
      const reg = registry.get(w.workerId);
      if (reg && w.humanActionDone?.length) {
        w.humanActionDone.forEach((id) => reg.humanActionDone.add(id));
      }
    });
  } catch {
    /* بی‌اهمیت */
  }
}

function persistSims() {
  if (typeof window === "undefined") return;
  try {
    const list = Array.from(registry.values()).map((w) => ({
      workerId: w.workerId,
      token: w.token,
      platforms: w.platforms,
      humanActionDone: Array.from(w.humanActionDone),
    }));
    window.sessionStorage.setItem("rasaweb-sim-workers", JSON.stringify(list));
  } catch {
    /* بی‌اهمیت */
  }
}

/* بازنویسی persist بعد از هر start/stop */
const _origStart = startSimWorker;
const _origStop = stopSimWorker;
export function startSimWorkerPersisted(input: { workerId: string; token: string; platforms?: string[] }) {
  _origStart(input);
  persistSims();
}
export function stopSimWorkerPersisted(workerId: string) {
  _origStop(workerId);
  persistSims();
}
