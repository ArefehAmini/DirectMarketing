"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app-store";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { EmptyState, PageHeader } from "@/components/shared/ui-bits";
import { PLATFORMS, PLATFORM_LABEL, CONSENT_META, ConsentStatus } from "@/lib/types";
import { faNum, maskPhone } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowRight, CheckCircle2, XCircle, Megaphone, Send, MessageSquare, MapPin, Briefcase, Inbox, Info, ShieldBan, ShieldCheck, Building2, NotebookPen, UserCheck,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const HISTORY = [
  { platform: "telegram" as const, time: "امروز ۰۹:۲۰", text: "پیشنهاد ویژه مهر — ۳۰٪ تخفیف طراحی سایت", status: "sent" },
  { platform: "bale" as const, time: "دیروز ۱۱:۴۵", text: "دعوت به وبینار سئو", status: "sent" },
  { platform: "rubika" as const, time: "۳ روز پیش", text: "پیگیری درخواست نمونه‌کار", status: "failed" },
];

export function ContactDetails() {
  const { params, contacts, navigate, setContactConsent, addToSuppression, suppression, openConversation } = useApp();
  const contact = contacts.find((c) => c.id === params.contactId);
  const [consentDialog, setConsentDialog] = useState(false);
  const [newConsent, setNewConsent] = useState<ConsentStatus>(contact?.consent ?? "allowed");
  const [supDialog, setSupDialog] = useState(false);
  const [supReason, setSupReason] = useState<string>("opt_out_request");

  if (!contact) {
    return (
      <EmptyState
        icon={<MessageSquare className="w-7 h-7" />}
        title="مخاطب پیدا نشد"
        action={<Button variant="outline" onClick={() => navigate("contacts")}>بازگشت به مخاطبان</Button>}
      />
    );
  }

  const inSuppression = suppression.some((s) => s.phone === contact.phone);
  const cm = CONSENT_META[contact.consent];

  return (
    <div className="space-y-5 max-w-4xl">
      <button onClick={() => navigate("contacts")} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer">
        <ArrowRight className="w-3.5 h-3.5" /> بازگشت به مخاطبان
      </button>

      <PageHeader title={contact.name} subtitle={`پروفایل ارتباطی — ${maskPhone(contact.phone)}`} />

      {/* وضعیت دریافت پیام + لیست عدم ارسال */}
      <Card className="shadow-none">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <span className={cn("w-11 h-11 rounded-xl border flex items-center justify-center", cm.bg)}>
              <ShieldCheck className={cn("w-5 h-5", cm.color)} />
            </span>
            <div>
              <div className="text-[10px] text-muted-foreground">وضعیت دریافت پیام</div>
              <div className={cn("text-sm font-bold flex items-center gap-1.5", cm.color)}>
                <span className={cn("w-2 h-2 rounded-full", cm.dot)} />
                {cm.label}
              </div>
            </div>
          </div>
          <div className="h-9 w-px bg-border hidden sm:block" />
          <div className="text-[11px] leading-5 text-muted-foreground max-w-md flex-1 min-w-52">
            پیش از ورود هر مخاطب به صف ارسال، سیستم این وضعیت و <button onClick={() => navigate("suppression")} className="text-teal-600 hover:underline cursor-pointer">لیست عدم ارسال</button> را بررسی می‌کند؛ مخاطب غیرمجاز به Queue اضافه نمی‌شود.
          </div>
          <div className="flex gap-2 mr-auto">
            <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1.5" onClick={() => { setNewConsent(contact.consent); setConsentDialog(true); }}>
              <ShieldCheck className="w-3.5 h-3.5" />
              تغییر وضعیت
            </Button>
            {inSuppression ? (
              <Badge variant="outline" className="text-[10px] border-red-200 text-red-700 bg-red-50 dark:bg-red-950/30 gap-1">
                <ShieldBan className="w-3 h-3" /> در لیست عدم ارسال
              </Badge>
            ) : (
              <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1.5 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => setSupDialog(true)}>
                <ShieldBan className="w-3.5 h-3.5" />
                افزودن به عدم ارسال
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="shadow-none lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">کانال‌های قابل دسترس</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {PLATFORMS.map((p) => {
                const ok = contact.channels.includes(p);
                return (
                  <div key={p} className={cn(
                    "flex items-center gap-2.5 rounded-xl border px-3.5 py-3 transition-colors",
                    ok ? "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20" : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40"
                  )}>
                    <PlatformIcon platform={p} size={30} className={cn(!ok && "grayscale opacity-50")} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold">{PLATFORM_LABEL[p]}</div>
                      <div className={cn("text-[10px] flex items-center gap-1", ok ? "text-emerald-600" : "text-slate-400")}>
                        {ok ? <><CheckCircle2 className="w-3 h-3" /> در دسترس</> : <><XCircle className="w-3 h-3" /> خارج از دسترس</>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Alert className="mt-4">
              <Info className="w-4 h-4" />
              <AlertDescription className="text-[11px] leading-5">
                تشخیص دسترسی فقط بر اساس اطلاعات رسمی که هر سرویس ارائه می‌دهد انجام می‌شود؛ هیچ حدس یا روش غیرمجازی برای تشخیص وضعیت حساب‌ها به‌کار نمی‌رود.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">اطلاعات مخاطب</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-xs">
            <InfoRow icon={<Briefcase className="w-3.5 h-3.5" />} label="شرکت / کسب‌وکار" value={contact.company ?? "—"} />
            <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="شهر" value={contact.city} />
            <InfoRow icon={<Briefcase className="w-3.5 h-3.5" />} label="صنف" value={contact.category} />
            <InfoRow icon={<Inbox className="w-3.5 h-3.5" />} label="منبع" value={contact.source} />
            <InfoRow icon={<Send className="w-3.5 h-3.5" />} label="شماره" value={<span dir="ltr" className="tabular-nums">{maskPhone(contact.phone)}</span>} />
            <InfoRow icon={<UserCheck className="w-3.5 h-3.5" />} label="کارشناس" value={contact.expert ?? "—"} />
            <InfoRow icon={<MessageSquare className="w-3.5 h-3.5" />} label="آخرین تعامل" value={contact.lastInteraction ?? "—"} />
            <div className="pt-1">
              <div className="text-muted-foreground mb-1.5">رضایت مشتری</div>
              <div className={cn(
                "text-sm font-bold",
                contact.satisfaction === "satisfied" && "text-emerald-600",
                contact.satisfaction === "neutral" && "text-amber-600",
                contact.satisfaction === "angry" && "text-red-600",
                contact.satisfaction === "unknown" && "text-slate-500",
              )}>
                {contact.satisfaction === "satisfied" ? "😊 راضی" : contact.satisfaction === "neutral" ? "😐 خنثی" : contact.satisfaction === "angry" ? "😠 ناراضی" : "— نامشخص"}
              </div>
            </div>
            {contact.notes && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 p-3 text-[11px] leading-5 text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-1.5 font-semibold mb-1">
                  <NotebookPen className="w-3.5 h-3.5" />
                  یادداشت‌ها
                </div>
                {contact.notes}
              </div>
            )}
            <div className="pt-1">
              <div className="text-muted-foreground mb-1.5">برچسب‌ها</div>
              <div className="flex flex-wrap gap-1.5">
                {contact.tags.length > 0 ? contact.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px] font-normal">{t}</Badge>
                )) : <span className="text-[11px] text-muted-foreground/60">برچسبی ثبت نشده</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-teal-600" /> سابقه ارتباط
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {HISTORY.map((h, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border p-3.5">
              <PlatformIcon platform={h.platform} size={32} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate">{h.text}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{h.time}</div>
              </div>
              {h.status === "sent" ? (
                <Badge variant="outline" className="text-[10px] border-emerald-200 text-emerald-700 bg-emerald-50">ارسال موفق</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] border-red-200 text-red-700 bg-red-50">ناموفق</Badge>
              )}
            </div>
          ))}
          <div className="rounded-xl bg-secondary/60 p-3.5 text-[11px] text-muted-foreground leading-5">
            نرخ پاسخ‌گویی این مخاطب: <b className="text-foreground">{faNum(38)}٪</b> — کمتر از میانگین ({faNum(44)}٪)
            <Progress value={38} className="h-1.5 mt-2" />
          </div>
        </CardContent>
      </Card>

      {/* Consent dialog */}
      <Dialog open={consentDialog} onOpenChange={setConsentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تغییر وضعیت دریافت پیام</DialogTitle>
            <DialogDescription>
              این وضعیت مستقیماً روی ورود مخاطب به صف ارسال کمپین‌ها اثر می‌گذارد.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <Select value={newConsent} onValueChange={(v) => setNewConsent(v as ConsentStatus)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="allowed">🟢 مجاز — کمپین‌ها برای او ارسال می‌شود</SelectItem>
                <SelectItem value="unknown">🟡 نامشخص — نیازمند بررسی رضایت</SelectItem>
                <SelectItem value="opted_out">🔴 عدم دریافت پیام — به هیچ کمپینی وارد نمی‌شود</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConsentDialog(false)}>انصراف</Button>
              <Button
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                onClick={() => {
                  setContactConsent(contact.id, newConsent);
                  toast.success("وضعیت دریافت پیام به‌روزرسانی شد");
                  setConsentDialog(false);
                }}
              >
                ثبت وضعیت
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suppression dialog */}
      <Dialog open={supDialog} onOpenChange={setSupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>افزودن به لیست عدم ارسال</DialogTitle>
            <DialogDescription>
              {contact.name} ({maskPhone(contact.phone)}) از تمام کمپین‌های فعلی و آینده حذف می‌شود.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <Select value={supReason} onValueChange={setSupReason}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="opt_out_request">درخواست عدم دریافت پیام</SelectItem>
                <SelectItem value="invalid_number">شماره نامعتبر</SelectItem>
                <SelectItem value="blocked_number">شماره مسدود</SelectItem>
                <SelectItem value="internal_customer">مشتری داخلی</SelectItem>
                <SelectItem value="manual_list">لیست عدم ارسال دستی</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSupDialog(false)}>انصراف</Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  addToSuppression({ name: contact.name, phone: contact.phone, reason: supReason as never, note: "افزوده از پروفایل مخاطب" });
                  toast.success("به لیست عدم ارسال اضافه شد");
                  setSupDialog(false);
                }}
              >
                افزودن
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 border-b pb-2.5 last:border-0">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className="mr-auto font-semibold">{value}</span>
    </div>
  );
}
