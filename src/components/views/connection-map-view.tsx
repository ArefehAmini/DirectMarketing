"use client";
import { useMemo } from "react";
import { useApp } from "@/store/app-store";
import { PageHeader, EmptyState } from "@/components/shared/ui-bits";
import { WorkerStatusBadge, TaskStatusBadge, platformFa } from "@/components/shared/agent-bits";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { Platform } from "@/lib/types";
import { faNum, maskPhone } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bot, Chrome, Smartphone, Workflow, Building2, Link2, Plus, ListTree,
} from "lucide-react";

export function ConnectionMapView() {
  const { agents, accounts, navigate } = useApp();
  const workers = agents.workers;

  /* نقشه: Worker → اکانت‌های متصل + پلتفرم‌های تب‌ها → وظایف جاری */
  const map = useMemo(
    () =>
      workers.map((w) => {
        const boundAccounts = accounts.filter((a) => a.workerId === w.id);
        const platforms = Array.from(new Set<string>([...w.tabs.map((t) => t.platform), ...boundAccounts.map((a) => a.platform)])).filter((p) => p !== "other");
        const currentTasks = agents.tasks.filter((t) => t.workerId === w.id && ["received", "running", "verifying", "queued", "human_action", "paused"].includes(t.status));
        return { worker: w, boundAccounts, platforms, currentTasks };
      }),
    [workers, accounts, agents.tasks]
  );

  const unboundAccounts = accounts.filter((a) => !a.workerId);
  const activeTaskTotal = agents.tasks.filter((t) => ["received", "running", "verifying", "queued"].includes(t.status)).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="نقشه اتصال"
        subtitle="مسیر کامل کنترل: فضای کاری → Workerها → پروفایل مرورگر → اکانت‌ها → پلتفرم‌ها → وظایف"
        actions={
          <Button variant="outline" onClick={() => navigate("agent-tasks")} className="gap-1.5">
            <ListTree className="w-4 h-4" /> مانیتور وظایف
          </Button>
        }
      />

      {workers.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<Workflow className="w-8 h-8" />}
              title="نقشه اتصال خالی است"
              description="با افزودن Browser Worker، مسیر کنترل از پنل تا پیام‌رسان‌ها اینجا به‌صورت زنده نمایش داده می‌شود."
              action={
                <Button onClick={() => navigate("workers")} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
                  <Plus className="w-4 h-4" /> افزودن Worker
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-0">
          {/* ریشه: Workspace */}
          <MapNode
            depth={0}
            icon={<Building2 className="w-4 h-4" />}
            title="فضای کاری RasaWeb"
            subtitle={`${faNum(accounts.length)} اکانت • ${faNum(workers.length)} Worker • ${faNum(activeTaskTotal)} وظیفه فعال`}
            tone="workspace"
          />
          <Connector />

          {map.map(({ worker, boundAccounts, platforms, currentTasks }) => (
            <div key={worker.id} className="space-y-0">
              <MapNode
                depth={1}
                icon={worker.simulated ? <Bot className="w-4 h-4 text-violet-600" /> : <Chrome className="w-4 h-4 text-teal-600" />}
                title={
                  <>
                    Worker #{faNum(String(worker.workerNo).padStart(3, "0"))}
                    <WorkerStatusBadge status={worker.status} size="sm" />
                  </>
                }
                subtitle={`${worker.profileLabel || "بدون پروفایل"} • ${worker.chromeVersion || "Chrome"} • Heartbeat: ${worker.lastHeartbeat ? "زنده" : "—"}`}
                tone="worker"
                right={
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">{faNum(worker.tabs.length)} تب</span>
                    <span className="text-[10px] text-muted-foreground">{faNum(worker.activeTasks)} وظیفه فعال</span>
                  </div>
                }
              />

              {/* اکانت‌های متصل */}
              {boundAccounts.length > 0 && (
                <>
                  <Connector />
                  <div className="flex flex-wrap gap-2 pr-8">
                    {boundAccounts.map((a) => (
                      <div key={a.id} className="rounded-lg border bg-white p-2.5 flex items-center gap-2 shadow-sm">
                        <PlatformIcon platform={a.platform} className="w-4 h-4" />
                        <div>
                          <div className="text-xs font-medium">{a.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono" dir="ltr">{maskPhone(a.phone)}</div>
                        </div>
                        <span className="text-[9px] text-muted-foreground bg-secondary rounded px-1.5 py-0.5">Tab #{a.tabId ?? "—"}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* پلتفرم‌های تب‌های باز */}
              {platforms.length > 0 && (
                <>
                  <Connector />
                  <div className="flex flex-wrap items-center gap-2 pr-8">
                    <span className="text-[10px] text-muted-foreground">پلتفرم‌ها:</span>
                    {platforms.map((p) => (
                      <span key={p} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[10px]">
                        <PlatformIcon platform={p as Platform} className="w-3 h-3" />
                        {platformFa(p)}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {/* وظایف جاری */}
              {currentTasks.length > 0 && (
                <>
                  <Connector />
                  <div className="space-y-1.5 pr-8 pb-2">
                    {currentTasks.slice(0, 5).map((t) => (
                      <div key={t.id} className="rounded-lg border border-dashed p-2 flex items-center gap-2 bg-white max-w-md">
                        <Workflow className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="text-[10px] font-mono text-muted-foreground">TASK-{faNum(t.refNo)}</span>
                        <span className="text-[11px] truncate flex-1">{t.action === "SEND_TEXT" ? "ارسال پیام" : t.action === "READ_CHAT_CONTEXT" ? "خواندن Context" : t.action === "CREATE_GROUP" ? "ساخت گروه" : "ارسال"}</span>
                        <TaskStatusBadge status={t.status as never} size="sm" />
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="h-3" />
            </div>
          ))}

          {/* اکانت‌های بدون Worker */}
          {unboundAccounts.length > 0 && (
            <>
              <Connector />
              <div className="pr-8">
                <div className="rounded-xl border border-dashed p-3.5 bg-secondary/30 max-w-lg">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                    <Link2 className="w-4 h-4" />
                    اکانت‌های بدون Worker ({faNum(unboundAccounts.length)})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {unboundAccounts.slice(0, 8).map((a) => (
                      <span key={a.id} className="inline-flex items-center gap-1 rounded-md bg-white border px-2 py-1 text-[10px]">
                        <Smartphone className="w-3 h-3 text-muted-foreground" />
                        {a.name}
                      </span>
                    ))}
                    {unboundAccounts.length > 8 && <span className="text-[10px] text-muted-foreground self-center">+{faNum(unboundAccounts.length - 8)}</span>}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MapNode({
  depth,
  icon,
  title,
  subtitle,
  tone,
  right,
}: {
  depth: number;
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle: string;
  tone: "workspace" | "worker" | "leaf";
  right?: React.ReactNode;
}) {
  return (
    <div style={{ marginRight: depth * 16 }}>
      <div
        className={cn(
          "rounded-xl border p-3.5 flex items-center gap-3 shadow-sm max-w-2xl",
          tone === "workspace" && "bg-teal-600 text-white border-teal-700",
          tone === "worker" && "bg-white",
          tone === "leaf" && "bg-secondary/40"
        )}
      >
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
            tone === "workspace" ? "bg-white/15 text-white" : "bg-secondary text-foreground"
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn("text-sm font-bold flex items-center gap-2 flex-wrap", tone === "workspace" ? "text-white" : "text-foreground")}>{title}</div>
          <div className={cn("text-[11px] mt-0.5 truncate", tone === "workspace" ? "text-white/70" : "text-muted-foreground")}>{subtitle}</div>
        </div>
        {right}
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div className="border-r-2 border-dashed border-slate-200 h-4 mr-8" style={{ marginRight: 40 }} />
  );
}
