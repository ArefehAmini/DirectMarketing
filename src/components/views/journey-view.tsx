"use client";
import { useState } from "react";
import { useApp } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/fa";
import { TRIGGER_EVENT_META, TRIGGER_ACTION_META } from "@/lib/types";
import { PageHeader } from "@/components/shared/ui-bits";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  GitBranch, MessageSquare, HelpCircle, Zap, ArrowDown, MoveLeft, UserCheck,
  Bell, Tag, PauseCircle, Inbox as InboxIcon, Square, CheckCircle2, AlertTriangle, ArrowUp,
} from "lucide-react";

const NODE_ICON = {
  message: MessageSquare,
  condition: HelpCircle,
  action: Zap,
};

const EDGE_COLOR = {
  positive: "stroke-emerald-500",
  negative: "stroke-rose-400",
  neutral: "stroke-slate-300 dark:stroke-slate-600",
};

const TRIGGER_ACTION_ICON = {
  stop_followup: Square,
  assign_operator: UserCheck,
  add_tag: Tag,
  send_notification: Bell,
  move_to_inbox: InboxIcon,
  pause_campaign: PauseCircle,
};

export function JourneyView() {
  const { journey, toggleJourney, toggleTrigger, navigate, params } = useApp();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const selected = journey.nodes.find((n) => n.id === selectedNode);
  const campaignName = journey.campaignName;

  return (
    <div className="space-y-4">
      <PageHeader
        title="سفر کمپین — Follow-up بصری"
        subtitle={`Workflow کمپین «${campaignName}» — مسیر هر مخاطب از پیام اول تا مرحله پایانی`}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className={cn("text-muted-foreground")}>Follow-up خودکار</span>
              <Switch checked={journey.enabled} onCheckedChange={toggleJourney} />
            </div>
            <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => navigate("campaign-details", { campaignId: "cmp-1" })}>
              مشاهده کمپین
            </Button>
          </div>
        }
      />

      {!journey.enabled && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-4 py-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[11px] leading-5 text-amber-800 dark:text-amber-200">
            Follow-up خودکار خاموش است — فقط پیام مرحله ۱ ارسال می‌شود و مراحل بعدی اجرا نخواهند شد.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-4">
        {/* ── Visual Canvas ── */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <GitBranch className="w-4 h-4 text-teal-600" />
              مسیر کمپین
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> اگر پاسخ داد</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400" /> اگر پاسخ نداد</span>
            </div>
          </div>

          <div className="relative bg-[radial-gradient(circle_at_1px_1px,hsl(var(--border))_1px,transparent_0)] [background-size:22px_22px] overflow-auto">
            <div className="relative min-w-[720px] h-[760px]">
              {/* Edges (SVG) — مختصات درصدی هم‌راستا با نودها؛ برچسب‌ها به‌صورت HTML جدا رندر می‌شوند */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 760" preserveAspectRatio="none">
                {journey.edges.map((e) => {
                  const from = journey.nodes.find((n) => n.id === e.from);
                  const to = journey.nodes.find((n) => n.id === e.to);
                  if (!from || !to) return null;
                  const hPx = from.body ? 108 : 66;
                  const x1 = from.x;
                  const y1 = (from.y * 760) / 100 + hPx;
                  const x2 = to.x;
                  const y2 = (to.y * 760) / 100 - 6;
                  const midY = (y1 + y2) / 2;
                  return (
                    <path
                      key={`${e.from}-${e.to}`}
                      d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                      fill="none"
                      vectorEffect="non-scaling-stroke"
                      strokeWidth={2}
                      strokeDasharray={e.tone === "neutral" ? undefined : "7 5"}
                      className={EDGE_COLOR[e.tone]}
                    />
                  );
                })}
              </svg>

              {/* Edge labels (HTML — بدون کشیدگی) */}
              {journey.edges.map((e) => {
                const from = journey.nodes.find((n) => n.id === e.from);
                const to = journey.nodes.find((n) => n.id === e.to);
                if (!from || !to || !e.label) return null;
                const hPx = from.body ? 108 : 66;
                const midPx = ((from.y * 760) / 100 + hPx + (to.y * 760) / 100 - 6) / 2;
                const midY = (midPx / 760) * 100;
                const midX = (from.x + to.x) / 2;
                return (
                  <span
                    key={`lbl-${e.from}-${e.to}`}
                    style={{ left: `${midX}%`, top: `${midY}%` }}
                    className={cn(
                      "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border bg-card px-2 py-0.5 text-[9px] font-semibold whitespace-nowrap shadow-sm",
                      e.tone === "positive" ? "text-emerald-600 border-emerald-200 dark:border-emerald-900" : e.tone === "negative" ? "text-rose-500 border-rose-200 dark:border-rose-900" : "text-slate-400 border-border"
                    )}
                  >
                    {e.label}
                  </span>
                );
              })}

              {/* Nodes */}
              {journey.nodes.map((n) => {
                const Icon = NODE_ICON[n.type];
                const isSelected = selectedNode === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => setSelectedNode(isSelected ? null : n.id)}
                    style={{ left: `${n.x}%`, top: `${n.y}%`, transform: "translateX(-50%)" }}
                    className={cn(
                      "absolute w-60 rounded-2xl border bg-card p-3 text-right shadow-sm transition-all cursor-pointer hover:shadow-md",
                      isSelected ? "border-teal-500 ring-2 ring-teal-500/30" : "border-border",
                      n.type === "condition" && "border-dashed"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                          n.type === "message" && "bg-teal-600 text-white",
                          n.type === "condition" && "bg-amber-100 dark:bg-amber-950 text-amber-600",
                          n.type === "action" && "bg-sky-100 dark:bg-sky-950 text-sky-600"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold truncate">{n.title}</div>
                        {n.subtitle && <div className="text-[9px] text-muted-foreground truncate">{n.subtitle}</div>}
                      </div>
                    </div>
                    {n.body && (
                      <p className="mt-2 text-[10px] leading-4 text-muted-foreground line-clamp-2 border-t pt-2">{n.body}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selected && (
            <div className="border-t px-4 py-3 bg-muted/30 text-[11px] leading-5">
              <b>{selected.title}:</b> {selected.body ?? selected.subtitle ?? "این گره بخشی از مسیر Follow-up کمپین است."}
            </div>
          )}
        </div>

        {/* ── Triggers panel ── */}
        <div className="space-y-3">
          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Zap className="w-4 h-4 text-amber-500" />
              Triggerها
            </div>
            <p className="text-[10px] text-muted-foreground leading-5">
              هر Trigger رویدادی است که به‌صورت خودکار Action را اجرا می‌کند — بدون نیاز به دخالت دستی.
            </p>
            <div className="space-y-2">
              {journey.triggers.map((t) => (
                <div key={t.id} className={cn("rounded-xl border p-3 space-y-2 transition-opacity", !t.enabled && "opacity-50")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold">{TRIGGER_EVENT_META[t.event].label}</span>
                    <Switch checked={t.enabled} onCheckedChange={() => toggleTrigger(t.id)} />
                  </div>
                  {t.condition && <div className="text-[9px] text-muted-foreground">شرط: {t.condition}</div>}
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[9px] text-muted-foreground self-center">→</span>
                    {t.actions.map((a) => {
                      const AIcon = TRIGGER_ACTION_ICON[a];
                      return (
                        <span key={a} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[9px]">
                          <AIcon className="w-3 h-3" />
                          {TRIGGER_ACTION_META[a].label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Journey legend */}
          <div className="rounded-2xl border bg-card p-4 space-y-2.5 text-[10px] leading-5 text-muted-foreground">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-1">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              منطق مسیر
            </div>
            <p>• اگر مخاطب <b className="text-foreground">پاسخ دهد</b> → Follow-up او فوراً متوقف و گفتگو به صندوق ورودی منتقل و به اپراتور اختصاص می‌یابد.</p>
            <p>• اگر <b className="text-foreground">پاسخ ندهد</b> → پس از ۴۸ ساعت، مرحله بعد (Follow-up) ارسال می‌شود.</p>
            <p>• پس از مرحله نهایی، مخاطب بدون پاسخ به سگمنت «مخاطبان بدون پاسخ» می‌رود و از ارسال‌های تکراری حذف می‌شود.</p>
            <p>• این تصمیم‌ها همگی قابل مشاهده در <button onClick={() => navigate("audit")} className="text-teal-600 hover:underline cursor-pointer">گزارش فعالیت‌ها</button> هستند.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
