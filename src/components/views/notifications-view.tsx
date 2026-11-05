"use client";
import { useState } from "react";
import { useApp } from "@/store/app-store";
import { PageHeader } from "@/components/shared/ui-bits";
import { faMinutesAgo, faNum } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { NOTIFICATION_CATEGORY_META, NotificationCategory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle2, XCircle, Info, Bell, CheckCheck, Smartphone, Megaphone, Server, Inbox, GitBranch } from "lucide-react";

const TYPE_META: Record<string, { icon: React.ElementType; cls: string; label: string }> = {
  error: { icon: XCircle, cls: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400", label: "خطا" },
  warning: { icon: AlertTriangle, cls: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400", label: "هشدار" },
  success: { icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400", label: "موفق" },
  info: { icon: Info, cls: "bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400", label: "اطلاع" },
};

const CATEGORY_ICON: Record<NotificationCategory, React.ElementType> = {
  account: Smartphone,
  campaign: Megaphone,
  system: Server,
  messages: Inbox,
};

export function NotificationsView() {
  const { notifications, markRead, markAllRead, navigate } = useApp();
  const [tab, setTab] = useState<"all" | "unread" | "error">("all");
  const [category, setCategory] = useState<NotificationCategory | "all">("all");

  let list = notifications;
  if (tab === "unread") list = list.filter((n) => !n.read);
  if (tab === "error") list = list.filter((n) => n.type === "error" || n.type === "warning");
  if (category !== "all") list = list.filter((n) => n.category === category);

  const catCounts: Record<string, number> = { all: notifications.length };
  for (const n of notifications) catCounts[n.category] = (catCounts[n.category] ?? 0) + 1;

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="مرکز اعلان‌ها"
        subtitle="هشدارهای اکانت، کمپین، سیستم و پیام‌ها — همه در یک مرکز با دسته‌بندی شفاف"
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={markAllRead}>
            <CheckCheck className="w-3.5 h-3.5" /> خواندن همه
          </Button>
        }
      />

      {/* Categories */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => setCategory("all")}
          className={cn(
            "rounded-xl border p-3 text-right transition-all cursor-pointer",
            category === "all" ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 ring-1 ring-teal-500/30" : "bg-card hover:border-teal-300"
          )}
        >
          <div className="flex items-center justify-between">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <span className="text-lg font-bold tabular-nums">{faNum(catCounts.all ?? 0)}</span>
          </div>
          <div className="text-[11px] font-semibold mt-1.5">همه اعلان‌ها</div>
        </button>
        {(Object.keys(NOTIFICATION_CATEGORY_META) as NotificationCategory[]).map((cat) => {
          const Icon = CATEGORY_ICON[cat];
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "rounded-xl border p-3 text-right transition-all cursor-pointer",
                category === cat ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 ring-1 ring-teal-500/30" : "bg-card hover:border-teal-300"
              )}
            >
              <div className="flex items-center justify-between">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-lg font-bold tabular-nums">{faNum(catCounts[cat] ?? 0)}</span>
              </div>
              <div className="text-[11px] font-semibold mt-1.5">{NOTIFICATION_CATEGORY_META[cat].label}</div>
            </button>
          );
        })}
      </div>

      <Tabs defaultValue="all" onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="bg-muted/70">
          <TabsTrigger value="all">همه ({faNum(notifications.length)})</TabsTrigger>
          <TabsTrigger value="unread">خوانده‌نشده ({faNum(notifications.filter((n) => !n.read).length)})</TabsTrigger>
          <TabsTrigger value="error">مهم و هشدار</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-2.5">
        {list.map((n) => {
          const m = TYPE_META[n.type];
          const Icon = m.icon;
          const CatIcon = CATEGORY_ICON[n.category];
          return (
            <Card
              key={n.id}
              onClick={() => markRead(n.id)}
              className={cn("shadow-none cursor-pointer transition-all hover:shadow-sm", !n.read && "border-teal-200 dark:border-teal-900 bg-teal-50/30 dark:bg-teal-950/10")}
            >
              <CardContent className="p-4 flex gap-3.5">
                <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", m.cls)}>
                  <Icon className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{n.title}</span>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-teal-500" />}
                  </div>
                  <p className="text-xs text-muted-foreground leading-6 mt-1">{n.body}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-[10px] font-normal gap-1">
                      <CatIcon className="w-3 h-3" />
                      {NOTIFICATION_CATEGORY_META[n.category].label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground/70">{faMinutesAgo(n.minutesAgo)} · ساعت {n.at}</span>
                    {/* Action links */}
                    {n.category === "account" && (
                      <button onClick={(e) => { e.stopPropagation(); navigate("accounts"); }} className="text-[11px] font-medium text-teal-600 hover:underline cursor-pointer">
                        بررسی اکانت
                      </button>
                    )}
                    {n.category === "campaign" && (
                      <button onClick={(e) => { e.stopPropagation(); navigate(n.title.includes("تأیید") ? "approval" : "campaigns"); }} className="text-[11px] font-medium text-teal-600 hover:underline cursor-pointer">
                        {n.title.includes("تأیید") ? "بازبینی و تأیید" : "مشاهده کمپین"}
                      </button>
                    )}
                    {n.category === "messages" && (
                      <button onClick={(e) => { e.stopPropagation(); navigate("inbox"); }} className="text-[11px] font-medium text-teal-600 hover:underline cursor-pointer">
                        رفتن به صندوق ورودی
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {list.length === 0 && (
          <Card className="shadow-none">
            <CardContent className="py-14 text-center">
              <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-semibold">اعلانی در این دسته نیست</p>
              <p className="text-xs text-muted-foreground mt-1">همه‌چیز مرتب است.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
