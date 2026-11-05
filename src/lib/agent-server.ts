import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";

/* ─── ابزارهای سمت سرور برای Browser Worker / Agent ─── */

export const WORKER_ONLINE_WINDOW_MS = 45_000; // اگر Heartbeat تازه‌تر از این باشد → Online
export const PAIRING_TTL_MS = 15 * 60 * 1000; // کد جفت‌سازی: ۱۵ دقیقه

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function randomToken(): string {
  return randomBytes(24).toString("hex");
}

/* احراز هویت Worker — توکن خام هرگز ذخیره نمی‌شود، فقط hash مقایسه می‌شود */
export async function authenticateWorker(workerId: string | undefined, token: string | undefined) {
  if (!workerId || !token) return null;
  try {
    const worker = await db.browserWorker.findUnique({ where: { id: workerId } });
    if (!worker) return null;
    if (worker.tokenHash !== sha256(token)) return null;
    return worker;
  } catch {
    return null;
  }
}

/* محاسبه وضعیت مؤثر Worker بر اساس Heartbeat و وظایف */
export function effectiveStatus(status: string, lastHeartbeat: Date | null): "pending" | "online" | "offline" | "needs_action" {
  if (status === "pending") return "pending";
  if (status === "needs_action") return "needs_action";
  if (lastHeartbeat && Date.now() - lastHeartbeat.getTime() < WORKER_ONLINE_WINDOW_MS) return "online";
  return "offline";
}

/* ساخت تایم‌لاین پیش‌فرض Agent Loop */
export function freshSteps(): { key: string; label: string; state: string }[] {
  return [
    { key: "observe", label: "مشاهده صفحه", state: "pending" },
    { key: "understand", label: "درک Context", state: "pending" },
    { key: "decide", label: "تصمیم‌گیری", state: "pending" },
    { key: "act", label: "اجرای Action", state: "pending" },
    { key: "verify", label: "بررسی نتیجه", state: "pending" },
    { key: "report", label: "گزارش به پنل", state: "pending" },
  ];
}

/* شماره نمایشی بعدی برای Worker و Task */
export async function nextWorkerNo(userId: string): Promise<number> {
  const last = await db.browserWorker.findFirst({
    where: { userId },
    orderBy: { workerNo: "desc" },
    select: { workerNo: true },
  });
  return (last?.workerNo ?? 0) + 1;
}

export async function nextTaskRefNo(userId: string): Promise<number> {
  const last = await db.agentTask.findFirst({
    where: { userId },
    orderBy: { refNo: "desc" },
    select: { refNo: true },
  });
  return Math.max(9280, (last?.refNo ?? 9280)) + 1;
}

/* ساخت کد جفت‌سازی: RX-28491 */
export function makePairingCode(): string {
  const n = Math.floor(10000 + Math.random() * 89999);
  return `RX-${n}`;
}

/* ثبت رویداد Worker — همه اتفاقات مهم Event Log می‌شوند */
export async function logEvent(
  userId: string,
  workerId: string | null,
  type: string,
  title: string,
  detail = ""
) {
  try {
    await db.workerEvent.create({ data: { userId, workerId, type, title, detail } });
  } catch {
    /* لاگ هرگز جریان اصلی را نمی‌شکند */
  }
}

/* پارس امن JSON payload */
export function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
