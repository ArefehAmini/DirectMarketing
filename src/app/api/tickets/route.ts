import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/* ─── سیستم تیکت پشتیبانی ───
   GET  /api/tickets            → تیکت‌ها (کاربر: تیکت‌های خودش | مالک: همه + آمار)
   POST /api/tickets            → ثبت تیکت جدید { subject, category, priority, message } */

const CATEGORIES = new Set(["bug", "feature", "account", "campaign", "extension", "other"]);
const PRIORITIES = new Set(["low", "normal", "high", "urgent"]);

async function nextTicketRefNo(): Promise<number> {
  const last = await db.ticket.findFirst({ orderBy: { refNo: "desc" }, select: { refNo: true } });
  return Math.max(1000, last?.refNo ?? 1000) + 1;
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req.cookies.get("rw_session")?.value);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const isOwner = user.role === "owner" || user.role === "admin";
  const where = isOwner ? {} : { userId: user.id };

  const tickets = await db.ticket.findMany({
    where,
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      user: { select: { name: true, email: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  const rows = tickets.map((t) => ({
    id: t.id,
    refNo: t.refNo,
    subject: t.subject,
    category: t.category,
    priority: t.priority,
    status: t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    userName: t.user.name,
    userEmail: t.user.email,
    mine: t.userId === user.id,
    messages: t.messages.map((m) => ({
      id: m.id,
      authorRole: m.authorRole,
      authorName: m.authorName,
      body: m.body,
      createdAt: m.createdAt,
    })),
  }));

  return NextResponse.json({
    isOwner,
    tickets: rows,
    stats: {
      total: rows.length,
      open: rows.filter((t) => t.status === "open").length,
      inProgress: rows.filter((t) => t.status === "in_progress").length,
      resolved: rows.filter((t) => t.status === "resolved" || t.status === "closed").length,
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req.cookies.get("rw_session")?.value);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const subject = String(body?.subject ?? "").trim().slice(0, 140);
  const message = String(body?.message ?? "").trim().slice(0, 4000);
  const category = CATEGORIES.has(body?.category) ? body.category : "other";
  const priority = PRIORITIES.has(body?.priority) ? body.priority : "normal";

  if (subject.length < 3) return NextResponse.json({ error: "موضوع تیکت باید حداقل ۳ نویسه باشد" }, { status: 400 });
  if (message.length < 10) return NextResponse.json({ error: "شرح مشکل باید حداقل ۱۰ نویسه باشد" }, { status: 400 });

  const refNo = await nextTicketRefNo();
  const ticket = await db.ticket.create({
    data: {
      userId: user.id,
      refNo,
      subject,
      category,
      priority,
      status: "open",
      messages: {
        create: { authorRole: "user", authorName: user.name, body: message },
      },
    },
  });

  return NextResponse.json({ ok: true, id: ticket.id, refNo });
}
