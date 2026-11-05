"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app-store";
import { PageHeader } from "@/components/shared/ui-bits";
import { ROLE_META, Role } from "@/lib/types";
import { faNum } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, ShieldCheck, Check, X } from "lucide-react";

const PERMISSIONS = [
  { label: "مشاهده داشبورد و گزارش‌ها", roles: ["owner", "admin", "campaign_manager", "operator", "viewer"] },
  { label: "پاسخ‌گویی صندوق ورودی و اختصاص گفتگو", roles: ["owner", "admin", "operator"] },
  { label: "ساخت و ویرایش کمپین", roles: ["owner", "admin", "campaign_manager", "operator"] },
  { label: "تأیید / رد کمپین (Approval)", roles: ["owner", "admin"] },
  { label: "مدیریت مخاطبان و ورود گروهی", roles: ["owner", "admin", "campaign_manager", "operator"] },
  { label: "مدیریت سگمنت‌ها و قالب‌ها", roles: ["owner", "admin", "campaign_manager", "operator"] },
  { label: "توقف / ادامه کمپین‌ها", roles: ["owner", "admin", "campaign_manager"] },
  { label: "اتصال و حذف اکانت‌ها", roles: ["owner", "admin"] },
  { label: "تغییر قوانین ارسال و Limits", roles: ["owner", "admin"] },
  { label: "مشاهده مصرف و هزینه", roles: ["owner", "admin"] },
  { label: "مدیریت کاربران و نقش‌ها", roles: ["owner", "admin"] },
  { label: "مشاهده Audit Log و امنیت", roles: ["owner", "admin", "campaign_manager"] },
] as const;

