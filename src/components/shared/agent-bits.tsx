"use client";
import {
  AGENT_TASK_STATUS_META, AgentTaskStatus, WORKER_STATUS_META, WorkerStatus,
  AGENT_ERROR_META, TAB_STATUS_META, SESSION_STATE_META, TabStatus, SessionState,
  ChatType, CHAT_TYPE_META, Platform, PLATFORM_LABEL, AgentAction, AGENT_ACTION_META,
} from "@/lib/types";
import { faNum } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "@/components/shared/platform-icon";
import {
  User, Users, Megaphone, Bot, Briefcase, HelpCircle, Loader2, CheckCircle2, XCircle, MinusCircle,
} from "lucide-react";

/* ── نشان وضعیت Worker ── */
export function WorkerStatusBadge({ status, size = "md" }: { status: WorkerStatus; size?: "sm" | "md" }) {
  const m = WORKER_STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border font-medium", m.bg, m.color, size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs")}>
      <span className={cn("rounded-full", m.dot, size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2", status === "online" && "pulse-dot")} />
      {m.label}
    </span>
  );
}

/* ── نشان وضعیت وظیفه عامل ── */
export function TaskStatusBadge({ status, size = "md" }: { status: AgentTaskStatus; size?: "sm" | "md" }) {
  const m = AGENT_TASK_STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap", m.bg, m.color, size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs")}>
      {(status === "running" || status === "verifying") && <Loader2 className={cn("animate-spin", size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5")} />}
      <span className={cn("rounded-full", m.dot, size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2")} />
      {m.label}
    </span>
  );
}

/* ── نشان وضعیت تب مرورگر ── */
export function TabStatusDot({ status }: { status: TabStatus }) {
  const m = TAB_STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("w-2 h-2 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

/* ── وضعیت نشست ── */
export function SessionBadge({ state }: { state: SessionState }) {
  const m = SESSION_STATE_META[state];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", m.color)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", m.dot)} />
      نشست: {m.label}
    </span>
  );
}

/* ── نوع چت با آیکون ── */
const CHAT_TYPE_ICONS: Record<ChatType, React.ElementType> = {
  private: User, group: Users, channel: Megaphone, bot: Bot, business: Briefcase, unknown: HelpCircle,
};

export function ChatTypeBadge({ type }: { type: ChatType }) {
  const m = CHAT_TYPE_META[type];
  const Icon = CHAT_TYPE_ICONS[type] ?? HelpCircle;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
      <Icon className="w-3.5 h-3.5" />
      {m.label}
    </span>
  );
}

/* ── برچسب Action با آیکون پلتفرم ── */
export function ActionBadge({ action, platform }: { action: AgentAction; platform?: Platform }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {platform && <PlatformIcon platform={platform} className="w-4 h-4" />}
      <span className="text-xs font-medium text-foreground">{AGENT_ACTION_META[action]?.label ?? action}</span>
    </span>
  );
}

/* ── زمان نسبی از ISO ── */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 5) return "همین حالا";
  if (diff < 60) return `${faNum(diff)} ثانیه پیش`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${faNum(m)} دقیقه پیش`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${faNum(h)} ساعت پیش`;
  return `${faNum(Math.floor(h / 24))} روز پیش`;
}

/* ── مدت اجرا ── */
export function durationLabel(startedAt: string | null, finishedAt: string | null): string {
  if (!startedAt) return "—";
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  const sec = Math.max(1, Math.round((end - new Date(startedAt).getTime()) / 1000));
  if (sec < 60) return `${faNum(sec)} ثانیه`;
  return `${faNum(Math.floor(sec / 60))}:${faNum(String(sec % 60).padStart(2, "0"))}`;
}

/* ── آیکون نتیجه مرحله Loop ── */
export function StepIcon({ state }: { state: string }) {
  if (state === "done") return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
  if (state === "failed") return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
  if (state === "active") return <Loader2 className="w-4 h-4 text-teal-500 animate-spin shrink-0" />;
  return <MinusCircle className="w-4 h-4 text-slate-300 shrink-0" />;
}

/* ── پیام خطای دوستانه ── */
export function FriendlyError({ errorKind, error }: { errorKind: string; error: string }) {
  const meta = AGENT_ERROR_META[errorKind as keyof typeof AGENT_ERROR_META];
  if (!meta) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error || "خطای نامشخص"}</div>;
  }
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 space-y-1.5">
      <div className="text-sm font-semibold text-red-800">{meta.friendly}</div>
      <div className="text-xs text-red-600 leading-5">{meta.advice}</div>
    </div>
  );
}

/* ── برچسب پلتفرم فارسی ── */
export function platformFa(p: string): string {
  return PLATFORM_LABEL[p as Platform] ?? p;
}
