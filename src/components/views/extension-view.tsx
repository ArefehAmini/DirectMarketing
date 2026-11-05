"use client";
import { useApp } from "@/store/app-store";
import { PageHeader } from "@/components/shared/ui-bits";
import { WorkerStatusBadge } from "@/components/shared/agent-bits";
import { EXTENSION_LATEST_VERSION, EXTENSION_DOWNLOAD_URL } from "@/lib/types";
import { faNum } from "@/lib/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Download, Chrome, Puzzle, ShieldCheck, Lock, Globe, Bell, MonitorSmartphone,
  RefreshCcw, PackageCheck, ArrowDownCircle, Cpu, KeyRound, Database, EyeOff, Bot,
} from "lucide-react";

export function ExtensionView() {
  const { agents, navigate } = useApp();
  const workers = agents.workers;
  const outdated = workers.filter((w) => w.extVersion && w.extVersion !== EXTENSION_LATEST_VERSION);
  const onlineWorkers = workers.filter((w) => w.status === "online");

  const PERMISSIONS: { icon: React.ReactNode; name: string; why: string }[] = [
    { icon: <Globe className="w-4 h-4" />, name: "tabs / scripting", why: "تشخیص تب‌های پیام‌رسان و تزریق Agent فقط روی همان تب‌ها — بدون خواندن سایر صفحات" },
    { icon: <MonitorSmartphone className="w-4 h-4" />, name: "Side Panel", why: "نمایش پنل کنار صفحه پیام‌رسان با Context لحظه‌ای" },
    { icon: <Bell className="w-4 h-4" />, name: "notifications", why: "اعلان نیاز به اقدام انسانی یا خطای Adapter" },
    { icon: <RefreshCcw className="w-4 h-4" />, name: "alarms", why: "Heartbeat منظم مطابق چرخه Service Worker در Manifest V3" },
    { icon: <Lock className="w-4 h-4" />, name: "storage (local)", why: "ذخیره توکن جفت‌سازی روی مرورگر خودتان — ارسال فقط به پنل شما" },
    { icon: <KeyRound className="w-4 h-4" />, name: "Host: پیام‌رسان‌ها", why: "اجرا در web.whatsapp، web.telegram، rubika، web.bale، eitaa و soroush برای اجرای دستورات مجاز" },
    { icon: <Database className="w-4 h-4" />, name: "Host: پنل RasaWeb", why: "ارتباط امن با پنل شما — فقط هنگام جفت‌سازی درخواست می‌شود" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="افزونه کروم — RasaWeb Agent"
        subtitle="عامل اجرایی مرورگر: دریافت دستور از پنل، اجرا در محیط واقعی پیام‌رسان، گزارش نتیجه"
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("workers")} className="gap-1.5">
              <Bot className="w-4 h-4" /> Browser Workers
            </Button>
            <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
              <a href={EXTENSION_DOWNLOAD_URL} download className="gap-1.5 inline-flex items-center">
                <Download className="w-4 h-4" /> دانلود افزونه (v{faNum(EXTENSION_LATEST_VERSION)})
              </a>
            </Button>
          </>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        {/* دانلود و وضعیت */}
        <Card className="lg:col-span-1">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md">
                <Puzzle className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-sm">RasaWeb Agent</div>
                <div className="text-xs text-muted-foreground">Chrome Extension — Manifest V3</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-secondary/50 p-2.5">
                <div className="text-[10px] text-muted-foreground">نسخه فعلی</div>
                <div className="font-bold mt-0.5">v{faNum(EXTENSION_LATEST_VERSION)}</div>
              </div>
              <div className="rounded-lg bg-secondary/50 p-2.5">
                <div className="text-[10px] text-muted-foreground">آخرین نسخه منتشرشده</div>
                <div className="font-bold mt-0.5">v{faNum(EXTENSION_LATEST_VERSION)}</div>
              </div>
            </div>
            {outdated.length > 0 ? (
              <div className="rounded-lg border border-orange-300 bg-orange-50 p-3 text-xs text-orange-800">
                <div className="font-semibold flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" />Update Required</div>
                {faNum(outdated.length)} Worker با نسخه قدیمی افزونه متصل است — افزونه جدید را دانلود و نصب کنید.
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 flex items-center gap-1.5">
                <PackageCheck className="w-3.5 h-3.5 shrink-0" />
                همه Workerها روی آخرین نسخه هستند.
              </div>
            )}
            <div className="rounded-lg bg-secondary/50 p-3 text-xs space-y-1.5">
              <div className="flex justify-between"><span className="text-muted-foreground">Workerهای متصل</span><span className="font-bold">{faNum(onlineWorkers.length)} از {faNum(workers.length)}</span></div>
              {workers.slice(0, 3).map((w) => (
                <div key={w.id} className="flex items-center justify-between">
                  <span className="text-muted-foreground">#{faNum(String(w.workerNo).padStart(3, "0"))} {w.name}</span>
                  <WorkerStatusBadge status={w.status} size="sm" />
                </div>
              ))}
              {workers.length === 0 && <div className="text-muted-foreground">هنوز Worker جفت نشده است.</div>}
            </div>
          </CardContent>
        </Card>

        {/* راهنمای نصب */}
        <Card className="lg:col-span-2">
          <CardContent className="p-5 space-y-4">
            <div className="text-sm font-bold flex items-center gap-2">
              <ArrowDownCircle className="w-4 h-4 text-teal-600" />
              نصب و جفت‌سازی — ۵ مرحله
            </div>
            <div className="space-y-2.5">
              {[
                { t: "دانلود و باز کردن فایل ZIP", d: `فایل rasaweb-agent-v${EXTENSION_LATEST_VERSION}.zip را دانلود و Extract کنید.` },
                { t: "باز کردن صفحه افزونه‌ها", d: "در کروم آدرس chrome://extensions را باز کنید و Developer Mode را روشن کنید." },
                { t: "Load unpacked", d: "روی Load unpacked کلیک و پوشه extract‌شده را انتخاب کنید." },
                { t: "صدور کد از پنل", d: "در همین پنل به Browser Workers بروید و «افزودن Worker» را بزنید — کد مثل RX-28491 صادر می‌شود." },
                { t: "جفت‌سازی", d: "روی آیکون افزونه کلیک کنید، آدرس پنل و کد را وارد کنید — Worker سبز می‌شود و در پنل Online نمایش داده می‌شود." },
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                  <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{faNum(i + 1)}</span>
                  <div>
                    <div className="text-xs font-semibold">{s.t}</div>
                    <div className="text-[11px] text-muted-foreground leading-5 mt-0.5">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3.5 text-xs leading-6 text-teal-900">
              <div className="font-semibold mb-1 flex items-center gap-1.5"><Bot className="w-4 h-4" />تست بدون نصب افزونه</div>
              می‌توانید بدون نصب افزونه، «Worker شبیه‌ساز» بسازید — دقیقاً همان پروتکل (Heartbeat، دریافت وظیفه، Agent Loop، گزارش) را روی API واقعی اجرا می‌کند و در همه صفحات پنل به‌صورت زنده دیده می‌شود.
              <Button size="sm" variant="outline" onClick={() => navigate("workers")} className="mt-2 gap-1.5 h-8">
                رفتن به Browser Workers
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* مجوزها و امنیت */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5 space-y-3.5">
            <div className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              مجوزها — اصل حداقل دسترسی
            </div>
            <div className="space-y-2">
              {PERMISSIONS.map((p, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border p-2.5">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 text-muted-foreground">{p.icon}</div>
                  <div>
                    <div className="text-xs font-semibold font-mono" dir="ltr">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground leading-5 mt-0.5">{p.why}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3.5">
            <div className="text-sm font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 text-teal-600" />
              امنیت و حریم خصوصی
            </div>
            <div className="space-y-2.5 text-xs leading-6">
              <SecurityItem icon={<Check />} text="Manifest V3 با Service Worker — بدون کد ریموت (remotely hosted code)؛ همه کدها در پکیج افزونه." />
              <SecurityItem icon={<Check />} text="توکن Worker فقط hash در سرور ذخیره می‌شود و در لاگ‌ها ثبت نمی‌گردد؛ هر Worker فقط به فضای کاری خودش متصل است." />
              <SecurityItem icon={<Check />} text="متن خصوصی پیام‌ها، توکن و نشست در Debug Log نمایش داده نمی‌شود (Mask)." />
              <SecurityItem icon={<Check />} text="عامل هرگز CAPTCHA، 2FA یا محدودیت امنیتی را دور نمی‌زند — در این موارد متوقف و «نیاز به اقدام انسانی» گزارش می‌شود." />
              <SecurityItem icon={<Check />} text="Safety Layer قبل از اجرا: تطابق پلتفرم، اکانت، چت و اعتبار Payload بررسی می‌شود." />
            </div>
            <div className="rounded-lg bg-secondary/50 p-3 text-[11px] leading-5 text-muted-foreground">
              معماری اجرا: Panel → Task Manager → Secure API → Service Worker → Platform Adapter → Content Script → UI پیام‌رسان. نتیجه در همان مسیر برمی‌گردد و در «گزارش فعالیت‌ها» و Event Log ثبت می‌شود.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SecurityItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-emerald-500 mt-1 shrink-0">{icon}</span>
      <span className="text-muted-foreground">{text}</span>
    </div>
  );
}

function Check() {
  return <EyeOff className="w-3.5 h-3.5" />;
}
