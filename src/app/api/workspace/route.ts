import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";

/* فضای کاری کاربر — بارگذاری snapshot کامل داده‌ها */
export async function GET() {
  const jar = await cookies();
  const user = await getSessionUser(jar.get(SESSION_COOKIE)?.value);
  if (!user) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const ws = await db.workspace.findUnique({ where: { userId: user.id } });
  if (!ws) return Response.json({ data: null });
  return Response.json({ data: JSON.parse(ws.data) });
}

/* ذخیره snapshot کامل داده‌ها (debounce سمت کلاینت) */
export async function PUT(req: Request) {
  const jar = await cookies();
  const user = await getSessionUser(jar.get(SESSION_COOKIE)?.value);
  if (!user) return Response.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const body = await req.text();
    if (!body || body.length < 2) return Response.json({ error: "empty payload" }, { status: 400 });
    JSON.parse(body); /* اعتبارسنجی JSON */

    await db.workspace.upsert({
      where: { userId: user.id },
      create: { userId: user.id, data: body },
      update: { data: body },
    });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("workspace PUT error", e);
    return Response.json({ error: "save failed" }, { status: 500 });
  }
}
