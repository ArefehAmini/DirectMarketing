"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app-store";
import { PageHeader } from "@/components/shared/ui-bits";
import { faNum } from "@/lib/fa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTheme } from "@/lib/use-theme";
import { PICKER_ORDER, THEMES, ThemeChoice } from "@/lib/themes";
import { cn } from "@/lib/utils";
import {
  Building2, Globe, Bell, Database, Download, Webhook, Info, Save, Palette, Check,
  MonitorSmartphone, RotateCcw, UploadCloud, TriangleAlert,
} from "lucide-react";

const THEME_LABEL: Record<ThemeChoice, string> = {
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

export function SettingsView() {
  const { logout, accounts, contacts, campaigns, queue, conversations, loadSampleData, resetWorkspace, currentUser } = useApp();
  const [org, setOrg] = useState("RasaWeb");
  const [tz, setTz] = useState("Asia/Tehran");
  const [notifAccount, setNotifAccount] = useState(true);
  const [notifCampaign, setNotifCampaign] = useState(true);
  const [notifDaily, setNotifDaily] = useState(false);
  const [webhook, setWebhook] = useState("https://hooks.rasaweb.ir/messaging-hub");
  const [wipeOpen, setWipeOpen] = useState(false);

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="تنظیمات" subtitle="پیکربندی کلی محصول، اعلان‌ها و یکپارچه‌سازی‌ها" />

      <AppearanceCard />

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2"><Building2 className="w-4 h-4 text-teal-600" /> اطلاعات سازمان</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>نام سازمان</Label>
              <Input value={org} onChange={(e) => setOrg(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><Globe className="w-3 h-3" /> منطقه زمانی</Label>
              <Select value={tz} onValueChange={setTz}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Tehran">تهران (GMT+3:30)</SelectItem>
                  <SelectItem value="Asia/Dubai">دبی (GMT+4)</SelectItem>
                  <SelectItem value="Europe/Berlin">برلین (GMT+1)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>زبان رابط کاربری</Label>
              <Input value="فارسی (RTL)" disabled />
            </div>
            <div className="space-y-1.5">
              <Label>قالب شماره‌ها</Label>
              <Input value="۰۹xxxxxxxxx — استاندارد ایرانی" disabled />
            </div>
          </div>
          <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => toast.success("تنظیمات ذخیره شد")}>
            <Save className="w-4 h-4" /> ذخیره تغییرات
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2"><Bell className="w-4 h-4 text-teal-600" /> اعلان‌ها</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3.5">
          <SwitchRow label="محدود شدن اکانت توسط سرویس مقصد" desc="هشدار فوری + ایمیل" checked={notifAccount} onChange={setNotifAccount} />
          <SwitchRow label="شروع، توقف و تکمیل کمپین‌ها" desc="اعلان در پنل" checked={notifCampaign} onChange={setNotifCampaign} />
          <SwitchRow label="خلاصه روزانه ارسال‌ها" desc="هر روز ساعت ۱۹:۰۰" checked={notifDaily} onChange={setNotifDaily} />
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2"><Webhook className="w-4 h-4 text-teal-600" /> یکپارچه‌سازی (Webhook)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>آدرس دریافت رخدادها</Label>
            <Input dir="ltr" className="text-left text-xs" value={webhook} onChange={(e) => setWebhook(e.target.value)} />
          </div>
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription className="text-[11px] leading-5">
              رخدادهای «محدود شدن اکانت»، «تکمیل کمپین» و «خطای ارسال» به این آدرس POST می‌شوند.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2"><Database className="w-4 h-4 text-teal-600" /> داده و فضای کاری</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center mb-1">
            {[
              { label: "اکانت", v: accounts.length },
              { label: "مخاطب", v: contacts.length },
              { label: "کمپین", v: campaigns.length },
              { label: "رکورد صف", v: queue.length },
              { label: "گفتگو", v: conversations.length },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border py-2.5">
                <div className="text-sm font-bold text-teal-700 dark:text-teal-300">{faNum(s.v)}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
            <div>
              <div className="text-xs font-semibold">خروجی کامل داده‌ها</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">دانلود فوری فضای کاری (اکانت‌ها، مخاطبان، کمپین‌ها، صف و گزارش‌ها) با فرمت JSON</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                try {
                  const data = { accounts, contacts, campaigns, queue, conversations, exportedAt: new Date().toISOString() };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `rasaweb-backup-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("فایل پشتیبان دانلود شد");
                } catch {
                  toast.error("دانلود پشتیبان ناموفق بود");
                }
              }}
            >
              <Download className="w-3.5 h-3.5" /> دریافت خروجی
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
            <div>
              <div className="text-xs font-semibold">بارگذاری داده نمونه</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">برای تست سریع همه‌ی بخش‌ها: اکانت‌ها، مخاطبان، کمپین‌ها و صف نمونه جایگزین داده‌های فعلی می‌شوند</div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { loadSampleData(); toast.success("داده نمونه بارگذاری شد"); }}>
              <UploadCloud className="w-3.5 h-3.5" /> بارگذاری نمونه
            </Button>
          </div>
          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50/50 dark:bg-red-950/20 p-4">
            <div>
              <div className="text-xs font-semibold text-red-600 flex items-center gap-1.5"><TriangleAlert className="w-3.5 h-3.5" /> پاک‌سازی کامل فضای کاری</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">همه اکانت‌ها، مخاطبان، کمپین‌ها، صف و گفتگوها برای «{currentUser.email}» برای همیشه حذف می‌شوند. این عملیات قابل بازگشت نیست.</div>
            </div>
            <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-100 dark:hover:bg-red-900/40" onClick={() => setWipeOpen(true)}>
              <RotateCcw className="w-3.5 h-3.5" /> پاک‌سازی فضای کاری
            </Button>
          </div>
          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
            <div>
              <div className="text-xs font-semibold">خروج از حساب</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">نشست فعلی پایان می‌یابد؛ داده‌های فضای کاری شما ذخیره باقی می‌ماند</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => { logout(); toast.info("از حساب خارج شدید"); }}>
              خروج از حساب
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* تأیید پاک‌سازی — توضیح دقیق پیامدها */}
      <AlertDialog open={wipeOpen} onOpenChange={setWipeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>پاک‌سازی کامل فضای کاری؟</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 leading-6">
                <span className="block">با انجام این عملیات، برای حساب <b dir="ltr">{currentUser.email}</b>:</span>
                <span className="block">• {faNum(accounts.length)} اکانت متصل حذف می‌شود</span>
                <span className="block">• {faNum(contacts.length)} مخاطب و {faNum(conversations.length)} گفتگو حذف می‌شود</span>
                <span className="block">• {faNum(campaigns.length)} کمپین و {faNum(queue.length)} رکورد صف حذف می‌شود</span>
                <span className="block font-semibold text-red-600">این عملیات قابل بازگشت نیست و داده‌ها بازیابی نمی‌شوند.</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                resetWorkspace();
                toast.success("فضای کاری پاک‌سازی شد — از صفر شروع کنید");
              }}
            >
              بله، همه‌چیز حذف شود
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SwitchRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-xs font-semibold">{label}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/* ═══════ کارت ظاهر و تم — انتخاب از ۸ تم تولیدی + حالت سیستمی ═══════ */
function AppearanceCard() {
  const { choice, set } = useTheme();
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Palette className="w-4 h-4 text-teal-600" /> ظاهر و تم رنگی
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-[11px] text-muted-foreground leading-5 mb-3.5">
          هر کاربر می‌تواند تم رنگی دلخواه خود را انتخاب کند؛ انتخاب در همین مرورگر ذخیره می‌شود.
          حالت «سیستمی» طبق تنظیمات سیستم‌عامل شما بین تم تیره (گرافیت) و روشن (دی‌لایت) جابه‌جا می‌شود.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {PICKER_ORDER.map((id) => {
            const t = THEMES.find((x) => x.id === id);
            const active = choice === id;
            return (
              <button
                key={id}
                onClick={() => set(id)}
                className={cn(
                  "group rounded-xl border p-3 text-right transition-all cursor-pointer hover:shadow-md",
                  active ? "border-teal-500 ring-2 ring-teal-500/30" : "border-border hover:border-teal-400/50"
                )}
              >
                {t ? (
                  <span
                    className="block h-14 w-full rounded-lg border border-black/10 overflow-hidden mb-2.5"
                    style={{ background: t.swatch.bg }}
                  >
                    <span className="flex h-full w-full p-1.5 gap-1.5 items-stretch">
                      <span className="flex-1 rounded-md" style={{ background: t.swatch.card, boxShadow: "0 1px 2px rgba(0,0,0,.15)" }} />
                      <span className="flex flex-col justify-center gap-1">
                        <span className="block w-5 h-2 rounded-full" style={{ background: t.swatch.accent }} />
                        <span className="block w-3 h-2 rounded-full" style={{ background: t.swatch.accent, opacity: 0.55 }} />
                      </span>
                    </span>
                  </span>
                ) : (
                  <span className="block h-14 w-full rounded-lg border border-border bg-secondary mb-2.5 flex items-center justify-center">
                    <MonitorSmartphone className="w-5 h-5 text-muted-foreground" />
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold truncate">{THEME_LABEL[id]}</span>
                  {active && <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />}
                </span>
                <span className="block text-[10px] text-muted-foreground truncate mt-0.5">
                  {t ? t.hint : "هماهنگ با تنظیمات سیستم‌عامل"}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
