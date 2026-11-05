"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/store/app-store";
import { AnimatedCounter, StatusBadge, Skeleton } from "@/components/shared/ui-bits";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { CAMPAIGN_STATUS_META, PLATFORM_LABEL } from "@/lib/types";
import { faNum, faPercent } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { HOURLY_SENDS } from "@/lib/mock-data";
import {
  AlertTriangle, ArrowUpRight, ArrowLeft, Activity, CheckCircle2, Megaphone,
  Smartphone, Users, Send, Layers, RefreshCcw, XCircle, PlayCircle, Plus, Upload, Inbox, BadgeCheck, DatabaseZap, Sparkles,
  Bot, Chrome, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
} from "recharts";

const EVENT_ICON: Record<string, { icon: React.ElementType; cls: string }> = {
  account_stopped: { icon: XCircle, cls: "bg-red-100 text-red-600" },
  campaign_started: { icon: PlayCircle, cls: "bg-emerald-100 text-emerald-600" },
  messages_sent: { icon: CheckCircle2, cls: "bg-teal-100 text-teal-600" },
  messages_failed: { icon: AlertTriangle, cls: "bg-amber-100 text-amber-600" },
  account_resumed: { icon: RefreshCcw, cls: "bg-sky-100 text-sky-600" },
  import: { icon: Upload, cls: "bg-violet-100 text-violet-600" },
  warning: { icon: AlertTriangle, cls: "bg-amber-100 text-amber-600" },
};

