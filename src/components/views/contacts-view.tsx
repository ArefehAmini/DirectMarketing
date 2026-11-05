"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app-store";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { EmptyState, PageHeader } from "@/components/shared/ui-bits";
import { PLATFORM_LABEL, Platform, CONSENT_META } from "@/lib/types";
import { faNum, maskPhone } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Search, Plus, Upload, ChevronRight, ChevronLeft, Users, Tag, Download, FolderPlus, Inbox, Layers,
} from "lucide-react";

const PAGE_SIZE = 12;

export function ContactsView() {
  const { contacts, groups, navigate, addContact, applyTagToContacts, addContactsToGroup } = useApp();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string>("all");
  const [tag, setTag] = useState<string>("all");
  const [consent, setConsent] = useState<string>("all");
  const [platform, setPlatform] = useState<"all" | Platform>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  /* add-contact dialog */
  const [addOpen, setAddOpen] = useState(false);
  const [ncName, setNcName] = useState("");
  const [ncPhone, setNcPhone] = useState("");
  const [ncCity, setNcCity] = useState("");
  const [ncCat, setNcCat] = useState("");

  /* bulk dialogs */
  const [tagOpen, setTagOpen] = useState(false);
  const [bulkTag, setBulkTag] = useState("");
  const [groupOpen, setGroupOpen] = useState(false);
  const [bulkGroup, setBulkGroup] = useState<string>("");

  const allTags = useMemo(() => Array.from(new Set(contacts.flatMap((c) => c.tags))).slice(0, 8), [contacts]);

  const filtered = useMemo(() => {
    let list = contacts;
    if (q.trim()) {
      const needle = q.trim().replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
      list = list.filter((c) => c.name.includes(needle) || c.phone.includes(needle));
    }
    if (platform !== "all") list = list.filter((c) => c.channels.includes(platform));
    if (tag !== "all") list = list.filter((c) => c.tags.includes(tag));
    if (consent !== "all") list = list.filter((c) => c.consent === consent);
    if (group !== "all") {
      // شبیه‌سازی نسبت گروه‌ها به مخاطبان بر اساس ایندکس
      const gi = parseInt(group.replace("g", ""), 10) || 0;
      list = list.filter((_, i) => i % groups.length === gi - 1);
    }
    return list;
  }, [contacts, q, platform, tag, consent, group, groups.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div className="space-y-5">
      <PageHeader
        title="مخاطبان"
        subtitle={`${faNum(contacts.length)} مخاطب در ${faNum(groups.length)} گروه — مدیریت متمرکز و قابل جستجو`}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("import-contacts")} className="gap-1.5">
              <Upload className="w-4 h-4" /> ورود گروهی
            </Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4" /> افزودن مخاطب
            </Button>
          </>
        }
      />

      {/* Groups */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => { setGroup("all"); setPage(1); }}
          className={cn(
            "shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition-colors cursor-pointer",
            group === "all" ? "bg-teal-600 text-white border-teal-600" : "bg-card hover:border-teal-300"
          )}
        >
          همه مخاطبان · {faNum(contacts.length)}
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => { setGroup(g.id); setPage(1); }}
            className={cn(
              "shrink-0 rounded-full border pl-4 pr-2.5 py-2 text-xs font-medium transition-colors cursor-pointer flex items-center gap-2",
              group === g.id ? "bg-teal-600 text-white border-teal-600" : "bg-card hover:border-teal-300"
            )}
          >
            <span className={cn("w-2 h-2 rounded-full", g.color)} />
            {g.name} · {faNum(g.count)}
          </button>
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
            <SelectTrigger className="w-40"><SelectValue placeholder="کانال" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه کانال‌ها</SelectItem>
              {(Object.keys(PLATFORM_LABEL) as Platform[]).map((p) => (
                <SelectItem key={p} value={p}>دسترسی {PLATFORM_LABEL[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={consent} onValueChange={(v) => { setConsent(v); setPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue placeholder="وضعیت دریافت" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌های دریافت</SelectItem>
              <SelectItem value="allowed">🟢 مجاز</SelectItem>
              <SelectItem value="unknown">🟡 نامشخص</SelectItem>
              <SelectItem value="opted_out">🔴 عدم دریافت پیام</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tag} onValueChange={(v) => { setTag(v); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="برچسب" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه برچسب‌ها</SelectItem>
              {allTags.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-9 gap-1.5 text-[11px]" onClick={() => navigate("segments")}>
            <Layers className="w-3.5 h-3.5" />
            سگمنت‌ها
          </Button>
        </CardContent>
      </Card>

      {/* Bulk */}
      {selected.size > 0 && (
        <div className="rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 px-4 py-3 flex flex-wrap items-center gap-2">
          <Badge className="bg-teal-600 text-white hover:bg-teal-600">{faNum(selected.size)} مخاطب انتخاب‌شده</Badge>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => { setBulkGroup(groups[0]?.id ?? ""); setGroupOpen(true); }}>
            <FolderPlus className="w-3.5 h-3.5" /> افزودن به گروه
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => { setBulkTag(""); setTagOpen(true); }}>
            <Tag className="w-3.5 h-3.5" /> برچسب‌گذاری
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            onClick={() => {
              const rowsCsv = contacts.filter((c) => selected.has(c.id));
              const csv = ["نام,شماره,شهر,صنف,وضعیت دریافت,منبع", ...rowsCsv.map((c) => `${c.name},${c.phone},${c.city},${c.category},${c.consent},${c.source}`)].join("\n");
              const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "rasaweb-contacts.csv";
              a.click();
              URL.revokeObjectURL(url);
              toast.success(`${faNum(rowsCsv.length)} مخاطب به‌صورت CSV خروجی گرفت`);
            }}
          >
            <Download className="w-3.5 h-3.5" /> خروجی اکسل
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
                  <Checkbox
                    checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
                    onCheckedChange={(v) => {
                      if (v) setSelected(new Set([...selected, ...rows.map((r) => r.id)]));
                      else setSelected(new Set([...selected].filter((id) => !rows.some((r) => r.id === id))));
                    }}
                    aria-label="انتخاب همه"
                  />
                </TableHead>
                <TableHead>نام</TableHead>
                <TableHead>شماره</TableHead>
                <TableHead>کانال‌های قابل دسترس</TableHead>
                <TableHead>وضعیت دریافت پیام</TableHead>
                <TableHead>شهر</TableHead>
                <TableHead>صنف</TableHead>
                <TableHead>برچسب‌ها</TableHead>
                <TableHead>آخرین کمپین</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate("contact-details", { contactId: c.id })}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selected.has(c.id)} onCheckedChange={(v) => {
                      const next = new Set(selected);
                      if (v) next.add(c.id); else next.delete(c.id);
                      setSelected(next);
                    }} />
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        {c.name.slice(0, 1)}
                      </span>
                      {c.name}
                    </div>
                  </TableCell>
                  <TableCell dir="ltr" className="text-left tabular-nums text-muted-foreground whitespace-nowrap">{maskPhone(c.phone)}</TableCell>
                  <TableCell>
                    <span className="inline-flex -space-x-1.5">
                      {c.channels.map((p) => (
                        <PlatformIcon key={p} platform={p} size={20} className="rounded-md ring-2 ring-background" />
                      ))}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      CONSENT_META[c.consent].bg, CONSENT_META[c.consent].color
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", CONSENT_META[c.consent].dot)} />
                      {CONSENT_META[c.consent].label}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.city}</TableCell>
                  <TableCell className="text-muted-foreground">{c.category}</TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-1">
                      {c.tags.slice(0, 2).map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px] font-normal">{t}</Badge>
                      ))}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.lastCampaign ?? "—"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-7 text-[11px] text-teal-600" onClick={(e) => { e.stopPropagation(); navigate("contact-details", { contactId: c.id }); }}>
                      پروفایل
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {rows.length === 0 && (
          <EmptyState
            icon={<Users className="w-7 h-7" />}
            title="هنوز مخاطبی با این فیلترها اضافه نشده"
            description="فیلترها را تغییر دهید یا هزاران شماره را یکجا وارد کنید؛ سیستم تکراری‌ها را حذف و فرمت را استاندارد می‌کند."
            action={
              <Button onClick={() => navigate("import-contacts")} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
                <Upload className="w-4 h-4" /> ورود گروهی مخاطبان
              </Button>
            }
          />
        )}

        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t">
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              نمایش {faNum((current - 1) * PAGE_SIZE + 1)} تا {faNum(Math.min(current * PAGE_SIZE, filtered.length))} از {faNum(filtered.length)} مخاطب
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent" disabled={current === 1} onClick={() => setPage(current - 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, current - 2)) + i;
                if (p > totalPages) return null;
                return (
                  <Button key={p} variant={p === current ? "default" : "outline"} size="icon" className={cn("h-8 w-8 text-xs", p === current && "bg-teal-600 hover:bg-teal-700 text-white")} onClick={() => setPage(p)}>
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
      {/* افزودن مخاطب دستی */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>افزودن مخاطب جدید</DialogTitle>
            <DialogDescription>مخاطب با وضعیت دریافت «نامشخص» ثبت می‌شود؛ پس از تأیید رضایت، مجاز به دریافت کمپین خواهد بود.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (ncName.trim().length < 2) return toast.error("نام مخاطب را وارد کنید");
              if (!/^09\d{9}$/.test(ncPhone.trim())) return toast.error("شماره باید ۱۱ رقم و با ۰۹ شروع شود");
              addContact({ name: ncName.trim(), phone: ncPhone.trim(), city: ncCity.trim() || undefined, category: ncCat.trim() || undefined });
              toast.success(`مخاطب «${ncName.trim()}» اضافه شد`);
              setAddOpen(false);
              setNcName(""); setNcPhone(""); setNcCity(""); setNcCat("");
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="nc-name">نام و نام خانوادگی *</Label>
              <Input id="nc-name" value={ncName} onChange={(e) => setNcName(e.target.value)} placeholder="مثلاً علی رضایی" autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nc-phone">شماره موبایل *</Label>
              <Input id="nc-phone" dir="ltr" className="text-left" value={ncPhone} onChange={(e) => setNcPhone(e.target.value)} placeholder="09123456789" inputMode="numeric" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="nc-city">شهر</Label>
                <Input id="nc-city" value={ncCity} onChange={(e) => setNcCity(e.target.value)} placeholder="تهران" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nc-cat">صنف</Label>
                <Input id="nc-cat" value={ncCat} onChange={(e) => setNcCat(e.target.value)} placeholder="مثلاً مبلمان" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>انصراف</Button>
              <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700 text-white">افزودن مخاطب</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* برچسب‌گذاری گروهی */}
      <Dialog open={tagOpen} onOpenChange={setTagOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>برچسب‌گذاری {faNum(selected.size)} مخاطب</DialogTitle>
            <DialogDescription>برچسب به همه مخاطبان انتخاب‌شده اضافه می‌شود و در فیلترها و سگمنت‌ها قابل استفاده است.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = bulkTag.trim();
              if (!t) return toast.error("نام برچسب را وارد کنید");
              applyTagToContacts([...selected], t);
              toast.success(`برچسب «${t}» به ${faNum(selected.size)} مخاطب اعمال شد`);
              setTagOpen(false);
              setSelected(new Set());
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="bulk-tag">نام برچسب</Label>
              <Input id="bulk-tag" value={bulkTag} onChange={(e) => setBulkTag(e.target.value)} placeholder="مثلاً VIP" autoFocus />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setTagOpen(false)}>انصراف</Button>
              <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700 text-white">اعمال برچسب</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* افزودن به گروه */}
      <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>افزودن به گروه</DialogTitle>
            <DialogDescription>{faNum(selected.size)} مخاطب انتخاب‌شده به گروه دلخواه اضافه می‌شوند.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>گروه مقصد</Label>
              <Select value={bulkGroup} onValueChange={setBulkGroup}>
                <SelectTrigger><SelectValue placeholder="انتخاب گروه" /></SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name} — {faNum(g.count)} مخاطب</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setGroupOpen(false)}>انصراف</Button>
              <Button
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                disabled={!bulkGroup}
                onClick={() => {
                  addContactsToGroup(bulkGroup, selected.size);
                  toast.success(`${faNum(selected.size)} مخاطب به گروه اضافه شدند`);
                  setGroupOpen(false);
                  setSelected(new Set());
                }}
              >
                افزودن
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function InboxIconExport() {
  return <Inbox className="w-4 h-4" />;
}
