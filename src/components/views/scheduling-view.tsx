"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app-store";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { PageHeader } from "@/components/shared/ui-bits";
import { PLATFORM_LABEL, PLATFORMS, Platform } from "@/lib/types";
import { faNum } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarClock, Clock3, Info, Minus, Plus, Gauge } from "lucide-react";

export function SchedulingView() {
  const { rules, updateRule, queue } = useApp();
  const [edit, setEdit] = useState<Record<string, boolean>>({});

  const queuedCount = queue.filter((q) => q.status === "queued").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="زمان‌بندی ارسال"
        subtitle="بازه ارسال و سرعت صف برای هر پلتفرم — پیام‌ها هرگز به‌صورت همزمان ارسال نمی‌شوند"
      />

      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription className="text-xs leading-6">
          سیستم پیام‌های هر اکانت را در بازه مجاز زمان‌بندی و به‌صورت تدریجی پردازش می‌کند. در حال حاضر <b>{faNum(queuedCount)}</b> پیام در صف پردازش است.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {PLATFORMS.map((p) => {
          const r = rules.find((x) => x.platform === p)!;
          const sHour = parseInt(r.windowStart.split(":")[0], 10) || 8;
          const eHour = parseInt(r.windowEnd.split(":")[0], 10) || 18;
          const hours = Math.max(1, eHour - sHour);
          const perHour = Math.ceil(r.dailyLimit / hours);
          return (
            <Card key={p} className="shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2.5">
                    <PlatformIcon platform={p} size={32} className="rounded-lg" />
                    {PLATFORM_LABEL[p]}
                  </span>
                  <Switch checked={r.enabled} onCheckedChange={(v) => { updateRule(p, { enabled: v }); toast.info(`${PLATFORM_LABEL[p]} ${v ? "فعال" : "غیرفعال"} شد`); }} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] flex items-center gap-1"><Clock3 className="w-3 h-3" /> شروع</Label>
                    <Input type="time" value={r.windowStart} onChange={(e) => updateRule(p, { windowStart: e.target.value })} dir="ltr" className="w-28 h-8 text-left text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] flex items-center gap-1"><Clock3 className="w-3 h-3" /> پایان</Label>
                    <Input type="time" value={r.windowEnd} onChange={(e) => updateRule(p, { windowEnd: e.target.value })} dir="ltr" className="w-28 h-8 text-left text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] flex items-center gap-1"><Gauge className="w-3 h-3" /> سرعت صف</Label>
                    <Select value={r.queueSpeed} onValueChange={(v) => updateRule(p, { queueSpeed: v as typeof r.queueSpeed })}>
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="slow">آرام (ایمن‌تر)</SelectItem>
                        <SelectItem value="normal">معمولی</SelectItem>
                        <SelectItem value="fast">سریع</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* توزیع ساعتی */}
                <div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
                    <span>توزیع ظرفیت روزانه در بازه</span>
                    <span className="tabular-nums">≈ {faNum(perHour)} پیام/ساعت</span>
                  </div>
                  <div className="flex gap-0.5 h-6 rounded-md overflow-hidden">
                    {Array.from({ length: hours }, (_, i) => (
                      <div key={i} className="flex-1 bg-teal-500/80" style={{ opacity: 0.3 + (i / hours) * 0.7 }} title={`ساعت ${sHour + i}`} />
                    ))}
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground mt-1 tabular-nums">
                    <span>{r.windowStart}</span><span>{r.windowEnd}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-3.5 py-2.5">
                  <span className="text-[11px] text-muted-foreground">سقف روزانه این پلتفرم</span>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateRule(p, { dailyLimit: Math.max(1, r.dailyLimit - 5) })}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="text-sm font-bold tabular-nums w-10 text-center">{faNum(r.dailyLimit)}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateRule(p, { dailyLimit: r.dailyLimit + 5 })}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground leading-5">
                  مقادیر کاملاً قابل ویرایش‌اند و در کد ثابت نیستند؛ برای افزایش تدریجی مطمئن، Limit را پله‌پله بالا ببرید (۲۰ ← ۴۰ ← ۱۰۰).
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2"><CalendarClock className="w-4 h-4 text-teal-600" /> کمپین‌های زمان‌بندی‌شده</CardTitle>
        </CardHeader>
        <CardContent>
          <ScheduledList />
        </CardContent>
      </Card>
    </div>
  );
}

function ScheduledList() {
  const { campaigns, navigate } = useApp();
  const scheduled = campaigns.filter((c) => c.status === "scheduled");
  if (scheduled.length === 0) {
    return <p className="text-xs text-muted-foreground py-4 text-center">کمپین زمان‌بندی‌شده‌ای وجود ندارد.</p>;
  }
  return (
    <div className="space-y-2">
      {scheduled.map((c) => (
        <button key={c.id} onClick={() => navigate("campaign-details", { campaignId: c.id })}
          className="w-full text-right flex flex-wrap items-center gap-3 rounded-xl border p-3.5 hover:border-teal-300 transition-colors cursor-pointer">
          <div className="text-xs font-bold">{c.name}</div>
          <Badge variant="outline" className="text-[10px] border-sky-200 text-sky-700 bg-sky-50">زمان‌بندی‌شده</Badge>
          <span className="text-[11px] text-muted-foreground">{c.startDate} · {c.startAt} تا {c.endAt}</span>
          <span className="text-[11px] text-muted-foreground">{faNum(c.audienceCount)} مخاطب</span>
        </button>
      ))}
    </div>
  );
}
