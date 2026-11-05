"use client";
import { useMemo, useState } from "react";
import { useApp } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/fa";
import { SEGMENT_FIELD_META, SegmentField, SegmentRule } from "@/lib/types";
import { PageHeader, EmptyState } from "@/components/shared/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Layers, Loader2, Megaphone, Wand2, X } from "lucide-react";

let ruleSeq = 0;

export function SegmentsView() {
  const { segments, addSegment, deleteSegment, navigate } = useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [rules, setRules] = useState<SegmentRule[]>([
    { id: "r-temp-0", field: "category", operator: "is", value: "مبلمان" },
  ]);

  const openCreate = () => {
    ruleSeq = 0;
    setName("");
    setRules([{ id: "r-temp-0", field: "category", operator: "is", value: SEGMENT_FIELD_META.category.options[0] }]);
    setCreateOpen(true);
  };

  /* شمارش زنده matching — شبیه‌سازی روی داده واقعی مخاطبان */
  const liveCount = useMemo(() => {
    const { contacts } = useApp.getState();
    return contacts.filter((c) =>
      rules.every((r) => {
        const val = SEGMENT_FIELD_META[r.field];
        switch (r.field) {
          case "category": return r.operator === "is" ? c.category === r.value : c.category !== r.value;
          case "city": return r.operator === "is" ? c.city === r.value : c.city !== r.value;
          case "consent": {
            const label = c.consent === "allowed" ? "مجاز" : c.consent === "unknown" ? "نامشخص" : "عدم دریافت پیام";
            return r.operator === "is" ? label === r.value : label !== r.value;
          }
          case "tag": return r.operator === "is" ? c.tags.includes(r.value) : !c.tags.includes(r.value);
          case "source": return r.operator === "is" ? c.source === r.value : c.source !== r.value;
          case "replied": {
            const label = c.replied ? "پاسخ داده" : "پاسخ نداده";
            return r.operator === "is" ? label === r.value : label !== r.value;
          }
          case "lastCampaign": {
            const label = c.lastCampaign ?? "—";
            return r.operator === "is" ? label === r.value : label !== r.value;
          }
          default: return true;
        }
      })
    ).length;
  }, [rules]);

  const submit = () => {
    if (!name.trim() || rules.length === 0) return;
    setSaving(true);
    setTimeout(() => {
      addSegment({ name: name.trim(), rules, matchCount: liveCount });
      setSaving(false);
      setCreateOpen(false);
    }, 700);
  };

  const deleteTarget = segments.find((s) => s.id === confirmDelete);

  return (
    <div className="space-y-4">
      <PageHeader
        title="سگمنت‌ها"
        subtitle="گروه‌های هدف هوشمند — با Rule Builder بسازید و در کمپین‌ها استفاده کنید"
        actions={
          <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            سگمنت جدید
          </Button>
        }
      />

      {segments.length === 0 ? (
        <div className="rounded-2xl border bg-card">
          <EmptyState
            icon={<Layers className="w-8 h-8" />}
            title="هنوز سگمنتی نساخته‌اید"
            description="سگمنت‌ها مخاطبان را بر اساس صنف، شهر، وضعیت دریافت پیام، برچسب و پاسخ‌دهی گروه‌بندی می‌کنند و در کمپین‌ها به‌عنوان مخاطب هدف انتخاب می‌شوند."
            action={
              <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700 text-white">
                ساخت اولین سگمنت
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {segments.map((s) => (
            <div key={s.id} className="rounded-2xl border bg-card p-4 space-y-3 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0", s.color)}>
                    <Layers className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">{s.name}</div>
                    <div className="text-[10px] text-muted-foreground">ساخته‌شده در {s.createdAt}{s.isSystem ? " · سیستمی" : ""}</div>
                  </div>
                </div>
                <button
                  onClick={() => setConfirmDelete(s.id)}
                  className="text-muted-foreground hover:text-red-600 transition-colors cursor-pointer shrink-0"
                  aria-label="حذف سگمنت"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="text-2xl font-bold tabular-nums">
                {faNum(s.matchCount)}
                <span className="text-[11px] font-normal text-muted-foreground mr-1.5">مخاطب</span>
              </div>

              <div className="space-y-1">
                {s.rules.map((r, i) => (
                  <div key={r.id} className="flex items-center gap-1.5 text-[10px]">
                    {i > 0 && <span className="text-muted-foreground font-semibold">AND</span>}
                    {i === 0 && <span className="text-muted-foreground">if</span>}
                    <span className="rounded bg-secondary px-1.5 py-0.5">{SEGMENT_FIELD_META[r.field].label}</span>
                    <span className="text-muted-foreground">{r.operator === "is" ? "=" : "≠"}</span>
                    <span className="rounded bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 font-medium">{r.value}</span>
                  </div>
                ))}
              </div>

              <Button
                variant="outline" size="sm"
                className="w-full h-8 text-[11px] gap-1.5"
                onClick={() => navigate("create-campaign", { segmentId: s.id })}
              >
                <Megaphone className="w-3.5 h-3.5" />
                استفاده در کمپین
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog — Rule Builder */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ساخت سگمنت با Rule Builder</DialogTitle>
            <DialogDescription>
              شرط‌ها با هم AND می‌شوند؛ تعداد مخاطبان منطبق به‌صورت زنده محاسبه می‌شود.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام سگمنت — مثلاً: فروشندگان مبلمان تهران" />

            <div className="space-y-2">
              {rules.map((r, idx) => (
                <div key={r.id} className="rounded-xl border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {idx > 0 && <span className="text-teal-600 font-bold">AND</span>} شرط {faNum(idx + 1)}
                    </span>
                    {rules.length > 1 && (
                      <button onClick={() => setRules((rs) => rs.filter((x) => x.id !== r.id))} className="text-muted-foreground hover:text-red-600 cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Select
                      value={r.field}
                      onValueChange={(v) => {
                        const f = v as SegmentField;
                        setRules((rs) => rs.map((x) => (x.id === r.id ? { ...x, field: f, value: SEGMENT_FIELD_META[f].options[0] } : x)));
                      }}
                    >
                      <SelectTrigger className="h-9 text-[11px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(SEGMENT_FIELD_META) as SegmentField[]).map((f) => (
                          <SelectItem key={f} value={f}>{SEGMENT_FIELD_META[f].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={r.operator}
                      onValueChange={(v) => setRules((rs) => rs.map((x) => (x.id === r.id ? { ...x, operator: v as "is" | "is_not" } : x)))}
                    >
                      <SelectTrigger className="h-9 text-[11px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="is">برابر است با</SelectItem>
                        <SelectItem value="is_not">برابر نیست با</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={r.value}
                      onValueChange={(v) => setRules((rs) => rs.map((x) => (x.id === r.id ? { ...x, value: v } : x)))}
                    >
                      <SelectTrigger className="h-9 text-[11px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SEGMENT_FIELD_META[r.field].options.map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}

              <Button
                variant="outline" size="sm"
                className="w-full h-8 text-[11px] gap-1.5 border-dashed"
                onClick={() => {
                  const f: SegmentField = "city";
                  setRules((rs) => [...rs, { id: `r-temp-${++ruleSeq}`, field: f, operator: "is", value: SEGMENT_FIELD_META[f].options[0] }]);
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                افزودن شرط (AND)
              </Button>
            </div>

            {/* Live match count */}
            <div className="rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] text-teal-800 dark:text-teal-300">
                <Wand2 className="w-4 h-4" />
                مخاطبان منطبق (زنده):
              </div>
              <div className="text-xl font-bold text-teal-700 dark:text-teal-300 tabular-nums">{faNum(liveCount)}</div>
            </div>

            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 text-white gap-2"
              disabled={saving || !name.trim()}
              onClick={submit}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              ذخیره سگمنت
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف سگمنت؟</AlertDialogTitle>
            <AlertDialogDescription>
              سگمنت «{deleteTarget?.name}» با {faNum(deleteTarget?.matchCount ?? 0)} مخاطب حذف می‌شود.
              کمپین‌هایی که از این سگمنت استفاده کرده‌اند به کار خود ادامه می‌دهند، ولی این سگمنت دیگر برای کمپین‌های جدید قابل انتخاب نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { if (confirmDelete) deleteSegment(confirmDelete); setConfirmDelete(null); }}>
              حذف سگمنت
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
