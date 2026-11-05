"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app-store";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { StatusBadge, PageHeader } from "@/components/shared/ui-bits";
import { ACCOUNT_STATUS_META, ErrorBehavior, PLATFORMS, PLATFORM_LABEL, Platform, ResumeBehavior } from "@/lib/types";
import { faNum } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { SlidersHorizontal, Layers, Info, ShieldCheck } from "lucide-react";

const ERROR_BEHAVIOR_LABEL: Record<ErrorBehavior, string> = {
  stop_account: "توقف فوری ارسال اکانت",
  retry_then_stop: "۲ تلاش مجدد، سپس توقف",
  skip_contact: "رد کردن مخاطب و ادامه",
};

const RESUME_BEHAVIOR_LABEL: Record<ResumeBehavior, string> = {
  auto_resume: "ادامه خودکار پس از سیگنال معتبر سرویس",
  manual_review: "بررسی و تأیید دستی مدیر",
};

export function LimitsView() {
  const { rules, updateRule, accounts, pools, resumeAccount, navigate } = useApp();
  const [showAll, setShowAll] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="قوانین ارسال"
        subtitle="سقف روزانه، بازه ارسال و رفتار سیستم هنگام خطا برای هر پلتفرم"
      />

      <Alert>
        <ShieldCheck className="w-4 h-4" />
        <AlertDescription className="text-xs leading-6">
          هدف این قوانین، مدیریت ظرفیت و اجرای ارسال‌های مجاز مطابق سیاست هر سرویس است. هنگام اعلام محدودیت از سرویس مقصد، اکانت فوراً از چرخه ارسال خارج و پیام‌های باقی‌مانده در صف حفظ می‌شوند.
        </AlertDescription>
      </Alert>

      {/* Rules per platform */}
      <div className="space-y-4">
        {PLATFORMS.map((p) => {
          const r = rules.find((x) => x.platform === p)!;
          const platformAccounts = accounts.filter((a) => a.platform === p);
          const activeCount = platformAccounts.filter((a) => a.status === "active").length;
          return (
            <Card key={p} className="shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex flex-wrap items-center gap-3">
                  <PlatformIcon platform={p} size={34} className="rounded-lg" />
                  {PLATFORM_LABEL[p]}
                  <Badge variant={r.enabled ? "default" : "secondary"} className={cn("text-[10px]", r.enabled && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100")}>
                    {r.enabled ? "قوانین فعال" : "غیرفعال"}
                  </Badge>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {faNum(platformAccounts.length)} اکانت · {faNum(activeCount)} فعال
                  </span>
                  <span className="mr-auto flex items-center gap-2">
                    <Label className="text-[11px] font-normal text-muted-foreground">وضعیت</Label>
                    <Switch checked={r.enabled} onCheckedChange={(v) => { updateRule(p, { enabled: v }); toast.info(`قوانین ${PLATFORM_LABEL[p]} ${v ? "فعال" : "غیرفعال"} شد`); }} />
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {/* Daily limit */}
                <div className="space-y-2.5">
                  <Label className="text-xs flex items-center justify-between">
                    سقف روزانه
                    <b className="text-teal-700 dark:text-teal-400 tabular-nums">{faNum(r.dailyLimit)} پیام</b>
                  </Label>
                  <Slider value={[r.dailyLimit]} min={5} max={200} step={5} dir="ltr"
                    onValueChange={([v]) => updateRule(p, { dailyLimit: v })} />
                  <div className="flex gap-1.5">
                    {[20, 40, 100].map((v) => (
                      <button key={v} onClick={() => updateRule(p, { dailyLimit: v })}
                        className={cn("rounded-md border px-2.5 py-1 text-[10px] font-medium transition-colors cursor-pointer",
                          r.dailyLimit === v ? "bg-teal-600 text-white border-teal-600" : "hover:border-teal-400")}>
                        {faNum(v)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Window */}
                <div className="space-y-2.5">
                  <Label className="text-xs">بازه ارسال</Label>
                  <div className="flex items-center gap-2">
                    <Input type="time" value={r.windowStart} onChange={(e) => updateRule(p, { windowStart: e.target.value })} dir="ltr" className="h-8 text-left text-xs" />
                    <span className="text-xs text-muted-foreground">تا</span>
                    <Input type="time" value={r.windowEnd} onChange={(e) => updateRule(p, { windowEnd: e.target.value })} dir="ltr" className="h-8 text-left text-xs" />
                  </div>
                  <Select value={r.queueSpeed} onValueChange={(v) => updateRule(p, { queueSpeed: v as typeof r.queueSpeed })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slow">صف: آرام (ایمن‌تر)</SelectItem>
                      <SelectItem value="normal">صف: معمولی</SelectItem>
                      <SelectItem value="fast">صف: سریع</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Error behavior */}
                <div className="space-y-2.5">
                  <Label className="text-xs flex items-center gap-1"><SlidersHorizontal className="w-3 h-3" /> رفتار هنگام خطا</Label>
                  <Select value={r.errorBehavior} onValueChange={(v) => updateRule(p, { errorBehavior: v as ErrorBehavior })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ERROR_BEHAVIOR_LABEL) as ErrorBehavior[]).map((k) => (
                        <SelectItem key={k} value={k}>{ERROR_BEHAVIOR_LABEL[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Label className="text-xs">رفتار پس از رفع محدودیت</Label>
                  <Select value={r.resumeBehavior} onValueChange={(v) => updateRule(p, { resumeBehavior: v as ResumeBehavior })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(RESUME_BEHAVIOR_LABEL) as ResumeBehavior[]).map((k) => (
                        <SelectItem key={k} value={k}>{RESUME_BEHAVIOR_LABEL[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status summary */}
                <div className="space-y-2.5">
                  <Label className="text-xs">وضعیت فعلی اکانت‌ها</Label>
                  <div className="space-y-1.5">
                    {(Object.keys(ACCOUNT_STATUS_META) as (keyof typeof ACCOUNT_STATUS_META)[])
                      .filter((s) => platformAccounts.some((a) => a.status === s))
                      .slice(0, showAll ? 6 : 3)
                      .map((s) => {
                        const n = platformAccounts.filter((a) => a.status === s).length;
                        const m = ACCOUNT_STATUS_META[s];
                        return (
                          <div key={s} className="flex items-center justify-between text-[11px]">
                            <span className="flex items-center gap-1.5"><span className={cn("w-2 h-2 rounded-full", m.dot)} />{m.label}</span>
                            <span className="tabular-nums text-muted-foreground">{faNum(n)}</span>
                          </div>
                        );
                      })}
                  </div>
                  {platformAccounts.some((a) => a.status === "limited") && (
                    <button
                      onClick={() => {
                        const acc = platformAccounts.find((a) => a.status === "limited");
                        if (acc) { resumeAccount(acc.id); toast.success(`${acc.name} فعال‌سازی شد`); }
                      }}
                      className="w-full rounded-lg border border-emerald-200 text-emerald-700 text-[11px] py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                    >
                      فعال‌سازی اکانت محدودشده (پس از تأیید)
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pools */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold flex items-center gap-2"><Layers className="w-4 h-4 text-teal-600" /> استخرهای اکانت‌ها (Multi-Account Pool)</h3>
          <button onClick={() => setShowAll((s) => !s)} className="text-xs text-teal-600 hover:underline cursor-pointer">
            {showAll ? "نمایش کمتر" : "نمایش همه وضعیت‌ها"}
          </button>
        </div>
        <Alert className="mb-3">
          <Info className="w-4 h-4" />
          <AlertDescription className="text-[11px] leading-5">
            در زمان ارسال، فقط اکانت‌هایی با وضعیت مجاز در چرخه قرار می‌گیرند. هدف سیستم مدیریت ظرفیت و اجرای ارسال‌های مجاز است.
          </AlertDescription>
        </Alert>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pools.map((pool) => {
            const list = accounts.filter((a) => a.platform === pool.platform).slice(0, 6);
            return (
              <Card key={pool.id} className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <PlatformIcon platform={pool.platform} size={26} className="rounded-md" />
                      {pool.name}
                    </span>
                    <button onClick={() => navigate("accounts")} className="text-[10px] font-normal text-teal-600 hover:underline cursor-pointer">مدیریت</button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {list.map((a) => (
                    <button key={a.id} onClick={() => navigate("account-details", { accountId: a.id })}
                      className="w-full flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-right hover:border-teal-300 transition-colors cursor-pointer">
                      <span className={cn("w-2 h-2 rounded-full", ACCOUNT_STATUS_META[a.status].dot)} />
                      <span className="text-[11px] font-medium flex-1 truncate">{a.name}</span>
                      <StatusBadge status={a.status} size="sm" />
                    </button>
                  ))}
                  <button onClick={() => navigate("accounts")} className="w-full text-[10px] text-muted-foreground hover:text-teal-600 pt-1 cursor-pointer">
                    و {faNum(Math.max(0, accounts.filter((a) => a.platform === pool.platform).length - 6))} اکانت دیگر…
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
