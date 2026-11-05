"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app-store";
import { MessagePreview, PreviewTabSwitch } from "@/components/shared/message-preview";
import { PLATFORMS, PLATFORM_LABEL, Platform } from "@/lib/types";
import { faNum } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { PageHeader, Skeleton } from "@/components/shared/ui-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles, Wand2, Loader2, Eye, Type, RotateCcw, Check, Copy,
} from "lucide-react";

const AI_MODES = [
  { key: "professional", label: "حرفه‌ای‌تر", desc: "لحن سازمانی و قابل اعتماد" },
  { key: "attractive", label: "جذاب‌تر", desc: "خلاقانه با فضاسازی هیجان" },
  { key: "shorter", label: "کوتاه‌تر", desc: "خلاصه و در یک نگاه" },
  { key: "friendly", label: "صمیمی‌تر", desc: "گرم و دوستانه" },
  { key: "formal", label: "رسمی‌تر", desc: "محرمانه و اداری" },
  { key: "sales", label: "فروش‌محور", desc: "تمرکز بر تبدیل و CTA" },
];

const GOALS = [
  { key: "intro", label: "معرفی" },
  { key: "sales", label: "فروش" },
  { key: "followup", label: "پیگیری" },
  { key: "announce", label: "اطلاع‌رسانی" },
  { key: "invite", label: "دعوت" },
  { key: "offer", label: "پیشنهاد ویژه" },
];

export function AiAssistantView() {
  const { navigate } = useApp();
  const [text, setText] = useState("برای طراحی سایت تخفیف داریم.");
  const [goal, setGoal] = useState("");
  const [goalType, setGoalType] = useState("offer");
  const [loading, setLoading] = useState<string | null>(null);
  const [variants, setVariants] = useState<string[]>([]);
  const [previewPlatform, setPreviewPlatform] = useState<Platform>("whatsapp");

  const call = async (mode: string) => {
    if (!text.trim()) return toast.error("متن خام را بنویسید");
    setLoading(mode);
    setVariants([]);
    try {
      const res = await fetch("/api/ai/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode, goal: mode === "goal" ? goalType : "" }),
      });
      const data = await res.json();
      setVariants(data.variants ?? []);
    } catch {
      toast.error("خطا در ارتباط با سرور هوش مصنوعی");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="دستیار هوش مصنوعی پیام"
        subtitle="متن خام را بنویسید؛ دستیار چند نسخه حرفه‌ای تولید می‌کند — سپس یکی را انتخاب و ویرایش کنید"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="space-y-4">
          <Card className="shadow-none">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">متن خام پیام</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-28 text-sm leading-7" placeholder="مثلاً: برای طراحی سایت تخفیف داریم." />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Type className="w-3 h-3" /> {faNum(text.length)} کاراکتر</span>
                <button onClick={() => { setText(""); setVariants([]); }} className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer">
                  <RotateCcw className="w-3 h-3" /> پاک کردن
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border-teal-200 dark:border-teal-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </span>
                بازنویسی سریع
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AI_MODES.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => call(m.key)}
                    disabled={loading !== null}
                    className={cn(
                      "rounded-xl border p-3 text-right transition-all cursor-pointer hover:border-teal-400 hover:shadow-sm disabled:opacity-50",
                      loading === m.key ? "border-teal-500 bg-teal-50/60 dark:bg-teal-950/40" : "bg-card"
                    )}
                  >
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      {loading === m.key ? <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" /> : <Wand2 className="w-3.5 h-3.5 text-teal-600" />}
                      {m.label} کن
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">{m.desc}</div>
                  </button>
                ))}
              </div>

              <Separator />

              <div className="space-y-2.5">
                <Label className="text-xs">هدف پیام را بنویسید</Label>
                <div className="flex flex-wrap gap-1.5">
                  {GOALS.map((g) => (
                    <button key={g.key} onClick={() => setGoalType(g.key)}
                      className={cn("rounded-full border px-3 py-1 text-[11px] transition-colors cursor-pointer",
                        goalType === g.key ? "bg-teal-600 text-white border-teal-600" : "bg-card hover:border-teal-300 text-muted-foreground")}>
                      {g.label}
                    </button>
                  ))}
                </div>
                <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="مثلاً: ترغیب مشتریان قدیمی به خرید مجدد با تخفیف" className="text-xs h-9" />
                <Button onClick={() => call("goal")} disabled={loading !== null} size="sm" className="bg-gradient-to-l from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white gap-1.5">
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  تولید نسخه‌های پیشنهادی
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Variants */}
          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          )}
          {!loading && variants.length > 0 && (
            <div className="space-y-2.5 animate-in fade-in slide-in-from-bottom-2">
              {variants.map((v, i) => (
                <Card key={i} className="shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary" className="text-[10px]">نسخه {faNum(i + 1)}</Badge>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1" onClick={() => { navigator.clipboard?.writeText(v); toast.success("کپی شد"); }}>
                          <Copy className="w-3 h-3" /> کپی
                        </Button>
                        <Button size="sm" className="h-7 text-[11px] gap-1 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => { setText(v); toast.success("در ادیتور جایگزین شد"); }}>
                          <Check className="w-3 h-3" /> استفاده
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs leading-6 whitespace-pre-wrap">{v}</p>
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" className="w-full" onClick={() => navigate("create-campaign")}>
                استفاده در کمپین جدید
              </Button>
            </div>
          )}
        </div>

        {/* Preview */}
        <Card className="shadow-none lg:sticky lg:top-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2"><Eye className="w-4 h-4 text-teal-600" /> پیش‌نمایش</CardTitle>
          </CardHeader>
          <CardContent>
            <PreviewTabSwitch platforms={PLATFORMS} active={previewPlatform} onChange={setPreviewPlatform} />
            <div className="mb-2 text-[11px] text-muted-foreground text-center">پیش‌نمایش روی {PLATFORM_LABEL[previewPlatform]}</div>
            <MessagePreview platform={previewPlatform} message={text} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
