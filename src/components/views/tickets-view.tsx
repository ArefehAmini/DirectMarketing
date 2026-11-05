"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { faNum, faTime, faMinutesAgo } from "@/lib/fa";
import { PageHeader, EmptyState } from "@/components/shared/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  LifeBuoy, Plus, Send, Bug, Sparkles, Smartphone, Megaphone, Puzzle, HelpCircle,
  CircleDot, Clock, CheckCircle2, XCircle, Hourglass, Wrench, ShieldCheck,
} from "lucide-react";

/* ═══════ سیستم تیکت پشتیبانی — کاربر ایراد ثبت می‌کند، مالک پیگیری می‌کند ═══════ */

type TicketMsg = { id: string; authorRole: string; authorName: string; body: string; createdAt: string };
type TicketRow = {
  id: string; refNo: number; subject: string; category: string; priority: string; status: string;
  createdAt: string; updatedAt: string; userName?: string; userEmail?: string; mine: boolean; messages: TicketMsg[];
};

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  bug: { label: "ایراد / باگ", icon: Bug, cls: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300" },
  feature: { label: "پیشنهاد امکانت", icon: Sparkles, cls: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300" },
  account: { label: "اکانت‌ها", icon: Smartphone, cls: "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300" },
  campaign: { label: "کمپین‌ها", icon: Megaphone, cls: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" },
  extension: { label: "افزونه / عامل مرورگر", icon: Puzzle, cls: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300" },
  other: { label: "سایر", icon: HelpCircle, cls: "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300" },
};

const STATUS_META: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  open: { label: "باز", icon: CircleDot, cls: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 border-red-200 dark:border-red-900" },
  in_progress: { label: "در حال بررسی", icon: Wrench, cls: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900" },
  waiting: { label: "در انتظار کاربر", icon: Hourglass, cls: "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-900" },
  resolved: { label: "حل شد", icon: CheckCircle2, cls: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900" },
  closed: { label: "بسته شد", icon: XCircle, cls: "bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800" },
};

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  low: { label: "کم", cls: "bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400" },
  normal: { label: "معمولی", cls: "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300" },
  high: { label: "مهم", cls: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300" },
  urgent: { label: "فوری", cls: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300" },
};

const relTime = (iso: string) => faMinutesAgo(Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000)));

export function TicketsView() {
  const { currentUser } = useApp();
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0 });
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const threadEnd = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tickets", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setRows(data.tickets ?? []);
      setStats(data.stats ?? stats);
      setIsOwner(!!data.isOwner);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return rows;
    if (statusFilter === "active") return rows.filter((t) => ["open", "in_progress", "waiting"].includes(t.status));
    return rows.filter((t) => t.status === statusFilter);
  }, [rows, statusFilter]);

  const selected = rows.find((t) => t.id === selectedId) ?? null;

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selected?.messages.length, selectedId]);

  const sendReply = async () => {
    const body = reply.trim();
    if (!selected || body.length < 2) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tickets/${selected.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        setReply("");
        await load();
      }
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (status: string) => {
    if (!selected) return;
    await fetch(`/api/tickets/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  };

  const ownerActions = isOwner && selected && !["closed"].includes(selected.status) && (
    <>
      {selected.status !== "in_progress" && (
        <Button size="sm" variant="outline" onClick={() => changeStatus("in_progress")} className="gap-1.5 text-xs">
          <Wrench className="w-3.5 h-3.5" /> در حال بررسی
        </Button>
      )}
      {selected.status !== "waiting" && (
        <Button size="sm" variant="outline" onClick={() => changeStatus("waiting")} className="gap-1.5 text-xs">
          <Hourglass className="w-3.5 h-3.5" /> انتظار پاسخ کاربر
        </Button>
      )}
      {selected.status !== "resolved" && (
        <Button size="sm" variant="outline" onClick={() => changeStatus("resolved")} className="gap-1.5 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5" /> حل شد
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={() => changeStatus("closed")} className="gap-1.5 text-xs">
        <XCircle className="w-3.5 h-3.5" /> بستن
      </Button>
    </>
  );

  const userClose = !isOwner && selected && !["closed", "resolved"].includes(selected.status) && (
    <Button size="sm" variant="outline" onClick={() => changeStatus("closed")} className="gap-1.5 text-xs">
      <XCircle className="w-3.5 h-3.5" /> مشکل حل شد — بستن تیکت
    </Button>
  );

  return (
    <div>
      <PageHeader
        title="پشتیبانی و تیکت"
        subtitle={isOwner
          ? "تیکت‌های ثبت‌شده کاربران — پیگیری، پاسخ و حل مشکل"
          : "ایراد یا مشکل را ثبت کنید تا تیم پشتیبانی پیگیری کند"}
        actions={
          <Button onClick={() => setNewOpen(true)} className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="w-4 h-4" /> تیکت جدید
          </Button>
        }
      />

      {/* آمار */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "کل تیکت‌ها", value: stats.total, icon: LifeBuoy, cls: "text-slate-500" },
          { label: "باز", value: stats.open, icon: CircleDot, cls: "text-red-500" },
          { label: "در حال بررسی", value: stats.inProgress, icon: Clock, cls: "text-amber-500" },
          { label: "حل‌شده/بسته", value: stats.resolved, icon: CheckCircle2, cls: "text-emerald-500" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4 flex items-center gap-3">
            <s.icon className={cn("w-5 h-5 shrink-0", s.cls)} />
            <div>
              <div className="text-lg font-bold tabular-nums leading-none">{faNum(s.value)}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-4 items-start">
        {/* لیست تیکت‌ها */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="p-3 border-b flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: "active", label: "فعال" },
              { id: "open", label: "باز" },
              { id: "in_progress", label: "در بررسی" },
              { id: "resolved", label: "حل‌شده" },
              { id: "closed", label: "بسته" },
              { id: "all", label: "همه" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer",
                  statusFilter === f.id ? "bg-teal-600 text-white" : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="max-h-[62vh] overflow-y-auto divide-y">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">در حال بارگذاری…</div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<LifeBuoy className="w-7 h-7" />}
                title="تیکتی نیست"
                description="با «تیکت جدید» ایراد یا پیشنهاد خود را ثبت کنید."
              />
            ) : (
              filtered.map((t) => {
                const cat = CATEGORY_META[t.category] ?? CATEGORY_META.other;
                const st = STATUS_META[t.status] ?? STATUS_META.open;
                const CatIcon = cat.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={cn(
                      "w-full text-right p-3.5 hover:bg-muted/50 transition-colors cursor-pointer",
                      selectedId === t.id && "bg-teal-50/60 dark:bg-teal-950/20"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", cat.cls)}>
                        <CatIcon className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-sm font-semibold truncate flex-1">{t.subject}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">#{faNum(t.refNo)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn("text-[10px] rounded-full border px-2 py-0.5", st.cls)}>{st.label}</span>
                      <span className={cn("text-[10px] rounded-full px-2 py-0.5", (PRIORITY_META[t.priority] ?? PRIORITY_META.normal).cls)}>
                        {(PRIORITY_META[t.priority] ?? PRIORITY_META.normal).label}
                      </span>
                      <span className="text-[10px] text-muted-foreground mr-auto">{relTime(t.updatedAt)}</span>
                    </div>
                    {isOwner && (
                      <div className="text-[10px] text-muted-foreground mt-1.5 truncate">
                        {t.userName} · {t.userEmail}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* گفتگوی تیکت */}
        <div className="rounded-xl border bg-card min-h-[420px] flex flex-col overflow-hidden">
          {!selected ? (
            <EmptyState
              icon={<LifeBuoy className="w-7 h-7" />}
              title="یک تیکت را انتخاب کنید"
              description="از فهرست سمت راست تیکت را انتخاب کنید تا گفتگو و وضعیت آن نمایش داده شود."
            />
          ) : (
            <>
              {/* هدر تیکت */}
              <div className="p-4 border-b flex flex-wrap items-center gap-2.5">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm truncate">{selected.subject}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    تیکت #{faNum(selected.refNo)} · {(CATEGORY_META[selected.category] ?? CATEGORY_META.other).label}
                    {isOwner && ` · ${selected.userName}`}
                  </div>
                </div>
                <span className={cn("text-[11px] rounded-full border px-2.5 py-1", (STATUS_META[selected.status] ?? STATUS_META.open).cls)}>
                  {(STATUS_META[selected.status] ?? STATUS_META.open).label}
                </span>
              </div>

              {/* پیام‌ها */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[46vh]">
                {selected.messages.map((m) => {
                  const isOwnerMsg = m.authorRole === "owner";
                  return (
                    <div key={m.id} className={cn("flex", isOwnerMsg ? "justify-start" : "justify-end")}>
                      <div className={cn("max-w-[78%] rounded-2xl px-3.5 py-2.5", isOwnerMsg
                        ? "bg-secondary rounded-tr-md"
                        : "bg-teal-600 text-white rounded-tl-md")}>
                        <div className={cn("text-[10px] font-semibold mb-1 flex items-center gap-1", isOwnerMsg ? "text-muted-foreground" : "text-teal-100")}>
                          {isOwnerMsg && <ShieldCheck className="w-3 h-3" />}
                          {isOwnerMsg ? `پشتیبانی — ${m.authorName}` : m.authorName}
                        </div>
                        <div className="text-[13px] leading-6 whitespace-pre-wrap break-words">{m.body}</div>
                        <div className={cn("text-[9px] mt-1", isOwnerMsg ? "text-muted-foreground/70" : "text-teal-100/80")}>
                          {faTime(new Date(m.createdAt))}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={threadEnd} />
              </div>

              {/* اقدامات وضعیت (مالک) */}
              {(ownerActions || userClose) && (
                <div className="px-4 pt-3 flex flex-wrap items-center gap-2 border-t">
                  {ownerActions}
                  {userClose}
                </div>
              )}

              {/* پاسخ */}
              {!["closed"].includes(selected.status) ? (
                <div className="p-3.5 flex items-end gap-2">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendReply(); }
                    }}
                    rows={2}
                    placeholder={isOwner ? "پاسخ پشتیبانی… (Ctrl+Enter برای ارسال)" : "شرح بیشتر یا پاسخ… (Ctrl+Enter برای ارسال)"}
                    className="flex-1 resize-none rounded-xl border bg-background px-3 py-2.5 text-[13px] leading-6 outline-none focus:ring-2 focus:ring-teal-500/30 min-h-[52px] max-h-32"
                  />
                  <Button onClick={sendReply} disabled={sending || reply.trim().length < 2} className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shrink-0">
                    <Send className="w-4 h-4" /> ارسال
                  </Button>
                </div>
              ) : (
                <div className="p-3.5 text-center text-[11px] text-muted-foreground border-t">
                  این تیکت بسته شده است — برای موضوع جدید تیکت تازه بسازید.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <NewTicketDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={async (refNo) => {
          await load();
          toastCreated(refNo);
        }}
      />
    </div>
  );
}

function toastCreated(refNo: number) {
  import("sonner").then(({ toast }) => toast.success(`تیکت #${faNum(refNo)} ثبت شد — تیم پشتیبانی بررسی می‌کند`));
}

/* ═══════ دیالوگ تیکت جدید ═══════ */
function NewTicketDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (refNo: number) => void }) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("bug");
  const [priority, setPriority] = useState("normal");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (subject.trim().length < 3 || message.trim().length < 10) return;
    setSending(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), category, priority, message: message.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubject(""); setMessage("");
        onClose();
        onCreated(data.refNo);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><LifeBuoy className="w-5 h-5 text-teal-600" />ثبت تیکت جدید</DialogTitle>
          <DialogDescription>مشکل، ایراد یا پیشنهاد خود را با جزئیات شرح دهید — هرچه دقیق‌تر، سریع‌تر حل می‌شود.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5 py-1">
          <div className="space-y-1.5">
            <Label>موضوع</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="مثلاً: ارسال کمپین روبیکا متوقف می‌شود" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>دسته‌بندی</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_META).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>اهمیت</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_META).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>شرح مشکل</Label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="چه اتفاقی افتاد؟ در کدام بخش؟ پیام خطا اگر هست را کپی کنید…"
              className="w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-[13px] leading-6 outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>انصراف</Button>
          <Button
            onClick={submit}
            disabled={sending || subject.trim().length < 3 || message.trim().length < 10}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
          >
            <Send className="w-4 h-4" /> ثبت تیکت
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
