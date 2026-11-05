import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/* ─── تیکت منفرد ───
   GET   /api/tickets/[id]  → تیکت + گفتگو
   POST  /api/tickets/[id]  → پاسخ { body }  (کاربر یا مالک)
   PATCH /api/tickets/[id]  → تغییر وضعیت { status }  (مالک: همه | کاربر: فقط بستن تیکت خودش) */

const STATUSES = new Set(["open", "in_progress", "waiting", "resolved", "closed"]);

async function loadOwned(req: NextRequest, id: string) {
  const user = await getSessionUser(req.cookies.get("rw_session")?.value);
  if (!user) return { user: null, ticket: null, isOwner: false };
  const ticket = await db.ticket.findUnique({ where: { id }, include: { user: { select: { id: true } } } });
  if (!ticket) return { user, ticket: null, isOwner: false };
  const isOwner = user.role === "owner" || user.role === "admin";
  if (!isOwner && ticket.userId !== user.id) return { user, ticket: null, isOwner };
  return { user, ticket, isOwner };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { user, ticket, isOwner } = await loadOwned(req, id);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!ticket) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const messages = await db.ticketMessage.findMany({ where: { ticketId: ticket.id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({
    ticket: {
      id: ticket.id, refNo: ticket.refNo, subject: ticket.subject, category: ticket.category,
      priority: ticket.priority, status: ticket.status, createdAt: ticket.createdAt, updatedAt: ticket.updatedAt,
      mine: ticket.userId === user.id, isOwner,
    },
    messages,
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { user, ticket, isOwner } = await loadOwned(req, id);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!ticket) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const text = String(body?.body ?? "").trim().slice(0, 4000);
  if (text.length < 2) return NextResponse.json({ error: "متن پاسخ خیلی کوتاه است" }, { status: 400 });

  await db.ticketMessage.create({
    data: { ticketId: ticket.id, authorRole: isOwner ? "owner" : "user", authorName: user.name, body: text },
  });

  /* پاسخ مالک → تیکت «در حال بررسی»؛ پاسخ کاربر روی تیکتِ در انتظارش → دوباره «باز» */
  const nextStatus = isOwner
    ? (ticket.status === "open" ? "in_progress" : ticket.status)
    : (ticket.status === "waiting" || ticket.status === "resolved" ? "open" : ticket.status);
  if (nextStatus !== ticket.status) {
    await db.ticket.update({ where: { id: ticket.id }, data: { status: nextStatus } });
  }

  return NextResponse.json({ ok: true, status: nextStatus });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { user, ticket, isOwner } = await loadOwned(req, id);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!ticket) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const status = String(body?.status ?? "");
  if (!STATUSES.has(status)) return NextResponse.json({ error: "وضعیت نامعتبر است" }, { status: 400 });

  /* کاربر عادی فقط می‌تواند تیکت خودش را ببندد */
  if (!isOwner && !(status === "closed" && ticket.userId === user.id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await db.ticket.update({ where: { id: ticket.id }, data: { status } });
  return NextResponse.json({ ok: true, status });
}
