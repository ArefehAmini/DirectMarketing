"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app-store";
import { PlatformIcon } from "@/components/shared/platform-icon";
import {
  WorkerStatusBadge, TaskStatusBadge, TabStatusDot, SessionBadge, ChatTypeBadge,
  ActionBadge, timeAgo, durationLabel, platformFa,
} from "@/components/shared/agent-bits";
import {
  WORKER_STATUS_META, SCENARIO_META, ScenarioKind,
  AGENT_ACTION_META, AgentAction, PLATFORMS, PLATFORM_LABEL, Platform, EXTENSION_LATEST_VERSION,
} from "@/lib/types";
import { faNum, maskPhone } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Chrome, Cpu, Activity, Globe, MonitorSmartphone, Smartphone, ListOrdered, ScrollText,
  Zap, FlaskConical, Send, Unlink, Link2, ShieldCheck, RefreshCw, LogIn, ArrowRight, X,
} from "lucide-react";

export function WorkerDetails({
  workerId,
  onClose,
  onRevoke,
}: {
  workerId: string | null;
  onClose: () => void;
  onRevoke: (id: string) => void;
}) {
  const { agents, accounts, bindAccountToWorker, unbindAccount, dispatchTask, workerOnline, toggleSimOffline, runScenario } = useApp();
  const worker = agents.workers.find((w) => w.id === workerId) ?? null;
  const workerTasks = useMemo(
    () => agents.tasks.filter((t) => t.workerId === workerId),
    [agents.tasks, workerId]
  );
  const workerEvents = useMemo(
    () => agents.events.filter((e) => e.workerId === workerId).slice(0, 30),
    [agents.events, workerId]
  );
  const bound = accounts.filter((a) => a.workerId === workerId);
  const unbound = accounts.filter((a) => !a.workerId && a.status === "active");

  /* دیالوگ ارسال دستور */
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdAction, setCmdAction] = useState<AgentAction>("SEND_TEXT");
  const [cmdPlatform, setCmdPlatform] = useState<Platform>("telegram");
  const [cmdTarget, setCmdTarget] = useState("علی رضایی");
  const [cmdPhone, setCmdPhone] = useState("");
  const [cmdText, setCmdText] = useState("سلام! این پیام توسط عامل مرورگر ارسال شده است.");

  if (!worker) return null;
  const statusMeta = WORKER_STATUS_META[worker.status];

  const sendCommand = async () => {
    const meta = AGENT_ACTION_META[cmdAction];
    const payload: Record<string, unknown> = {};
    if (cmdAction === "SEND_TEXT") payload.text = cmdText;
    if (cmdAction === "SEND_IMAGE") payload.image = "photo.jpg";
    if (cmdAction === "SEND_FILE") payload.file = "document.pdf";
    if (cmdAction === "SEND_IMAGE_WITH_CAPTION") { payload.image = "photo.jpg"; payload.caption = cmdText; }
    if (cmdAction === "CREATE_GROUP") { payload.groupName = cmdTarget || "گروه جدید"; payload.members = ["علی رضایی", "سارا محمدی", "مهدی نوری"]; }
    if (meta.needsTarget && cmdAction !== "CREATE_GROUP") {
      /* § Contact Resolution — جستجو فقط با شماره؛ نام فقط برای تطبیق هویت */
      if (cmdPhone.trim()) payload.phone = cmdPhone.trim();
      payload.displayName = cmdTarget;
    }
    const res = await dispatchTask({
      workerId: worker.id,
      action: cmdAction,
      platform: cmdPlatform,
      target: meta.needsTarget ? cmdTarget : "",
      payload,
    });
    if (res.ok) {
      toast.success(`وظیفه TASK-${faNum(res.refNo ?? 0)} در صف قرار گرفت`);
      setCmdOpen(false);
    } else toast.error(res.error ?? "خطا");
  };

  return (
    <Dialog open={!!workerId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2.5">
            <span className={cn("w-9 h-9 rounded-xl flex items-center justify-center", statusMeta.bg)}>
              {worker.simulated ? <Zap className="w-5 h-5 text-violet-600" /> : <Chrome className="w-5 h-5 text-teal-600" />}
            </span>
            <span>
              Worker #{faNum(String(worker.workerNo).padStart(3, "0"))}
              <span className="text-muted-foreground font-normal text-sm mr-2">— {worker.name}</span>
            </span>
            <WorkerStatusBadge status={worker.status} size="sm" />
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1"><Cpu className="w-3.5 h-3.5" />{worker.chromeVersion || "Chrome"}</span>
            <span className="inline-flex items-center gap-1"><MonitorSmartphone className="w-3.5 h-3.5" />{worker.profileLabel || "—"}</span>
            <span className="inline-flex items-center gap-1"><Activity className="w-3.5 h-3.5" />آخرین Heartbeat: {timeAgo(worker.lastHeartbeat)}</span>
            <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />افزونه v{faNum(worker.extVersion || "—")}{worker.extVersion && worker.extVersion !== EXTENSION_LATEST_VERSION ? " (نیاز به بروزرسانی)" : ""}</span>
          </DialogDescription>
        </DialogHeader>

        {/* اقدام‌های وضعیت خاص */}
        {worker.status === "needs_action" && (
          <div className="rounded-xl border border-orange-300 bg-orange-50 p-3.5 space-y-2">
            <div className="text-sm font-semibold text-orange-800 flex items-center gap-2">
              <LogIn className="w-4 h-4" />
              نیاز به ورود مجدد در مرورگر
            </div>
            <div className="text-xs text-orange-700 leading-5">
              نشست یکی از اکانت‌ها منقضی شده یا مانع امنیتی فعال است. در تب مربوطه وارد شوید و سپس «ورود انجام شد» را بزنید تا وظایف متوقف‌شده به صف برگردند.
            </div>
            <Button size="sm" onClick={() => { workerOnline(worker.id); toast.success("Worker دوباره فعال شد و وظایف به صف بازگشتند"); }} className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white">
              <CheckIcon />
              ورود انجام شد — ادامه وظایف
            </Button>
          </div>
        )}

        <Tabs defaultValue="info" className="mt-1">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="info">اطلاعات</TabsTrigger>
            <TabsTrigger value="tabs">تب‌ها ({faNum(worker.tabs.length)})</TabsTrigger>
            <TabsTrigger value="accounts">اکانت‌ها ({faNum(bound.length)})</TabsTrigger>
            <TabsTrigger value="tasks">وظایف ({faNum(workerTasks.length)})</TabsTrigger>
            <TabsTrigger value="events">رویدادها</TabsTrigger>
          </TabsList>

          {/* ── اطلاعات + سناریوها ── */}
          <TabsContent value="info" className="space-y-4 pt-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <InfoBox label="وظایف فعال" value={faNum(worker.activeTasks)} />
              <InfoBox label="وظایف ناموفق" value={faNum(worker.errorTasks)} tone={worker.errorTasks > 0 ? "text-red-600" : undefined} />
              <InfoBox label="تب‌های باز" value={faNum(worker.tabs.length)} />
              <InfoBox label="اکانت متصل" value={faNum(bound.length)} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setCmdOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
                <Send className="w-3.5 h-3.5" /> ارسال دستور
              </Button>
              <Button size="sm" variant="outline" onClick={() => { workerOnline(worker.id); toast.info("وضعیت Worker به‌روزرسانی شد"); }} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> بررسی مجدد اتصال
              </Button>
              {worker.simulated && (
                <Button size="sm" variant="outline" onClick={() => { toggleSimOffline(worker.id); toast.info("Heartbeat قطع شد — وضعیت به Offline تغییر می‌کند"); }} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
                  <Globe className="w-3.5 h-3.5" /> قطع اتصال (آزمایش)
                </Button>
              )}
            </div>

            <div className="rounded-xl border p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FlaskConical className="w-4 h-4 text-violet-600" />
                سناریوهای تست — اجرای واقعی در خط‌لوله افزونه
              </div>
              <div className="text-xs text-muted-foreground leading-5">
                هر سناریو یک وظیفه واقعی می‌سازد که همان مسیر API افزونه را طی می‌کند: صف → دریافت → Agent Loop → بررسی → گزارش.
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {(Object.keys(SCENARIO_META) as ScenarioKind[]).map((k) => {
                  const s = SCENARIO_META[k];
                  return (
                    <button
                      key={k}
                      onClick={() => runScenario(worker.id, k)}
                      className="text-right rounded-lg border bg-white hover:border-teal-400 hover:bg-teal-50/50 transition-colors p-2.5 group cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-secondary text-[10px] font-bold flex items-center justify-center shrink-0">{s.code}</span>
                        <span className="text-xs font-semibold text-foreground truncate">{s.label}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1 leading-4 line-clamp-2">{s.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={() => onRevoke(worker.id)} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
              <X className="w-3.5 h-3.5" /> ابطال Worker و لغو دسترسی افزونه
            </Button>
          </TabsContent>

          {/* ── تب‌های مرورگر ── */}
          <TabsContent value="tabs" className="pt-3">
            {worker.tabs.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">هنوز تب مرورگری گزارش نشده است.</div>
            ) : (
              <div className="space-y-2">
                {worker.tabs.map((t, i) => (
                  <div key={i} className="rounded-xl border p-3.5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {t.platform !== "other" && <PlatformIcon platform={t.platform} className="w-4.5 h-4.5" />}
                        <span className="text-sm font-semibold">{t.title || platformFa(t.platform)}</span>
                        <TabStatusDot status={t.status as never} />
                      </div>
                      <SessionBadge state={t.session as never} />
                    </div>
                    {t.chatName && (
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>چت جاری: <b className="text-foreground">{t.chatName}</b></span>
                        <ChatTypeBadge type={t.chatType as never} />
                      </div>
                    )}
                    {t.url && <div className="text-[10px] text-muted-foreground font-mono truncate" dir="ltr">{t.url}</div>}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── اکانت‌های متصل (Account → Worker Mapping §۴۴) ── */}
          <TabsContent value="accounts" className="pt-3 space-y-3">
            {bound.length > 0 ? (
              <div className="space-y-2">
                {bound.map((a) => (
                  <div key={a.id} className="rounded-xl border p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlatformIcon platform={a.platform} className="w-4.5 h-4.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{a.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono" dir="ltr">{maskPhone(a.phone)} — Tab #{a.tabId ?? "—"}</div>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { unbindAccount(a.id); toast.success("اتصال حذف شد"); }} className="text-red-500 hover:text-red-600 shrink-0">
                      <Unlink className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3">هنوز اکانتی به این Worker متصل نشده — از لیست زیر اتصال دهید.</div>
            )}
            {unbound.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" />اتصال اکانت جدید</div>
                <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {unbound.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => { bindAccountToWorker(a.id, worker.id); toast.success(`${a.name} به Worker متصل شد`); }}
                      className="flex items-center gap-2 rounded-lg border p-2.5 hover:border-teal-400 hover:bg-teal-50/50 text-right cursor-pointer"
                    >
                      <PlatformIcon platform={a.platform} className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-medium truncate">{a.name}</span>
                      <span className="text-[10px] text-muted-foreground mr-auto font-mono" dir="ltr">{maskPhone(a.phone)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── وظایف Worker ── */}
          <TabsContent value="tasks" className="pt-3">
            {workerTasks.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">هنوز وظیفه‌ای اجرا نشده — از «ارسال دستور» یا سناریوهای تست استفاده کنید.</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {workerTasks.slice(0, 20).map((t) => (
                  <div key={t.id} className="rounded-xl border p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">TASK-{faNum(t.refNo)}</span>
                        <ActionBadge action={t.action} platform={t.platform} />
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{t.target || t.payload?.groupName || "—"}</div>
                    </div>
                    <div className="text-left shrink-0 space-y-1">
                      <TaskStatusBadge status={t.status as never} size="sm" />
                      <div className="text-[10px] text-muted-foreground">{durationLabel(t.startedAt, t.finishedAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── رویدادها ── */}
          <TabsContent value="events" className="pt-3">
            {workerEvents.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">رویدادی ثبت نشده است.</div>
            ) : (
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {workerEvents.map((e) => (
                  <div key={e.id} className="flex items-start gap-2.5 rounded-lg border p-2.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", e.type.includes("fail") || e.type.includes("error") || e.type.includes("offline") ? "bg-red-500" : e.type.includes("sent") || e.type.includes("connected") ? "bg-emerald-500" : "bg-amber-500")} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium">{e.title}</div>
                      {e.detail && <div className="text-[11px] text-muted-foreground leading-4">{e.detail}</div>}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(e.at)}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* دیالوگ ارسال دستور */}
        <Dialog open={cmdOpen} onOpenChange={setCmdOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>ارسال دستور به Worker #{faNum(String(worker.workerNo).padStart(3, "0"))}</DialogTitle>
              <DialogDescription>دستور از پنل به افزونه ارسال و با Agent Loop اجرا می‌شود.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3.5 py-1">
              <div className="space-y-1.5">
                <Label>Action</Label>
                <Select value={cmdAction} onValueChange={(v) => setCmdAction(v as AgentAction)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(AGENT_ACTION_META) as AgentAction[]).map((a) => (
                      <SelectItem key={a} value={a}>{AGENT_ACTION_META[a].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-[11px] text-muted-foreground leading-4">{AGENT_ACTION_META[cmdAction].desc}</div>
              </div>
              <div className="space-y-1.5">
                <Label>پلتفرم</Label>
                <Select value={cmdPlatform} onValueChange={(v) => setCmdPlatform(v as Platform)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p}>{PLATFORM_LABEL[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {AGENT_ACTION_META[cmdAction].needsTarget && cmdAction !== "SEND_TEXT" && (
                <div className="space-y-1.5">
                  <Label>مخاطب مقصد</Label>
                  <Input value={cmdTarget} onChange={(e) => setCmdTarget(e.target.value)} />
                </div>
              )}
              {cmdAction !== "CREATE_GROUP" && (
                <div className="space-y-1.5">
                  <Label>
                    شماره مخاطب <span className="text-[10px] text-muted-foreground font-normal">(کلید جستجو — مخاطب ذخیره‌شده لازم نیست)</span>
                  </Label>
                  <Input dir="ltr" className="text-left" value={cmdPhone} onChange={(e) => setCmdPhone(e.target.value)} placeholder="0912…" />
                </div>
              )}
              {cmdAction === "CREATE_GROUP" && (
                <div className="space-y-1.5">
                  <Label>نام گروه</Label>
                  <Input value={cmdTarget} onChange={(e) => setCmdTarget(e.target.value)} placeholder="گروه جدید" />
                  <div className="text-[11px] text-muted-foreground">اعضای نمونه: علی رضایی، سارا محمدی، مهدی نوری</div>
                </div>
              )}
              {(cmdAction === "SEND_TEXT" || cmdAction === "SEND_IMAGE_WITH_CAPTION") && (
                <div className="space-y-1.5">
                  <Label>{cmdAction === "SEND_TEXT" ? "متن پیام" : "کپشن تصویر"}</Label>
                  <Input value={cmdText} onChange={(e) => setCmdText(e.target.value)} />
                </div>
              )}
              <div className="rounded-lg bg-secondary/50 p-2.5 text-[11px] leading-5 text-muted-foreground flex items-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />
                Safety Layer: پلتفرم، اکانت و چت قبل از اجرا بررسی می‌شود؛ در صورت عدم تطابق، دستور اجرا نمی‌شود.
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCmdOpen(false)}>انصراف</Button>
              <Button onClick={sendCommand} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
                <Send className="w-4 h-4" /> ارسال به صف
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function InfoBox({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-secondary/50 p-3">
      <div className={cn("text-base font-bold", tone ?? "text-foreground")}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function CheckIcon() {
  return <ArrowRight className="w-3.5 h-3.5" />;
}
