"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app-store";
import { PageHeader, EmptyState } from "@/components/shared/ui-bits";
import { WorkerStatusBadge, timeAgo } from "@/components/shared/agent-bits";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { WORKER_STATUS_META, EXTENSION_LATEST_VERSION } from "@/lib/types";
import { faNum } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Plus, Download, Bot, Globe, MonitorSmartphone, ListOrdered, Activity,
  XCircle, Puzzle, Chrome, TimerReset, Cpu, Zap, CircleAlert,
} from "lucide-react";
import { WorkerDetails } from "./worker-details";

export function WorkersView() {
  const { agents, accounts, navigate, createPairing, createSimWorker, revokeWorker } = useApp();
  const workers = agents.workers;
  const tasks = agents.tasks;

  const [pairOpen, setPairOpen] = useState(false);
  const [workerName, setWorkerName] = useState("");
  const [pairingBusy, setPairingBusy] = useState(false);
  const [issuedCode, setIssuedCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [simBusy, setSimBusy] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(0);

  /* تیک هر ثانیه برای نمایش زنده Heartbeat و شمارش معکوس کد */
  useEffect(() => {
    const t = setInterval(() => setNowTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const stats = useMemo(() => ({
    total: workers.length,
    online: workers.filter((w) => w.status === "online").length,
    offline: workers.filter((w) => w.status === "offline").length,
    needsAction: workers.filter((w) => w.status === "needs_action").length,
    activeTasks: tasks.filter((t) => ["queued", "received", "running", "verifying"].includes(t.status)).length,
    tabs: workers.reduce((acc, w) => acc + w.tabs.length, 0),
  }), [workers, tasks]);

  const activePairing = agents.pairing.filter((p) => !p.used && new Date(p.expiresAt).getTime() > Date.now());

  const startPairing = async () => {
    setPairingBusy(true);
    const res = await createPairing(workerName.trim() || undefined);
    setPairingBusy(false);
    if (res.ok && res.code) {
      setIssuedCode({ code: res.code, expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() });
    } else {
      toast.error(res.error ?? "صدور کد ناموفق بود");
    }
  };

  const addSimulator = async () => {
    setSimBusy(true);
    const res = await createSimWorker();
    setSimBusy(false);
    if (res.ok) toast.success("Worker شبیه‌ساز متصل شد — از طریق API واقعی افزونه");
    else toast.error(res.error ?? "ساخت Worker ناموفق بود");
  };

  const secondsLeft = (iso: string) => Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
  void nowTick;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Browser Workers"
        subtitle="عامل‌های اجرایی مرورگر — اجرای دستورات پنل در محیط واقعی پیام‌رسان‌ها"
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("extension")} className="gap-1.5">
              <Download className="w-4 h-4" />
              افزونه کروم
            </Button>
            <Button variant="outline" onClick={addSimWorkerBusyGuard(addSimulator, simBusy)} className="gap-1.5">
              <Zap className="w-4 h-4" />
              Worker شبیه‌ساز
            </Button>
            <Button onClick={() => { setPairOpen(true); setIssuedCode(null); }} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
              <Plus className="w-4 h-4" />
              افزودن Worker
            </Button>
          </>
        }
      />

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard icon={<Bot className="w-4 h-4" />} label="کل Workerها" value={stats.total} tone="text-foreground" />
        <StatCard icon={<Globe className="w-4 h-4" />} label="آنلاین" value={stats.online} tone="text-emerald-600" />
        <StatCard icon={<XCircle className="w-4 h-4" />} label="خارج از اتصال" value={stats.offline} tone="text-red-600" />
        <StatCard icon={<CircleAlert className="w-4 h-4" />} label="نیاز به اقدام" value={stats.needsAction} tone="text-orange-600" />
        <StatCard icon={<ListOrdered className="w-4 h-4" />} label="وظایف فعال" value={stats.activeTasks} tone="text-teal-600" />
        <StatCard icon={<MonitorSmartphone className="w-4 h-4" />} label="تب‌های باز" value={stats.tabs} tone="text-sky-600" />
      </div>

      {/* کدهای جفت‌سازی فعال */}
      {activePairing.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
              <TimerReset className="w-4 h-4" />
              کد جفت‌سازی فعال
            </div>
            {activePairing.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-mono font-bold text-lg tracking-widest text-amber-900 bg-amber-100 border border-amber-200 rounded-lg px-3 py-1">{p.code}</span>
                <span className="text-amber-700">در افزونه وارد کنید — انقضا: {faNum(Math.floor(secondsLeft(p.expiresAt) / 60))}:{faNum(String(secondsLeft(p.expiresAt) % 60).padStart(2, "0"))}</span>
                {p.workerName && <Badge variant="outline" className="border-amber-300 text-amber-800">{p.workerName}</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* لیست Workerها */}
      {workers.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<Bot className="w-8 h-8" />}
              title="هنوز Worker متصل نیست"
              description="افزونه کروم را نصب کنید و با کد جفت‌سازی وصل شوید — یا برای تست فوری، یک Worker شبیه‌ساز بسازید که دقیقاً همان پروتکل افزونه را اجرا می‌کند."
              action={
                <div className="flex gap-2">
                  <Button onClick={() => setPairOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
                    <Plus className="w-4 h-4" /> افزودن Worker
                  </Button>
                  <Button variant="outline" onClick={() => navigate("extension")} className="gap-1.5">
                    <Download className="w-4 h-4" /> دانلود افزونه
                  </Button>
                </div>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {workers.map((w) => {
            const boundAccounts = accounts.filter((a) => a.workerId === w.id);
            const statusMeta = WORKER_STATUS_META[w.status];
            return (
              <Card
                key={w.id}
                className={cn(
                  "hover:shadow-md transition-shadow cursor-pointer group",
                  w.status === "needs_action" && "border-orange-300"
                )}
                onClick={() => setDetailsId(w.id)}
              >
                <CardContent className="p-4 space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", statusMeta.bg)}>
                        {w.simulated ? <Zap className="w-5 h-5 text-violet-600" /> : <Chrome className="w-5 h-5 text-teal-600" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-foreground truncate">
                          Worker #{faNum(String(w.workerNo).padStart(3, "0"))}
                          {w.simulated && <span className="mr-1.5 text-[10px] font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded px-1.5 py-0.5">شبیه‌ساز</span>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{w.name} — {w.profileLabel || "—"}</div>
                      </div>
                    </div>
                    <WorkerStatusBadge status={w.status} size="sm" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <MiniStat label="تب" value={w.tabs.length} />
                    <MiniStat label="اکانت" value={boundAccounts.length} />
                    <MiniStat label="وظیفه فعال" value={w.activeTasks} tone={w.activeTasks > 0 ? "text-teal-600" : undefined} />
                  </div>

                  {w.tabs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {w.tabs.slice(0, 4).map((t, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
                          {t.platform !== "other" && <PlatformIcon platform={t.platform} className="w-3 h-3" />}
                          {t.chatName || t.title}
                        </span>
                      ))}
                      {w.tabs.length > 4 && <span className="text-[10px] text-muted-foreground self-center">+{faNum(w.tabs.length - 4)}</span>}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      آخرین Heartbeat: {timeAgo(w.lastHeartbeat)}
                    </span>
                    {w.extVersion && w.extVersion !== EXTENSION_LATEST_VERSION ? (
                      <span className="text-orange-600 font-medium">بروزرسانی لازم است</span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Cpu className="w-3 h-3" />
                        v{faNum(w.extVersion || "—")}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* دیالوگ جفت‌سازی */}
      <Dialog open={pairOpen} onOpenChange={setPairOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Puzzle className="w-5 h-5 text-teal-600" />
              افزودن Browser Worker
            </DialogTitle>
            <DialogDescription>
              افزونه را در کروم نصب کنید، کد اتصال را در Popup افزونه وارد کنید تا Worker به این فضای کاری متصل شود.
            </DialogDescription>
          </DialogHeader>

          {!issuedCode ? (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">نام Worker (اختیاری)</label>
                <Input value={workerName} onChange={(e) => setWorkerName(e.target.value)} placeholder="مثلاً: لپ‌تاپ پشتیبانی" />
              </div>
              <div className="rounded-lg bg-secondary/60 p-3 text-xs leading-6 text-muted-foreground">
                <div className="font-semibold text-foreground mb-1">مراحل:</div>
                ۱. افزونه کروم را نصب کنید — ۲. روی آیکون RasaWeb Agent کلیک کنید — ۳. کد اتصال را وارد کنید — ۴. Worker در همین صفحه 🟢 متصل می‌شود
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="text-xs text-muted-foreground">کد اتصال شما:</div>
                <div className="font-mono font-black text-4xl tracking-[0.3em] text-teal-700 bg-teal-50 border-2 border-teal-200 rounded-2xl px-8 py-4" dir="ltr">
                  {issuedCode.code}
                </div>
                <div className="text-xs text-muted-foreground">
                  انقضا: {faNum(Math.floor(secondsLeft(issuedCode.expiresAt) / 60))}:{faNum(String(secondsLeft(issuedCode.expiresAt) % 60).padStart(2, "0"))} دیگر
                </div>
              </div>
              <div className="rounded-lg border bg-secondary/40 p-3 text-xs leading-6">
                افزونه نصب نشده؟{" "}
                <button className="text-teal-700 font-semibold underline underline-offset-4 cursor-pointer" onClick={() => navigate("extension")}>
                  دانلود افزونه کروم
                </button>{" "}
                — یا برای تست بدون نصب، Worker شبیه‌ساز بسازید.
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {issuedCode && (
              <Button
                variant="outline"
                onClick={addSimWorkerBusyGuard(addSimulator, simBusy)}
                disabled={simBusy}
                className="gap-1.5"
              >
                <Zap className="w-4 h-4" />
                {simBusy ? "در حال ساخت…" : "به‌جایش Worker شبیه‌ساز بساز"}
              </Button>
            )}
            <Button
              onClick={() => (issuedCode ? setPairOpen(false) : startPairing())}
              disabled={pairingBusy}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {pairingBusy ? "…" : issuedCode ? "بستن" : "صدور کد اتصال"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* جزئیات Worker */}
      <WorkerDetails workerId={detailsId} onClose={() => setDetailsId(null)} onRevoke={(id) => { revokeWorker(id); setDetailsId(null); }} />
    </div>
  );
}

function addSimWorkerBusyGuard(fn: () => Promise<void>, busy: boolean) {
  return () => { if (!busy) fn(); };
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: string }) {
  return (
    <Card>
      <CardContent className="p-3.5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground shrink-0">{icon}</div>
        <div>
          <div className={cn("text-lg font-bold tabular-nums", tone ?? "text-foreground")}>{faNum(value)}</div>
          <div className="text-[11px] text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg bg-secondary/50 py-2">
      <div className={cn("text-sm font-bold tabular-nums", tone ?? "text-foreground")}>{faNum(value)}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
