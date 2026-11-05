"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app-store";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { MessagePreview, PreviewTabSwitch } from "@/components/shared/message-preview";
import { PLATFORM_LABEL, PLATFORMS, Platform, PERSONALIZATION_VARS, applyPersonalization, CAMPAIGN_STATUS_META } from "@/lib/types";
import { faNum } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/shared/ui-bits";
import {
  ArrowLeft, ArrowRight, Users, Send, Megaphone, CalendarClock, Sparkles, Wand2,
  Loader2, CheckCircle2, Eye, Info, Rocket, Save, Clock3, AlertTriangle, Type,
  Layers, ShieldCheck, BadgeCheck, Lightbulb, GitBranch, Variable,
} from "lucide-react";

const AI_MODES = [
  { key: "professional", label: "حرفه‌ای‌تر" },
  { key: "attractive", label: "جذاب‌تر" },
  { key: "shorter", label: "کوتاه‌تر" },
  { key: "friendly", label: "صمیمی‌تر" },
  { key: "formal", label: "رسمی‌تر" },
  { key: "sales", label: "فروش‌محور" },
];

const GOALS = [
  { key: "intro", label: "معرفی" },
  { key: "sales", label: "فروش" },
  { key: "followup", label: "پیگیری" },
  { key: "announce", label: "اطلاع‌رسانی" },
  { key: "invite", label: "دعوت" },
  { key: "offer", label: "پیشنهاد ویژه" },
];

const AUDIENCE_MODES = [
  { key: "all", label: "همه مخاطبان", desc: "کل مخاطبان سیستم" },
  { key: "segment", label: "سگمنت هوشمند", desc: "گروه‌های Rule Builder با فیلتر رضایت" },
  { key: "group", label: "گروه خاص", desc: "انتخاب از دسته‌بندی‌ها" },
  { key: "tag", label: "برچسب خاص", desc: "فیلتر بر اساس Tag" },
  { key: "manual", label: "انتخاب دستی", desc: "ورود یا انتخاب شماره‌ها" },
];

const COPILOT_EXAMPLES = [
  "می‌خواهم به فروشندگان مبلمان پیشنهاد طراحی سایت بدهم",
  "مشتریان قدیمی را به خرید مجدد ترغیب کنم",
  "سرنخ‌های نمایشگاه را با کاتالوگ پیگیری کنم",
];

