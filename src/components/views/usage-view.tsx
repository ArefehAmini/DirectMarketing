"use client";
import { useMemo, useState } from "react";
import { useApp } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/fa";
import { PLATFORM_LABEL, Platform } from "@/lib/types";
import { PageHeader } from "@/components/shared/ui-bits";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { AnimatedCounter } from "@/components/shared/ui-bits";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RTooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { Coins, Send, CheckCircle2, XCircle, TrendingUp } from "lucide-react";

export function UsageView() {
  const { usageRows, campaigns } = useApp();
  const [range, setRange] = useState<"today" | "week" | "month">("today");
  const mult = range === "today" ? 1 : range === "week" ? 6.4 : 24.8;

  const totals = useMemo(() => {
    const sent = usageRows.reduce((a, r) => a + r.sent, 0);
    const success = usageRows.reduce((a, r) => a + r.success, 0);
    const failed = usageRows.reduce((a, r) => a + r.failed, 0);
    const cost = usageRows.reduce((a, r) => a + r.sent * r.costPerMessage, 0);
    return { sent: Math.round(sent * mult), success: Math.round(success * mult), failed: Math.round(failed * mult), cost: Math.round(cost * mult) };
  }, [usageRows, mult]);

  const platformData = usageRows.map((r) => ({
    name: PLATFORM_LABEL[r.platform],
    platform: r.platform,
    ارسال: Math.round(r.sent * mult),
    موفق: Math.round(r.success * mult),
    خطا: Math.round(r.failed * mult),
  }));

  const costData = usageRows
    .filter((r) => r.costPerMessage > 0)
    .map((r) => ({ name: PLATFORM_LABEL[r.platform], value: Math.round(r.sent * r.costPerMessage * mult) }));
  const COST_COLORS = ["#7c3aed", "#16a34a", "#f59e0b", "#0ea5e9"];

  /* مصرف به تفکیک کمپین */
  const campaignData = campaigns.slice(0, 5).map((c) => ({
    name: c.name.length > 16 ? c.name.slice(0, 16) + "…" : c.name,
    sent: Math.round(c.sentCount * mult),
    success: Math.round(c.successCount * mult),
    failed: Math.round(c.failedCount * mult),
  }));

  const fmtTomans = (n: number) => `${faNum(n)} تومان`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="مصرف و هزینه"
        subtitle="تحلیل مصرف ارسال به تفکیک پلتفرم، اکانت، کمپین و پروژه — هزینه فقط در صورت ارائه تعرفه توسط سرویس"
        actions={
          <div className="flex gap-1 rounded-lg border bg-card p-1">
            {([["today", "امروز"], ["week", "هفته"], ["month", "ماه"]] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setRange(k)}
                className={cn("rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors cursor-pointer",
                  range === k ? "bg-teal-600 text-white" : "text-muted-foreground hover:text-foreground")}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: "کل ارسال", value: totals.sent, icon: Send, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-950/40" },
          { label: "ارسال موفق", value: totals.success, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
          { label: "خطاها", value: totals.failed, icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/40" },
          { label: "هزینه برآوردی (پلتفرم‌های metered)", value: totals.cost, icon: Coins, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/40", isCost: true },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border bg-card p-4">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", k.bg)}>
              <k.icon className={cn("w-4.5 h-4.5 w-5 h-5", k.color)} />
            </div>
            {k.isCost ? (
              <div className="text-lg font-bold">{fmtTomans(k.value)}</div>
            ) : (
              <div className="text-xl font-bold"><AnimatedCounter value={k.value} /></div>
            )}
            <div className="text-[11px] text-muted-foreground mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-card p-4">
          <div className="text-xs font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-600" />
            مصرف به تفکیک پلتفرم
          </div>
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <RTooltip contentStyle={{ fontSize: 11, direction: "rtl", fontFamily: "inherit" }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="ارسال" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="موفق" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="خطا" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4">
          <div className="text-xs font-semibold mb-2 flex items-center gap-2">
            <Coins className="w-4 h-4 text-violet-600" />
            توزیع هزینه (فقط پلتفرم‌های دارای تعرفه)
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">
            واتساپ و تلگرام از طریق روش اتصال رسمی بدون هزینه پیام محاسبه می‌شوند؛ پلتفرم‌های داخلی بر اساس تعرفه اعلامی سرویس.
          </p>
          <div className="h-56" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={costData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                  {costData.map((_, i) => (
                    <Cell key={i} fill={COST_COLORS[i % COST_COLORS.length]} />
                  ))}
                </Pie>
                <RTooltip contentStyle={{ fontSize: 11, direction: "rtl", fontFamily: "inherit" }} formatter={(v: number) => fmtTomans(v)} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Usage table per platform */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b text-xs font-semibold">جزئیات مصرف پلتفرم‌ها</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground">
                <th className="text-right font-medium px-4 py-2.5">پلتفرم</th>
                <th className="text-right font-medium px-4 py-2.5">ارسال</th>
                <th className="text-right font-medium px-4 py-2.5">موفق</th>
                <th className="text-right font-medium px-4 py-2.5">خطا</th>
                <th className="text-right font-medium px-4 py-2.5">نرخ موفقیت</th>
                <th className="text-right font-medium px-4 py-2.5">تعرفه هر پیام</th>
                <th className="text-right font-medium px-4 py-2.5">هزینه</th>
              </tr>
            </thead>
            <tbody>
              {usageRows.map((r) => {
                const rate = Math.round((r.success / Math.max(1, r.sent)) * 100);
                return (
                  <tr key={r.platform} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={r.platform} size={24} className="rounded-md" />
                        <span className="font-medium">{PLATFORM_LABEL[r.platform]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{faNum(Math.round(r.sent * mult))}</td>
                    <td className="px-4 py-3 tabular-nums text-emerald-600">{faNum(Math.round(r.success * mult))}</td>
                    <td className="px-4 py-3 tabular-nums text-red-500">{faNum(Math.round(r.failed * mult))}</td>
                    <td className="px-4 py-3 tabular-nums">{faNum(rate)}٪</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{r.costPerMessage > 0 ? `${faNum(r.costPerMessage)} تومان` : "رایگان (اتصال رسمی)"}</td>
                    <td className="px-4 py-3 tabular-nums font-medium">{r.costPerMessage > 0 ? fmtTomans(Math.round(r.sent * r.costPerMessage * mult)) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign usage */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="text-xs font-semibold mb-4">مصرف به تفکیک کمپین</div>
        <div className="space-y-3">
          {campaignData.map((c) => {
            const max = Math.max(...campaignData.map((x) => x.sent), 1);
            return (
              <div key={c.name} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground tabular-nums">{faNum(c.sent)} ارسال · {faNum(c.failed)} خطا</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden flex" dir="ltr">
                  <div className="h-full bg-emerald-500" style={{ width: `${(c.success / max) * 100}%` }} />
                  <div className="h-full bg-red-400" style={{ width: `${(c.failed / max) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
