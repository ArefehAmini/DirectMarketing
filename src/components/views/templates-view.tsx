"use client";
import { useState } from "react";
import { useApp } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/fa";
import { TEMPLATE_CATEGORY_META, TemplateCategory, PERSONALIZATION_VARS } from "@/lib/types";
import { PageHeader, EmptyState } from "@/components/shared/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, FileText, Trash2, Loader2, Megaphone, Sparkles, Copy } from "lucide-react";

export function TemplatesView() {
  const { templates, addTemplate, deleteTemplate, markTemplateUsed, navigate } = useApp();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", category: "intro" as TemplateCategory, body: "" });

  const filtered = categoryFilter === "all" ? templates : templates.filter((t) => t.category === categoryFilter);
  const deleteTarget = templates.find((t) => t.id === confirmDelete);

  const insertVar = (key: string) => setForm((f) => ({ ...f, body: f.body + key }));

  const submit = () => {
    if (!form.name.trim() || !form.body.trim()) return;
    setSaving(true);
    setTimeout(() => {
      addTemplate({ name: form.name.trim(), category: form.category, body: form.body.trim() });
      setSaving(false);
      setCreateOpen(false);
      setForm({ name: "", category: "intro", body: "" });
    }, 600);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="قالب‌های پیام"
        subtitle="کتابخانه قالب‌های آماده با متغیرهای شخصی‌سازی — قابل استفاده در کمپین و پاسخ‌گویی Inbox"
        actions={
          <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            قالب جدید
          </Button>
        }
      />

      {/* Category filter */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => setCategoryFilter("all")}
          className={cn("rounded-full px-3 py-1.5 text-[11px] font-medium border transition-colors cursor-pointer",
            categoryFilter === "all" ? "bg-teal-600 text-white border-teal-600" : "bg-background text-muted-foreground hover:border-foreground/30")}
        >
          همه ({faNum(templates.length)})
        </button>
        {(Object.keys(TEMPLATE_CATEGORY_META) as TemplateCategory[]).map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={cn("rounded-full px-3 py-1.5 text-[11px] font-medium border transition-colors cursor-pointer",
              categoryFilter === c ? "bg-teal-600 text-white border-teal-600" : "bg-background text-muted-foreground hover:border-foreground/30")}
          >
            {TEMPLATE_CATEGORY_META[c].label} ({faNum(templates.filter((t) => t.category === c).length)})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border bg-card">
          <EmptyState
            icon={<FileText className="w-8 h-8" />}
            title="قالبی در این دسته وجود ندارد"
            description="قالب‌های ذخیره‌شده با متغیرهای {{نام}}، {{نام کسب‌وکار}} و… در کمپین‌ها به‌صورت خودکار شخصی‌سازی می‌شوند."
            action={
              <Button onClick={() => setCreateOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white">
                ساخت اولین قالب
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((t) => (
            <div key={t.id} className="rounded-2xl border bg-card p-4 space-y-3 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", TEMPLATE_CATEGORY_META[t.category].color)}>
                  {TEMPLATE_CATEGORY_META[t.category].label}
                </span>
                <button onClick={() => setConfirmDelete(t.id)} className="text-muted-foreground hover:text-red-600 transition-colors cursor-pointer" aria-label="حذف قالب">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="text-sm font-bold">{t.name}</div>
              <p className="text-[11px] leading-5 text-muted-foreground whitespace-pre-wrap line-clamp-5 flex-1">{t.body}</p>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{faNum(t.uses)} بار استفاده</span>
                {t.lastUsed && <span>آخرین استفاده: {t.lastUsed}</span>}
              </div>
              <div className="flex gap-1.5">
                <Button
                  variant="outline" size="sm"
                  className="flex-1 h-8 text-[11px] gap-1.5"
                  onClick={() => {
                    navigator.clipboard?.writeText(t.body);
                    markTemplateUsed(t.id);
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                  کپی متن
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-8 text-[11px] gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={() => {
                    markTemplateUsed(t.id);
                    navigate("create-campaign", { templateId: t.id });
                  }}
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  استفاده در کمپین
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>قالب پیام جدید</DialogTitle>
            <DialogDescription>
              از متغیرها استفاده کنید تا در کمپین‌ها به‌صورت خودکار با اطلاعات هر مخاطب جایگزین شوند.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label htmlFor="tpl-name">نام قالب</Label>
              <Input id="tpl-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثلاً: معرفی خدمات برای فروشندگان مبلمان" />
            </div>
            <div className="space-y-2">
              <Label>دسته‌بندی</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as TemplateCategory }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TEMPLATE_CATEGORY_META) as TemplateCategory[]).map((c) => (
                    <SelectItem key={c} value={c}>{TEMPLATE_CATEGORY_META[c].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="tpl-body">متن قالب</Label>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-violet-500" />
                  در کمپین می‌توانید با AI بهبودش دهید
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {PERSONALIZATION_VARS.map((v) => (
                  <button
                    key={v.key}
                    onClick={() => insertVar(v.key)}
                    title={v.label}
                    className="rounded-full bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-100 transition-colors cursor-pointer"
                  >
                    {v.key}
                  </button>
                ))}
              </div>
              <Textarea id="tpl-body" rows={5} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="سلام {{نام}}، برای کسب‌وکار {{نام کسب‌وکار}} یک پیشنهاد ویژه آماده کرده‌ایم…" />
            </div>
            <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white gap-2" disabled={saving || !form.name.trim() || !form.body.trim()} onClick={submit}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              ذخیره قالب
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف قالب؟</AlertDialogTitle>
            <AlertDialogDescription>
              قالب «{deleteTarget?.name}» حذف می‌شود. کمپین‌هایی که قبلاً از این قالب استفاده کرده‌اند بدون تغییر باقی می‌مانند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { if (confirmDelete) deleteTemplate(confirmDelete); setConfirmDelete(null); }}>
              حذف قالب
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
