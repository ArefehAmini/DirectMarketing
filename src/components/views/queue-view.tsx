"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app-store";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { EmptyState, PageHeader } from "@/components/shared/ui-bits";
import { QUEUE_STATUS_META, QueueStatus, PLATFORM_LABEL, Platform, ERROR_CLASS_META, ErrorClass } from "@/lib/types";
import { faNum, maskPhone } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  RotateCcw, PauseCircle, ChevronRight, ChevronLeft, Layers, Search, ListOrdered, Zap,
  ShieldAlert, Timer, UserX, Lock, Ban, Trash2, AlertCircle, Unplug,
} from "lucide-react";

const TABS: { key: "all" | QueueStatus; label: string }[] = [
  { key: "all", label: "همه" },
  { key: "queued", label: "در صف" },
  { key: "sending", label: "در حال ارسال" },
  { key: "sent", label: "ارسال موفق" },
  { key: "failed", label: "خطا" },
  { key: "stopped", label: "متوقف" },
  { key: "paused", label: "توقف موقت" },
];

const ERROR_CLASS_ICON: Record<ErrorClass, React.ElementType> = {
  temporary: Timer,
  rate_limit: ShieldAlert,
  auth: Lock,
  restriction: Ban,
  invalid_recipient: UserX,
  no_worker: Unplug,
};

const PAGE = 10;

