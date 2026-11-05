"use client";
import { useState } from "react";
import { useApp } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/fa";
import { CAMPAIGN_STATUS_META, PLATFORM_LABEL } from "@/lib/types";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { PageHeader, EmptyState } from "@/components/shared/ui-bits";
import { MessagePreview } from "@/components/shared/message-preview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BadgeCheck, XCircle, PencilLine, Loader2, ShieldCheck, Clock, Users, Smartphone, Gauge, CalendarClock } from "lucide-react";

export function ApprovalView() {
  const { campaigns, decideCampaign, navigate, users } = useApp();
  const [deciding, setDeciding] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState<{ campaignId: string; kind: "rejected" | "changes_requested" } | null>(null);
  const [note, setNote] = useState("");

  const pending = campaigns.filter((c) => c.status === "pending_approval");
  const decided = campaigns.filter((c) => c.status === "approved" || c.status === "rejected" || c.status === "changes_requested");

  const act = (campaignId: string, decision: "approved" | "rejected" | "changes_requested", reviewNote?: string) => {
    setDeciding(campaignId);
    setTimeout(() => {
      decideCampaign(campaignId, decision, reviewNote);
      setDeciding(null);
      setRejectOpen(null);
      setNote("");
    }, 800);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="تأیید کمپین‌ها"
        subtitle="بازبینی حرفه‌ای کمپین‌های نیازمند تأیید — متن، مخاطبان، پلتفرم‌ها، اکانت‌ها، Limit و بازه ارسال"
      />

      {/* Approval flow hint */}
      <div className="rounded-2xl border bg-card px-4 py-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground">چرخه تأیید:</span>
        {["پیش‌نویس", "نیازمند تأیید", "تأیید شده", "زمان‌بندی‌شده", "در حال اجرا", "تکمیل‌شده"].map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            {i > 0 && <span className="text-border">←</span>}
            <span className={cn("rounded-full border px-2 py-0.5", i === 1 ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900 font-semibold" : "bg-muted/40")}>{s}</span>
          </span>
        ))}
        <span className="mr-auto text-[10px]">
          نقش‌های دارای مجوز تأیید: {users.filter((u) => u.canApprove).map((u) => u.name).join("، ")}
        </span>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-2xl border bg-card">
          <EmptyState
            icon={<BadgeCheck className="w-8 h-8" />}
            title="کمپین منتظر تأییدی وجود ندارد"
            description="وقتی مدیر کمپین کمپینی را برای تأیید ارسال کند، اینجا برای بازبینی نمایش داده می‌شود."
          />
        </div>
      ) : (
        pending.map((c) => (
          <div key={c.id} className="rounded-2xl border bg-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b bg-muted/30">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold">{c.name}</h3>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", CAMPAIGN_STATUS_META[c.status].bg, CAMPAIGN_STATUS_META[c.status].color)}>
                    نیازمند تأیید
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  درخواست‌دهنده: <span className="font-medium text-foreground">{c.requestedBy ?? "—"}</span> · {c.createdAt}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5" onClick={() => setRejectOpen({ campaignId: c.id, kind: "changes_requested" })}>
                  <PencilLine className="w-3.5 h-3.5" />
                  درخواست اصلاح
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => setRejectOpen({ campaignId: c.id, kind: "rejected" })}>
                  <XCircle className="w-3.5 h-3.5" />
                  رد کمپین
                </Button>
                <Button size="sm" className="h-8 text-[11px] gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" disabled={deciding === c.id} onClick={() => act(c.id, "approved")}>
                  {deciding === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />}
                  تأیید کمپین
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 p-5">
              {/* Review facts */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { icon: Users, label: "تعداد مخاطبان", value: `${faNum(c.audienceCount)} مخاطب` },
                    { icon: Layers2Icon, label: "سگمنت", value: c.segmentName ?? "انتخاب دستی" },
                    { icon: Users, label: "حذف‌شده (عدم ارسال/رضایت)", value: `${faNum(c.suppressedCount ?? 0)} مخاطب` },
                    { icon: Smartphone, label: "پلتفرم‌ها", value: c.platforms.map((p) => PLATFORM_LABEL[p]).join("، ") },
                    { icon: Gauge, label: "اکانت‌های مورد استفاده", value: `استخر ${c.platforms.map((p) => PLATFORM_LABEL[p]).join(" + ")}` },
                    { icon: Gauge, label: "Limit روزانه هر اکانت", value: `${faNum(20)} پیام (قابل تنظیم)` },
                    { icon: CalendarClock, label: "بازه ارسال", value: `${faNum(c.startAt)} تا ${faNum(c.endAt)}` },
                    { icon: Clock, label: "تعداد پیام‌های قابل ارسال", value: `${faNum(c.audienceCount - (c.suppressedCount ?? 0))} پیام` },
                    { icon: CalendarClock, label: "زمان‌بندی", value: `${c.startDate} — ${faNum(c.startAt)}` },
                  ].map((f, i) => (
                    <div key={i} className="rounded-xl border p-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1.5">
                        <f.icon className="w-3.5 h-3.5" />
                        {f.label}
                      </div>
                      <div className="text-xs font-semibold leading-5">{f.value}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border p-4">
                  <div className="text-[10px] font-semibold text-muted-foreground mb-2">متن پیام (با متغیرهای شخصی‌سازی)</div>
                  <p className="text-xs leading-6 whitespace-pre-wrap">{c.message}</p>
                  {c.personalization && (
                    <div className="mt-3 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900 px-3 py-2 text-[10px] text-violet-700 dark:text-violet-300">
                      شخصی‌سازی AI فعال است — پیش از ارسال، نمونه مقدار هر مخاطب در Preview قابل بررسی است.
                    </div>
                  )}
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-3">
                <div className="text-[10px] font-semibold text-muted-foreground">پیش‌نمایش پیام</div>
                <MessagePreview platform={c.platforms[0]} message={c.message.replace(/\{\{نام\}\}/g, "علی رضایی").replace(/\{\{نام کسب‌وکار\}\}/g, "مبلمان آرا").replace(/\{\{[^}]+\}\}/g, "…")} />
              </div>
            </div>
          </div>
        ))
      )}

      {/* Decided history */}
      {decided.length > 0 && (
        <div className="rounded-2xl border bg-card">
          <div className="px-5 py-3.5 border-b text-sm font-semibold">تاریخچه تصمیم‌ها</div>
          <div className="divide-y">
            {decided.map((c) => (
              <button key={c.id} onClick={() => navigate("campaign-details", { campaignId: c.id })} className="w-full flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40 transition-colors text-right cursor-pointer">
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{c.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{c.audienceCount.toLocaleString("fa-IR")} مخاطب</div>
                </div>
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] shrink-0", CAMPAIGN_STATUS_META[c.status].bg, CAMPAIGN_STATUS_META[c.status].color)}>
                  {CAMPAIGN_STATUS_META[c.status].label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reject / Request changes dialog */}
      <Dialog open={!!rejectOpen} onOpenChange={(o) => !o && setRejectOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{rejectOpen?.kind === "rejected" ? "رد کمپین" : "درخواست اصلاح"}</DialogTitle>
            <DialogDescription>
              {rejectOpen?.kind === "rejected"
                ? "کمپین رد می‌شود و برای ارسال آماده نخواهد بود. دلیل را برای درخواست‌دهنده بنویسید."
                : "کمپین به حالت «نیازمند اصلاح» برمی‌گردد و درخواست‌دهنده باید تغییرات را اعمال و دوباره ارسال کند."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={rejectOpen?.kind === "rejected" ? "مثلاً: متن پیام با سیاست برند همخوانی ندارد…" : "مثلاً: CTA را واضح‌تر کنید و بازه ارسال را ۹ تا ۱۷ بگذارید…"}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRejectOpen(null)}>انصراف</Button>
              <Button
                className={cn("flex-1 text-white", rejectOpen?.kind === "rejected" ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700")}
                disabled={deciding === rejectOpen?.campaignId}
                onClick={() => rejectOpen && act(rejectOpen.campaignId, rejectOpen.kind, note.trim() || undefined)}
              >
                {deciding === rejectOpen?.campaignId && <Loader2 className="w-4 h-4 animate-spin" />}
                ثبت تصمیم
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* small alias to reuse Users icon with different label */
function Layers2Icon(props: React.SVGProps<SVGSVGElement>) {
  return <ShieldCheck {...props} />;
}
