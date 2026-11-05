"use client";
import { useMemo, useState } from "react";
import { useApp } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { faNum, faMinutesAgo } from "@/lib/fa";
import {
  INBOX_FILTER_META, InboxFilter, CONVERSATION_STATE_META, MESSAGE_STATUS_META, Platform,
} from "@/lib/types";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { EmptyState, PageHeader } from "@/components/shared/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/shared/ui-bits";
import {
  Search, MoreVertical, Star, UserCheck, CheckCheck, Paperclip, Smile, FileText,
  Sparkles, SendHorizonal, Loader2, Pencil, ShieldOff, Inbox as InboxIcon, MessageSquareOff,
} from "lucide-react";

/* ── AI reply suggestion (calls real backend, graceful fallback) ── */
async function fetchAiReplies(lastIncoming: string): Promise<{ tone: string; text: string }[]> {
  try {
    const res = await fetch("/api/ai/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lastIncoming, mode: "friendly", goal: "" }),
    });
    const data = await res.json();
    const variants: string[] = data?.variants ?? [];
    if (variants.length === 0) throw new Error("empty");
    const tones = ["صمیمی", "رسمی", "فروش‌محور"];
    return variants.slice(0, 3).map((text, i) => ({ tone: tones[i] ?? "پیشنهاد", text }));
  } catch {
    return [
      { tone: "صمیمی", text: `سلام 🌹 ممنون از پیامتون؛ دقیق بررسی کردم و جزئیات کامل رو براتون می‌فرستم. اگه سوالی بود در خدمتم.` },
      { tone: "رسمی", text: `با سلام و احترام،\nدر پاسخ به پیام شما، اطلاعات موردنظر پیوست شده است. در صورت نیاز به توضیح بیشتر در خدمت شما هستیم.` },
      { tone: "کوتاه", text: `سلام، چشم! همین الان اطلاعات را می‌فرستم ✅` },
    ];
  }
}