export function QueueView() {
  const { queue, retryQueueItem, pauseQueueItems, removeFromQueue, navigate } = useApp();
  const [tab, setTab] = useState<"all" | QueueStatus>("all");
  const [platform, setPlatform] = useState<"all" | Platform>("all");
  const [errorFilter, setErrorFilter] = useState<"all" | ErrorClass>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: queue.length };
    queue.forEach((x) => { c[x.status] = (c[x.status] ?? 0) + 1; });
    return c;
  }, [queue]);

  const filtered = useMemo(() => {
    let list = queue;
    if (tab !== "all") list = list.filter((x) => x.status === tab);
    if (platform !== "all") list = list.filter((x) => x.platform === platform);
    if (errorFilter !== "all") list = list.filter((x) => x.errorClass === errorFilter);
    if (q.trim()) {
      const needle = q.trim().replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
      list = list.filter((x) => x.contactName.includes(needle) || x.campaignName.includes(needle) || x.phone.includes(needle));
    }
    return list;
  }, [queue, tab, platform, errorFilter, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * PAGE, current * PAGE);

  return (
    <div className="space-y-5">
      <PageHeader
        title="صف ارسال"
        subtitle="پایش لحظه‌ای صف — پیام‌ها در بازه مجاز به‌صورت تدریجی پردازش می‌شوند"
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.success("صف همگام‌سازی شد")}>
            <Zap className="w-3.5 h-3.5" /> همگام‌سازی
          </Button>
        }
      />

      {/* Summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SumBox label="کل رکوردها" value={counts.all} cls="text-foreground" />
        <SumBox label="در صف" value={counts.queued ?? 0} cls="text-amber-600" />
        <SumBox label="در حال ارسال" value={counts.sending ?? 0} cls="text-sky-600" />
        <SumBox label="ارسال موفق" value={counts.sent ?? 0} cls="text-emerald-600" />
        <SumBox label="خطا" value={counts.failed ?? 0} cls="text-red-600" />
        <SumBox label="متوقف / توقف موقت" value={(counts.stopped ?? 0) + (counts.paused ?? 0)} cls="text-slate-500" />
      </div>

      {/* Smart error classification */}
      <div className="rounded-2xl border bg-card p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          طبقه‌بندی هوشمند خطاها
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
          {(Object.keys(ERROR_CLASS_META) as ErrorClass[]).map((k) => {
            const meta = ERROR_CLASS_META[k];
            const Icon = ERROR_CLASS_ICON[k];
            const n = queue.filter((x) => x.errorClass === k).length;
            return (
              <button
                key={k}
                onClick={() => { setErrorFilter(errorFilter === k ? "all" : k); setPage(1); }}
                title={meta.desc}
                className={cn(
                  "rounded-xl border p-3 text-right transition-all cursor-pointer hover:shadow-sm",
                  errorFilter === k ? "ring-2 ring-teal-500/40 border-teal-400" : "",
                  meta.bg
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("w-7 h-7 rounded-lg bg-white/70 dark:bg-white/10 flex items-center justify-center", meta.color)}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className={cn("text-base font-bold tabular-nums", meta.color)}>{faNum(n)}</span>
                </div>
                <div className="text-[11px] font-semibold mt-2">{meta.label}</div>
                <div className="text-[9px] text-muted-foreground mt-0.5">{meta.action}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1); }}
              className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                tab === t.key ? "bg-teal-600 text-white border-teal-600" : "bg-card hover:border-teal-300")}
            >
              {t.label} · {faNum(counts[t.key] ?? (t.key === "all" ? queue.length : 0))}
            </button>
          ))}
        </div>
        <div className="mr-auto flex gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="جستجو…" className="h-9 rounded-md border bg-background pr-9 pl-3 text-xs outline-none focus:ring-2 focus:ring-teal-500/30 w-44" />
          </div>
          <Select value={platform} onValueChange={(v) => { setPlatform(v as typeof platform); setPage(1); }}>
            <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه پلتفرم‌ها</SelectItem>
              {(Object.keys(PLATFORM_LABEL) as Platform[]).map((p) => (
                <SelectItem key={p} value={p}>{PLATFORM_LABEL[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk */}
      {selected.size > 0 && (
        <div className="rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 px-4 py-3 flex flex-wrap items-center gap-2">
          <Badge className="bg-teal-600 text-white hover:bg-teal-600">{faNum(selected.size)} انتخاب‌شده</Badge>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => { selected.forEach(retryQueueItem); toast.success("مجدداً در صف قرار گرفتند"); setSelected(new Set()); }}>
            <RotateCcw className="w-3.5 h-3.5" /> تلاش مجدد
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => { pauseQueueItems([...selected]); toast.info("توقف موقت اعمال شد"); setSelected(new Set()); }}>
            <PauseCircle className="w-3.5 h-3.5" /> توقف موقت
          </Button>
          <button onClick={() => setSelected(new Set())} className="mr-auto text-xs text-muted-foreground hover:text-foreground cursor-pointer">لغو انتخاب</button>
        </div>
      )}

      {/* Table */}
      <Card className="shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-10">
                  <Checkbox checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
                    onCheckedChange={(v) => v ? setSelected(new Set(rows.map((r) => r.id))) : setSelected(new Set())} />
                </TableHead>
                <TableHead>کمپین (پیام)</TableHead>
                <TableHead>مخاطب</TableHead>
                <TableHead>پلتفرم</TableHead>
                <TableHead>اکانت</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>زمان</TableHead>
                <TableHead>طبقه خطا</TableHead>
                <TableHead>تلاش</TableHead>
                <TableHead>آخرین خطا</TableHead>
                <TableHead className="text-center">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((x) => {
                const m = QUEUE_STATUS_META[x.status];
                return (
                  <TableRow key={x.id} className="hover:bg-muted/30">
                    <TableCell>
                      <Checkbox checked={selected.has(x.id)} onCheckedChange={(v) => {
                        const next = new Set(selected);
                        if (v) next.add(x.id); else next.delete(x.id);
                        setSelected(next);
                      }} />
                    </TableCell>
                    <TableCell className="text-xs font-medium max-w-44 truncate">{x.campaignName}</TableCell>
                    <TableCell>
                      <div className="text-xs font-medium whitespace-nowrap">{x.contactName}</div>
                      <div dir="ltr" className="text-[10px] text-muted-foreground text-left tabular-nums">{maskPhone(x.phone)}</div>
                    </TableCell>
                    <TableCell><PlatformIcon platform={x.platform} size={26} /></TableCell>
                    <TableCell className="text-xs">{x.accountName}</TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium", m.bg, m.color)}>
                        {x.status === "sending" && <span className="w-1.5 h-1.5 rounded-full bg-sky-500 pulse-dot" />}
                        {m.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">{x.scheduledAt}</TableCell>
                    <TableCell>
                      {x.errorClass ? (() => {
                        const meta = ERROR_CLASS_META[x.errorClass];
                        const EIcon = ERROR_CLASS_ICON[x.errorClass];
                        return (
                          <div title={meta.desc} className="flex items-center gap-1.5">
                            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", meta.bg, meta.color)}>
                              <EIcon className="w-3 h-3" />
                              {meta.label}
                            </span>
                          </div>
                        );
                      })() : <span className="text-[10px] text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {/* Retry هوشمند: نمایش تلاش‌ها */}
                      <div className="flex items-center gap-1" title={x.errorClass ? ERROR_CLASS_META[x.errorClass].desc : undefined}>
                        {[1, 2, 3].map((n) => (
                          <span
                            key={n}
                            className={cn(
                              "w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center",
                              x.attempts >= n
                                ? x.status === "failed"
                                  ? "bg-red-100 dark:bg-red-950 text-red-600"
                                  : "bg-emerald-100 dark:bg-emerald-950 text-emerald-600"
                                : "bg-muted text-muted-foreground/50"
                            )}
                          >
                            {faNum(n)}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground max-w-40 truncate">{x.lastError ?? "—"}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {(x.status === "failed" || x.status === "stopped") && (
                          x.errorClass && !ERROR_CLASS_META[x.errorClass].autoRetry ? (
                            /* خطاهای جدی: تلاش مجدد خودکار ندارد */
                            <span
                              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
                              title={ERROR_CLASS_META[x.errorClass].desc}
                            >
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                              نیازمند بررسی
                            </span>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-7 text-[11px] text-teal-600 gap-1" onClick={() => { retryQueueItem(x.id); toast.success("به صف ارسال برگشت"); }}>
                              <RotateCcw className="w-3 h-3" /> تلاش مجدد
                            </Button>
                          )
                        )}
                        {x.errorClass === "invalid_recipient" && (
                          <Button size="sm" variant="ghost" className="h-7 text-[11px] text-red-500 gap-1" onClick={() => { removeFromQueue([x.id]); toast.info("از صف حذف شد و به لیست عدم ارسال پیشنهاد شد"); }}>
                            <Trash2 className="w-3 h-3" /> حذف از صف
                          </Button>
                        )}
                        {x.status === "queued" && (
                          <Button size="sm" variant="ghost" className="h-7 text-[11px] text-amber-600 gap-1" onClick={() => { pauseQueueItems([x.id]); toast.info("توقف موقت"); }}>
                            <PauseCircle className="w-3 h-3" /> توقف
                          </Button>
                        )}
                        {x.status === "sent" && <span className="text-emerald-500"><Layers className="w-3.5 h-3.5" /></span>}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {rows.length === 0 && (
          <EmptyState
            icon={<ListOrdered className="w-7 h-7" />}
            title="رکوردی در صف با این فیلترها نیست"
            description="با اجرای کمپین‌ها، پیام‌ها به‌صورت خودکار وارد این صف می‌شوند."
            action={<Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => navigate("campaigns")}>مشاهده کمپین‌ها</Button>}
          />
        )}

        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t">
            <div className="text-xs text-muted-foreground">
              نمایش {faNum((current - 1) * PAGE + 1)} تا {faNum(Math.min(current * PAGE, filtered.length))} از {faNum(filtered.length)}
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent" disabled={current === 1} onClick={() => setPage(current - 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="text-xs tabular-nums px-2">{faNum(current)} / {faNum(totalPages)}</span>
              <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent" disabled={current === totalPages} onClick={() => setPage(current + 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function SumBox({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-3.5">
        <div className={cn("text-lg font-bold tabular-nums", cls)}>{faNum(value)}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
      </CardContent>
    </Card>
  );
}
