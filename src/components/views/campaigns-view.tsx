"use client";
import { useApp } from "@/store/app-store";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { EmptyState, PageHeader } from "@/components/shared/ui-bits";
import { CAMPAIGN_STATUS_META, Campaign, CampaignStatus } from "@/lib/types";
import { faNum, faPercent } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Megaphone, CalendarClock, Users, Send, CheckCircle2, XCircle, Layers, PauseCircle, Play, Square, BadgeCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_TABS: { key: "all" | CampaignStatus; label: string }[] = [
  { key: "all", label: "همه" },
  { key: "pending_approval", label: "نیازمند تأیید" },
  { key: "running", label: "در حال اجرا" },
  { key: "scheduled", label: "زمان‌بندی‌شده" },
  { key: "paused", label: "متوقف موقت" },
  { key: "completed", label: "تکمیل‌شده" },
  { key: "draft", label: "پیش‌نویس" },
];

export function CampaignsView() {
  const { campaigns, navigate, setCampaignStatus, startCampaign } = useApp();
  const [tab, setTab] = useState<"all" | CampaignStatus>("all");

  const filtered = tab === "all" ? campaigns : campaigns.filter((c) => c.status === tab);

  return (
    <div className="space-y-5">
      <PageHeader
        title="کمپین‌ها"
        subtitle="طراحی، تأیید، اجرا و پیگیری کمپین‌های پیام‌رسانی چندپلتفرمی"
        actions={
          <Button onClick={() => navigate("create-campaign")} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
            <Plus className="w-4 h-4" /> ساخت کمپین جدید
          </Button>
        }
      />

      {/* Approval flow banner */}
      {campaigns.some((c) => c.status === "pending_approval") && (
        <button
          onClick={() => navigate("approval")}
          className="w-full rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-4 py-3 flex items-center justify-between gap-3 hover:shadow-sm transition-shadow text-right cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center shrink-0">
              <BadgeCheck className="w-4 h-4 text-amber-600" />
            </span>
            <div className="text-[11px] leading-5">
              <b className="text-xs">{faNum(campaigns.filter((c) => c.status === "pending_approval").length)} کمپین منتظر تأیید شماست</b>
              <span className="block text-amber-800/80 dark:text-amber-200/80">بازبینی متن، مخاطبان، Limit و بازه ارسال پیش از ورود به صف</span>
            </div>
          </div>
          <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium shrink-0">بازبینی ←</span>
        </button>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_TABS.map((t) => {
          const count = t.key === "all" ? campaigns.length : campaigns.filter((c) => c.status === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                tab === t.key ? "bg-teal-600 text-white border-teal-600" : "bg-card hover:border-teal-300"
              )}
            >
              {t.label} · {faNum(count)}
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="shadow-none">
          <EmptyState
            icon={<Megaphone className="w-7 h-7" />}
            title="کمپینی در این وضعیت وجود ندارد"
            description="اولین کمپین خود را بسازید: مخاطب را انتخاب کنید، پیام را با AI بنویسید و زمان ارسال را تعیین کنید."
            action={
              <Button onClick={() => navigate("create-campaign")} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
                <Plus className="w-4 h-4" /> ساخت کمپین جدید
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <CampaignCard key={c.id} c={c} onOpen={() => navigate("campaign-details", { campaignId: c.id })} onApprove={() => navigate("approval")} onPauseResume={() => {
              if (c.status === "running") {
                setCampaignStatus(c.id, "paused");
                toast.info(`کمپین «${c.name}» موقتاً متوقف شد`);
              } else if (c.status === "paused") {
                setCampaignStatus(c.id, "running");
                toast.success(`کمپین «${c.name}» از سر گرفته شد`);
              } else if (c.status === "approved" || c.status === "scheduled") {
                /* toast در startCampaign (store) — فقط در صورت موفقیت واقعی */
                startCampaign(c.id);
              } else if (c.status === "stopped") {
                setCampaignStatus(c.id, "running");
                toast.success(`کمپین «${c.name}» دوباره فعال شد`);
              }
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignCard({ c, onOpen, onApprove, onPauseResume }: { c: Campaign; onOpen: () => void; onApprove: () => void; onPauseResume: () => void }) {
  const progress = c.plannedCount > 0 ? Math.round((c.sentCount / c.plannedCount) * 100) : 0;
  const m = CAMPAIGN_STATUS_META[c.status];
  return (
    <Card className="shadow-none group transition-all hover:border-teal-300 hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <button onClick={onOpen} className="text-right min-w-0 cursor-pointer">
            <div className="text-sm font-bold group-hover:text-teal-700 transition-colors truncate">{c.name}</div>
            <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1"><CalendarClock className="w-3 h-3" /> {c.startDate} · {c.startAt} تا {c.endAt}</span>
            </div>
          </button>
          <Badge className={cn("text-[10px] font-medium border shrink-0", m.bg, m.color)}>{m.label}</Badge>
        </div>

        <Progress value={progress} className="h-2 mb-3" />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-[11px] mb-4">
          <Cell icon={<Users className="w-3.5 h-3.5" />} label="مخاطب" value={faNum(c.audienceCount)} />
          <Cell icon={<Send className="w-3.5 h-3.5" />} label="ارسال‌شده" value={faNum(c.sentCount)} tone="text-sky-600" />
          <Cell icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="موفق" value={faNum(c.successCount)} tone="text-emerald-600" />
          <Cell icon={<XCircle className="w-3.5 h-3.5" />} label="ناموفق" value={faNum(c.failedCount)} tone="text-red-600" />
        </div>

        {/* Tags: سگمنت / شخصی‌سازی / Follow-up */}
        {(c.segmentName || c.personalization || c.hasJourney) && (
          <div className="flex flex-wrap gap-1 mb-3">
            {c.segmentName && <span className="rounded-full bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900 px-2 py-0.5 text-[9px] text-sky-700 dark:text-sky-300">سگمنت: {c.segmentName}</span>}
            {c.personalization && <span className="rounded-full bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900 px-2 py-0.5 text-[9px] text-violet-700 dark:text-violet-300">شخصی‌سازی متغیر</span>}
            {c.hasJourney && <span className="rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 px-2 py-0.5 text-[9px] text-rose-700 dark:text-rose-300">Follow-up فعال</span>}
            {!!c.suppressedCount && <span className="rounded-full bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 px-2 py-0.5 text-[9px] text-red-600">{faNum(c.suppressedCount)} حذف عدم‌ارسال</span>}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex -space-x-1.5">
              {c.platforms.map((p) => (
                <PlatformIcon key={p} platform={p} size={20} className="rounded-md ring-2 ring-background" />
              ))}
            </span>
            <span className="inline-flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> {faNum(c.accountsUsed)} اکانت</span>
            <span className="font-medium text-teal-700">{faPercent(progress)}</span>
          </div>
          <div className="flex gap-1.5">
            {c.status === "pending_approval" && (
              <Button size="sm" className="h-7 text-[11px] gap-1 bg-amber-500 hover:bg-amber-600 text-white" onClick={onApprove}>
                <BadgeCheck className="w-3 h-3" /> بازبینی و تأیید
              </Button>
            )}
            {(c.status === "running" || c.status === "paused") && (
              <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={onPauseResume}>
                {c.status === "running" ? <><PauseCircle className="w-3 h-3" /> توقف موقت</> : <><Play className="w-3 h-3" /> ادامه</>}
              </Button>
            )}
            {(c.status === "approved" || c.status === "scheduled") && (
              <Button size="sm" className="h-7 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onPauseResume}>
                <Play className="w-3 h-3" /> شروع ارسال
              </Button>
            )}
            {c.status === "running" && (
              <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => toast.info("برای توقف کامل کمپین، تأیید مدیر لازم است")}>
                <Square className="w-3 h-3" /> توقف کامل
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-[11px] text-teal-600" onClick={onOpen}>
              گزارش کامل
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Cell({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground/70">{icon}</span>
      <div className="min-w-0">
        <div className="text-[9px] text-muted-foreground/70">{label}</div>
        <div className={cn("font-bold tabular-nums", tone ?? "text-foreground")}>{value}</div>
      </div>
    </div>
  );
}