export function CreateCampaignView() {
  const { contacts, groups, rules, accounts, createCampaign, navigate, segments, params, submitCampaignForApproval, suppression, currentUser } = useApp();
  const [step, setStep] = useState(1);

  // Step 1
  const [name, setName] = useState("");
  // Step 2
  const [audMode, setAudMode] = useState(params.segmentId ? "segment" : "all");
  const [segmentId, setSegmentId] = useState<string | null>(params.segmentId ?? null);
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "g1");
  const [tag, setTag] = useState("");
  const [manualCount, setManualCount] = useState("1200");
  const [aiAudienceOpen, setAiAudienceOpen] = useState(false);
  // Step 3
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  // Step 4
  const [message, setMessage] = useState("");
  const [aiGoal, setAiGoal] = useState("");
  const [aiGoalType, setAiGoalType] = useState("offer");
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [variants, setVariants] = useState<string[]>([]);
  const [previewPlatform, setPreviewPlatform] = useState<Platform>("telegram");
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilot, setCopilot] = useState<{ text: string; cta: string; tone: string; short: string; segmentHint: string } | null>(null);
  // Step 5
  const [startAt, setStartAt] = useState("08:00");
  const [endAt, setEndAt] = useState("18:00");
  const [hasJourney, setHasJourney] = useState(false);
  const [aiScheduleOpen, setAiScheduleOpen] = useState(false);

  /* اگر از صفحه سگمنت‌ها یا قالب‌ها آمده‌ایم */
  useEffect(() => {
    if (params.templateId) {
      const tpl = useApp.getState().templates.find((t) => t.id === params.templateId);
      if (tpl) setMessage(tpl.body);
    }
  }, [params.templateId]);

  const allTags = useMemo(() => Array.from(new Set(contacts.flatMap((c) => c.tags))).slice(0, 8), [contacts]);

  const selectedSegment = segments.find((s) => s.id === segmentId);

  /* مخاطبان هدف پیش از فیلتر رضایت/عدم ارسال */
  const rawAudience = useMemo(() => {
    if (audMode === "all") return contacts.length;
    if (audMode === "segment") return selectedSegment?.matchCount ?? 0;
    if (audMode === "group") return groups.find((g) => g.id === groupId)?.count ?? 0;
    if (audMode === "tag") {
      return tag ? contacts.filter((c) => c.tags.includes(tag)).length : 0;
    }
    const n = parseInt(manualCount.replace(/\D/g, ""), 10);
    return Math.min(n || 0, contacts.length);
  }, [audMode, segmentId, selectedSegment, groupId, tag, manualCount, contacts, groups]);

  /* برآورد حذف‌شدگان: مخاطبان با عدم دریافت پیام + لیست عدم ارسال */
  const suppressedEstimate = useMemo(() => {
    if (audMode === "segment" && selectedSegment) {
      /* سگمنت‌هایی که شرط رضایت دارند تقریباً همه مجازند */
      const hasConsentRule = selectedSegment.rules.some((r) => r.field === "consent" && r.value === "مجاز");
      return hasConsentRule ? Math.round(rawAudience * 0.004) : Math.round(rawAudience * 0.07);
    }
    /* برآورد کلی: ۷٪ عدم رضایت + ۲۰۰ رکورد لیست عدم ارسال */
    return Math.min(Math.round(rawAudience * 0.07) + suppression.length, rawAudience);
  }, [audMode, selectedSegment, rawAudience, suppression.length]);

  const audienceCount = Math.max(0, rawAudience - suppressedEstimate);

  const activeAccountsFor = (p: Platform) => accounts.filter((a) => a.platform === p && a.status === "active").length;
  const ruleFor = (p: Platform) => rules.find((r) => r.platform === p);

  const capacityCheck = useMemo(() => {
    // برآورد ظرفیت امروز پلتفرم‌های انتخابی × بازه
    let cap = 0;
    platforms.forEach((p) => {
      cap += activeAccountsFor(p) * (ruleFor(p)?.dailyLimit ?? 20);
    });
    return cap;
  }, [platforms, accounts, rules]);

  const perPlatform = platforms.length > 0 ? Math.ceil(audienceCount / platforms.length) : 0;
  const windowHours = useMemo(() => {
    const s = parseInt(startAt.split(":")[0], 10) || 8;
    const e = parseInt(endAt.split(":")[0], 10) || 18;
    return Math.max(1, e - s);
  }, [startAt, endAt]);
  const perHourPerPlatform = Math.ceil(perPlatform / windowHours);

  const canNext =
    (step === 1 && name.trim().length >= 3) ||
    (step === 2 && audienceCount > 0) ||
    (step === 3 && platforms.length > 0) ||
    (step === 4 && message.trim().length >= 10) ||
    step === 5;

  const callAI = async (mode: string) => {
    if (!message.trim()) return toast.error("اول متن خام پیام را بنویسید");
    setAiLoading(mode);
    setVariants([]);
    try {
      const res = await fetch("/api/ai/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message, mode, goal: mode === "goal" ? aiGoalType : "", customGoal: aiGoal }),
      });
      const data = await res.json();
      setVariants(data.variants ?? []);
      if (data.source === "fallback") toast.info("پاسخ از قالب‌های آماده نمایش داده شد");
    } catch {
      toast.error("خطا در ارتباط با دستیار هوشمند");
    } finally {
      setAiLoading(null);
    }
  };

  const generateGoal = async () => {
    if (!aiGoal.trim() && !message.trim()) return toast.error("هدف پیام یا متن اولیه را بنویسید");
    setAiLoading("goal");
    setVariants([]);
    try {
      const base = message.trim() || aiGoal;
      const res = await fetch("/api/ai/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: base, mode: "goal", goal: aiGoalType }),
      });
      const data = await res.json();
      setVariants(data.variants ?? []);
    } catch {
      toast.error("خطا در ارتباط با دستیار هوشمند");
    } finally {
      setAiLoading(null);
    }
  };

  /* ── AI Campaign Copilot: هدف ← پیشنهاد کامل کمپین ── */
  const runCopilot = async () => {
    const goal = aiGoal.trim() || COPILOT_EXAMPLES[0];
    setCopilotLoading(true);
    setCopilot(null);
    try {
      const res = await fetch("/api/ai/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: goal, mode: "goal", goal: aiGoalType }),
      });
      const data = await res.json();
      const vs: string[] = data.variants ?? [];
      /* پیشنهاد سگمنت بر اساس کلمات کلیدی هدف */
      const segmentHint =
        goal.includes("مبلمان") ? "فروشندگان مبلمان در تهران" :
        goal.includes("نمایشگاه") ? "سرنخ‌های نمایشگاه" :
        goal.includes("مشتری") ? "مشتریان قدیمی" : "مخاطبان پاسخ‌داده";
      const main = vs[0] ?? "";
      const short = vs.find((v) => v.length < 160) ?? main.slice(0, 140);
      setCopilot({
        text: main,
        cta: "همین حالا پاسخ دهید تا نوبت شما رزرو شود ✅",
        tone: "گرم و حرفه‌ای با CTA واضح — مناسب موبایل",
        short,
        segmentHint,
      });
      setVariants(vs.slice(1));
    } catch {
      toast.error("خطا در ارتباط با دستیار هوشمند");
    } finally {
      setCopilotLoading(false);
    }
  };

  /* ── پیشنهاد هوشمند سگمنت مخاطبان ── */
  const suggestAudience = () => {
    setAiAudienceOpen(true);
  };

  const suggestedSegment = useMemo(() => {
    const g = aiGoal.trim();
    const best =
      g.includes("مبلمان") ? segments.find((s) => s.id === "seg-1") :
      g.includes("نمایشگاه") ? segments.find((s) => s.id === "seg-4") :
      g.includes("مشتری") ? segments.find((s) => s.id === "seg-7") :
      segments.find((s) => s.id === "seg-5");
    return best ?? segments[0];
  }, [aiGoal, segments]);

  /* ── پیشنهاد زمان‌بندی بر اساس داده تاریخی سیستم ── */
  const runScheduleSuggestion = () => {
    setAiScheduleOpen(true);
  };

  const launch = (status: "running" | "scheduled" | "draft" | "pending_approval") => {
    const id = createCampaign({
      name: name.trim(),
      status,
      audienceCount,
      platforms,
      accountsUsed: platforms.reduce((n, p) => n + Math.min(activeAccountsFor(p), 10), 0),
      message: message.trim(),
      plannedCount: audienceCount,
      sentCount: 0,
      successCount: 0,
      failedCount: 0,
      queuedCount: status === "running" || status === "scheduled" ? audienceCount : 0,
      stoppedCount: 0,
      startAt,
      endAt,
      startDate: status === "scheduled" ? "فردا" : status === "running" ? "امروز" : "—",
      segmentId: segmentId ?? undefined,
      segmentName: selectedSegment?.name,
      requestedBy: status === "pending_approval" ? currentUser.name : undefined,
      hasJourney,
      personalization: message.includes("{{"),
      suppressedCount: suppressedEstimate,
    });
    if (status === "running") toast.success("کمپین شروع شد — پیام‌ها به صف ارسال اضافه شدند");
    if (status === "scheduled") toast.success("کمپین زمان‌بندی شد");
    if (status === "draft") toast.info("پیش‌نویس ذخیره شد");
    if (status === "pending_approval") toast.success("کمپین برای تأیید به مدیر ارسال شد");
    navigate("campaign-details", { campaignId: id });
  };

  const steps = [
    { n: 1, label: "نام کمپین", icon: Type },
    { n: 2, label: "انتخاب مخاطبان", icon: Users },
    { n: 3, label: "انتخاب پلتفرم", icon: Send },
    { n: 4, label: "نوشتن پیام", icon: Wand2 },
    { n: 5, label: "زمان‌بندی و اجرا", icon: CalendarClock },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center gap-1 flex-1 last:flex-none min-w-fit">
            <button
              onClick={() => s.n < step && setStep(s.n)}
              className={cn(
                "flex items-center gap-2 rounded-full pl-3 pr-2 py-1.5 text-xs font-semibold border transition-colors whitespace-nowrap",
                step === s.n ? "bg-teal-600 text-white border-teal-600" : step > s.n ? "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:border-teal-900 cursor-pointer" : "bg-background text-muted-foreground"
              )}
            >
              <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px]",
                step === s.n ? "bg-white/20" : step > s.n ? "bg-teal-600 text-white" : "bg-muted")}>
                {step > s.n ? "✓" : faNum(s.n)}
              </span>
              <s.icon className="w-3.5 h-3.5" />
              {s.label}
            </button>
            {i < 4 && <div className={cn("h-px w-full min-w-4", step > s.n ? "bg-teal-300" : "bg-border")} />}
          </div>
        ))}
      </div>

      {/* STEP 1: name */}
      {step === 1 && (
        <Card className="shadow-none">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">نام کمپین چیست؟</CardTitle></CardHeader>
          <CardContent className="space-y-4 max-w-lg">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: پیشنهاد ویژه طراحی سایت مهر" className="h-11 text-sm" />
            <div className="flex flex-wrap gap-2">
              {["پیشنهاد ویژه مهر", "معرفی خدمات جدید", "پیگیری سرنخ‌های نمایشگاه", "تخفیف باشگاه مشتریان"].map((s) => (
                <button key={s} onClick={() => setName(s)} className="rounded-full border px-3 py-1.5 text-[11px] text-muted-foreground hover:border-teal-400 hover:text-teal-700 transition-colors cursor-pointer">
                  {s}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">نام کمپین در گزارش‌ها، اعلان‌ها و صف ارسال استفاده می‌شود.</p>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: audience */}
      {step === 2 && (
        <Card className="shadow-none">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">مخاطبان کمپین را انتخاب کنید</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <RadioGroup value={audMode} onValueChange={setAudMode} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {AUDIENCE_MODES.map((m) => (
                <Label key={m.key} htmlFor={m.key} className="cursor-pointer">
                  <div className={cn("rounded-xl border p-4 h-full transition-all", audMode === m.key ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 ring-1 ring-teal-500/30" : "hover:border-teal-300")}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold">{m.label}</span>
                      <RadioGroupItem value={m.key} id={m.key} />
                    </div>
                    <div className="text-[10px] text-muted-foreground">{m.desc}</div>
                  </div>
                </Label>
              ))}
            </RadioGroup>

            {audMode === "segment" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">سگمنت هوشمند</Label>
                  <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1.5 text-violet-600" onClick={suggestAudience}>
                    <Sparkles className="w-3.5 h-3.5" />
                    پیشنهاد مخاطبان با AI
                  </Button>
                </div>
                {segments.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                    هنوز سگمنتی نساخته‌اید.
                    <button onClick={() => navigate("segments")} className="text-teal-600 hover:underline mr-1 cursor-pointer">ساخت سگمنت</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {segments.map((s) => (
                      <button key={s.id} onClick={() => setSegmentId(s.id)}
                        className={cn("rounded-xl border p-3 text-right transition-all cursor-pointer",
                          segmentId === s.id ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 ring-1 ring-teal-500/30" : "bg-card hover:border-teal-300")}>
                        <div className="flex items-center gap-2">
                          <span className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0", s.color)}>
                            <Layers className="w-3 h-3" />
                          </span>
                          <span className="text-xs font-bold truncate flex-1">{s.name}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{faNum(s.matchCount)}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {s.rules.map((r, i) => (
                            <span key={r.id} className="rounded bg-secondary px-1.5 py-0.5 text-[9px]">
                              {i > 0 ? "AND " : ""}{r.value}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {audMode === "group" && (
              <div className="space-y-2">
                <Label className="text-xs">گروه مخاطبان</Label>
                <div className="flex flex-wrap gap-2">
                  {groups.map((g) => (
                    <button key={g.id} onClick={() => setGroupId(g.id)}
                      className={cn("rounded-full border pl-3 pr-2.5 py-2 text-xs font-medium transition-colors cursor-pointer flex items-center gap-2",
                        groupId === g.id ? "bg-teal-600 text-white border-teal-600" : "bg-card hover:border-teal-300")}>
                      <span className={cn("w-2 h-2 rounded-full", g.color)} />{g.name} · {faNum(g.count)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {audMode === "tag" && (
              <div className="space-y-2">
                <Label className="text-xs">برچسب (Tag)</Label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((t) => (
                    <button key={t} onClick={() => setTag(t)}
                      className={cn("rounded-full border px-3 py-1.5 text-xs transition-colors cursor-pointer",
                        tag === t ? "bg-teal-600 text-white border-teal-600" : "bg-card hover:border-teal-300")}>
                      #{t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {audMode === "manual" && (
              <div className="space-y-2 max-w-xs">
                <Label className="text-xs">تعداد مخاطبان دستی (از لیست)</Label>
                <Input value={manualCount} onChange={(e) => setManualCount(e.target.value.replace(/\D/g, ""))} dir="ltr" className="text-left" />
              </div>
            )}

            <div className="rounded-xl bg-secondary/60 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-muted-foreground">مخاطبان هدف نهایی (پس از فیلتر رضایت و عدم ارسال)</div>
                  <div className="text-2xl font-bold tabular-nums text-teal-700 dark:text-teal-400">{faNum(audienceCount)}</div>
                </div>
                <Users className="w-8 h-8 text-teal-600/30" />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground border-t pt-2">
                <span>کل انتخاب‌شده: <b className="text-foreground">{faNum(rawAudience)}</b></span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-red-500" />
                  حذف‌شده (عدم رضایت + لیست عدم ارسال): <b className="text-red-600">{faNum(suppressedEstimate)}</b>
                </span>
                <button onClick={() => navigate("suppression")} className="text-teal-600 hover:underline cursor-pointer">مشاهده لیست عدم ارسال</button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: platforms */}
      {step === 3 && (
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">کدام پیام‌رسان‌ها؟</CardTitle>
            <p className="text-xs text-muted-foreground">سیستم به‌صورت خودکار فقط از اکانت‌های سالم و دارای ظرفیت استفاده می‌کند (Multi-Account Pool).</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PLATFORMS.map((p) => {
                const selected = platforms.includes(p);
                const rule = ruleFor(p);
                const activeAcc = activeAccountsFor(p);
                return (
                  <button
                    key={p}
                    onClick={() => setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))}
                    className={cn(
                      "rounded-2xl border p-4 text-right transition-all cursor-pointer",
                      selected ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 ring-1 ring-teal-500/30" : "bg-card hover:border-teal-300"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <PlatformIcon platform={p} size={38} className="rounded-xl" />
                      {selected && <CheckCircle2 className="w-5 h-5 text-teal-600" />}
                    </div>
                    <div className="text-sm font-bold">{PLATFORM_LABEL[p]}</div>
                    <div className="text-[10px] text-muted-foreground mt-1 leading-5">
                      {faNum(activeAcc)} اکانت فعال · Limit روزانه {faNum(rule?.dailyLimit ?? 20)}
                    </div>
                  </button>
                );
              })}
            </div>
            {platforms.length > 0 && (
              <div className="rounded-xl bg-secondary/60 p-4 text-xs leading-6">
                توزیع پیام‌ها: <b>{faNum(audienceCount)}</b> مخاطب روی <b>{faNum(platforms.length)}</b> پلتفرم ≈ <b>{faNum(perPlatform)}</b> پیام برای هر پلتفرم — ظرفیت روزانه فعال این پلتفرم‌ها: <b className="text-teal-700 dark:text-teal-400">{faNum(capacityCheck)}</b> پیام
                {perPlatform > capacityCheck && (
                  <div className="mt-2 flex items-start gap-1.5 text-amber-600">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>ظرفیت امروز کافی نیست؛ پیام‌های مازاد در روزهای بعدی صف پردازش می‌شوند.</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 4: message + AI + preview */}
      {step === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="space-y-4">
            <Card className="shadow-none">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">متن پیام</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {/* متغیرهای شخصی‌سازی */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <Variable className="w-3.5 h-3.5 text-violet-500" />
                    متغیرهای شخصی‌سازی — کلیک کنید تا در متن درج شود
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {PERSONALIZATION_VARS.map((v) => (
                      <button
                        key={v.key}
                        onClick={() => setMessage((m) => m + v.key)}
                        title={v.label}
                        className="rounded-full bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-100 transition-colors cursor-pointer"
                      >
                        {v.key}
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-40 text-sm leading-7" placeholder="مثلاً: سلام {{نام}}، برای کسب‌وکار {{نام کسب‌وکار}} یک پیشنهاد ویژه آماده کرده‌ایم." />
                {message.includes("{{") && (
                  <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900 px-3 py-2">
                    <div className="text-[10px] font-semibold text-violet-700 dark:text-violet-300 mb-1">نمونه مقدار واقعی برای یک مخاطب:</div>
                    <p className="text-[11px] leading-5 text-violet-900 dark:text-violet-200 whitespace-pre-wrap line-clamp-3">
                      {applyPersonalization(message, Object.fromEntries(PERSONALIZATION_VARS.map((v) => [v.key.replace(/[{}]/g, ""), v.sample])))}
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Type className="w-3 h-3" /> {faNum(message.length)} کاراکتر</span>
                  <span>{message.length > 480 ? <span className="text-amber-600">پیشنهاد: کوتاه‌تر برای خوانایی موبایل</span> : "مناسب پیام‌رسان‌ها"}</span>
                </div>
              </CardContent>
            </Card>

            {/* AI Assistant */}
            <Card className="shadow-none border-teal-200 dark:border-teal-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </span>
                  دستیار هوش مصنوعی پیام
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {AI_MODES.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => callAI(m.key)}
                      disabled={aiLoading !== null}
                      className="rounded-full border border-teal-200 dark:border-teal-800 px-3.5 py-1.5 text-xs font-medium text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {aiLoading === m.key ? <Loader2 className="w-3 h-3 inline animate-spin ml-1" /> : <Wand2 className="w-3 h-3 inline ml-1" />}
                      {m.label} کن
                    </button>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2.5">
                  <Label className="text-xs">هدف پیام را بنویسید</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {GOALS.map((g) => (
                      <button key={g.key} onClick={() => setAiGoalType(g.key)}
                        className={cn("rounded-full border px-3 py-1 text-[11px] transition-colors cursor-pointer",
                          aiGoalType === g.key ? "bg-teal-600 text-white border-teal-600" : "bg-card hover:border-teal-300 text-muted-foreground")}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                  <Input value={aiGoal} onChange={(e) => setAiGoal(e.target.value)} placeholder="مثلاً: مشتریان قدیمی را به خرید مجدد ترغیب کن" className="text-xs h-9" />
                  <Button onClick={generateGoal} disabled={aiLoading !== null} size="sm" className="bg-gradient-to-l from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white gap-1.5">
                    {aiLoading === "goal" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    تولید نسخه‌های پیشنهادی
                  </Button>
                </div>

                {/* Variants */}
                {aiLoading && (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                  </div>
                )}
                {!aiLoading && variants.length > 0 && (
                  <div className="space-y-2.5 animate-in fade-in slide-in-from-bottom-2">
                    {variants.map((v, i) => (
                      <div key={i} className="rounded-xl border p-3.5 bg-muted/20">
                        <p className="text-xs leading-6 whitespace-pre-wrap">{v}</p>
                        <div className="flex items-center justify-between mt-2.5">
                          <Badge variant="secondary" className="text-[10px]">نسخه {faNum(i + 1)}</Badge>
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => { navigator.clipboard?.writeText(v); toast.success("کپی شد"); }}>
                              کپی
                            </Button>
                            <Button size="sm" className="h-7 text-[11px] bg-teal-600 hover:bg-teal-700 text-white" onClick={() => { setMessage(v); toast.success(`نسخه ${faNum(i + 1)} در ادیتور قرار گرفت`); }}>
                              استفاده
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview column */}
          <div className="space-y-4">
            {/* AI Copilot Panel */}
            <Card className="shadow-none border-violet-200 dark:border-violet-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </span>
                    دستیار هوشمند کمپین (Copilot)
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setCopilotOpen((v) => !v)}>
                    {copilotOpen ? "بستن" : "باز کردن"}
                  </Button>
                </CardTitle>
              </CardHeader>
              {copilotOpen && (
                <CardContent className="space-y-3">
                  <p className="text-[11px] text-muted-foreground leading-5">
                    فقط هدف کمپین را بنویسید — Copilot متن، CTA، لحن، سگمنت پیشنهادی، شخصی‌سازی و ساختار Follow-up را پیشنهاد می‌دهد.
                  </p>
                  <Input
                    value={aiGoal}
                    onChange={(e) => setAiGoal(e.target.value)}
                    placeholder="مثلاً: می‌خواهم به فروشندگان مبلمان پیشنهاد طراحی سایت بدهم"
                    className="text-xs h-9"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {COPILOT_EXAMPLES.map((ex) => (
                      <button key={ex} onClick={() => setAiGoal(ex)} className="rounded-full border px-2.5 py-1 text-[10px] text-muted-foreground hover:border-violet-400 hover:text-violet-700 transition-colors cursor-pointer">
                        {ex}
                      </button>
                    ))}
                  </div>
                  <Button onClick={runCopilot} disabled={copilotLoading} size="sm" className="w-full bg-gradient-to-l from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white gap-1.5">
                    {copilotLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    پیشنهاد کامل کمپین
                  </Button>

                  {copilotLoading && (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full rounded-xl" />
                      <Skeleton className="h-10 w-full rounded-xl" />
                    </div>
                  )}

                  {copilot && (
                    <div className="space-y-2.5 animate-in fade-in slide-in-from-bottom-2">
                      <div className="rounded-xl border p-3 bg-muted/20 space-y-2">
                        <div className="text-[10px] font-semibold text-violet-600">متن پیشنهادی کمپین</div>
                        <p className="text-xs leading-6 whitespace-pre-wrap">{copilot.text}</p>
                        <div className="flex gap-1.5 justify-end">
                          <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => { navigator.clipboard?.writeText(copilot.text); toast.success("کپی شد"); }}>کپی</Button>
                          <Button size="sm" className="h-7 text-[11px] bg-teal-600 hover:bg-teal-700 text-white" onClick={() => { setMessage(copilot.text); toast.success("متن در ادیتور قرار گرفت"); }}>استفاده</Button>
                        </div>
                      </div>
                      {variants.length > 0 && (
                        <div className="rounded-xl border p-3 bg-muted/20 space-y-2">
                          <div className="text-[10px] font-semibold text-violet-600">نسخه‌های جایگزین ({faNum(variants.length)})</div>
                          {variants.slice(0, 2).map((v, i) => (
                            <div key={i} className="rounded-lg bg-background border p-2">
                              <p className="text-[11px] leading-5 line-clamp-2 text-muted-foreground">{v}</p>
                              <button onClick={() => setMessage(v)} className="text-[10px] text-teal-600 hover:underline mt-1 cursor-pointer">استفاده از این نسخه</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                        <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                          <Megaphone className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span><b>CTA:</b> {copilot.cta}</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span><b>لحن:</b> {copilot.tone}</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                          <Layers className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <span><b>سگمنت پیشنهادی:</b> {copilot.segmentHint}</span>
                          {suggestedSegment && (
                            <button onClick={() => { setAudMode("segment"); setSegmentId(suggestedSegment.id); setStep(2); toast.success(`سگمنت «${suggestedSegment.name}» انتخاب شد`); }} className="mr-auto text-[10px] text-teal-600 hover:underline cursor-pointer shrink-0">
                              انتخاب ({faNum(suggestedSegment.matchCount)} نفر)
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                          <Variable className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                          <span><b>شخصی‌سازی:</b> پیشنهاد استفاده از {"{{نام}}"} و {"{{نام کسب‌وکار}}"} در جمله اول</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                          <GitBranch className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span><b>Follow-up:</b> مرحله ۱ معرفی ← ۴۸ ساعت انتظار ← مرحله ۲ پیگیری ← مرحله ۳ پیام پایانی</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                          <Type className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="min-w-0"><b>نسخه کوتاه:</b> <span className="text-muted-foreground line-clamp-1">{copilot.short}</span></span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            <Card className="shadow-none lg:sticky lg:top-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2"><Eye className="w-4 h-4 text-teal-600" /> پیش‌نمایش پیام</CardTitle>
              </CardHeader>
              <CardContent>
                <PreviewTabSwitch platforms={platforms.length > 0 ? platforms : ["telegram"]} active={previewPlatform} onChange={setPreviewPlatform} />
                <MessagePreview
                  platform={previewPlatform}
                  message={message.includes("{{") ? applyPersonalization(message, Object.fromEntries(PERSONALIZATION_VARS.map((v) => [v.key.replace(/[{}]/g, ""), v.sample]))) : message}
                />
                {message.includes("{{") && (
                  <p className="text-[10px] text-muted-foreground mt-2 text-center">
                    پیش‌نمایش با مقادیر نمونه — در ارسال واقعی، مقدار هر مخاطب جایگزین می‌شود.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* STEP 5: schedule + launch */}
      {step === 5 && (
        <div className="space-y-4">
          <Card className="shadow-none">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">بازه ارسال</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><Clock3 className="w-3 h-3" /> شروع</Label>
                  <Input type="time" value={startAt} onChange={(e) => setStartAt(e.target.value)} dir="ltr" className="w-32 text-left" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><Clock3 className="w-3 h-3" /> پایان</Label>
                  <Input type="time" value={endAt} onChange={(e) => setEndAt(e.target.value)} dir="ltr" className="w-32 text-left" />
                </div>
                <Badge variant="outline" className="mb-1.5">پیش‌فرض: ۰۸:۰۰ تا ۱۸:۰۰</Badge>
              </div>

              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className="font-semibold">توزیع تدریجی پیام‌ها در بازه ارسال</span>
                  <span className="text-muted-foreground">هر پیام‌رسان: ≈ {faNum(perHourPerPlatform)} پیام در ساعت</span>
                </div>
                <div className="flex gap-1 h-9 rounded-lg overflow-hidden">
                  {Array.from({ length: windowHours }, (_, i) => (
                    <div key={i} className="flex-1 bg-gradient-to-t from-teal-600/80 to-teal-400/70 flex items-end justify-center pb-0.5 relative group" style={{ opacity: 0.35 + (i / windowHours) * 0.65 }}>
                      <span className="text-[8px] text-white font-bold">{perHourPerPlatform > 99 ? faNum(Math.round(perHourPerPlatform / 100)) + "۰۰+" : faNum(perHourPerPlatform)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground mt-1.5 tabular-nums">
                  <span>{startAt}</span><span>{endAt}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-3 leading-5">
                  پیام‌ها به‌صورت همزمان ارسال نمی‌شوند؛ سیستم آن‌ها را در صف زمان‌بندی کرده و ظرفیت هر اکانت (Limit روزانه) را در بازه مجاز به‌تدریج پردازش می‌کند.
                </p>
              </div>

              {/* Per-platform plan */}
              <div className="space-y-2">
                {platforms.map((p) => {
                  const rule = ruleFor(p);
                  return (
                    <div key={p} className="flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3">
                      <PlatformIcon platform={p} size={30} />
                      <div className="text-xs font-bold">{PLATFORM_LABEL[p]}</div>
                      <div className="text-[11px] text-muted-foreground">
                        ≈ {faNum(perPlatform)} پیام · Limit روزانه {faNum(rule?.dailyLimit ?? 20)} · {faNum(activeAccountsFor(p))} اکانت فعال
                      </div>
                      <div className="mr-auto flex items-center gap-2 min-w-32">
                        <Progress value={Math.min(100, (perPlatform / (activeAccountsFor(p) * (rule?.dailyLimit ?? 20))) * 100)} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {perPlatform > activeAccountsFor(p) * (rule?.dailyLimit ?? 20) ? "چند روزه" : "یک روزه"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* AI schedule suggestion */}
              <div className="rounded-xl border border-dashed border-violet-300 dark:border-violet-800 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <Sparkles className="w-4 h-4 text-violet-500" />
                    پیشنهاد زمان‌بندی هوشمند
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5 border-violet-300 text-violet-600" onClick={runScheduleSuggestion}>
                    <Lightbulb className="w-3.5 h-3.5" />
                    دریافت پیشنهاد
                  </Button>
                </div>
                {aiScheduleOpen && (
                  <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900 p-3 text-[11px] leading-5 text-violet-900 dark:text-violet-200 space-y-2 animate-in fade-in">
                    <p>
                      بر اساس داده تاریخی ارسال‌های این پروژه، <b>بیشترین نرخ پاسخ‌گویی بین ۱۰:۰۰ تا ۱۳:۰۰</b> ثبت شده است.
                      پیشنهاد: بازه ارسال <b>{"۱۰:۰۰ تا ۱۸:۰۰"}</b> با توزیع تدریجی برای پلتفرم‌های انتخابی.
                    </p>
                    <div className="flex gap-1.5">
                      <Button size="sm" className="h-7 text-[11px] bg-violet-600 hover:bg-violet-700 text-white" onClick={() => { setStartAt("10:00"); setEndAt("18:00"); toast.success("بازه پیشنهادی اعمال شد"); }}>
                        اعمال بازه ۱۰ تا ۱۸
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setAiScheduleOpen(false)}>
                        نه، بازه فعلی بهتر است
                      </Button>
                    </div>
                    <p className="text-[10px] text-violet-700/70 dark:text-violet-300/70">
                      این فقط یک توصیه است — تصمیم نهایی همیشه با شماست.
                    </p>
                  </div>
                )}
              </div>

              {/* Follow-up journey toggle */}
              <div className="rounded-xl border p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <GitBranch className="w-4 h-4 text-rose-500" />
                    سفر کمپین (Follow-up خودکار)
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-5 mt-1">
                    اگر مخاطب پاسخ داد → گفتگو به Inbox و اپراتور می‌رود و Follow-up متوقف می‌شود؛
                    اگر پاسخ نداد → مرحله ۲ و ۳ به‌صورت خودکار ارسال می‌شود.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={hasJourney} onCheckedChange={setHasJourney} />
                  {hasJourney && (
                    <Button variant="ghost" size="sm" className="h-7 text-[11px] text-rose-600" onClick={() => navigate("journey")}>
                      مشاهده Canvas
                    </Button>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-xl bg-secondary/60 p-4 text-xs leading-7">
                <b>مرور نهایی:</b> «{name}» — {faNum(rawAudience)} مخاطب انتخابی − {faNum(suppressedEstimate)} عدم رضایت/عدم ارسال = <b className="text-teal-700 dark:text-teal-400">{faNum(audienceCount)} مخاطب قابل ارسال</b> — پلتفرم‌ها: {platforms.map((p) => PLATFORM_LABEL[p]).join("، ")} — بازه ارسال {startAt} تا {endAt}
                {selectedSegment && <> — سگمنت: {selectedSegment.name}</>}
                {message && <> — پیام: «{message.slice(0, 60)}{message.length > 60 ? "…" : ""}»</>}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => launch("pending_approval")} className="bg-gradient-to-l from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white gap-2 h-11 px-6">
              <BadgeCheck className="w-4 h-4" /> ارسال برای تأیید
            </Button>
            <Button variant="outline" onClick={() => launch("scheduled")} className="gap-2 h-11">
              <CalendarClock className="w-4 h-4" /> زمان‌بندی مستقیم (مدیر)
            </Button>
            <Button variant="outline" onClick={() => launch("draft")} className="gap-2 h-11">
              <Save className="w-4 h-4" /> ذخیره پیش‌نویس
            </Button>
            <div className="w-full flex items-start gap-1.5 text-[10px] text-muted-foreground leading-5">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                کمپین‌ها پس از «ارسال برای تأیید» فقط با تأیید نقش‌های دارای مجوز (مالک/مدیر کل) وارد صف می‌شوند.
                اگر نقش شما اجازه اجرای مستقیم دارد، «زمان‌بندی مستقیم» کمپین را بی‌واسطه زمان‌بندی می‌کند.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Nav buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))} className="gap-1.5">
          <ArrowRight className="w-4 h-4" /> مرحله قبل
        </Button>
        {step < 5 && (
          <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
            مرحله بعد <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        {step === 5 && (
          <Button variant="ghost" onClick={() => navigate("campaigns")} className="text-muted-foreground">
            انصراف
          </Button>
        )}
      </div>
    </div>
  );
}