export function DashboardView() {
  const { accounts, contacts, campaigns, queue, activity, navigate, notifications, conversations, projects, activeProjectId, suppression, onboarded, loadSampleData, currentUser, agents } = useApp();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  const project = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const unreadInbox = conversations.reduce((acc, c) => acc + c.unread, 0);
  const unassigned = conversations.filter((c) => !c.assignedTo).length;
  const pendingApprovals = campaigns.filter((c) => c.status === "pending_approval").length;

  const total = accounts.length;
  const active = accounts.filter((a) => a.status === "active").length;
  const limited = accounts.filter((a) => a.status === "limited").length;
  const blocked = accounts.filter((a) => a.status === "blocked").length;
  const connErr = accounts.filter((a) => a.status === "connection_error").length;
  const inactive = accounts.filter((a) => a.status === "inactive").length;
  const queued = queue.filter((q) => q.status === "queued" || q.status === "paused").length;
  const sentToday = 8420;
  const capacity = 12000;
  const runningCampaigns = campaigns.filter((c) => c.status === "running");
  const liveAlert = notifications.find((n) => n.type === "error" && n.title.includes("بله 012"));

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      {/* Onboarding — فضای کاری تازه و خالی */}
      {!onboarded && accounts.length === 0 && contacts.length === 0 && (
        <div className="rounded-2xl border border-teal-200 bg-gradient-to-l from-teal-50 via-background to-background p-6 dark:border-teal-900 dark:from-teal-950/40">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300">فضای کاری جدید ساخته شد</span>
              </div>
              <h2 className="text-lg font-bold">{currentUser.name} عزیز، خوش آمدید 👋</h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-6 max-w-2xl">
                برای شروع واقعی: یک <b>اکانت پیام‌رسان</b> متصل کنید، <b>مخاطبان</b> را وارد کنید و اولین <b>کمپین</b> را بسازید.
                همه‌چیز از صفر با خودتان ساخته می‌شود و داده‌هایتان ماندگار ذخیره خواهد شد.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <Button onClick={() => navigate("add-account")} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 h-9">
                  <Plus className="w-4 h-4" /> اتصال اولین اکانت
                </Button>
                <Button onClick={() => navigate("import-contacts")} variant="outline" className="gap-1.5 h-9">
                  <Upload className="w-4 h-4" /> ورود مخاطبان
                </Button>
                <Button
                  onClick={loadSampleData}
                  variant="ghost"
                  className="gap-1.5 h-9 text-muted-foreground"
                  title="برای تست سریع، داده نمونه واقع‌گرایانه بارگذاری می‌شود"
                >
                  <DatabaseZap className="w-4 h-4" /> بارگذاری داده نمونه برای تست
                </Button>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 text-[11px] text-muted-foreground border rounded-xl px-3 py-2 bg-background">
              <Inbox className="w-4 h-4 text-teal-600" />
              مسیر پیشنهادی: اکانت ← مخاطب ← کمپین ← صف ارسال ← گزارش
            </div>
          </div>
        </div>
      )}

      {/* Project context bar */}
      <div className="rounded-xl border bg-card px-4 py-3 flex flex-wrap items-center gap-3">
        <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0", project.color)}>
          {project.name.slice(0, 2)}
        </span>
        <div className="min-w-0">
          <div className="text-xs font-bold">پروژه فعال: {project.name}</div>
          <div className="text-[10px] text-muted-foreground">
            {faNum(project.accounts)} اکانت · {faNum(project.contacts)} مخاطب · {faNum(project.activeCampaigns)} کمپین فعال · {faNum(project.messagesToday)} پیام امروز
            {project.issues > 0 && <span className="text-amber-600"> · {faNum(project.issues)} مشکل</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mr-auto">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-[11px]" onClick={() => navigate("inbox")}>
            <Inbox className="w-3.5 h-3.5" />
            صندوق ورودی
            {unreadInbox > 0 && <span className="rounded-full bg-teal-600 text-white text-[9px] px-1.5 min-w-4 h-4 flex items-center justify-center">{faNum(unreadInbox)}</span>}
          </Button>
          {pendingApprovals > 0 && (
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-[11px] border-amber-200 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30" onClick={() => navigate("approval")}>
              <BadgeCheck className="w-3.5 h-3.5" />
              {faNum(pendingApprovals)} کمپین منتظر تأیید
            </Button>
          )}
        </div>
      </div>
      {/* Live alert */}
      {liveAlert && (
        <div className="rounded-xl border border-red-200 bg-gradient-to-l from-red-50 to-background dark:from-red-950/40 px-5 py-4 flex flex-wrap items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-red-700 dark:text-red-400">{liveAlert.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {liveAlert.body} — پیام‌های باقی‌مانده: <b>{faNum(84)}</b>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate("account-details", { accountId: "bale-۰۱۲" })}>
              بررسی اکانت
            </Button>
            <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => navigate("queue")}>
              مشاهده صف
            </Button>
          </div>
        </div>
      )}

      {/* Page head */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">داشبورد</h1>
          <p className="text-sm text-muted-foreground mt-1">
            خلاصه وضعیت کلی سیستم — همه اکانت‌ها، مخاطبان و کمپین‌ها در یک نگاه
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("import-contacts")} className="gap-1.5">
            <Upload className="w-4 h-4" /> ورود گروهی مخاطبان
          </Button>
          <Button size="sm" onClick={() => navigate("add-account")} className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="w-4 h-4" /> افزودن اکانت
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<Smartphone className="w-5 h-5" />}
          iconCls="bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400"
          label="اکانت‌های متصل"
          value={total}
          onClick={() => navigate("accounts")}
          footer={
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {faNum(active)} فعال
              </span>
              <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {faNum(limited + blocked + connErr)} نیازمند بررسی
              </span>
            </div>
          }
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          iconCls="bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400"
          label="مخاطبان"
          value={contacts.length}
          onClick={() => navigate("contacts")}
          footer={
            <button onClick={() => navigate("import-contacts")} className="text-xs text-teal-600 font-medium inline-flex items-center gap-1 hover:underline cursor-pointer">
              ورود گروهی مخاطبان <ArrowUpRight className="w-3 h-3" />
            </button>
          }
        />
        <StatCard
          icon={<Send className="w-5 h-5" />}
          iconCls="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
          label="پیام‌های امروز"
          value={sentToday}
          suffix={`/ ${faNum(capacity)}`}
          onClick={() => navigate("reports")}
          footer={
            <div className="space-y-1.5">
              <Progress value={(sentToday / capacity) * 100} className="h-1.5" />
              <div className="text-[11px] text-muted-foreground">{faPercent(Math.round((sentToday / capacity) * 100))} از ظرفیت روزانه</div>
            </div>
          }
        />
        <StatCard
          icon={<Layers className="w-5 h-5" />}
          iconCls="bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
          label="پیام‌های در صف"
          value={queued}
          onClick={() => navigate("queue")}
          footer={
            <div className="text-xs text-muted-foreground">
              در حال پردازش در بازه <b className="text-foreground">۰۸:۰۰ تا ۱۸:۰۰</b>
            </div>
          }
        />
      </div>

      {/* Browser Agents card — عامل‌های مرورگر (§۴۶) */}
      <BrowserAgentsCard />

      {/* Account status + hourly chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500 pulse-dot" />
              وضعیت اکانت‌ها
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "فعال", count: active, color: "bg-emerald-500", dot: "🟢" },
              { label: "محدود", count: limited, color: "bg-amber-500", dot: "🟡" },
              { label: "مسدود", count: blocked, color: "bg-red-500", dot: "🔴" },
              { label: "خطای اتصال", count: connErr, color: "bg-orange-500", dot: "⚠️" },
              { label: "غیرفعال", count: inactive, color: "bg-slate-300", dot: "⚪" },
            ].map((row) => (
              <div key={row.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-foreground/80">
                    <span className={cn("w-2 h-2 rounded-full", row.color)} />
                    {row.label}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {faNum(row.count)} <span className="text-[10px]">({faPercent(Math.round((row.count / total) * 1000) / 10)})</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-700", row.color)} style={{ width: `${(row.count / total) * 100}%` }} />
                </div>
              </div>
            ))}
            <button onClick={() => navigate("accounts")} className="w-full mt-2 text-xs font-medium text-teal-600 hover:underline cursor-pointer text-center pt-1">
              مدیریت اکانت‌ها
            </button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">روند ارسال امروز</span>
              <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">بازه ۰۸:۰۰ تا ۱۸:۰۰</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-56 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={HOURLY_SENDS} margin={{ top: 5, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.005 200)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "oklch(0.55 0.02 215)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.55 0.02 215)" }} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => faNum(v)} />
                <ReTooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.005 190)", fontSize: 12, direction: "rtl" }}
                  formatter={(v: number, name: string) => [faNum(v), name === "sent" ? "ارسال موفق" : "ناموفق"]}
                />
                <Area type="monotone" dataKey="sent" stroke="#0d9488" strokeWidth={2.2} fill="url(#gSent)" />
                <Area type="monotone" dataKey="failed" stroke="#f59e0b" strokeWidth={1.6} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Active campaigns + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-teal-600" />
                کمپین‌های فعال
              </span>
              <button onClick={() => navigate("campaigns")} className="text-xs font-normal text-teal-600 hover:underline cursor-pointer inline-flex items-center gap-1">
                همه کمپین‌ها <ArrowLeft className="w-3 h-3" />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {runningCampaigns.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">در حال حاضر کمپین فعالی وجود ندارد.</p>
            )}
            {runningCampaigns.map((c) => {
              const progress = Math.round((c.sentCount / c.plannedCount) * 100);
              return (
                <button
                  key={c.id}
                  onClick={() => navigate("campaign-details", { campaignId: c.id })}
                  className="w-full text-right rounded-xl border p-4 hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <div className="flex flex-wrap items-center gap-2.5 mb-3">
                    <span className="text-sm font-bold group-hover:text-teal-700 transition-colors">{c.name}</span>
                    <Badge className={cn("text-[10px] font-medium border", CAMPAIGN_STATUS_META[c.status].bg, CAMPAIGN_STATUS_META[c.status].color)}>
                      {CAMPAIGN_STATUS_META[c.status].label}
                    </Badge>
                    <span className="mr-auto text-[11px] text-muted-foreground">
                      {faPercent(progress)} پیشرفت
                    </span>
                  </div>
                  <Progress value={progress} className="h-2 mb-3" />
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-muted-foreground">
                    <span>مخاطب: <b className="text-foreground">{faNum(c.audienceCount)}</b></span>
                    <span>ارسال‌شده: <b className="text-emerald-600">{faNum(c.sentCount)}</b></span>
                    <span>باقی‌مانده: <b className="text-foreground">{faNum(c.plannedCount - c.sentCount)}</b></span>
                    <span className="flex items-center gap-1">
                      پلتفرم‌ها:
                      <span className="inline-flex -space-x-1.5">
                        {c.platforms.map((p) => (
                          <PlatformIcon key={p} platform={p} size={18} className="ring-2 ring-background rounded-md" />
                        ))}
                      </span>
                    </span>
                    <span>⏱ {c.startAt} تا {c.endAt}</span>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              آخرین رخدادها
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[420px] overflow-y-auto">
            {activity.slice(0, 8).map((e) => {
              const meta = EVENT_ICON[e.type] ?? EVENT_ICON.warning;
              const Icon = meta.icon;
              return (
                <div key={e.id} className="flex gap-3 py-2.5 border-b last:border-0">
                  <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", meta.cls)}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold leading-5">{e.title}</div>
                    <div className="text-[11px] text-muted-foreground leading-5 line-clamp-2">{e.detail}</div>
                  </div>
                  <span className="text-[10px] text-muted-foreground/70 shrink-0 tabular-nums">{e.at}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon, iconCls, label, value, suffix, footer, onClick,
}: {
  icon: React.ReactNode; iconCls: string; label: string; value: number;
  suffix?: string; footer?: React.ReactNode; onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={cn("group transition-all", onClick && "cursor-pointer hover:border-teal-300 hover:shadow-md")}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconCls)}>{icon}</span>
          {onClick && <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-teal-500 transition-colors" />}
        </div>
        <div className="text-2xl font-bold tabular-nums">
          <AnimatedCounter value={value} />
          {suffix && <span className="text-sm font-medium text-muted-foreground mr-1.5">{suffix}</span>}
        </div>
        <div className="text-xs text-muted-foreground mt-1 mb-2.5">{label}</div>
        {footer}
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}><CardContent className="p-5 space-y-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-32" />
          </CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Skeleton className="lg:col-span-2 h-80 rounded-xl" />
        <Skeleton className="lg:col-span-3 h-80 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

export { StatCard };

/* ═══════ کارت Browser Agents (§۴۶) ═══════ */
function BrowserAgentsCard() {
  const { agents, navigate } = useApp();
  const workers = agents.workers;
  const online = workers.filter((w) => w.status === "online").length;
  const offline = workers.filter((w) => w.status === "offline").length;
  const needsAction = workers.filter((w) => w.status === "needs_action").length;
  const activeTasks = agents.tasks.filter((t) => ["queued", "received", "running", "verifying"].includes(t.status)).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-teal-600" />
            عامل‌های مرورگر
          </span>
          <Button size="sm" variant="ghost" className="h-7 text-[11px] text-teal-600" onClick={() => navigate("workers")}>
            مدیریت Workerها
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {workers.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed p-4">
            <div className="text-xs text-muted-foreground leading-5">
              هنوز عامل مرورگری متصل نیست — افزونه کروم را نصب کنید یا برای تست فوری یک Worker شبیه‌ساز بسازید تا ارسال‌ها در محیط واقعی پیام‌رسان‌ها اجرا شوند.
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("extension")} className="gap-1.5 shrink-0">
              <Chrome className="w-3.5 h-3.5" /> افزونه کروم
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-secondary/50 p-3">
              <div className="text-lg font-bold">{faNum(workers.length)}</div>
              <div className="text-[10px] text-muted-foreground">Workerها</div>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
              <div className="text-lg font-bold text-emerald-600">{faNum(online)}</div>
              <div className="text-[10px] text-emerald-700/70">آنلاین</div>
            </div>
            <div className={cn("rounded-xl p-3 border", offline > 0 ? "bg-red-50 border-red-100" : "bg-secondary/50 border-transparent")}>
              <div className={cn("text-lg font-bold", offline > 0 ? "text-red-600" : "text-muted-foreground")}>{faNum(offline)}</div>
              <div className={cn("text-[10px]", offline > 0 ? "text-red-700/70" : "text-muted-foreground")}>خارج از اتصال</div>
            </div>
            <div className={cn("rounded-xl p-3 border", needsAction + activeTasks > 0 ? "bg-amber-50 border-amber-100" : "bg-secondary/50 border-transparent")}>
              <div className={cn("text-lg font-bold", needsAction + activeTasks > 0 ? "text-amber-600" : "text-muted-foreground")}>{faNum(needsAction + activeTasks)}</div>
              <div className={cn("text-[10px]", needsAction + activeTasks > 0 ? "text-amber-700/70" : "text-muted-foreground")}>نیاز به اقدام / وظیفه فعال</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
