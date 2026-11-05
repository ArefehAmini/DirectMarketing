"use client";
import { useMemo, useRef, useState, useEffect } from "react";
import { useApp } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { faMinutesAgo, faNum } from "@/lib/fa";
import { Bell, Search, Menu, Sparkles, ChevronDown, Layers, Smartphone, Megaphone, Users, Inbox, Check, FolderKanban, Palette, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { useTheme } from "@/lib/use-theme";
import { PICKER_ORDER, THEMES, ThemeChoice } from "@/lib/themes";

const THEME_CHOICE_LABEL: Record<ThemeChoice, string> = {
  system: "سیستمی (خودکار)",
  continental: "کانتیننتال",
  graphite: "گرافیت",
  midnight_indigo: "نیلی نیمه‌شب",
  daylight: "دی‌لایت",
  saramad_rose: "سرامد رز",
  lavande: "لاوند",
  sakura: "ساکورا",
  forest: "فارست",
};

const VIEW_TITLES: Record<string, { title: string; sub?: string }> = {
  dashboard: { title: "داشبورد", sub: "خلاصه وضعیت کلی سیستم در یک نگاه" },
  accounts: { title: "مدیریت اکانت‌ها", sub: "اتصال، پایش و مدیریت اکانت‌های پیام‌رسان" },
  "account-details": { title: "جزئیات اکانت", sub: "وضعیت، فعالیت و تنظیمات اکانت" },
  "add-account": { title: "افزودن اکانت", sub: "اتصال اکانت جدید به هاب" },
  contacts: { title: "مخاطبان", sub: "مدیریت متمرکز مخاطبان و دسته‌بندی‌ها" },
  "contact-details": { title: "پروفایل مخاطب", sub: "کانال‌های قابل دسترس و سابقه ارتباط" },
  "import-contacts": { title: "ورود گروهی مخاطبان", sub: "ایمپورت از فایل، کپی/پیست با اعتبارسنجی خودکار" },
  campaigns: { title: "کمپین‌ها", sub: "مدیریت و پیگیری کمپین‌های پیام‌رسانی" },
  "create-campaign": { title: "ساخت کمپین جدید", sub: "از انتخاب مخاطب تا اجرای زمان‌بندی‌شده" },
  "campaign-details": { title: "گزارش کمپین", sub: "پیشرفت، نتیجه و Timeline کمپین" },
  queue: { title: "صف ارسال", sub: "پایش لحظه‌ای صف و وضعیت هر پیام" },
  scheduling: { title: "زمان‌بندی", sub: "بازه‌های ارسال و توزیع پیام‌ها در صف" },
  reports: { title: "گزارش‌ها", sub: "تحلیل عملکرد ارسال‌ها و کمپین‌ها" },
  ai: { title: "دستیار هوش مصنوعی پیام", sub: "تولید و بهبود متن پیام با AI" },
  notifications: { title: "مرکز اعلان‌ها", sub: "هشدارها و رخدادهای مهم سیستم" },
  limits: { title: "قوانین ارسال", sub: "سقف روزانه، بازه ارسال و رفتار هنگام خطا" },
  users: { title: "کاربران و دسترسی‌ها", sub: "نقش‌ها، سطح دسترسی و وضعیت کاربران" },
  security: { title: "امنیت", sub: "نشست‌ها، دستگاه‌ها و لاگ رخدادها" },
  settings: { title: "تنظیمات", sub: "پیکربندی کلی محصول" },
  inbox: { title: "صندوق ورودی", sub: "مدیریت مکالمات همه کانال‌ها در یک محیط واحد" },
  suppression: { title: "لیست عدم ارسال", sub: "مخاطبانی که کمپین برایشان ارسال نمی‌شود" },
  segments: { title: "سگمنت‌ها", sub: "ساخت گروه هدف هوشمند با Rule Builder" },
  approval: { title: "تأیید کمپین‌ها", sub: "بازبینی و تصمیم‌گیری کمپین‌های منتظر تأیید" },
  templates: { title: "قالب‌های پیام", sub: "کتابخانه قالب‌های آماده با متغیرهای شخصی‌سازی" },
  journey: { title: "سفر کمپین", sub: "طراحی بصری Follow-up و Triggerها" },
  audit: { title: "گزارش فعالیت‌ها", sub: "ثبت کامل عملیات کاربران و سیستم" },
  usage: { title: "مصرف و هزینه", sub: "تحلیل مصرف ارسال به تفکیک پلتفرم و کمپین" },
  tickets: { title: "پشتیبانی و تیکت", sub: "ثبت ایرادها و پیگیری پاسخ تیم پشتیبانی" },
};

const NOTIF_STYLE: Record<string, string> = {
  error: "bg-red-500",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
  info: "bg-sky-500",
};

type SearchResult = { type: "contact" | "account" | "campaign" | "conversation" | "project"; id: string; title: string; sub: string };

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const { view, navigate, notifications, markAllRead, currentUser, projects, activeProjectId, switchProject, contacts, accounts, campaigns, conversations } = useApp();
  const { choice: themeChoice, set: setTheme, resolved: resolvedTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const meta = VIEW_TITLES[view] ?? { title: "RasaWeb", sub: "" };
  const unread = notifications.filter((n) => !n.read).length;
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];

  /* ── Global Search ── */
  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    if (q.length < 2) return [];
    const ql = q.toLowerCase();
    const out: SearchResult[] = [];
    for (const c of contacts.slice(0, 5000)) {
      if (out.filter((r) => r.type === "contact").length >= 5) break;
      if (c.name.toLowerCase().includes(ql) || c.phone.includes(q)) {
        out.push({ type: "contact", id: c.id, title: c.name, sub: `${c.phone} — ${c.city}` });
      }
    }
    for (const a of accounts.slice(0, 200)) {
      if (out.filter((r) => r.type === "account").length >= 4) break;
      if (a.name.toLowerCase().includes(ql) || a.phone.includes(q)) {
        out.push({ type: "account", id: a.id, title: a.name, sub: `${a.phone} — ${a.status === "active" ? "فعال" : "غیرفعال"}` });
      }
    }
    for (const c of campaigns) {
      if (out.filter((r) => r.type === "campaign").length >= 4) break;
      if (c.name.toLowerCase().includes(ql)) {
        out.push({ type: "campaign", id: c.id, title: c.name, sub: `${c.audienceCount.toLocaleString("fa-IR")} مخاطب — ${c.status === "running" ? "در حال اجرا" : c.status === "completed" ? "تکمیل‌شده" : "زمان‌بندی‌شده"}` });
      }
    }
    for (const c of conversations) {
      if (out.filter((r) => r.type === "conversation").length >= 3) break;
      if (c.contactName.toLowerCase().includes(ql) || c.phone.includes(q) || c.lastMessage.includes(q)) {
        out.push({ type: "conversation", id: c.id, title: c.contactName, sub: `صندوق ورودی — ${c.lastMessage.slice(0, 40)}` });
      }
    }
    for (const p of projects) {
      if (out.filter((r) => r.type === "project").length >= 2) break;
      if (p.name.toLowerCase().includes(ql)) {
        out.push({ type: "project", id: p.id, title: p.name, sub: `پروژه — ${p.accounts.toLocaleString("fa-IR")} اکانت` });
      }
    }
    return out;
  }, [query, contacts, accounts, campaigns, conversations, projects]);

  const grouped = useMemo(() => {
    const g: Record<string, SearchResult[]> = {};
    for (const r of results) (g[r.type] ??= []).push(r);
    return g;
  }, [results]);

  const GROUP_LABEL: Record<string, string> = {
    contact: "مخاطبان",
    account: "اکانت‌ها",
    campaign: "کمپین‌ها",
    conversation: "مکالمات",
    project: "پروژه‌ها",
  };

  /* close search on outside click */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const goResult = (r: SearchResult) => {
    setSearchOpen(false);
    setQuery("");
    if (r.type === "contact") navigate("contact-details", { contactId: r.id });
    else if (r.type === "account") navigate("account-details", { accountId: r.id });
    else if (r.type === "campaign") navigate("campaign-details", { campaignId: r.id });
    else if (r.type === "conversation") navigate("inbox", { conversationId: r.id });
    else if (r.type === "project") switchProject(r.id);
  };

  const RESULT_ICON: Record<string, React.ElementType> = {
    contact: Users,
    account: Smartphone,
    campaign: Megaphone,
    conversation: Inbox,
    project: FolderKanban,
  };

  return (
    <header className="h-16 shrink-0 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30">
      <div className="h-full px-4 lg:px-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMobileNav} aria-label="منو">
          <Menu className="w-5 h-5" />
        </Button>

        <div className="min-w-0">
          <h2 className="text-sm font-bold text-foreground truncate">{meta.title}</h2>
          <p className="text-[11px] text-muted-foreground truncate hidden sm:block">{meta.sub}</p>
        </div>

        {/* Project Switcher */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="hidden md:flex items-center gap-2 rounded-lg border bg-muted/40 hover:bg-muted px-2.5 py-1.5 transition-colors cursor-pointer shrink-0">
              <span className={cn("w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold", activeProject?.color)}>
                {activeProject?.name.slice(0, 2)}
              </span>
              <span className="text-xs font-semibold max-w-24 truncate">{activeProject?.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-2">
            <div className="text-[11px] font-semibold text-muted-foreground px-2 pb-2 pt-1">پروژه‌ها</div>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => switchProject(p.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted/70 transition-colors text-right cursor-pointer",
                  p.id === activeProjectId && "bg-teal-50 dark:bg-teal-950/30"
                )}
              >
                <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0", p.color)}>
                  {p.name.slice(0, 2)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold truncate">{p.name}</span>
                  <span className="block text-[10px] text-muted-foreground">
                    {faNum(p.accounts)} اکانت · {faNum(p.contacts)} مخاطب
                    {p.issues > 0 && <span className="text-amber-600"> · {faNum(p.issues)} مشکل</span>}
                  </span>
                </span>
                {p.id === activeProjectId && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
              </button>
            ))}
            <div className="border-t mt-2 pt-2 px-2 text-[10px] text-muted-foreground leading-5">
              داده‌های هر پروژه (اکانت‌ها، مخاطبان، کمپین‌ها، Inbox) کاملاً مجزاست.
            </div>
          </PopoverContent>
        </Popover>

        {/* Global Search */}
        <div ref={searchRef} className="hidden md:flex items-center flex-1 max-w-md mx-auto relative">
          <Search className="absolute right-3 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="جستجوی شماره، مخاطب، کمپین، اکانت…"
            className="pr-9 bg-muted/50 border-transparent focus-visible:ring-1"
          />
          {searchOpen && query.trim().length >= 2 && (
            <div className="absolute top-full mt-2 w-full rounded-xl border bg-card shadow-lg overflow-hidden z-50 max-h-96 overflow-y-auto">
              {results.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">نتیجه‌ای یافت نشد</div>
              ) : (
                Object.entries(grouped).map(([type, items]) => {
                  const Icon = RESULT_ICON[type] ?? Search;
                  return (
                    <div key={type}>
                      <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-muted-foreground">
                        {GROUP_LABEL[type]} ({faNum(items.length)})
                      </div>
                      {items.map((r) => (
                        <button
                          key={`${r.type}-${r.id}`}
                          onClick={() => goResult(r)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/70 transition-colors text-right cursor-pointer"
                        >
                          <span className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-xs font-medium truncate">{r.title}</span>
                            <span className="block text-[10px] text-muted-foreground truncate">{r.sub}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="flex-1 md:hidden" />

        <div className="flex items-center gap-1.5">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  className="hidden sm:inline-flex gap-1.5 bg-gradient-to-l from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                  onClick={() => navigate("create-campaign")}
                >
                  <Sparkles className="w-4 h-4" />
                  کمپین جدید
                </Button>
              </TooltipTrigger>
              <TooltipContent>ساخت کمپین پیام‌رسانی</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="اعلان‌ها">
                <Bell className="w-[18px] h-[18px]" />
                {unread > 0 && (
                  <span className="absolute top-1.5 left-1.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unread.toLocaleString("fa-IR")}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96 p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="text-sm font-semibold">اعلان‌ها</span>
                <button onClick={markAllRead} className="text-xs text-teal-600 hover:underline cursor-pointer">
                  علامت‌گذاری همه به‌عنوان خوانده‌شده
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.slice(0, 6).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => navigate("notifications")}
                    className={cn(
                      "w-full text-right flex gap-3 px-4 py-3 hover:bg-muted/60 transition-colors border-b last:border-0 cursor-pointer",
                      !n.read && "bg-teal-50/50 dark:bg-teal-950/20"
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", NOTIF_STYLE[n.type])} />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-foreground">{n.title}</span>
                      <span className="block text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-5">{n.body}</span>
                      <span className="block text-[10px] text-muted-foreground/70 mt-1">{faMinutesAgo(n.minutesAgo)}</span>
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => navigate("notifications")}
                className="w-full py-2.5 text-xs font-medium text-teal-600 hover:bg-muted/60 transition-colors cursor-pointer"
              >
                مشاهده همه اعلان‌ها
              </button>
            </PopoverContent>
          </Popover>

          {/* انتخابگر تم رنگی */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="تم رنگی" title={`تم فعال: ${THEME_CHOICE_LABEL[resolvedTheme.theme]}`}>
                <span className="relative inline-flex w-[18px] h-[18px]">
                  <span className="w-[18px] h-[18px] rounded-full border border-border shadow-sm" style={{ background: `linear-gradient(135deg, var(--background) 48%, var(--primary) 52%)` }} />
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-2">
              <div className="text-[11px] font-semibold text-muted-foreground px-2 pb-2 pt-1 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" /> تم رنگی
              </div>
              {PICKER_ORDER.map((id) => {
                const t = THEMES.find((x) => x.id === id);
                const active = themeChoice === id;
                return (
                  <button
                    key={id}
                    onClick={() => setTheme(id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted/70 transition-colors text-right cursor-pointer",
                      active && "bg-teal-50 dark:bg-teal-950/30"
                    )}
                  >
                    {t ? (
                      <span className="flex shrink-0 rounded-lg overflow-hidden border border-border w-8 h-6">
                        <span className="flex-1" style={{ background: t.swatch.bg }} />
                        <span className="flex-1" style={{ background: t.swatch.card }} />
                        <span className="flex-1" style={{ background: t.swatch.accent }} />
                      </span>
                    ) : (
                      <span className="w-8 h-6 shrink-0 rounded-lg border border-border bg-secondary flex items-center justify-center">
                        <MonitorSmartphone className="w-3.5 h-3.5 text-muted-foreground" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold truncate">{THEME_CHOICE_LABEL[id]}</span>
                      {t && <span className="block text-[10px] text-muted-foreground truncate">{t.hint}</span>}
                    </span>
                    {active && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                  </button>
                );
              })}
              <div className="border-t mt-2 pt-2 px-2 text-[10px] text-muted-foreground leading-5">
                حالت سیستمی: گرافیت در پس‌زمینهٔ تیره، دی‌لایت در روشن — انتخاب کامل در تنظیمات.
              </div>
            </PopoverContent>
          </Popover>

          <div className="hidden sm:flex items-center gap-2.5 pr-2 mr-1 border-r">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-white text-[11px] font-bold">
              {currentUser.name.slice(0, 1)}‌{currentUser.name.split(" ")[1]?.slice(0, 1) ?? ""}
            </div>
            <div className="leading-tight">
              <div className="text-xs font-semibold">{currentUser.name}</div>
              <div className="text-[10px] text-muted-foreground">{currentUser.role}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
