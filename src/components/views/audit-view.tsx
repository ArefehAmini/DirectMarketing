"use client";
import { useMemo, useState } from "react";
import { useApp } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/fa";
import { AuditObjectType } from "@/lib/types";
import { PageHeader, EmptyState } from "@/components/shared/ui-bits";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ScrollText, User, Bot } from "lucide-react";

const OBJECT_TYPE_LABEL: Record<AuditObjectType, string> = {
  campaign: "کمپین",
  account: "اکانت",
  contact: "مخاطب",
  segment: "سگمنت",
  template: "قالب",
  settings: "تنظیمات",
  system: "سیستم",
  queue: "صف ارسال",
  project: "پروژه",
};

const OBJECT_TYPE_COLOR: Record<AuditObjectType, string> = {
  campaign: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
  account: "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300",
  contact: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300",
  segment: "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300",
  template: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
  settings: "bg-slate-100 text-slate-600",
  system: "bg-slate-100 text-slate-600",
  queue: "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300",
  project: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300",
};

export function AuditView() {
  const { audit, projects } = useApp();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    let list = [...audit];
    if (typeFilter !== "all") list = list.filter((a) => a.objectType === typeFilter);
    if (projectFilter !== "all") list = list.filter((a) => a.projectName === projectFilter);
    const q = query.trim();
    if (q) list = list.filter((a) => a.action.includes(q) || a.user.includes(q) || a.object.includes(q));
    return list;
  }, [audit, query, typeFilter, projectFilter]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="گزارش فعالیت‌ها"
        subtitle="ثبت کامل عملیات کاربران و سیستم — چه کسی، چه کاری، روی چه شیئی، در کدام پروژه"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجو در عملیات، کاربر یا شیء…" className="pr-9 h-9 text-xs bg-muted/50" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 h-9 text-[11px]"><SelectValue placeholder="نوع شیء" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه انواع</SelectItem>
            {(Object.keys(OBJECT_TYPE_LABEL) as AuditObjectType[]).map((t) => (
              <SelectItem key={t} value={t}>{OBJECT_TYPE_LABEL[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-36 h-9 text-[11px]"><SelectValue placeholder="پروژه" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه پروژه‌ها</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timeline table */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<ScrollText className="w-8 h-8" />}
            title="فعالیتی ثبت نشده"
            description="با این فیلترها عملیاتی یافت نشد. همه عملیات مهم کاربران و سیستم به‌صورت خودکار اینجا ثبت می‌شوند."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground">
                  <th className="text-right font-medium px-4 py-3">کاربر</th>
                  <th className="text-right font-medium px-4 py-3">عملیات</th>
                  <th className="text-right font-medium px-4 py-3">شیء</th>
                  <th className="text-right font-medium px-4 py-3 hidden md:table-cell">پروژه</th>
                  <th className="text-right font-medium px-4 py-3">تاریخ</th>
                  <th className="text-right font-medium px-4 py-3">ساعت</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {a.user === "سیستم" ? (
                          <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                            <Bot className="w-3.5 h-3.5 text-slate-500" />
                          </span>
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                            {a.user.slice(0, 1)}
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{a.user}</div>
                          <div className="text-[10px] text-muted-foreground">{a.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-80">{a.action}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="truncate max-w-40">{a.object}</span>
                        <span className={cn("rounded-full px-1.5 py-0.5 text-[9px]", OBJECT_TYPE_COLOR[a.objectType])}>
                          {OBJECT_TYPE_LABEL[a.objectType]}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{a.projectName}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums" dir="ltr">{a.date}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums" dir="ltr">{a.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground px-1">
        {faNum(filtered.length)} رکورد — شامل عملیات کاربران (ایجاد، ویرایش، تأیید، حذف) و اتوماسیون سیستم (توقف اکانت، انتقال به صف، فیلتر رضایت).
      </p>
    </div>
  );
}
