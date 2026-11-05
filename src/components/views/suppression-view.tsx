"use client";
import { useMemo, useState } from "react";
import { useApp } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/fa";
import { SUPPRESSION_REASON_META, SuppressionReason } from "@/lib/types";
import { PageHeader, EmptyState } from "@/components/shared/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, ShieldBan, Trash2, Loader2, Info } from "lucide-react";

export function SuppressionView() {
  const { suppression, addToSuppression, removeFromSuppression } = useApp();
  const [query, setQuery] = useState("");
  const [reasonFilter, setReasonFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", reason: "manual_list" as SuppressionReason, note: "" });

  const filtered = useMemo(() => {
    let list = [...suppression];
    if (reasonFilter !== "all") list = list.filter((e) => e.reason === reasonFilter);
    const q = query.trim();
    if (q) list = list.filter((e) => e.name.includes(q) || e.phone.includes(q));
    return list;
  }, [suppression, query, reasonFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: suppression.length };
    for (const e of suppression) c[e.reason] = (c[e.reason] ?? 0) + 1;
    return c;
  }, [suppression]);

  const submit = () => {
    if (!form.name.trim() || form.phone.trim().length < 10) return;
    setSaving(true);
    setTimeout(() => {
      addToSuppression({ name: form.name.trim(), phone: form.phone.trim(), reason: form.reason, note: form.note.trim() || undefined });
      setSaving(false);
      setAddOpen(false);
      setForm({ name: "", phone: "", reason: "manual_list", note: "" });
    }, 700);
  };

  const confirmTarget = suppression.find((e) => e.id === confirmRemove);

  return (
    <div className="space-y-4">
      <PageHeader
        title="لیست عدم ارسال"
        subtitle="این مخاطبان در هیچ کمپینی وارد صف ارسال نمی‌شوند — سیستم پیش از ورود به صف به‌صورت خودکار بررسی می‌کند"
        actions={
          <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" />
            افزودن به لیست
          </Button>
        }
      />

      <div className="rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900 px-4 py-3 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
        <p className="text-[11px] leading-5 text-sky-800 dark:text-sky-300">
          هنگام ساخت کمپین، مخاطبان این لیست و مخاطبان با وضعیت «عدم دریافت پیام» به‌صورت خودکار از مخاطبان هدف کسر می‌شوند
          و هرگز به صف ارسال اضافه نمی‌شوند.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجوی نام یا شماره…" className="pr-9 h-9 text-xs bg-muted/50" />
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setReasonFilter("all")}
            className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors cursor-pointer",
              reasonFilter === "all" ? "bg-teal-600 text-white border-teal-600" : "bg-background text-muted-foreground hover:border-foreground/30")}
          >
            همه ({faNum(counts.all ?? 0)})
          </button>
          {(Object.keys(SUPPRESSION_REASON_META) as SuppressionReason[]).map((r) => (
            <button
              key={r}
              onClick={() => setReasonFilter(r)}
              className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors cursor-pointer",
                reasonFilter === r ? "bg-teal-600 text-white border-teal-600" : "bg-background text-muted-foreground hover:border-foreground/30")}
            >
              {SUPPRESSION_REASON_META[r].label} {counts[r] ? `(${faNum(counts[r])})` : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<ShieldBan className="w-8 h-8" />}
            title="لیست عدم ارسال خالی است"
            description="مخاطبان این لیست هرگز کمپین دریافت نمی‌کنند. می‌توانید به‌صورت دستی اضافه کنید یا سیستم به‌صورت خودکار (درخواست توقف، شماره نامعتبر و…) اینجا ثبت می‌کند."
            action={
              <Button onClick={() => setAddOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white">
                افزودن اولین مخاطب
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground">
                  <th className="text-right font-medium px-4 py-3">مخاطب</th>
                  <th className="text-right font-medium px-4 py-3">شماره</th>
                  <th className="text-right font-medium px-4 py-3">دلیل</th>
                  <th className="text-right font-medium px-4 py-3 hidden md:table-cell">توضیح</th>
                  <th className="text-right font-medium px-4 py-3 hidden lg:table-cell">ثبت‌کننده</th>
                  <th className="text-right font-medium px-4 py-3 hidden lg:table-cell">تاریخ</th>
                  <th className="text-right font-medium px-4 py-3">منبع</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{e.name}</td>
                    <td className="px-4 py-3" dir="ltr">{faNum(e.phone)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px]", SUPPRESSION_REASON_META[e.reason].bg, SUPPRESSION_REASON_META[e.reason].color)}>
                        {SUPPRESSION_REASON_META[e.reason].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-64 truncate">{e.note ?? "—"}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">{e.addedBy}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{e.addedAt}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[10px] rounded-full px-2 py-0.5", e.source === "automatic" ? "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300" : "bg-secondary text-muted-foreground")}>
                        {e.source === "automatic" ? "خودکار" : "دستی"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setConfirmRemove(e.id)}
                        className="text-muted-foreground hover:text-red-600 transition-colors cursor-pointer"
                        aria-label="حذف از لیست"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>افزودن به لیست عدم ارسال</DialogTitle>
            <DialogDescription>
              این مخاطب از تمام کمپین‌های فعلی و آینده حذف می‌شود.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label htmlFor="sup-name">نام مخاطب</Label>
              <Input id="sup-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثلاً: رضا محمدی" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-phone">شماره</Label>
              <Input id="sup-phone" dir="ltr" className="text-left" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="0912…" />
            </div>
            <div className="space-y-2">
              <Label>دلیل</Label>
              <Select value={form.reason} onValueChange={(v) => setForm((f) => ({ ...f, reason: v as SuppressionReason }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(SUPPRESSION_REASON_META) as SuppressionReason[]).map((r) => (
                    <SelectItem key={r} value={r}>{SUPPRESSION_REASON_META[r].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-note">یادداشت (اختیاری)</Label>
              <Textarea id="sup-note" rows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 text-white gap-2"
              disabled={saving || !form.name.trim() || form.phone.trim().length < 10}
              onClick={submit}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              افزودن به لیست
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove confirm */}
      <AlertDialog open={!!confirmRemove} onOpenChange={(o) => !o && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف از لیست عدم ارسال؟</AlertDialogTitle>
            <AlertDialogDescription>
              با حذف «{confirmTarget?.name}» از لیست، این مخاطب در کمپین‌های بعدی — در صورت مجاز بودن وضعیت دریافت پیام — مجدداً وارد صف ارسال می‌شود.
              این عملیات بلافاصله برای همه پروژه‌ها اعمال می‌شود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { if (confirmRemove) removeFromSuppression(confirmRemove); setConfirmRemove(null); }}>
              حذف کن
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