export function UsersView() {
  const { users, updateSystemUser } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("operator");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<Role>("operator");
  const [editStatus, setEditStatus] = useState<"active" | "suspended">("active");
  const [editApprove, setEditApprove] = useState(false);

  return (
    <div className="space-y-5">
      <PageHeader
        title="کاربران و دسترسی‌ها"
        subtitle="مدیریت نقش‌ها و سطوح دسترسی تیم — هر نقش فقط به بخش‌های مجاز دسترسی دارد"
        actions={
          <Button onClick={() => setAddOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
            <UserPlus className="w-4 h-4" /> افزودن کاربر
          </Button>
        }
      />

      {/* Users table */}
      <Card className="shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>کاربر</TableHead>
                <TableHead>ایمیل</TableHead>
                <TableHead>نقش</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>آخرین ورود</TableHead>
                <TableHead className="text-center">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className={cn("w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white", u.avatarColor)}>
                        {u.name.slice(0, 1)}
                      </span>
                      <span className="text-xs font-bold">{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell dir="ltr" className="text-left text-xs text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select value={u.role} onValueChange={(v) => {
                        const role = v as Role;
                        updateSystemUser(u.id, { role, canApprove: role === "owner" || role === "admin" });
                        toast.success(`نقش «${u.name}» به ${ROLE_META[role].label} تغییر کرد`);
                      }}>
                        <SelectTrigger className="h-8 w-40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ROLE_META) as Role[]).map((r) => (
                            <SelectItem key={r} value={r}>{ROLE_META[r].label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {u.customRoleName && (
                        <Badge variant="outline" className="text-[9px] text-indigo-600 border-indigo-200">{u.customRoleName}</Badge>
                      )}
                      {u.canApprove && (
                        <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-200">مجوز تأیید</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px]", u.status === "active" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-red-200 text-red-700 bg-red-50")}>
                      {u.status === "active" ? "فعال" : "معلق"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.lastLogin}</TableCell>
                  <TableCell className="text-center">
                    <Button size="sm" variant="ghost" className="h-7 text-[11px] text-teal-600" onClick={() => {
                      setEditId(u.id);
                      setEditName(u.name);
                      setEditRole(u.role);
                      setEditStatus(u.status);
                      setEditApprove(!!u.canApprove);
                    }}>
                      مدیریت
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Permission matrix */}
      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-teal-600" /> ماتریس دسترسی نقش‌ها</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>دسترسی</TableHead>
                {(Object.keys(ROLE_META) as Role[]).map((r) => (
                  <TableHead key={r} className="text-center min-w-24">
                    <div className="text-xs font-bold">{ROLE_META[r].label}</div>
                    <div className="text-[9px] font-normal text-muted-foreground leading-4 mt-0.5">{ROLE_META[r].desc}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSIONS.map((p) => (
                <TableRow key={p.label}>
                  <TableCell className="text-xs font-medium">{p.label}</TableCell>
                  {(Object.keys(ROLE_META) as Role[]).map((r) => {
                    const allowed = (p.roles as readonly string[]).includes(r);
                    return (
                      <TableCell key={r} className="text-center">
                        {allowed ? (
                          <span className="inline-flex w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 items-center justify-center"><Check className="w-3.5 h-3.5" /></span>
                        ) : (
                          <span className="inline-flex w-6 h-6 rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 items-center justify-center"><X className="w-3.5 h-3.5" /></span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-[10px] text-muted-foreground mt-3 leading-5">
            مدیر می‌تواند برای هر نقش تعیین کند چه کسی اجازه تأیید کمپین را دارد. نقش‌های سفارشی (مثل «پشتیبان Inbox») با انتخاب دستی دسترسی‌ها ساخته می‌شوند.
            مثال: اپراتور می‌تواند کمپین بسازد و Inbox را مدیریت کند، اما تأیید کمپین و تغییر Limits فقط با مالک/مدیر کل است.
          </p>
        </CardContent>
      </Card>

      {/* Edit user dialog */}
      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>مدیریت کاربر</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>نام و نام خانوادگی</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>نقش</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_META) as Role[]).map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_META[r].label} — {ROLE_META[r].desc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <div className="text-xs font-semibold">وضعیت حساب</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">کاربر معلق نمی‌تواند وارد شود</div>
              </div>
              <button
                onClick={() => setEditStatus(editStatus === "active" ? "suspended" : "active")}
                className={cn("text-[11px] font-semibold rounded-lg px-3 py-1.5 border cursor-pointer transition-colors", editStatus === "active" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-600")}
              >
                {editStatus === "active" ? "فعال" : "معلق"}
              </button>
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <div className="text-xs font-semibold">مجوز تأیید کمپین</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">می‌تواند کمپین‌های در انتظار را تأیید یا رد کند</div>
              </div>
              <button
                onClick={() => setEditApprove((v) => !v)}
                className={cn("text-[11px] font-semibold rounded-lg px-3 py-1.5 border cursor-pointer transition-colors", editApprove ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-muted text-muted-foreground")}
              >
                {editApprove ? "دارد" : "ندارد"}
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>انصراف</Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => {
                if (editId) {
                  updateSystemUser(editId, { name: editName.trim() || undefined, role: editRole, status: editStatus, canApprove: editApprove });
                  toast.success("تغییرات کاربر ذخیره شد");
                }
                setEditId(null);
              }}
            >
              ذخیره تغییرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add user dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>افزودن کاربر جدید</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>نام و نام خانوادگی</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="مثلاً: مریم رضایی" />
            </div>
            <div className="space-y-1.5">
              <Label>ایمیل سازمانی</Label>
              <Input dir="ltr" className="text-left" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@rasaweb.ir" />
            </div>
            <div className="space-y-1.5">
              <Label>نقش</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_META) as Role[]).map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_META[r].label} — {ROLE_META[r].desc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>انصراف</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => {
              if (!newName.trim() || !newEmail.includes("@")) return toast.error("نام و ایمیل معتبر وارد کنید");
              toast.success(`دعوت‌نامه برای ${newName} ارسال شد`);
              setAddOpen(false);
              setNewName(""); setNewEmail("");
            }}>
              ارسال دعوت‌نامه
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
