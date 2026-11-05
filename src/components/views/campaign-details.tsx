"use client";
import { useApp } from "@/store/app-store";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { StatusBadge, EmptyState } from "@/components/shared/ui-bits";
import { CAMPAIGN_STATUS_META } from "@/lib/types";
import { faNum, faPercent } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { HOURLY_SENDS } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowRight, PauseCircle, Play, Send, CheckCircle2, XCircle, Layers, Clock3,
  Users, AlertTriangle, History, Rocket, CircleStop, BadgeCheck, GitBranch,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend,
} from "recharts";

const TL_STYLE: Record<string, { icon: React.ElementType; cls: string }> = {
  start: { icon: Rocket, cls: "bg-teal-100 text-teal-600" },
  sent: { icon: Send, cls: "bg-emerald-100 text-emerald-600" },
  warning: { icon: AlertTriangle, cls: "bg-amber-100 text-amber-600" },
  resume: { icon: History, cls: "bg-sky-100 text-sky-600" },
  end: { icon: CircleStop, cls: "bg-slate-200 text-slate-600" },
  info: { icon: Clock3, cls: "bg-violet-100 text-violet-600" },
};

export function CampaignDetails() {
  const { params, campaigns, accounts, navigate, setCampaignStatus, startCampaign, resumeAccount, queue, journey, users } = useApp();
  const c = campaigns.find((x) => x.id === params.campaignId);

  if (!c) {
    return (
      <EmptyState
        icon={<AlertTriangle className="w-7 h-7" />}
        title="کمپین پیدا نشد"
        action={<Button variant="outline" onClick={() => navigate("campaigns")}>بازگشت به کمپین‌ها</Button>}
      />
    );
  }

  const progress = c.plannedCount > 0 ? Math.round((c.sentCount / c.plannedCount) * 100) : 0;
  const successRate = c.sentCount > 0 ? Math.round((c.successCount / c.sentCount) * 100) : 0;
  const m = CAMPAIGN_STATUS_META[c.status];
  const relatedAccounts = accounts.filter((a) => c.platforms.includes(a.platform)).slice(0, 6);
  const limitedAcc = relatedAccounts.find((a) => a.status === "limited");

  /* صف در سطح اکانت: چند پیام این کمپین برای هر اکانت در صف است */
  const accountQueue = relatedAccounts.map((a) => ({
    acc: a,
    queued: queue.filter((q) => q.accountId === a.id && q.campaignId === c.id && (q.status === "queued" || q.status === "paused")).length,
  }));

  return (
    <div className="space-y-5">
      <button onClick={() => navigate("campaigns")} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer">
        <ArrowRight className="w-3.5 h-3.5" /> بازگشت به کمپین‌ها
      </button>

      {/* Header */}
      <Card className="shadow-none">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-lg font-bold">{c.name}</h1>
                <Badge className={cn("border", m.bg, m.color)}>{m.label}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  پلتفرم‌ها:
                  <span className="inline-flex -space-x-1.5">
                    {c.platforms.map((p) => <PlatformIcon key={p} platform={p} size={20} className="rounded-md ring-2 ring-background" />)}
                  </span>
                </span>
                <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> {faNum(c.accountsUsed)} اکانت</span>
                <span className="flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" /> {c.startDate} · {c.startAt} تا {c.endAt}</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {faNum(c.audienceCount)} مخاطب</span>
              </div>
            </div>
            <div className="flex gap-2">
              {c.status === "pending_approval" && (
                <Button size="sm" className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => navigate("approval")}>
                  <BadgeCheck className="w-3.5 h-3.5" /> بازبینی و تأیید
                </Button>
              )}
              {(c.status === "approved" || c.status === "scheduled") && (
                <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { startCampaign(c.id); }}>
                  <Play className="w-3.5 h-3.5" /> شروع ارسال کمپین
                </Button>
              )}
              {c.status === "running" && (
                <>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setCampaignStatus(c.id, "paused"); }}>
                    <PauseCircle className="w-3.5 h-3.5" /> توقف موقت
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200" onClick={() => { setCampaignStatus(c.id, "stopped"); }}>
                    <CircleStop className="w-3.5 h-3.5" /> توقف کامل
                  </Button>
                </>
              )}
              {c.status === "paused" && (
                <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setCampaignStatus(c.id, "running")}>
                  <Play className="w-3.5 h-3.5" /> ادامه اجرا
                </Button>
              )}
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold">پیشرفت کمپین</span>
              <span className="text-muted-foreground">{faNum(c.sentCount)} از {faNum(c.plannedCount)} — <b className="text-teal-600">{faPercent(progress)}</b></span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Live problem */}
      {limitedAcc && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-xs leading-6">
            <b>اکانت {limitedAcc.name} محدود شد</b> — ارسال از این اکانت متوقف و پیام‌های باقی‌مانده ({faNum(limitedAcc.remainingMessages ?? 84)}) در صف حفظ شده‌اند.
            <Button size="sm" variant="outline" className="mr-2 h-7 text-[11px] border-amber-300 text-amber-700" onClick={() => resumeAccount(limitedAcc.id)}>
              بررسی و فعال‌سازی
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {[
          { label: "مخاطبان", value: c.audienceCount, cls: "text-foreground" },
          { label: "برنامه‌ریزی‌شده", value: c.plannedCount, cls: "text-sky-600" },
          { label: "ارسال‌شده", value: c.sentCount, cls: "text-teal-600" },
          { label: "موفق", value: c.successCount, cls: "text-emerald-600" },
          { label: "ناموفق", value: c.failedCount, cls: "text-red-600" },
          { label: "در صف", value: c.queuedCount, cls: "text-amber-600" },
          { label: "متوقف‌شده", value: c.stoppedCount, cls: "text-slate-500" },
        ].map((s) => (
          <Card key={s.label} className="shadow-none">
            <CardContent className="p-3.5 text-center">
              <div className={cn("text-lg font-bold tabular-nums", s.cls)}>{faNum(s.value)}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart */}
        <Card className="shadow-none">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-bold">عملکرد ساعتی</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={HOURLY_SENDS} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.92 0.005 190)" />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "oklch(0.55 0.02 215)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.55 0.02 215)" }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => faNum(v)} />
                <ReTooltip contentStyle={{ borderRadius: 12, fontSize: 12, direction: "rtl" }} formatter={(v: number, n: string) => [faNum(v), n === "sent" ? "موفق" : "ناموفق"]} />
                <Legend formatter={(v) => (v === "sent" ? "موفق" : "ناموفق")} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="sent" fill="#0d9488" radius={[5, 5, 0, 0]} maxBarSize={26} />
                <Bar dataKey="failed" fill="#f59e0b" radius={[5, 5, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2"><History className="w-4 h-4 text-teal-600" /> Timeline کمپین</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 max-h-64 overflow-y-auto">
            {c.timeline.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">رخدادی ثبت نشده است.</p>}
            {c.timeline.map((e, i) => {
              const s = TL_STYLE[e.type] ?? TL_STYLE.info;
              const Icon = s.icon;
              return (
                <div key={i} className="flex gap-3 pb-5 last:pb-0 relative">
                  {i < c.timeline.length - 1 && <span className="absolute right-[13px] top-8 bottom-0 w-px bg-border" />}
                  <span className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10", s.cls)}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold leading-5">{e.label}</div>
                    <div className="text-[10px] text-muted-foreground/70 tabular-nums mt-0.5">ساعت {e.time}</div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Accounts used — با صف در سطح اکانت */}
      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center justify-between">
            <span>اکانت‌های درگیر کمپین — صف در سطح اکانت</span>
            <span className="text-[10px] font-normal text-muted-foreground">ارسال امروز / سقف روزانه + پیام‌های این کمپین در صف</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {accountQueue.map(({ acc, queued }) => (
            <button key={acc.id} onClick={() => navigate("account-details", { accountId: acc.id })}
              className="rounded-xl border p-3 text-right hover:border-teal-300 transition-colors cursor-pointer space-y-2">
              <div className="flex items-center gap-3">
                <PlatformIcon platform={acc.platform} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">{acc.name}</div>
                  <div className="text-[10px] text-muted-foreground">سلامت {faNum(acc.health)}٪</div>
                </div>
                <StatusBadge status={acc.status} size="sm" />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full rounded-full", acc.sentToday >= acc.dailyLimit ? "bg-red-400" : "bg-teal-500")} style={{ width: `${Math.min(100, (acc.sentToday / Math.max(1, acc.dailyLimit)) * 100)}%` }} />
                </div>
                <span className="text-[10px] tabular-nums text-muted-foreground whitespace-nowrap">
                  {faNum(acc.sentToday)} / {faNum(acc.dailyLimit)} · صف کمپین: {faNum(queued)}
                </span>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Journey + Review note */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {c.hasJourney && (
          <Card className="shadow-none border-rose-200 dark:border-rose-900">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-rose-500" />
                  Follow-up خودکار فعال است
                </div>
                <p className="text-[10px] text-muted-foreground leading-5 mt-1">
                  پاسخ ← Inbox + اپراتور · بدون پاسخ ← مرحله ۲ و ۳ خودکار
                </p>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-[11px] shrink-0" onClick={() => navigate("journey")}>
                مشاهده Canvas
              </Button>
            </CardContent>
          </Card>
        )}
        {(c.status === "approved" || c.status === "rejected" || c.status === "changes_requested") && (
          <Card className="shadow-none">
            <CardContent className="p-4">
              <div className="text-xs font-bold flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4 text-teal-600" />
                نتیجه بازبینی کمپین
              </div>
              <p className="text-[11px] text-muted-foreground leading-5 mt-1.5">
                {c.reviewNote ?? `کمپین ${CAMPAIGN_STATUS_META[c.status].label} — تصمیم توسط ${users.find((u) => u.canApprove)?.name ?? "مدیر"} ثبت شد.`}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="rounded-xl bg-secondary/60 p-4 text-[11px] text-muted-foreground leading-6">
        نرخ موفقیت ارسال این کمپین: <b className="text-emerald-600">{faPercent(successRate)}</b> — پیام‌های ناموفق طبق سیاست پلتفرم مجدداً در صف قرار می‌گیرند یا کنار گذاشته می‌شوند.
      </div>
    </div>
  );
}
