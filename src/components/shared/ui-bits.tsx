"use client";
import { useEffect, useRef, useState } from "react";
import { faNum } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { ACCOUNT_STATUS_META, AccountStatus } from "@/lib/types";

/* ── Animated counter (count-up) ── */
export function AnimatedCounter({
  value,
  duration = 900,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);
  return <span className={className}>{faNum(display)}</span>;
}

/* ── Account status badge ── */
export function StatusBadge({ status, size = "md" }: { status: AccountStatus; size?: "sm" | "md" }) {
  const m = ACCOUNT_STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        m.bg,
        m.color,
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      )}
    >
      <span className={cn("rounded-full", m.dot, size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2", status === "active" && "pulse-dot")} />
      {m.label}
    </span>
  );
}

/* ── Health bar ── */
export function HealthBar({ value, className }: { value: number; className?: string }) {
  const color = value >= 85 ? "bg-emerald-500" : value >= 70 ? "bg-amber-500" : "bg-red-500";
  const text = value >= 85 ? "text-emerald-600" : value >= 70 ? "text-amber-600" : "text-red-600";
  return (
    <div className={cn("flex items-center gap-2 min-w-24", className)}>
      <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden min-w-10">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
      <span className={cn("text-xs font-medium tabular-nums", text)}>{faNum(value)}٪</span>
    </div>
  );
}

/* ── Empty state ── */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-16 px-6", className)}>
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1.5 max-w-sm leading-6">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ── Skeleton ── */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-md bg-muted skeleton-shimmer", className)} />;
}

/* ── Page header ── */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ── Toast helper shorthand ── */
export { };
