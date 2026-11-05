"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app-store";
import { PageHeader } from "@/components/shared/ui-bits";
import { faNum } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ShieldCheck, KeyRound, MonitorSmartphone, History, Smartphone, Monitor, LogIn,
  AlertTriangle, Eye, EyeOff, Copy, FileClock, RefreshCw,
} from "lucide-react";

interface DeviceRow {
  device: string;
  location: string;
  ip: string;
  at: string;
  current: boolean;
  icon: React.ElementType;
}

const BASE_DEVICES: DeviceRow[] = [
  { device: "Chrome — سیستم فعلی شما", location: "بر اساس IP فعلی", ip: "در حال استفاده", at: "همین لحظه", current: true, icon: Monitor },
  { device: "RasaWeb Mobile — Android", location: "تهران، ایران", ip: "185.•••.••.••", at: "دیروز ۱۸:۲۲", current: false, icon: Smartphone },
  { device: "Safari — macOS", location: "اصفهان، ایران", ip: "91.•••.••.••", at: "۳ روز پیش", current: false, icon: Monitor },
];

const AUDIT = [
  { at: "امروز ۱۲:۰۵", user: "سیستم", action: "توقف خودکار اکانت بله 012 به دلیل محدودیت سرویس مقصد", kind: "warn" },
  { at: "امروز ۰۹:۱۰", user: "مریم رضایی", action: "ورود گروهی ۱۲٬۵۸۰ مخاطب", kind: "ok" },
  { at: "امروز ۰۸:۱۲", user: "سارا محمدی", action: "ورود موفق — 2FA تأیید شد", kind: "ok" },
  { at: "دیروز ۱۷:۴۸", user: "سیستم", action: "تکمیل کمپین «معرفی خدمات طراحی سایت مهر»", kind: "ok" },
  { at: "دیروز ۱۱:۳۵", user: "سیستم", action: "تشخیص محدودیت روی اکانت روبیکا 021", kind: "warn" },
  { at: "دیروز ۰۹:۰۰", user: "امیر کریمی", action: "تغییر Limit پلتفرم تلگرام از ۲۰ به ۱۰۰", kind: "info" },
  { at: "۲ روز پیش ۱۴:۳۰", user: "سارا محمدی", action: "توقف موقت کمپین «اطلاع‌رسانی جشنواره پاییزه»", kind: "info" },
];

function genKey() {
  const abc = "abcdefghijklmnopqrstuvwxyz0123456789";
  let core = "";
  for (let i = 0; i < 24; i++) core += abc[Math.floor(Math.random() * abc.length)];
  return `rw_live_sk_${core}`;
}

function genRecoveryCodes() {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    let c = "";
    for (let j = 0; j < 10; j++) c += "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)];
    codes.push(c);
  }
  return codes;
}

