"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app-store";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { StatusBadge, EmptyState } from "@/components/shared/ui-bits";
import { faNum, faPercent, maskPhone } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { ACCOUNT_STATUS_META, CAMPAIGN_STATUS_META, QUEUE_STATUS_META } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowRight, Activity, Megaphone, SlidersHorizontal, Plug, RefreshCcw, AlertTriangle,
  CheckCircle2, ShieldCheck, KeyRound, MonitorSmartphone, PauseCircle, Gauge, ListOrdered, Clock3,
} from "lucide-react";

const ACC_EVENTS = [
  { at: "امروز 14:28", title: "۱۴ پیام ارسال شد", detail: "کمپین «پیشنهاد ویژه مهر»", kind: "ok" },
  { at: "امروز 11:35", title: "محدودیت ارسال از سرویس مقصد", detail: "ارسال اکانت متوقف و ۸۴ پیام به صف منتقل شد", kind: "warn" },
  { at: "امروز 13:10", title: "دوباره فعال شد", detail: "پس از تأیید سیگنال سرویس مقصد، ارسال از صف ادامه یافت", kind: "ok" },
  { at: "دیروز 17:52", title: "کمپین «معرفی خدمات طراحی سایت مهر» تکمیل شد", detail: "سهم این اکانت: ۴۱۲ پیام موفق", kind: "ok" },
  { at: "دیروز 09:00", title: "نشست احراز هویت تازه‌سازی شد", detail: "Token refresh موفق", kind: "info" },
];

