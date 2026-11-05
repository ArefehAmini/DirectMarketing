"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app-store";
import { PageHeader, EmptyState } from "@/components/shared/ui-bits";
import { TaskStatusBadge, ActionBadge, timeAgo, durationLabel, FriendlyError, StepIcon, platformFa } from "@/components/shared/agent-bits";
import { PlatformIcon } from "@/components/shared/platform-icon";
import {
  AgentTaskStatus, AGENT_TASK_STATUS_META, AgentTaskInfo, AGENT_ERROR_META,
  AGENT_ACTION_META, AgentAction, AgentLoopStep, WORKER_STATUS_META,
} from "@/lib/types";
import { faNum } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search, Plus, Pause, Play, XCircle, RotateCcw, Bot, ListOrdered,
  Send, ShieldCheck, ExternalLink, Hand, Workflow, Globe,
} from "lucide-react";

type FilterKey = "all" | AgentTaskStatus;

const FILTER_ORDER: FilterKey[] = ["all", "queued", "received", "running", "verifying", "success", "failed", "paused", "human_action", "canceled"];

export function AgentTasksView() {
  const { agents, dispatchTask, bulkTaskOp } = useApp();
  const tasks = agents.tasks;

  const [filter, setFilter] = useState<FilterKey>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<AgentTaskInfo | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: tasks.length };
    for (const t of tasks) c[t.status] = (c[t.status] ?? 0) + 1;
    return c;
  }, [tasks]);

  const filtered = useMemo(() => {
    let list = tasks;
    if (filter !== "all") list = list.filter((t) => t.status === filter);
    if (q.trim()) {
      const needle = q.trim().replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
      list = list.filter(
        (t) =>
          String(t.refNo).includes(needle) ||
          t.target.includes(needle) ||
          t.accountName.includes(needle) ||
          t.platform.includes(needle.toLowerCase()) ||
          t.action.toLowerCase().includes(needle.toLowerCase()) ||
          (agents.workers.find((w) => w.id === t.workerId)?.name ?? "").includes(needle)
      );
    }
    return list;
  }, [tasks, filter, q, agents.workers]);

  const toggleAll = () => {
    const actionable = filtered.filter((t) => ["queued", "received", "running", "verifying", "paused", "human_action", "failed"].includes(t.status));
    if (selected.size === actionable.length) setSelected(new Set());
    else setSelected(new Set(actionable.map((t) => t.id)));
  };

  const runBulk = async (op: "pause" | "resume" | "cancel" | "retry") => {
    if (!selected.size) return;
    const n = await bulkTaskOp(op, Array.from(selected));
    if (n > 0) toast.success(`عملیات «${op === "pause" ? "توقف" : op === "resume" ? "ادامه" : op === "cancel" ? "لغو" : "تلاش مجدد"}» روی ${faNum(n)} وظیفه اعمال شد`);
    else toast.info("هیچ وظیفه‌ای با این وضعیت قابل انجام نبود");
    setSelected(new Set());
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="وظایف عامل"
        subtitle="مانیتور زنده اجرای دستورات روی Browser Workerها — با چرخه کامل Queued تا Success"
        actions={
          <Button onClick={() => setNewOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
            <Plus className="w-4 h-4" /> دستور جدید
          </Button>
        }
      />

      {/* فیلترها */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTER_ORDER.map((f) => {
          const n = counts[f] ?? 0;
          if (f !== "all" && n === 0 && filter !== f) return null;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                filter === f ? "bg-teal-600 text-white border-teal-600" : "bg-white text-muted-foreground hover:border-teal-400"
              )}
            >
              {f === "all" ? "همه" : AGENT_TASK_STATUS_META[f].label}
              <span className={cn("mr-1.5", filter === f ? "text-white/80" : "text-muted-foreground/70")}>{faNum(n)}</span>
            </button>
          );
        })}
        <div className="relative mr-auto w-full sm:w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی وظیفه، مخاطب، اکانت…" className="pr-9" />
        </div>
      </div>

      {/* عملیات گروهی */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-secondary/40 p-3">
          <span className="text-xs font-semibold text-foreground">{faNum(selected.size)} وظیفه انتخاب شده:</span>
          <Button size="sm" variant="outline" onClick={() => runBulk("pause")} className="gap-1 text-xs h-8"><Pause className="w-3.5 h-3.5" /> توقف</Button>
          <Button size="sm" variant="outline" onClick={() => runBulk("resume")} className="gap-1 text-xs h-8"><Play className="w-3.5 h-3.5" /> ادامه</Button>
          <Button size="sm" variant="outline" onClick={() => runBulk("retry")} className="gap-1 text-xs h-8"><RotateCcw className="w-3.5 h-3.5" /> تلاش مجدد</Button>
          <Button size="sm" variant="outline" onClick={() => runBulk("cancel")} className="gap-1 text-xs h-8 text-red-600 border-red-200 hover:bg-red-50"><XCircle className="w-3.5 h-3.5" /> لغو</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="mr-auto text-xs h-8">پاک‌کردن انتخاب</Button>
        </div>
      )}

      {/* جدول */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<ListOrdered className="w-8 h-8" />}
              title="وظیفه‌ای پیدا نشد"
              description="از دکمه «دستور جدید» یک وظیفه بسازید یا از صفحه Browser Workers سناریوهای تست را اجرا کنید."
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={selected.size > 0 && selected.size === filtered.filter((t) => ["queued", "received", "running", "verifying", "paused", "human_action", "failed"].includes(t.status)).length} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>وظیفه</TableHead>
                  <TableHead>پلتفرم / اکانت</TableHead>
                  <TableHead>Worker</TableHead>
                  <TableHead>مقصد</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead>مدت</TableHead>
                  <TableHead>نتیجه</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 60).map((t) => {
                  const w = agents.workers.find((x) => x.id === t.workerId);
                  return (
                    <TableRow key={t.id} className="cursor-pointer" onClick={() => setDetail(t)}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(t.id)}
                          onCheckedChange={(c) => {
                            const s = new Set(selected);
                            if (c) s.add(t.id); else s.delete(t.id);
                            setSelected(s);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-mono text-muted-foreground">TASK-{faNum(t.refNo)}</div>
                        <ActionBadge action={t.action} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <PlatformIcon platform={t.platform} className="w-4 h-4" />
                          <span className="text-xs">{platformFa(t.platform)}</span>
                        </div>
                        {t.accountName && <div className="text-[10px] text-muted-foreground">{t.accountName}</div>}
                      </TableCell>
                      <TableCell>
                        {w ? (
                          <div className="flex items-center gap-1.5">
                            <span className={cn("w-2 h-2 rounded-full", WORKER_STATUS_META[w.status].dot)} />
                            <span className="text-xs">#{faNum(String(w.workerNo).padStart(3, "0"))}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell><span className="text-xs">{t.target || t.payload?.groupName || "—"}</span></TableCell>
                      <TableCell><TaskStatusBadge status={t.status as AgentTaskStatus} size="sm" /></TableCell>
                      <TableCell><span className="text-xs tabular-nums text-muted-foreground">{durationLabel(t.startedAt, t.finishedAt)}</span></TableCell>
                      <TableCell>
                        {t.status === "success" ? (
                          <span className="text-[11px] text-emerald-700 line-clamp-1 max-w-40">{t.result || "موفق"}</span>
                        ) : t.status === "failed" || t.errorKind ? (
                          <span className="text-[11px] text-red-600 line-clamp-1 max-w-40">{AGENT_ERROR_META[t.errorKind as keyof typeof AGENT_ERROR_META]?.label ?? t.error}</span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* جزئیات وظیفه */}
      <TaskDetail task={detail} onClose={() => setDetail(null)} onRetry={async (id) => { const n = await bulkTaskOp("retry", [id]); if (n) toast.success("وظیفه دوباره به صف رفت"); setDetail(null); }} onResume={async (id) => { const n = await bulkTaskOp("resume", [id]); if (n) toast.success("اقدام ثبت شد — وظیفه به صف بازگشت و ادامه پیدا می‌کند"); setDetail(null); }} />

      <NewTaskDialog open={newOpen} onClose={() => setNewOpen(false)} dispatchTask={dispatchTask} />
    </div>
  );
}

/* ═══════ جزئیات وظیفه — تایم‌لاین Agent Loop ═══════ */
function TaskDetail({
  task,
  onClose,
  onRetry,
  onResume,
}: {
  task: AgentTaskInfo | null;
  onClose: () => void;
  onRetry: (id: string) => void;
  onResume: (id: string) => void;
}) {
  const { navigate } = useApp();
  if (!task) return null;

  const payloadEntries = Object.entries(task.payload ?? {}).filter(([k]) => k !== "scenario");

  return (
    <Dialog open={!!task} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-teal-600" />
            TASK-{faNum(task.refNo)}
            <TaskStatusBadge status={task.status as AgentTaskStatus} size="sm" />
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-3 text-xs">
            <ActionBadge action={task.action} platform={task.platform} />
            {task.accountName && <span>اکانت: {task.accountName}</span>}
            <span>ایجاد: {timeAgo(task.createdAt)}</span>
            <span>مدت: {durationLabel(task.startedAt, task.finishedAt)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* تایم‌لاین Agent Loop */}
          <div className="rounded-xl border p-4 space-y-3">
            <div className="text-xs font-semibold flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-teal-600" />
              Agent Loop — مشاهده → درک → تصمیم → اجرا → بررسی → گزارش
            </div>
            <div className="space-y-2.5">
              {(task.steps?.length ? task.steps : []).map((s: AgentLoopStep) => (
                <div key={s.key} className="flex items-start gap-2.5">
                  <StepIcon state={s.state} />
                  <div className="min-w-0">
                    <div className={cn("text-xs font-medium", s.state === "pending" && "text-muted-foreground", s.state === "failed" && "text-red-600")}>{s.label}</div>
                    {s.detail && <div className="text-[11px] text-muted-foreground leading-4">{s.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* مقصد و Payload */}
          {(task.target || payloadEntries.length > 0) && (
            <div className="rounded-xl border p-4 space-y-2">
              <div className="text-xs font-semibold">Payload</div>
              {task.target && <div className="text-xs text-muted-foreground">مقصد: <b className="text-foreground">{task.target}</b></div>}
              {payloadEntries.map(([k, v]) => (
                <div key={k} className="text-xs text-muted-foreground">
                  {k}: <span className="text-foreground break-all">{Array.isArray(v) ? v.join("، ") : String(v)}</span>
                </div>
              ))}
              {task.chatType && <div className="text-xs text-muted-foreground">نوع چت تشخیص‌داده‌شده: <b className="text-foreground">{task.chatType === "group" ? "گروه" : "گفتگوی خصوصی"}</b></div>}
            </div>
          )}

          {/* خطا */}
          {(task.status === "failed" || task.status === "human_action") && task.errorKind && (
            <FriendlyError errorKind={task.errorKind} error={task.error} />
          )}

          {/* اقدام‌ها — Manual Takeover §۳۲ */}
          <div className="flex flex-wrap gap-2">
            {(task.status === "failed" || task.status === "canceled") && (
              <Button size="sm" variant="outline" onClick={() => onRetry(task.id)} className="gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> تلاش دوباره
              </Button>
            )}
            {task.status === "human_action" && (
              <Button size="sm" onClick={() => onResume(task.id)} className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white">
                <Hand className="w-3.5 h-3.5" /> اقدام انجام شد — ادامه وظیفه
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => { navigate("connection-map"); onClose(); }} className="gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" /> مشاهده در نقشه اتصال
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════ دیالوگ دستور جدید ═══════ */
function NewTaskDialog({
  open,
  onClose,
  dispatchTask,
}: {
  open: boolean;
  onClose: () => void;
  dispatchTask: ReturnType<typeof useApp.getState>["dispatchTask"];
}) {
  const { agents } = useApp();
  const onlineWorkers = agents.workers.filter((w) => w.status !== "pending");

  const [workerId, setWorkerId] = useState("");
  const [action, setAction] = useState<AgentAction>("SEND_TEXT");
  const [platform, setPlatform] = useState("telegram");
  const [target, setTarget] = useState("علی رضایی");
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("سلام! این پیام توسط عامل مرورگر ارسال شده است.");

  /* اگر «مخاطب مقصد» خودش شماره باشد (≥۱۰ رقم)، همان به‌عنوان شماره استفاده می‌شود */
  const digitsOf = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^0-9+]/g, "");
  const targetAsPhone = digitsOf(target).replace(/\D/g, "").length >= 10 ? digitsOf(target) : "";
  const effectivePhone = phone.trim() || targetAsPhone;

  const send = async () => {
    if (!workerId) return toast.error("ابتدا یک Worker انتخاب کنید");
    const payload: Record<string, unknown> = {};
    if (action === "SEND_TEXT") payload.text = text;
    if (action === "SEND_IMAGE") payload.image = "photo.jpg";
    if (action === "SEND_FILE") payload.file = "document.pdf";
    if (action === "SEND_IMAGE_WITH_CAPTION") { payload.image = "photo.jpg"; payload.caption = text; }
    if (action === "CREATE_GROUP") { payload.groupName = target || "گروه جدید"; payload.members = ["علی رضایی", "سارا محمدی", "مهدی نوری"]; }
    /* § Contact Resolution — عامل فقط یکبار و فقط با شماره جستجو می‌کند؛
       displayName فقط برای تطبیق هویت مقصد است (نه جستجو) */
    if (effectivePhone) payload.phone = effectivePhone;
    if (action !== "CREATE_GROUP") payload.displayName = target;
    const res = await dispatchTask({ workerId, action, platform: platform as never, target: AGENT_ACTION_META[action].needsTarget ? target : "", payload });
    if (res.ok) {
      toast.success(`وظیفه TASK-${faNum(res.refNo ?? 0)} به صف رفت`);
      onClose();
    } else toast.error(res.error ?? "خطا");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Send className="w-5 h-5 text-teal-600" />دستور جدید به عامل مرورگر</DialogTitle>
          <DialogDescription>وظیفه به صف Worker می‌رود و پس از دریافت، با Agent Loop اجرا می‌شود.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5 py-1">
          <div className="space-y-1.5">
            <Label>Worker</Label>
            <Select value={workerId} onValueChange={setWorkerId}>
              <SelectTrigger><SelectValue placeholder="انتخاب Worker" /></SelectTrigger>
              <SelectContent>
                {onlineWorkers.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    Worker #{faNum(String(w.workerNo).padStart(3, "0"))} — {WORKER_STATUS_META[w.status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {onlineWorkers.length === 0 && (
              <div className="text-[11px] text-amber-600 flex items-center gap-1"><Globe className="w-3 h-3" />هیچ Worker جفت‌شده‌ای وجود ندارد</div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Action</Label>
            <Select value={action} onValueChange={(v) => setAction(v as AgentAction)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(AGENT_ACTION_META) as AgentAction[]).map((a) => (
                  <SelectItem key={a} value={a}>{AGENT_ACTION_META[a].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>پلتفرم</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="telegram">تلگرام</SelectItem>
                <SelectItem value="whatsapp">واتساپ</SelectItem>
                <SelectItem value="rubika">روبیکا</SelectItem>
                <SelectItem value="bale">بله</SelectItem>
                <SelectItem value="eitaa">ایتا</SelectItem>
                <SelectItem value="soroush">سروش</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {AGENT_ACTION_META[action].needsTarget && (
            <div className="space-y-1.5">
              <Label>{action === "CREATE_GROUP" ? "نام گروه" : "مخاطب مقصد"}</Label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
          )}
          {AGENT_ACTION_META[action].needsTarget && action !== "CREATE_GROUP" && !targetAsPhone && (
            <div className="space-y-1.5">
              <Label>
                شماره مخاطب <span className="text-[10px] text-muted-foreground font-normal">(کلید جستجو — حتی اگر در مخاطبین ذخیره نباشد)</span>
              </Label>
              <Input dir="ltr" className="text-left" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0912…" />
              <div className="text-[10px] text-muted-foreground leading-4">
                با پر کردن شماره، عامل فقط با شماره جستجو می‌کند و به حساب مخاطب می‌رسد — حتی اگر مخاطب ذخیره نشده باشد. نام بالا فقط برای تأیید هویت مقصد استفاده می‌شود.
              </div>
            </div>
          )}
          {(action === "SEND_TEXT" || action === "SEND_IMAGE_WITH_CAPTION") && (
            <div className="space-y-1.5">
              <Label>{action === "SEND_TEXT" ? "متن پیام" : "کپشن"}</Label>
              <Input value={text} onChange={(e) => setText(e.target.value)} />
            </div>
          )}
          <div className="rounded-lg bg-secondary/50 p-2.5 text-[11px] leading-5 text-muted-foreground flex items-start gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />
            Preview و تأیید برای عملیات حساس در پنل فعال است — عامل فقط دستورات معتبر و مجاز را اجرا می‌کند.
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>انصراف</Button>
          <Button onClick={send} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"><Send className="w-4 h-4" /> ارسال به صف</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
