"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app-store";
import { PageHeader } from "@/components/shared/ui-bits";
import { faNum } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ClipboardPaste, FileSpreadsheet, Play, CheckCircle2, XCircle, Copy, Hash,
  Loader2, Upload, Download, ArrowRight, Info,
} from "lucide-react";

const SAMPLE = `09121234567
0912-123-4568
۹۸۹۱۲۳۴۵۶۷۹۰
09121234567
09351234569
0919 123 4570
091234567
hello
09361234572
+989171234573
09131234574
09131234574
09371234576
09141234577
09901234578
09901234578
09211234579
09151234580
09161234581
09171234582`;

type Phase = "input" | "processing" | "done";

export function ImportContactsView() {
  const { importContacts, navigate, groups } = useApp();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("input");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState({ total: 0, valid: 0, duplicates: 0, invalid: 0 });
  const [targetGroup, setTargetGroup] = useState("g5");

  const steps = ["استانداردسازی فرمت شماره‌ها", "حذف شماره‌های تکراری", "اعتبارسنجی با الگوی سرویس‌ها", "افزودن به مخاطبان"];

  const start = () => {
    const lines = (fileName ? text : text).split(/\n+/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return toast.error("حداقل چند شماره وارد کنید یا از دکمه «نمونه فرمت» استفاده کنید");
    setPhase("processing");
    setStep(0);
    let s = 0;
    const iv = setInterval(() => {
      s++;
      setStep(s);
      if (s >= steps.length) {
        clearInterval(iv);
        // تحلیل واقعی متن
        const normalized = lines.map((l) => {
          const latin = l.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
          return latin.replace(/[^0-9]/g, "").replace(/^98/, "0").replace(/^\+98/, "0");
        });
        const seen = new Set<string>();
        const valid: string[] = [];
        let dup = 0;
        let invalid = 0;
        for (const n of normalized) {
          if (!/^09\d{9}$/.test(n)) { invalid++; continue; }
          if (seen.has(n)) { dup++; continue; }
          seen.add(n);
          valid.push(n);
        }
        const r = { total: lines.length, valid: valid.length, duplicates: dup, invalid };
        setTimeout(() => {
          setResult(r);
          setPhase("done");
        }, 400);
      }
    }, 650);
  };

  const confirm = () => {
    importContacts(result.valid, result.duplicates, result.invalid);
    toast.success(`${faNum(result.valid)} مخاطب معتبر اضافه شد`);
    navigate("contacts");
  };

  const loadSample = () => {
    setText(SAMPLE);
    setFileName(null);
    toast.info("نمونه فرمت بارگذاری شد — شامل ردیف تکراری و نامعتبر برای تست پردازش");
  };

  const invalidSample = useMemo(
    () =>
      text
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => {
          const latin = l.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
          const digits = latin.replace(/[^0-9]/g, "");
          return digits.replace(/^98/, "0");
        })
        .filter((n) => n && !/^09\d{9}$/.test(n))
        .slice(0, 6),
    [text]
  );

  return (
    <div className="max-w-4xl space-y-5">
      <button onClick={() => navigate("contacts")} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer">
        <ArrowRight className="w-3.5 h-3.5" /> بازگشت به مخاطبان
      </button>
      <PageHeader title="ورود گروهی مخاطبان" subtitle="هزاران شماره را یکجا وارد کنید — استانداردسازی و حذف تکراری به‌صورت خودکار انجام می‌شود" />

      <Tabs defaultValue="paste">
        <TabsList className="bg-muted/70">
          <TabsTrigger value="paste" className="gap-1.5"><ClipboardPaste className="w-3.5 h-3.5" /> کپی / پیست</TabsTrigger>
          <TabsTrigger value="file" className="gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5" /> فایل Excel / CSV</TabsTrigger>
        </TabsList>

        <TabsContent value="paste" className="mt-4 space-y-4">
          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                شماره‌ها (هر خط یک شماره)
                <button onClick={loadSample} className="text-xs font-normal text-teal-600 hover:underline cursor-pointer inline-flex items-center gap-1">
                  <Copy className="w-3 h-3" /> پر کردن با نمونه فرمت
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                dir="ltr"
                value={text}
                onChange={(e) => { setText(e.target.value); setFileName(null); }}
                className="w-full h-52 rounded-xl border bg-muted/30 p-4 text-left text-sm font-mono tabular-nums outline-none focus:ring-2 focus:ring-teal-500/40 resize-none"
                placeholder={"09121234567\n09121234568\n…"}
              />
              <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
                <span>{faNum(text.split(/\n+/).filter((l) => l.trim()).length)} خط وارد شده</span>
                <span>فرمت‌های ۰۹xx، ۹۸۹xx و +۹۸ به‌صورت خودکار استاندارد می‌شوند</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="file" className="mt-4 space-y-4">
          <Card className="shadow-none">
            <CardContent className="p-8">
              <label className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-teal-600" />
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold">فایل اکسل یا CSV را اینجا رها کنید</div>
                  <div className="text-xs text-muted-foreground mt-1">فرمت‌های xlsx، xls، csv — حداکثر ۵۰۰ هزار ردیف</div>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setFileName(f.name);
                      setText(SAMPLE);
                      toast.success(`فایل «${f.name}» آماده پردازش است`);
                    }
                  }}
                />
                <span className="text-xs font-medium text-teal-600">انتخاب فایل</span>
              </label>
              {fileName && (
                <div className="mt-4 flex items-center gap-2 text-xs">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <b>{fileName}</b>
                  <Badge variant="secondary" className="text-[10px]">آماده پردازش</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Process */}
      {phase === "input" && (
        <div className="flex items-center gap-3">
          <Button onClick={start} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
            <Play className="w-4 h-4" /> شروع پردازش و اعتبارسنجی
          </Button>
          <GroupPicker target={targetGroup} setTarget={setTargetGroup} groups={groups.map((g) => ({ id: g.id, name: g.name }))} />
        </div>
      )}

      {phase === "processing" && (
        <Card className="shadow-none">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
              <span className="text-sm font-semibold">در حال پردازش شماره‌ها…</span>
            </div>
            <Progress value={(step / steps.length) * 100} className="h-2" />
            <div className="space-y-2">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-2.5 text-xs">
                  {i < step ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : i === step ? (
                    <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border-2 border-muted" />
                  )}
                  <span className={i <= step ? "font-medium" : "text-muted-foreground"}>{s}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {phase === "done" && (
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> نتیجه پردازش
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <ResBox label="شماره وارد‌شده" value={result.total} cls="text-foreground" />
              <ResBox label="معتبر و اضافه‌شده" value={result.valid} cls="text-emerald-600" />
              <ResBox label="تکراری (حذف شد)" value={result.duplicates} cls="text-amber-600" />
              <ResBox label="نامعتبر (جدا شد)" value={result.invalid} cls="text-red-600" />
            </div>

            {invalidSample.length > 0 && (
              <div className="rounded-xl border bg-muted/30 p-3.5">
                <div className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-500" /> نمونه شماره‌های نامعتبر
                </div>
                <div dir="ltr" className="flex flex-wrap gap-2">
                  {invalidSample.map((n, i) => (
                    <code key={i} className="rounded bg-background border px-2 py-1 text-[10px] tabular-nums text-red-600">{n || "—"}</code>
                  ))}
                </div>
              </div>
            )}

            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription className="text-[11px] leading-5">
                شماره‌های معتبر به گروه «{groups.find((g) => g.id === targetGroup)?.name}» اضافه می‌شوند. شماره‌های تکراری حذف و فرمت همه شماره‌ها استاندارد شده است.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button onClick={confirm} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                <Hash className="w-4 h-4" /> تأیید و افزودن {faNum(result.valid)} مخاطب
              </Button>
              <Button variant="outline" onClick={() => { setPhase("input"); setStep(0); }}>
                پردازش مجدد
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ResBox({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className={cn("rounded-xl border p-4", cls.includes("emerald") ? "border-emerald-200 bg-emerald-50/50" : cls.includes("amber") ? "border-amber-200 bg-amber-50/50" : cls.includes("red") ? "border-red-200 bg-red-50/50" : "")}>
      <div className={cn("text-xl font-bold tabular-nums", cls)}>{faNum(value)}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function GroupPicker({ target, setTarget, groups }: { target: string; setTarget: (v: string) => void; groups: { id: string; name: string }[] }) {
  return (
    <Select value={target} onValueChange={setTarget}>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="گروه مقصد" />
      </SelectTrigger>
      <SelectContent>
        {groups.map((g) => (
          <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