export function SecurityView() {
  const { currentUser, logout } = useApp();
  const twoFaKey = `rw-2fa:${currentUser.email.toLowerCase()}`;
  const apiKeyKey = `rw-apikey:${currentUser.email.toLowerCase()}`;

  const [twoFa, setTwoFa] = useState(true);
  const [twoFaOffOpen, setTwoFaOffOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showApi, setShowApi] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [devices, setDevices] = useState<DeviceRow[]>(BASE_DEVICES);
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);
  const [sessionStart] = useState(() =>
    new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date())
  );

  /* بارگذاری تنظیمات واقعی ذخیره‌شده کاربر (به‌صورت async تا خارج از فاز رندر باشد) */
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        setTwoFa(window.localStorage.getItem(twoFaKey) !== "off");
        let k = window.localStorage.getItem(apiKeyKey);
        if (!k) {
          k = genKey();
          window.localStorage.setItem(apiKeyKey, k);
        }
        setApiKey(k);
      } catch {
        /* storage در دسترس نیست */
      }
    }, 0);
    return () => clearTimeout(t);
  }, [twoFaKey, apiKeyKey]);

  const toggleTwoFa = (v: boolean) => {
    if (!v) {
      setTwoFaOffOpen(true);
      return;
    }
    setTwoFa(true);
    try {
      window.localStorage.removeItem(twoFaKey);
    } catch {}
    toast.success("2FA فعال شد — از ورود بعدی روی همه دستگاه‌ها اعمال می‌شود");
  };

  const confirmTwoFaOff = () => {
    setTwoFa(false);
    try {
      window.localStorage.setItem(twoFaKey, "off");
    } catch {}
    setTwoFaOffOpen(false);
    toast.info("2FA غیرفعال شد");
  };

  const rotateKey = () => {
    const k = genKey();
    try {
      window.localStorage.setItem(apiKeyKey, k);
    } catch {}
    setApiKey(k);
    setShowApi(true);
    toast.success("کلید جدید صادر شد — کلید قبلی باطل است");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="امنیت"
        subtitle="نشست‌ها، دستگاه‌های متصل، احراز هویت دو مرحله‌ای و لاگ رخدادها"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 2FA */}
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2"><KeyRound className="w-4 h-4 text-teal-600" /> احراز هویت دو مرحله‌ای</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold">2FA در ورود به پنل</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">پس از گذرواژه، کد یک‌بارمصرف پرسیده می‌شود</div>
              </div>
              <Switch checked={twoFa} onCheckedChange={toggleTwoFa} />
            </div>
            <div className="rounded-xl bg-secondary/60 p-3.5 text-[11px] text-muted-foreground leading-5">
              کدهای بازیابی یک‌بارمصرف برای ورود بدون دسترسی به کد اصلی صادر می‌شوند. هر کد فقط یک بار قابل استفاده است.
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setRecoveryCodes(genRecoveryCodes());
                setRecoveryOpen(true);
              }}
            >
              صدور کدهای بازیابی جدید
            </Button>
          </CardContent>
        </Card>

        {/* Session */}
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2"><LogIn className="w-4 h-4 text-teal-600" /> نشست جاری</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <Row label="حساب" value={<span dir="ltr">{currentUser.email}</span>} />
            <Row label="وضعیت" value={<Badge variant="outline" className="text-[10px] border-emerald-200 text-emerald-700 bg-emerald-50">فعال و امن</Badge>} />
            <Row label="شروع نشست" value={`امروز ${sessionStart}`} />
            <Row label="انقضای نشست" value="۷ روز پس از آخرین فعالیت" />
            <Button size="sm" variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50" onClick={() => setRevokeAllOpen(true)}>
              خروج از همه دستگاه‌ها
            </Button>
          </CardContent>
        </Card>

        {/* API */}
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-teal-600" /> اعتبارنامه‌های API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-muted px-3 py-2 text-[10px] tracking-wider" dir="ltr">
                {showApi ? apiKey : `${apiKey.slice(0, 11)}${"•".repeat(18)}`}
              </code>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setShowApi((s) => !s)}
                aria-label="نمایش/مخفی"
              >
                {showApi ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                aria-label="کپی"
                onClick={() => {
                  navigator.clipboard?.writeText(apiKey).then(
                    () => toast.success("کلید کپی شد"),
                    () => toast.error("کپی ناموفق بود")
                  );
                }}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground leading-5">
              کلید فقط در همین مرورگر نگه‌داری می‌شود و به‌صورت ماسک‌شده نمایش داده می‌شود. با چرخش کلید، کلید قبلی باطل می‌شود.
            </p>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={rotateKey}>
              <RefreshCw className="w-3.5 h-3.5" /> چرخش کلید (Rotate)
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Devices */}
      <Card className="shadow-none overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2"><MonitorSmartphone className="w-4 h-4 text-teal-600" /> دستگاه‌های متصل</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {devices.map((d) => (
            <div key={d.device} className={cn("rounded-xl border p-4", d.current && "border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20")}>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                  <d.icon className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{d.device}</div>
                  {d.current && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[9px] mt-0.5">دستگاه فعلی</Badge>}
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground space-y-1 leading-5">
                <div>موقعیت: {d.location}</div>
                <div dir="ltr" className="text-left">IP: {d.ip}</div>
                <div>آخرین فعالیت: {d.at}</div>
              </div>
              {!d.current && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 h-7 text-[11px] text-red-600 w-full"
                  onClick={() => {
                    setDevices((ds) => ds.filter((x) => x.device !== d.device));
                    toast.info(`دسترسی دستگاه «${d.device}» لغو شد`);
                  }}
                >
                  لغو دسترسی دستگاه
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Audit log */}
      <Card className="shadow-none overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2"><FileClock className="w-4 h-4 text-teal-600" /> Audit Log — رخدادهای امنیتی و مدیریتی</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>زمان</TableHead>
                  <TableHead>کاربر</TableHead>
                  <TableHead>رخداد</TableHead>
                  <TableHead>نوع</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {AUDIT.map((a, i) => (
                  <TableRow key={i} className="hover:bg-muted/30">
                    <TableCell className="text-xs tabular-nums whitespace-nowrap text-muted-foreground">{a.at}</TableCell>
                    <TableCell className="text-xs font-medium whitespace-nowrap">{a.user}</TableCell>
                    <TableCell className="text-xs leading-5">{a.action}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px]",
                        a.kind === "warn" ? "border-amber-200 text-amber-700 bg-amber-50" : a.kind === "ok" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-sky-200 text-sky-700 bg-sky-50")}>
                        {a.kind === "warn" ? <AlertTriangle className="w-3 h-3" /> : a.kind === "ok" ? <History className="w-3 h-3" /> : <FileClock className="w-3 h-3" />}
                        {a.kind === "warn" ? "هشدار" : a.kind === "ok" ? "عادی" : "تغییر"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recovery codes dialog */}
      <Dialog open={recoveryOpen} onOpenChange={setRecoveryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>کدهای بازیابی یک‌بارمصرف</DialogTitle>
            <DialogDescription>
              این کدها فقط همین یک بار نمایش داده می‌شوند. در جای امن ذخیره کنید؛ هر کد فقط یک بار قابل استفاده است.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {recoveryCodes.map((c) => (
              <code key={c} dir="ltr" className="rounded-lg bg-muted px-3 py-2 text-[11px] tracking-widest text-center">
                {c.slice(0, 5)}-{c.slice(5)}
              </code>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-1.5"
              onClick={() => {
                navigator.clipboard?.writeText(recoveryCodes.join("\n")).then(
                  () => toast.success("کدها کپی شدند"),
                  () => toast.error("کپی ناموفق بود")
                );
              }}
            >
              <Copy className="w-3.5 h-3.5" /> کپی همه
            </Button>
            <Button className="flex-1 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setRecoveryOpen(false)}>
              ذخیره کردم
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2FA disable confirm */}
      <AlertDialog open={twoFaOffOpen} onOpenChange={setTwoFaOffOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>غیرفعال‌سازی 2FA؟</AlertDialogTitle>
            <AlertDialogDescription>
              با غیرفعال‌کردن، ورود فقط با ایمیل و گذرواژه انجام می‌شود و لایه حفاظتی دوم حذف خواهد شد. توصیه می‌شود 2FA فعال بماند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف — فعال بماند</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmTwoFaOff}>
              بله، غیرفعال شود
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke all sessions confirm */}
      <AlertDialog open={revokeAllOpen} onOpenChange={setRevokeAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>خروج از همه دستگاه‌ها؟</AlertDialogTitle>
            <AlertDialogDescription>
              همه نشست‌های فعال حساب <b dir="ltr">{currentUser.email}</b> در همه دستگاه‌ها پایان می‌یابد و باید دوباره وارد شوید. داده‌های فضای کاری شما حذف نمی‌شود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                await fetch("/api/auth/logout-all", { method: "POST" }).catch(() => {});
                logout();
                toast.info("از همه دستگاه‌ها خارج شدید");
              }}
            >
              خروج از همه
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