export function InboxView() {
  const {
    conversations, activeConversationId, openConversation, inboxFilter, setInboxFilter,
    sendReply, assignConversation, toggleImportant, closeConversation, contacts, navigate,
    currentUser, users,
  } = useApp();

  const [loading] = useState(false); // داده seeded — بارگذاری آنی؛ اسکلتون برای فیلتر تعویض
  const [listQuery, setListQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{ tone: string; text: string }[]>([]);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const { templates, markTemplateUsed } = useApp();

  const active = conversations.find((c) => c.id === activeConversationId) ?? null;
  const activeContact = contacts.find((c) => c.id === active?.contactId);

  /* فیلتر + جستجو */
  const filtered = useMemo(() => {
    let list = [...conversations];
    if (inboxFilter === "unread") list = list.filter((c) => c.unread > 0);
    if (inboxFilter === "unanswered") list = list.filter((c) => !c.replied);
    if (inboxFilter === "important") list = list.filter((c) => c.isImportant);
    if (inboxFilter === "mine") list = list.filter((c) => c.assignedTo === currentUser.name);
    if (inboxFilter === "team") list = list.filter((c) => !!c.assignedTo);
    const q = listQuery.trim();
    if (q) {
      list = list.filter((c) => c.contactName.includes(q) || c.phone.includes(q) || c.lastMessage.includes(q));
    }
    /* مرتب‌سازی: خوانده‌نشده اول، سپس جدیدترین */
    return list.sort((a, b) => b.unread - a.unread || a.minutesAgo - b.minutesAgo);
  }, [conversations, inboxFilter, listQuery, currentUser.name]);

  const counts = useMemo(
    () => ({
      all: conversations.length,
      unread: conversations.filter((c) => c.unread > 0).length,
      unanswered: conversations.filter((c) => !c.replied).length,
      important: conversations.filter((c) => c.isImportant).length,
      mine: conversations.filter((c) => c.assignedTo === currentUser.name).length,
      team: conversations.filter((c) => !!c.assignedTo).length,
    }),
    [conversations, currentUser.name]
  );

  const lastIncoming = [...(active?.messages ?? [])].reverse().find((m) => m.direction === "in");

  const handleAiReply = async () => {
    setAiOpen(true);
    setAiLoading(true);
    const suggestions = await fetchAiReplies(lastIncoming?.body ?? "سلام");
    setAiSuggestions(suggestions);
    setAiLoading(false);
  };

  const send = () => {
    if (!active || !draft.trim()) return;
    setSending(true);
    sendReply(active.id, draft.trim(), currentUser.name, false);
    setDraft("");
    setTimeout(() => setSending(false), 400);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="صندوق ورودی"
        subtitle="همه مکالمات کانال‌های متصل — واتساپ، تلگرام، روبیکا، بله، ایتا و سروش — در یک محیط واحد"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)_320px] gap-4 h-[calc(100vh-190px)] min-h-[560px]">
        {/* ── ستون ۱: لیست گفتگوها ── */}
        <div className={cn("rounded-2xl border bg-card flex flex-col min-h-0", active && "hidden lg:flex")}>
          <div className="p-3 border-b space-y-2.5">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={listQuery}
                onChange={(e) => setListQuery(e.target.value)}
                placeholder="جستجوی نام، شماره یا پیام…"
                className="pr-9 h-9 text-xs bg-muted/50"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(INBOX_FILTER_META) as InboxFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setInboxFilter(f)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors cursor-pointer",
                    inboxFilter === f
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  )}
                >
                  {INBOX_FILTER_META[f].label}
                  {counts[f] > 0 && <span className="mr-1 opacity-70">{faNum(counts[f])}</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="p-3 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<MessageSquareOff className="w-7 h-7" />}
                title="گفتگویی یافت نشد"
                description="با این فیلتر یا عبارت جستجو، گفتگویی وجود ندارد. فیلتر دیگری را امتحان کنید."
                className="py-10"
              />
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openConversation(c.id)}
                  className={cn(
                    "w-full text-right flex gap-3 px-3 py-3 border-b transition-colors cursor-pointer hover:bg-muted/50",
                    activeConversationId === c.id && "bg-teal-50/70 dark:bg-teal-950/20"
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                      {c.contactName.slice(0, 1)}
                    </div>
                    <span className="absolute -bottom-1 -left-1">
                      <PlatformIcon platform={c.platform} size={16} className="rounded-md ring-2 ring-card" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold truncate">{c.contactName}</span>
                      {c.isImportant && <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                      <span className="mr-auto text-[10px] text-muted-foreground shrink-0">{faMinutesAgo(c.minutesAgo)}</span>
                    </div>
                    <p className={cn("text-[11px] text-muted-foreground truncate mt-0.5 leading-5", c.unread > 0 && "text-foreground font-medium")}>
                      {c.lastMessage}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {c.tags.slice(0, 1).map((t) => (
                        <span key={t} className="rounded-full bg-secondary px-1.5 py-0.5 text-[9px] text-muted-foreground">{t}</span>
                      ))}
                      {c.campaign && <span className="rounded-full bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900 px-1.5 py-0.5 text-[9px] text-sky-700 dark:text-sky-300 truncate max-w-28">کمپین: {c.campaign}</span>}
                      <span className={cn("mr-auto rounded-full px-1.5 py-0.5 text-[9px] border", CONVERSATION_STATE_META[c.state].bg, CONVERSATION_STATE_META[c.state].color)}>
                        {CONVERSATION_STATE_META[c.state].label}
                      </span>
                    </div>
                  </div>
                  {c.unread > 0 && (
                    <span className="self-center min-w-5 h-5 px-1.5 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {faNum(c.unread)}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── ستون ۲: مکالمه ── */}
        <div className={cn("rounded-2xl border bg-card flex flex-col min-h-0", !active && "hidden lg:flex")}>
          {!active ? (
            <EmptyState
              icon={<InboxIcon className="w-8 h-8" />}
              title="یک گفتگو را انتخاب کنید"
              description="از لیست سمت راست، یک مکالمه را باز کنید تا تاریخچه کامل پیام‌ها، اطلاعات مخاطب و ابزار پاسخ‌گویی نمایش داده شود."
              className="flex-1"
            />
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 p-3.5 border-b shrink-0">
                <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => openConversation("")}>
                  بازگشت
                </Button>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                  {active.contactName.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold">{active.contactName}</span>
                    <span dir="ltr" className="text-[11px] text-muted-foreground">{faNum(active.phone)}</span>
                    <PlatformIcon platform={active.platform} size={16} className="rounded-md" />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {active.campaign ? <>کمپین مرتبط: <span className="text-sky-600 dark:text-sky-400 font-medium">{active.campaign}</span></> : "بدون کمپین مرتبط"}
                    {active.assignedTo && <> · اختصاص به <span className="font-medium text-foreground">{active.assignedTo}</span></>}
                  </div>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="عملیات گفتگو">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-52 p-1.5">
                    <button
                      onClick={() => toggleImportant(active.id)}
                      className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs hover:bg-muted cursor-pointer"
                    >
                      <Star className={cn("w-3.5 h-3.5", active.isImportant && "text-amber-500 fill-amber-500")} />
                      {active.isImportant ? "حذف از مهم" : "علامت‌گذاری مهم"}
                    </button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs hover:bg-muted cursor-pointer">
                          <UserCheck className="w-3.5 h-3.5" />
                          اختصاص به اپراتور
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="left" className="w-48 p-1.5">
                        {users.filter((u) => u.role === "operator" || u.role === "admin").map((u) => (
                          <button
                            key={u.id}
                            onClick={() => assignConversation(active.id, u.name)}
                            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs hover:bg-muted cursor-pointer"
                          >
                            <span className={cn("w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center", u.avatarColor)}>
                              {u.name.slice(0, 1)}
                            </span>
                            {u.name}
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                    <button
                      onClick={() => closeConversation(active.id)}
                      className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs hover:bg-muted cursor-pointer text-red-600"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      بستن گفتگو
                    </button>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[repeating-linear-gradient(45deg,transparent,transparent_12px,hsl(var(--muted)/0.25)_12px,hsl(var(--muted)/0.25)_13px)] min-h-0">
                {active.messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.direction === "out" ? "justify-start" : "justify-end")}>
                    <div className={cn("max-w-[78%] space-y-1")}>
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2.5 text-xs leading-6 whitespace-pre-wrap shadow-sm",
                          m.direction === "out"
                            ? "bg-teal-600 text-white rounded-tr-md"
                            : "bg-card border rounded-tl-md"
                        )}
                      >
                        {m.body}
                      </div>
                      <div className={cn("flex items-center gap-1.5 text-[9px] text-muted-foreground px-1", m.direction === "out" ? "" : "justify-end")}>
                        <span>{m.sender}</span>
                        <span>·</span>
                        <span>{m.at}</span>
                        {m.direction === "out" && (
                          <>
                            <span>·</span>
                            <span className={cn(m.status === "failed" && "text-red-500")}>{MESSAGE_STATUS_META[m.status].label}</span>
                            {m.fromAI && <span className="text-violet-500">· پیشنهاد AI</span>}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Composer */}
              {active.replySupported ? (
                <div className="border-t p-3 space-y-2 shrink-0">
                  {aiOpen && (
                    <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                          پیشنهاد پاسخ با AI — بر اساس آخرین پیام مخاطب
                        </span>
                        <button onClick={() => setAiOpen(false)} className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer">بستن</button>
                      </div>
                      {aiLoading ? (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground py-3 justify-center">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          در حال تولید پاسخ‌های پیشنهادی…
                        </div>
                      ) : (
                        <div className="grid gap-1.5">
                          {aiSuggestions.map((s, i) => (
                            <div key={i} className="rounded-lg border bg-card p-2.5">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400">{s.tone}</span>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm" variant="ghost"
                                    className="h-6 px-2 text-[10px]"
                                    onClick={() => setDraft(s.text)}
                                  >
                                    <Pencil className="w-3 h-3" /> ویرایش
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="h-6 px-2.5 text-[10px] bg-teal-600 hover:bg-teal-700 text-white"
                                    onClick={() => {
                                      sendReply(active.id, s.text, currentUser.name, true);
                                      setAiOpen(false);
                                    }}
                                  >
                                    ارسال مستقیم
                                  </Button>
                                </div>
                              </div>
                              <p className="text-[11px] leading-5 text-muted-foreground line-clamp-3">{s.text}</p>
                            </div>
                          ))}
                          <Button
                            size="sm" variant="outline"
                            className="h-7 text-[10px] gap-1.5"
                            onClick={handleAiReply}
                          >
                            <Sparkles className="w-3 h-3 text-violet-500" />
                            بهبود پاسخ
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {templatePickerOpen && (
                    <div className="rounded-xl border bg-muted/30 p-3 max-h-52 overflow-y-auto space-y-1.5">
                      <div className="text-[11px] font-semibold mb-1">درج قالب آماده</div>
                      {templates.slice(0, 4).map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setDraft(t.body.replace(/\{\{نام\}\}/g, active.contactName).replace(/\{\{[^}]+\}\}/g, "—"));
                            setTemplatePickerOpen(false);
                            markTemplateUsed(t.id);
                          }}
                          className="w-full text-right rounded-lg border bg-card p-2.5 hover:border-teal-400 transition-colors cursor-pointer"
                        >
                          <div className="text-[11px] font-semibold">{t.name}</div>
                          <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{t.body}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-end gap-1.5">
                    <Button variant="ghost" size="icon" className="shrink-0" aria-label="پیوست فایل" title="پیوست فایل (در صورت پشتیبانی سرویس)">
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="shrink-0"
                      aria-label="قالب"
                      title="درج قالب آماده"
                      onClick={() => setTemplatePickerOpen((v) => !v)}
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="shrink-0"
                      aria-label="ایموجی"
                      title="ایموجی"
                      onClick={() => setDraft((d) => d + " 🌹")}
                    >
                      <Smile className="w-4 h-4" />
                    </Button>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                      rows={1}
                      placeholder="پاسخ خود را بنویسید… (Enter برای ارسال)"
                      className="flex-1 resize-none rounded-xl border bg-background px-3 py-2.5 text-xs leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 max-h-28"
                    />
                    <Button
                      variant="outline" size="icon"
                      className="shrink-0 border-violet-300 text-violet-600 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950"
                      aria-label="پیشنهاد پاسخ با AI"
                      title="پیشنهاد پاسخ با AI"
                      onClick={handleAiReply}
                    >
                      <Sparkles className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      className="shrink-0 bg-teal-600 hover:bg-teal-700 text-white"
                      aria-label="ارسال"
                      disabled={sending || !draft.trim()}
                      onClick={send}
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizonal className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              ) : (
                /* کانال بدون پاسخ‌دهی مجاز */
                <div className="border-t p-4 shrink-0">
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-4 py-3 flex items-start gap-3">
                    <ShieldOff className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-[11px] leading-5 text-amber-800 dark:text-amber-200">
                      پاسخ‌دهی برای <b>سروش</b> از طریق روش اتصال فعلی مجاز یا پشتیبانی‌شده نیست.
                      Composer برای این کانال غیرفعال است؛ پیام‌های خروجی فقط از طریق کمپین ارسال می‌شوند.
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── ستون ۳: اطلاعات مخاطب ── */}
        <div className={cn("rounded-2xl border bg-card overflow-y-auto", !active && "hidden xl:block")}>
          {!active || !activeContact ? (
            <div className="p-6 text-center text-xs text-muted-foreground pt-16">
              برای مشاهده پروفایل، یک گفتگو را باز کنید.
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <div className="flex flex-col items-center text-center gap-2 pt-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-white text-lg font-bold">
                  {activeContact.name.slice(0, 1)}
                </div>
                <div>
                  <div className="text-sm font-bold">{activeContact.name}</div>
                  <div dir="ltr" className="text-[11px] text-muted-foreground mt-0.5">{faNum(activeContact.phone)}</div>
                </div>
                <div className="flex gap-1 justify-center">
                  {activeContact.channels.map((ch) => (
                    <PlatformIcon key={ch} platform={ch as Platform} size={22} className="rounded-md" />
                  ))}
                </div>
              </div>

              <div className="rounded-xl border p-3 space-y-2 text-[11px]">
                {[
                  ["شرکت", activeContact.company ?? "—"],
                  ["صنف", activeContact.category],
                  ["شهر", activeContact.city],
                  ["آخرین تعامل", activeContact.lastInteraction ?? "—"],
                  ["کارشناس", activeContact.expert ?? "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">{k}</span>
                    <span className="font-medium truncate">{v}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">رضایت</span>
                  <span className={cn(
                    "font-medium",
                    activeContact.satisfaction === "satisfied" && "text-emerald-600",
                    activeContact.satisfaction === "neutral" && "text-amber-600",
                    activeContact.satisfaction === "angry" && "text-red-600",
                    activeContact.satisfaction === "unknown" && "text-slate-500",
                  )}>
                    {activeContact.satisfaction === "satisfied" ? "😊 راضی" : activeContact.satisfaction === "neutral" ? "😐 خنثی" : activeContact.satisfaction === "angry" ? "😠 ناراضی" : "— نامشخص"}
                  </span>
                </div>
              </div>

              {activeContact.tags.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-semibold text-muted-foreground">برچسب‌ها</div>
                  <div className="flex flex-wrap gap-1">
                    {activeContact.tags.map((t) => (
                      <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {activeContact.notes && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-semibold text-muted-foreground">یادداشت‌ها</div>
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 p-2.5 text-[11px] leading-5 text-amber-900 dark:text-amber-200">
                    {activeContact.notes}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="text-[10px] font-semibold text-muted-foreground">کمپین‌های قبلی</div>
                <div className="rounded-xl border p-2.5 text-[11px] leading-5">
                  {activeContact.lastCampaign ?? "بدون کمپین قبلی"}
                </div>
              </div>

              <Button
                className="w-full bg-teal-600 hover:bg-teal-700 text-white h-9 text-xs"
                onClick={() => navigate("contact-details", { contactId: activeContact.id })}
              >
                مشاهده پروفایل کامل مخاطب
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
