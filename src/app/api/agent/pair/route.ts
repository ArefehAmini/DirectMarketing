import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  PAIRING_TTL_MS, makePairingCode, randomToken, sha256,
  nextWorkerNo, logEvent,
} from "@/lib/agent-server";

/* ─── ایجاد کد جفت‌سازی — از پنل مرکزی (نشست کاربر) ───
   POST /api/agent/pair?action=new  { workerName }
   ─── جفت‌سازی افزونه — از Chrome Extension (بدون نشست) ───
   POST /api/agent/pair  { code, device: { chrome, ext, profile } } */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    /* ═ ۱) حالت پنل: ساخت کد جدید ═ */
    if (body?.action === "new") {
      const user = await getSessionUser(req.cookies.get("rw_session")?.value);
      if (!user) return NextResponse.json({ error: "ابتدا وارد پنل شوید." }, { status: 401 });

      /* کدهای منقضی/مصرف‌شده کاربر پاک‌سازی می‌شوند */
      await db.pairingCode.deleteMany({
        where: { userId: user.id, OR: [{ expiresAt: { lt: new Date() } }, { used: true }] },
      }).catch(() => {});

      let code = makePairingCode();
      for (let i = 0; i < 5; i++) {
        const exists = await db.pairingCode.findUnique({ where: { code } });
        if (!exists) break;
        code = makePairingCode();
      }

      const pc = await db.pairingCode.create({
        data: {
          userId: user.id,
          code,
          workerName: String(body.workerName ?? "").slice(0, 60),
          expiresAt: new Date(Date.now() + PAIRING_TTL_MS),
        },
      });
      await logEvent(user.id, null, "pairing", `کد جفت‌سازی ${code} صادر شد`, body.workerName ? `برای Worker «${body.workerName}»` : "");
      return NextResponse.json({ id: pc.id, code: pc.code, workerName: pc.workerName, expiresAt: pc.expiresAt });
    }

    /* ═ ۲) حالت افزونه: استفاده از کد برای جفت‌سازی ═ */
    const code = String(body?.code ?? "").trim().toUpperCase();
    if (!code) return NextResponse.json({ error: "کد اتصال الزامی است." }, { status: 400 });

    const pc = await db.pairingCode.findUnique({ where: { code }, include: { user: true } });
    if (!pc || pc.used) return NextResponse.json({ error: "کد اتصال نامعتبر است." }, { status: 404 });
    if (pc.expiresAt.getTime() < Date.now())
      return NextResponse.json({ error: "کد اتصال منقضی شده است. در پنل کد جدید بگیرید." }, { status: 410 });

    const device = body?.device ?? {};
    const token = randomToken();
    const workerNo = await nextWorkerNo(pc.userId);

    const worker = await db.browserWorker.create({
      data: {
        userId: pc.userId,
        workerNo,
        name: pc.workerName || (device.simulated ? "Worker شبیه‌ساز" : "Chrome Worker"),
        status: "online",
        tokenHash: sha256(token),
        chromeVersion: String(device.chrome ?? "").slice(0, 40),
        extVersion: String(device.ext ?? "").slice(0, 20),
        profileLabel: String(device.profile ?? `Profile-${workerNo + 1}`).slice(0, 40),
        simulated: Boolean(device.simulated),
        lastHeartbeat: new Date(),
      },
    });

    await db.pairingCode.update({ where: { id: pc.id }, data: { used: true } });
    await logEvent(pc.userId, worker.id, "connected", `Worker #${String(workerNo).padStart(3, "0")} جفت شد و متصل شد`, `Chrome ${device.chrome ?? "?"} — ${worker.profileLabel}`);

    return NextResponse.json({
      workerId: worker.id,
      workerNo: worker.workerNo,
      workerName: worker.name,
      token,
      workspace: pc.user.name,
      panelVersion: 1,
    });
  } catch {
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}
