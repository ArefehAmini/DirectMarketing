import { cookies } from "next/headers";
import { getSessionUser, ROLE_LABEL } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/auth";

export async function GET() {
  try {
    const jar = await cookies();
    const user = await getSessionUser(jar.get(SESSION_COOKIE)?.value);
    if (!user) return Response.json({ error: "unauthenticated" }, { status: 401 });
    return Response.json({
      id: user.id,
      email: user.email,
      name: user.name,
      roleKey: user.role,
      roleLabel: ROLE_LABEL[user.role] ?? "کاربر",
      createdAt: user.createdAt,
    });
  } catch (e) {
    console.error("me error", e);
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }
}
