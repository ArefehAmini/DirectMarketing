"use client";
import { useApp } from "@/store/app-store";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Smartphone, Users, Megaphone, ListOrdered, CalendarClock,
  BarChart3, Sparkles, Settings, Bell, ShieldCheck, SlidersHorizontal, UserCog,
  LogOut, PanelRightClose, PanelRightOpen, LifeBuoy, Inbox, Filter, Layers,
  FileText, GitBranch, ScrollText, Coins, BadgeCheck,
  Bot, MonitorPlay, Network, Puzzle, Ticket,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  view: Parameters<ReturnType<typeof useApp.getState>["navigate"]>[0];
  badge?: number;
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { view, navigate, sidebarCollapsed, toggleSidebar, notifications, logout, currentUser, conversations, campaigns, agents } = useApp();
  const unread = notifications.filter((n) => !n.read).length;
  const unreadInbox = conversations.reduce((acc, c) => acc + c.unread, 0);
  const pendingApprovals = campaigns.filter((c) => c.status === "pending_approval").length;
  const agentNeedsAction = agents.workers.filter((w) => w.status === "needs_action").length + agents.tasks.filter((t) => t.status === "human_action").length;
  const openTickets = agents.supportOpen ?? 0;
  const collapsed = sidebarCollapsed;

  const groups: { title?: string; items: NavItem[] }[] = [
    {
      items: [
        { id: "nav-dash", label: "داشبورد", icon: LayoutDashboard, view: "dashboard" },
        { id: "nav-inbox", label: "صندوق ورودی", icon: Inbox, view: "inbox", badge: unreadInbox },
      ],
    },
    {
      title: "عملیات",
      items: [
        { id: "nav-accounts", label: "اکانت‌ها", icon: Smartphone, view: "accounts" },
        { id: "nav-contacts", label: "مخاطبان", icon: Users, view: "contacts" },
        { id: "nav-segments", label: "سگمنت‌ها", icon: Layers, view: "segments" },
        { id: "nav-campaigns", label: "کمپین‌ها", icon: Megaphone, view: "campaigns", badge: pendingApprovals },
      ],
    },
    {
      title: "عامل مرورگر",
      items: [
        { id: "nav-workers", label: "Browser Workers", icon: Bot, view: "workers", badge: agentNeedsAction },
        { id: "nav-agent-tasks", label: "وظایف عامل", icon: MonitorPlay, view: "agent-tasks" },
        { id: "nav-connection-map", label: "نقشه اتصال", icon: Network, view: "connection-map" },
        { id: "nav-extension", label: "افزونه کروم", icon: Puzzle, view: "extension" },
      ],
    },
    {
      title: "ارسال",
      items: [
        { id: "nav-queue", label: "صف ارسال", icon: ListOrdered, view: "queue" },
        { id: "nav-schedule", label: "زمان‌بندی", icon: CalendarClock, view: "scheduling" },
        { id: "nav-suppression", label: "لیست عدم ارسال", icon: Filter, view: "suppression" },
      ],
    },
    {
      title: "هوشمند",
      items: [
        { id: "nav-ai", label: "دستیار هوشمند", icon: Sparkles, view: "ai" },
        { id: "nav-templates", label: "قالب‌های پیام", icon: FileText, view: "templates" },
        { id: "nav-journey", label: "سفر کمپین", icon: GitBranch, view: "journey" },
        { id: "nav-reports", label: "گزارش‌ها", icon: BarChart3, view: "reports" },
        { id: "nav-usage", label: "مصرف و هزینه", icon: Coins, view: "usage" },
      ],
    },
    {
      title: "پشتیبانی",
      items: [
        { id: "nav-tickets", label: "تیکت پشتیبانی", icon: Ticket, view: "tickets", badge: openTickets },
      ],
    },
    {
      title: "مدیریت سیستم",
      items: [
        { id: "nav-notif", label: "اعلان‌ها", icon: Bell, view: "notifications", badge: unread },
        { id: "nav-limits", label: "قوانین ارسال", icon: SlidersHorizontal, view: "limits" },
        { id: "nav-approval", label: "تأیید کمپین‌ها", icon: BadgeCheck, view: "approval", badge: pendingApprovals },
        { id: "nav-audit", label: "گزارش فعالیت‌ها", icon: ScrollText, view: "audit" },
        { id: "nav-users", label: "کاربران و دسترسی", icon: UserCog, view: "users" },
        { id: "nav-security", label: "امنیت", icon: ShieldCheck, view: "security" },
        { id: "nav-settings", label: "تنظیمات", icon: Settings, view: "settings" },
      ],
    },
  ];

  const activeView = view;

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "h-full flex flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        {/* Logo */}
        <div className={cn("flex items-center gap-3 h-16 px-4 border-b border-sidebar-border shrink-0")}>
          <div className="w-9 h-9 rounded-xl bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
            RW
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold text-sidebar-accent-foreground truncate">RasaWeb</div>
              <div className="text-[10px] text-sidebar-foreground/60 truncate">Messaging Hub</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1 no-scrollbar">
          {groups.map((g, gi) => (
            <div key={gi}>
              {g.title && !collapsed && (
                <div className="px-2.5 pt-4 pb-1.5 text-[10px] font-semibold tracking-wide text-sidebar-foreground/45">
                  {g.title}
                </div>
              )}
              {g.title && collapsed && <div className="h-px my-2 bg-sidebar-border" />}
              <div className="space-y-0.5">
                {g.items.map((item) => {
                  const active = activeView === item.view || (activeView.startsWith(item.view === "accounts" ? "account" : "###") && item.view === "accounts");
                  const isActive =
                    activeView === item.view ||
                    (item.view === "accounts" && (activeView === "account-details" || activeView === "add-account")) ||
                    (item.view === "contacts" && (activeView === "contact-details" || activeView === "import-contacts")) ||
                    (item.view === "campaigns" && (activeView === "create-campaign" || activeView === "campaign-details" || activeView === "approval" || activeView === "journey")) ||
                    (item.view === "segments" && activeView === "approval") ||
                    (item.view === "ai" && activeView === "templates");
                  const Icon = item.icon;
                  const btn = (
                    <button
                      key={item.id}
                      onClick={() => {
                        navigate(item.view);
                        onNavigate?.();
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        collapsed && "justify-center px-0"
                      )}
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {!collapsed && !!item.badge && (
                        <span className="mr-auto min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {item.badge > 9 ? "+۹" : item.badge.toLocaleString("fa-IR")}
                        </span>
                      )}
                      {collapsed && !!item.badge && (
                        <span className="absolute translate-x-3 -translate-y-2 w-2 h-2 rounded-full bg-red-500" />
                      )}
                    </button>
                  );
                  return collapsed ? (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>{btn}</TooltipTrigger>
                      <TooltipContent side="left">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    btn
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom profile */}
        <div className="border-t border-sidebar-border p-2.5 shrink-0">
          {!collapsed ? (
            <div className="rounded-xl bg-sidebar-accent/60 p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  س‌م
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-sidebar-accent-foreground truncate">{currentUser.name}</div>
                  <div className="text-[10px] text-sidebar-foreground/55">{currentUser.role}</div>
                </div>
                <button
                  onClick={logout}
                  title="خروج"
                  className="text-sidebar-foreground/50 hover:text-red-400 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={logout} className="text-sidebar-foreground/60 hover:text-red-400 cursor-pointer">
                    <LogOut className="w-4.5 h-4.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">خروج</TooltipContent>
              </Tooltip>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className={cn(
              "hidden lg:flex mt-2.5 w-full items-center justify-center gap-2 rounded-lg py-2 text-xs text-sidebar-foreground/55 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors cursor-pointer"
            )}
          >
            {collapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
            {!collapsed && "جمع کردن منو"}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