export function AccountDetails() {
  const { params, accounts, campaigns, navigate, resumeAccount, updateAccountLimit, pauseQueueItems, queue, accountEvents } = useApp();
  const acc = accounts.find((a) => a.id === params.accountId);
  const [limitInput, setLimitInput] = useState<string>("");

  if (!acc) {
    return (
      <EmptyState
        icon={<AlertTriangle className="w-7 h-7" />}
        title="اکانت پیدا نشد"
        description="ممکن است این اکانت حذف شده باشد."
        action={<Button onClick={() => navigate("accounts")} variant="outline">بازگشت به اکانت‌ها</Button>}
      />
    );
  }

  const usage = acc.dailyLimit > 0 ? Math.round((acc.sentToday / acc.dailyLimit) * 100) : 0;
  const isProblem = acc.status === "limited" || acc.status === "blocked" || acc.status === "connection_error" || acc.status === "auth_required";
  const relatedCampaigns = campaigns.filter((c) => c.platforms.includes(acc.platform)).slice(0, 4);
  const limit = limitInput !== "" ? parseInt(limitInput, 10) : acc.dailyLimit;

  /* صف در سطح اکانت */
  const accQueueCount = queue.filter((q) => q.accountId === acc.id && (q.status === "queued" || q.status === "paused")).length;
  const accQueueSample = queue.filter((q) => q.accountId === acc.id && (q.status === "queued" || q.status === "paused" || q.status === "sending")).slice(0, 5);
  /* رخدادهای واقعی اکانت از سیستم Health */
  const events = accountEvents.filter((e) => e.accountId === acc.id || e.accountId === acc.name);

  return (
    <div className="space-y-5">
      <button onClick={() => navigate("accounts")} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer">
        <ArrowRight className="w-3.5 h-3.5" /> بازگشت به اکانت‌ها
      </button>

      {/* Header */}
      <Card className="shadow-none">
        <CardContent className="p-5 flex flex-wrap items-center gap-4">
          <PlatformIcon platform={acc.platform} size={52} className="rounded-2xl" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg font-bold">{acc.name}</h1>
              <StatusBadge status={acc.status} />
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span dir="ltr" className="tabular-nums">{maskPhone(acc.phone)}</span>
              <span>پلتفرم: {acc.platform === "whatsapp" ? "WhatsApp" : acc.platform === "telegram" ? "Telegram" : "ایرانی"}</span>
              <span>متصل شده: {acc.connectedAt}</span>
            </div>
          </div>
          <div className="mr-auto flex gap-2">
            {isProblem && (
              <Button size="sm" onClick={() => resumeAccount(acc.id)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                <RefreshCcw className="w-3.5 h-3.5" /> فعال‌سازی مجدد
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { pauseQueueItems([]); toast.info("ارسال‌های این اکانت موقتاً متوقف شد"); }}>
              <PauseCircle className="w-3.5 h-3.5" /> توقف موقت
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Problem alert */}
      {acc.status === "limited" && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription>
            <b className="text-amber-800 dark:text-amber-400">اکانت {acc.name} متوقف شد</b>
            <div className="text-xs mt-1 leading-6 text-muted-foreground">
              علت: {acc.pausedReason ?? "محدودیت ارسال از طرف سرویس مقصد"}
              {" "}— پیام‌های باقی‌مانده: <b>{faNum(acc.remainingMessages ?? 84)}</b> (در صف حفظ شده‌اند)
              <div className="mt-1.5">پس از دریافت سیگنال معتبر سرویس مقصد، سیستم به‌صورت خودکار ادامه می‌دهد یا می‌توانید دستی بررسی و فعال کنید.</div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="bg-muted/70 h-auto flex-wrap">
          <TabsTrigger value="overview" className="gap-1.5"><Gauge className="w-3.5 h-3.5" /> نمای کلی</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5"><Activity className="w-3.5 h-3.5" /> فعالیت</TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1.5"><Megaphone className="w-3.5 h-3.5" /> کمپین‌ها</TabsTrigger>
          <TabsTrigger value="limits" className="gap-1.5"><SlidersHorizontal className="w-3.5 h-3.5" /> Limits</TabsTrigger>
          <TabsTrigger value="connection" className="gap-1.5"><Plug className="w-3.5 h-3.5" /> اتصال</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStat label="سلامت اکانت" value={faPercent(acc.health)} icon={<Gauge className="w-4 h-4" />} tone={acc.health >= 85 ? "ok" : acc.health >= 70 ? "warn" : "err"} />
            <MiniStat label="ارسال امروز" value={faNum(acc.sentToday)} sub={`از ${faNum(acc.dailyLimit)}`} icon={<Activity className="w-4 h-4" />} />
            <MiniStat label="صف این اکانت" value={faNum(accQueueCount)} sub="پیام در انتظار" icon={<ListOrdered className="w-4 h-4" />} />
            <MiniStat label="آخرین فعالیت" value={acc.lastActive} sub={acc.lastError ? `خطا: ${acc.lastError}` : "بدون خطا"} icon={<CheckCircle2 className="w-4 h-4" />} tone={acc.lastError ? "warn" : "ok"} />
          </div>
          <Card className="shadow-none">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">مصرف ظرفیت امروز</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-muted-foreground">{faNum(acc.sentToday)} از {faNum(acc.dailyLimit)} پیام · {faNum(accQueueCount)} پیام در صف این اکانت</span>
                <span className={cn("font-bold", usage > 90 ? "text-red-600" : "text-teal-600")}>{faPercent(usage)}</span>
              </div>
              <Progress value={usage} className="h-2.5" />
              <p className="text-[11px] text-muted-foreground mt-3 leading-5">
                ارسال‌ها فقط در بازه مجاز (۰۸:۰۰ تا ۱۸:۰۰) به‌صورت تدریجی پردازش می‌شوند تا محدودیت سرویس مقصد فعال نشود.
              </p>
            </CardContent>
          </Card>

          {/* Account-level queue sample */}
          {accQueueSample.length > 0 && (
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>صف این اکانت</span>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] text-teal-600" onClick={() => navigate("queue")}>
                    مشاهده صف کامل
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {accQueueSample.map((qi) => (
                  <div key={qi.id} className="flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[11px]">
                    <span className="font-medium truncate flex-1">{qi.contactName}</span>
                    <span className="text-muted-foreground truncate max-w-32 hidden sm:block">{qi.campaignName}</span>
                    <span className="text-muted-foreground tabular-nums">{qi.scheduledAt}</span>
                    <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px]", QUEUE_STATUS_META[qi.status].bg, QUEUE_STATUS_META[qi.status].color)}>
                      {QUEUE_STATUS_META[qi.status].label}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Activity — Account Health Events */}
        <TabsContent value="activity" className="mt-4">
          <Card className="shadow-none">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">آخرین رخدادهای اکانت (Health Events)</CardTitle></CardHeader>
            <CardContent className="space-y-0">
              {events.length === 0 && (
                <div className="text-xs text-muted-foreground py-6 text-center">
                  برای این اکانت رخداد ویژه‌ای ثبت نشده است — وضعیت پایدار است.
                </div>
              )}
              {events.map((e, i) => {
                const tone =
                  e.type === "error" || e.type === "status_change" ? "bg-amber-100 text-amber-600"
                  : e.type === "resume" || e.type === "reconnect" ? "bg-emerald-100 text-emerald-600"
                  : "bg-sky-100 text-sky-600";
                return (
                  <div key={e.id} className="flex gap-3 pb-5 last:pb-0 relative">
                    {i < events.length - 1 && <span className="absolute right-[11px] top-7 bottom-0 w-px bg-border" />}
                    <span className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-background", tone)}>
                      {e.type === "resume" || e.type === "reconnect" ? <RefreshCcw className="w-3.5 h-3.5" /> : e.type === "info" || e.type === "limit" ? <Clock3 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold">{e.title}</div>
                      {e.detail && <div className="text-[11px] text-muted-foreground mt-0.5">{e.detail}</div>}
                      <div className="text-[10px] text-muted-foreground/60 mt-1">{e.date} — ساعت {e.time}</div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaigns */}
        <TabsContent value="campaigns" className="mt-4 space-y-3">
          {relatedCampaigns.map((c) => (
            <button key={c.id} onClick={() => navigate("campaign-details", { campaignId: c.id })}
              className="w-full text-right rounded-xl border bg-card p-4 hover:border-teal-300 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-bold">{c.name}</span>
                <Badge className={cn("text-[10px] border", CAMPAIGN_STATUS_META[c.status].bg, CAMPAIGN_STATUS_META[c.status].color)}>
                  {CAMPAIGN_STATUS_META[c.status].label}
                </Badge>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {faNum(c.sentCount)} از {faNum(c.plannedCount)} پیام — {faPercent(Math.round((c.sentCount / c.plannedCount) * 100))} پیشرفت
              </div>
              <Progress value={(c.sentCount / c.plannedCount) * 100} className="h-1.5 mt-2" />
            </button>
          ))}
          {relatedCampaigns.length === 0 && (
            <EmptyState icon={<Megaphone className="w-6 h-6" />} title="کمپینی با این اکانت اجرا نشده" description="پس از ساخت اولین کمپین، سابقه در اینجا نمایش داده می‌شود." />
          )}
        </TabsContent>

        {/* Limits */}
        <TabsContent value="limits" className="mt-4">
          <Card className="shadow-none max-w-xl">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">تنظیم سقف ارسال روزانه</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-3">
                <div className="space-y-1.5 flex-1">
                  <Label>Limit روزانه (پیام)</Label>
                  <Input dir="ltr" className="text-left w-40 tabular-nums" value={limitInput !== "" ? limitInput : String(acc.dailyLimit)}
                    onChange={(e) => setLimitInput(e.target.value.replace(/\D/g, ""))} />
                </div>
                <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => {
                  if (!limit || limit < 1) return toast.error("مقدار نامعتبر است");
                  updateAccountLimit(acc.id, limit);
                  setLimitInput("");
                  toast.success(`سقف روزانه به ${faNum(limit)} تغییر کرد`);
                }}>
                  ذخیره
                </Button>
              </div>
              <div className="rounded-xl bg-secondary/60 p-3.5 text-[11px] text-muted-foreground leading-6">
                پیشنهاد شروع محافظه‌کارانه: <b>۲۰ پیام در روز</b>. در صورت سلامت پایدار اکانت می‌توانید به‌تدریج افزایش دهید (۲۰ ← ۴۰ ← ۱۰۰). این مقدار در کد ثابت نیست و هر لحظه قابل ویرایش است.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Connection */}
        <TabsContent value="connection" className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="shadow-none">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><KeyRound className="w-4 h-4 text-teal-600" /> وضعیت احراز هویت</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-xs">
              <Row label="روش اتصال" value={acc.authMethod === "qr" ? "QR Code (Linked Device)" : "شماره + کد تأیید"} />
              <Row label="وضعیت نشست" value={
                <Badge variant="outline" className={cn("text-[10px]", acc.status === "active" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-amber-200 text-amber-700 bg-amber-50")}>
                  {acc.status === "active" ? "معتبر و فعال" : "نیاز به بررسی"}
                </Badge>
              } />
              <Row label="توکن دسترسی" value={<code className="rounded bg-muted px-2 py-1 text-[10px] tracking-wider">rw••••••••{acc.id.slice(-4)}</code>} />
              <Row label="آخرین تازه‌سازی توکن" value="دیروز ۰۹:۰۰" />
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toast.success("نشست با موفقیت تازه‌سازی شد")}>
                <RefreshCcw className="w-3.5 h-3.5" /> تازه‌سازی اتصال
              </Button>
              <p className="text-[10px] text-muted-foreground leading-5 border-t pt-3">
                اطلاعات حساس مانند توکن‌ها هرگز به‌صورت متن خام نمایش داده نمی‌شوند.
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><MonitorSmartphone className="w-4 h-4 text-teal-600" /> دستگاه‌های متصل</CardTitle></CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              {[
                { device: "سرور ارسال راساوب (اصلی)", at: "همین لحظه", current: true },
                { device: "Android — اپ رسمی سرویس", at: "۳ روز پیش", current: false },
              ].map((d) => (
                <div key={d.device} className="flex items-center gap-3 rounded-xl border p-3">
                  <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center", d.current ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground")}>
                    <MonitorSmartphone className="w-4 h-4" />
                  </span>
                  <div className="flex-1">
                    <div className="font-semibold">{d.device}</div>
                    <div className="text-[10px] text-muted-foreground">آخرین فعالیت: {d.at}</div>
                  </div>
                  {d.current && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">فعال</Badge>}
                </div>
              ))}
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                اتصال این اکانت رمزنگاری‌شده است.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MiniStat({ label, value, sub, icon, tone = "neutral" }: { label: string; value: string; sub?: string; icon: React.ReactNode; tone?: "ok" | "warn" | "err" | "neutral" }) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-muted-foreground">{label}</span>
          <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center",
            tone === "ok" ? "bg-emerald-50 text-emerald-600" : tone === "warn" ? "bg-amber-50 text-amber-600" : tone === "err" ? "bg-red-50 text-red-600" : "bg-secondary text-secondary-foreground")}>
            {icon}
          </span>
        </div>
        <div className="text-lg font-bold tabular-nums">{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-2.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

export { MiniStat };
