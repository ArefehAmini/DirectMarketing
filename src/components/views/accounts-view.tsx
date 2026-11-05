"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app-store";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { StatusBadge, HealthBar, EmptyState, PageHeader } from "@/components/shared/ui-bits";
import { ACCOUNT_STATUS_META, Account, AccountStatus, PLATFORM_LABEL, PLATFORMS, Platform } from "@/lib/types";
import { faNum, maskPhone } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search, Plus, ChevronRight, ChevronLeft, XCircle, RotateCcw, SlidersHorizontal,
  Download, Layers, Tag, Power, Inbox, SlidersVertical,
} from "lucide-react";

const PAGE_SIZES = [10, 20, 50];

export function AccountsView() {
  const { accounts, navigate, setAccountStatus, updateAccountLimit, resumeAccount } = useApp();
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState<"all" | Platform>("all");
  const [status, setStatus] = useState<"all" | AccountStatus>("all");
  const [health, setHealth] = useState<"all" | "high" | "mid" | "low">("all");
  const [sort, setSort] = useState<"name" | "health" | "sent" | "remaining">("name");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [limitDialog, setLimitDialog] = useState(false);
  const [bulkLimit, setBulkLimit] = useState("40");

  const counts = useMemo(
    () => ({
      all: accounts.length,
      active: accounts.filter((a) => a.status === "active").length,
      limited: accounts.filter((a) => a.status === "limited").length,
      blocked: accounts.filter((a) => a.status === "blocked").length,
      error: accounts.filter((a) => a.status === "connection_error").length,
    }),
    [accounts]
  );

  const filtered = useMemo(() => {
    let list = accounts;
    if (q.trim()) {
      const needle = q.trim().replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
      list = list.filter((a) => a.name.includes(needle) || a.phone.includes(needle));
    }
    if (platform !== "all") list = list.filter((a) => a.platform === platform);
    if (status !== "all") list = list.filter((a) => a.status === status);
    if (health !== "all")
      list = list.filter((a) => (health === "high" ? a.health >= 90 : health === "mid" ? a.health >= 70 && a.health < 90 : a.health < 70));
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sort === "health") return b.health - a.health;
      if (sort === "sent") return b.sentToday - a.sentToday;
      if (sort === "remaining") return b.remaining - a.remaining;
      return a.name.localeCompare(b.name, "fa");
    });
    return sorted;
  }, [accounts, q, platform, status, health, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize);

  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  const applyBulk = (action: "deactivate" | "activate" | "resume") => {
    if (selected.size === 0) return;
    let n = 0;
    selected.forEach((id) => {
      const acc = accounts.find((a) => a.id === id);
      if (!acc) return;
      if (action === "deactivate" && acc.status === "active") {
        setAccountStatus(id, "inactive");
        n++;
      } else if (action === "activate" && acc.status === "inactive") {
        setAccountStatus(id, "active");
        n++;
      } else if (action === "resume" && (acc.status === "limited" || acc.status === "connection_error")) {
        resumeAccount(id);
        n++;
      }
    });
    if (n > 0) toast.success(`عملیات روی ${faNum(n)} اکانت اعمال شد`);
    else toast.info("هیچ اکانتی با این شرط پیدا نشد");
    setSelected(new Set());
  };

  const applyBulkLimit = () => {
    const v = parseInt(bulkLimit, 10);
    if (!v || v < 1) return toast.error("مقدار Limit نامعتبر است");
    selected.forEach((id) => updateAccountLimit(id, v));
    toast.success(`سقف روزانه ${faNum(selected.size)} اکانت به ${faNum(v)} تغییر کرد`);
    setLimitDialog(false);
    setSelected(new Set());
  };

  const exportSelected = () => {
    toast.success(`${faNum(selected.size)} اکانت برای خروجی CSV آماده شد`);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="مدیریت اکانت‌ها"
        subtitle="اتصال، پایش سلامت و مدیریت ظرفیت اکانت‌های پیام‌رسان"
        actions={
          <Button onClick={() => navigate("add-account")} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
            <Plus className="w-4 h-4" /> افزودن اکانت
          </Button>
        }
      />

      {/* Summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "کل اکانت‌ها", count: counts.all, cls: "text-foreground", border: "" },
          { label: "فعال", count: counts.active, cls: "text-emerald-600", border: "border-emerald-200" },
          { label: "محدود", count: counts.limited, cls: "text-amber-600", border: "border-amber-200" },
          { label: "مسدود", count: counts.blocked, cls: "text-red-600", border: "border-red-200" },
          { label: "خطای اتصال", count: counts.error, cls: "text-orange-600", border: "border-orange-200" },
        ].map((s) => (
          <Card key={s.label} className={cn("shadow-none", s.border)}>
            <CardContent className="p-4">
              <div className={cn("text-xl font-bold tabular-nums", s.cls)}>{faNum(s.count)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <Card className="shadow-none">
        <CardContent className="p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="جستجوی نام یا شماره…" className="pr-9" />
          </div>
          <Select value={platform} onValueChange={(v) => { setPlatform(v as typeof platform); setPage(1); }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="پلتفرم" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه پلتفرم‌ها</SelectItem>
              {PLATFORMS.map((p) => (
                <SelectItem key={p} value={p}>{PLATFORM_LABEL[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); setPage(1); }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="وضعیت" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              {(Object.keys(ACCOUNT_STATUS_META) as AccountStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{ACCOUNT_STATUS_META[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={health} onValueChange={(v) => { setHealth(v as typeof health); setPage(1); }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="سلامت" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه سطوح سلامت</SelectItem>
              <SelectItem value="high">سلامت ۹۰٪+</SelectItem>
              <SelectItem value="mid">سلامت ۷۰ تا ۹۰٪</SelectItem>
              <SelectItem value="low">سلامت زیر ۷۰٪</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="w-40"><SlidersVertical className="w-3.5 h-3.5 ml-1 text-muted-foreground" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="name">مرتب‌سازی: نام</SelectItem>
              <SelectItem value="health">مرتب‌سازی: سلامت</SelectItem>
              <SelectItem value="sent">مرتب‌سازی: ارسال امروز</SelectItem>
              <SelectItem value="remaining">مرتب‌سازی: باقی‌مانده</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 px-4 py-3 flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Badge className="bg-teal-600 text-white hover:bg-teal-600">{faNum(selected.size)} انتخاب‌شده</Badge>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => applyBulk("deactivate")}>
            <Power className="w-3.5 h-3.5" /> غیرفعال‌سازی
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => applyBulk("activate")}>
            <RotateCcw className="w-3.5 h-3.5" /> فعال‌سازی
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => applyBulk("resume")}>
            <XCircle className="w-3.5 h-3.5" /> رفع محدودیت/بررسی
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setLimitDialog(true)}>
            <SlidersHorizontal className="w-3.5 h-3.5" /> تغییر Limit
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => { toast.success("اکانت‌ها به استخر اضافه شدند"); setSelected(new Set()); }}>
            <Layers className="w-3.5 h-3.5" /> افزودن به Pool
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => { toast.success("برچسب اعمال شد"); setSelected(new Set()); }}>
            <Tag className="w-3.5 h-3.5" /> برچسب‌گذاری
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={exportSelected}>
            <Download className="w-3.5 h-3.5" /> خروجی
          </Button>
          <button onClick={() => setSelected(new Set())} className="mr-auto text-xs text-muted-foreground hover:text-foreground cursor-pointer">
            لغو انتخاب
          </button>
        </div>
      )}

      {/* Table */}
      <Card className="shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-10">
                  <Checkbox checked={rows.length > 0 && selected.size === rows.length} onCheckedChange={toggleAll} aria-label="انتخاب همه" />
                </TableHead>
                <TableHead>پلتفرم</TableHead>
                <TableHead>نام اکانت</TableHead>
                <TableHead>شماره</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="min-w-32">سلامت</TableHead>
                <TableHead>ارسال امروز</TableHead>
                <TableHead>Limit روزانه</TableHead>
                <TableHead>باقی‌مانده</TableHead>
                <TableHead>آخرین فعالیت</TableHead>
                <TableHead>آخرین خطا</TableHead>
                <TableHead className="text-center">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <AccountRow
                  key={a.id}
                  acc={a}
                  selected={selected.has(a.id)}
                  onToggle={(v) => {
                    const next = new Set(selected);
                    if (v) next.add(a.id);
                    else next.delete(a.id);
                    setSelected(next);
                  }}
                  onOpen={() => navigate("account-details", { accountId: a.id })}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        {rows.length === 0 && (
          <EmptyState
            icon={<Inbox className="w-7 h-7" />}
            title="اکانتی با این فیلترها پیدا نشد"
            description="فیلترها را تغییر دهید یا اولین اکانت خود را متصل کنید."
            action={
              <Button onClick={() => navigate("add-account")} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
                <Plus className="w-4 h-4" /> افزودن اکانت
              </Button>
            }
          />
        )}

        {/* Pagination */}
        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t">
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              نمایش {faNum((current - 1) * pageSize + 1)} تا {faNum(Math.min(current * pageSize, filtered.length))} از {faNum(filtered.length)} اکانت
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-7 w-[70px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((s) => (
                    <SelectItem key={s} value={String(s)}>{faNum(s)} ردیف</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent" disabled={current === 1} onClick={() => setPage(current - 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, current - 2)) + i;
                if (p > totalPages) return null;
                return (
                  <Button
                    key={p}
                    variant={p === current ? "default" : "outline"}
                    size="icon"
                    className={cn("h-8 w-8 text-xs", p === current && "bg-teal-600 hover:bg-teal-700 text-white")}
                    onClick={() => setPage(p)}
                  >
                    {faNum(p)}
                  </Button>
                );
              })}
              <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent" disabled={current === totalPages} onClick={() => setPage(current + 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Bulk limit dialog */}
      <Dialog open={limitDialog} onOpenChange={setLimitDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تغییر سقف روزانه ارسال</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Limit جدید برای {faNum(selected.size)} اکانت</Label>
            <Input value={bulkLimit} onChange={(e) => setBulkLimit(e.target.value)} dir="ltr" className="text-left" />
            <p className="text-[11px] text-muted-foreground leading-5">
              این سقف باید مطابق قوانین هر سرویس مقصد تعیین شود؛ مقدار پیشنهادی شروع: ۲۰ و افزایش تدریجی.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLimitDialog(false)}>انصراف</Button>
            <Button onClick={applyBulkLimit} className="bg-teal-600 hover:bg-teal-700 text-white">اعمال</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AccountRow({ acc, selected, onToggle, onOpen }: { acc: Account; selected: boolean; onToggle: (v: boolean) => void; onOpen: () => void }) {
  return (
    <TableRow className={cn("cursor-pointer transition-colors hover:bg-muted/40", selected && "bg-teal-50/60 dark:bg-teal-950/20")} onClick={onOpen}>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={(v) => onToggle(!!v)} aria-label={`انتخاب ${acc.name}`} />
      </TableCell>
      <TableCell><PlatformIcon platform={acc.platform} size={30} /></TableCell>
      <TableCell className="font-medium whitespace-nowrap">{acc.name}</TableCell>
      <TableCell dir="ltr" className="text-left tabular-nums text-muted-foreground whitespace-nowrap">{maskPhone(acc.phone)}</TableCell>
      <TableCell><StatusBadge status={acc.status} size="sm" /></TableCell>
      <TableCell><HealthBar value={acc.health} /></TableCell>
      <TableCell className="tabular-nums">{faNum(acc.sentToday)}</TableCell>
      <TableCell className="tabular-nums">{faNum(acc.dailyLimit)}</TableCell>
      <TableCell className="tabular-nums">
        <span className={cn("font-semibold", acc.remaining === 0 ? "text-red-600" : "text-emerald-600")}>{faNum(acc.remaining)}</span>
      </TableCell>
      <TableCell className="tabular-nums text-muted-foreground whitespace-nowrap">{acc.lastActive}</TableCell>
      <TableCell className="text-xs text-muted-foreground max-w-36 truncate">{acc.lastError ?? "—"}</TableCell>
      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
        {(acc.status === "limited" || acc.status === "connection_error") ? (
          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => onOpen()}>
            بررسی
          </Button>
        ) : (
          <Button size="sm" variant="ghost" className="h-7 text-[11px] text-teal-600" onClick={onOpen}>
            جزئیات
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
