"use client";
import { useState } from "react";
import { useApp } from "@/store/app-store";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { PageHeader } from "@/components/shared/ui-bits";
import { PLATFORM_LABEL, Platform } from "@/lib/types";
import { faNum, faPercent } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { WEEKLY_SENDS } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Send, CheckCircle2, XCircle, Percent, Timer } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const PIE_COLORS = ["#0d9488", "#22c55e", "#f59e0b", "#7c3aed", "#2aabee", "#f43f5e"];

export function ReportsView() {
  const { campaigns, accounts, navigate } = useApp();
  const [campaignId, setCampaignId] = useState<string>(campaigns[0]?.id ?? "");
  const c = campaigns.find((x) => x.id === campaignId) ?? campaigns[0];

  const platformBreakdown = (c?.platforms ?? []).map((p, i) => {
    const count = accounts.filter((a) => a.platform === p).length;
    const share = c ? Math.round((c.sentCount / c.platforms.length) * (0.6 + i * 0.15)) : 0;
    return { name: PLATFORM_LABEL[p], value: share, accounts: count, platform: p as Platform };
  });

  const successRate = c && c.sentCount > 0 ? Math.round((c.successCount / c.sentCount) * 100) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="گزارش‌ها"
        subtitle="تحلیل عملکرد ارسال‌ها بر اساس کمپین، پلتفرم و زمان"
        actions={
          <Select value={campaignId} onValueChange={setCampaignId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="انتخاب کمپین" /></SelectTrigger>
            <SelectContent>
              {campaigns.map((x) => (
                <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi icon={<Send className="w-4 h-4" />} label="کل ارسال‌شده" value={faNum(c?.sentCount ?? 0)} tone="text-teal-600" />
        <Kpi icon={<CheckCircle2 className="w-4 h-4" />} label="موفق" value={faNum(c?.successCount ?? 0)} tone="text-emerald-600" />
        <Kpi icon={<XCircle className="w-4 h-4" />} label="ناموفق" value={faNum(c?.failedCount ?? 0)} tone="text-red-600" />
        <Kpi icon={<Percent className="w-4 h-4" />} label="نرخ موفقیت" value={faPercent(successRate)} tone="text-teal-600" />
        <Kpi icon={<Timer className="w-4 h-4" />} label="میانگین زمان ارسال" value="۴٫۲ ثانیه" tone="text-sky-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly trend */}
        <Card className="shadow-none lg:col-span-2">
          <CardHeader className="pb-0"><CardTitle className="text-sm font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-teal-600" /> روند هفتگی ارسال</CardTitle></CardHeader>
          <CardContent className="h-64 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={WEEKLY_SENDS} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gWeek" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.92 0.005 190)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "oklch(0.55 0.02 215)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.55 0.02 215)" }} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => faNum(v)} />
                <ReTooltip contentStyle={{ borderRadius: 12, fontSize: 12, direction: "rtl" }} formatter={(v: number, n: string) => [faNum(v), n === "sent" ? "کل ارسال" : "موفق"]} />
                <Area type="monotone" dataKey="sent" stroke="#0d9488" strokeWidth={2.2} fill="url(#gWeek)" />
                <Area type="monotone" dataKey="success" stroke="#22c55e" strokeWidth={1.8} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Platform pie */}
        <Card className="shadow-none">
          <CardHeader className="pb-0"><CardTitle className="text-sm font-bold">سهم پلتفرم‌ها</CardTitle></CardHeader>
          <CardContent className="h-64 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={platformBreakdown} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                  {platformBreakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <ReTooltip contentStyle={{ borderRadius: 12, fontSize: 12, direction: "rtl" }} formatter={(v: number) => [faNum(v), "پیام"]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Platform breakdown table */}
      <Card className="shadow-none overflow-hidden">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">تفکیک پلتفرم‌های کمپین «{c?.name}»</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {platformBreakdown.map((p, i) => {
            const pct = Math.min(100, Math.round((p.value / (c?.plannedCount ?? 1)) * 100));
            return (
              <button key={p.platform} onClick={() => navigate("accounts")} className="w-full text-right cursor-pointer group">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-2 font-medium group-hover:text-teal-700 transition-colors">
                    <PlatformIcon platform={p.platform} size={22} className="rounded-md" />
                    {p.name}
                    <span className="text-[10px] text-muted-foreground">({faNum(p.accounts)} اکانت)</span>
                  </span>
                  <span className="text-muted-foreground tabular-nums">{faNum(p.value)} پیام · {faPercent(pct)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={cn("w-8 h-8 rounded-lg bg-muted flex items-center justify-center", tone)}>{icon}</span>
          <span className="text-[10px] text-muted-foreground leading-4">{label}</span>
        </div>
        <div className={cn("text-lg font-bold tabular-nums", tone)}>{value}</div>
      </CardContent>
    </Card>
  );
}
