import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MODE_LABEL: Record<string, string> = {
  professional: "حرفه‌ای‌تر",
  attractive: "جذاب‌تر و خلاقانه‌تر",
  shorter: "کوتاه‌تر و خلاصه‌تر",
  friendly: "صمیمی‌تر",
  formal: "رسمی‌تر",
  sales: "فروش‌محورتر با Call-to-Action قوی",
  goal: "متناسب با هدف تعیین‌شده",
};

const GOAL_LABEL: Record<string, string> = {
  intro: "معرفی محصول/خدمت",
  sales: "فروش و پیشنهاد خرید",
  followup: "پیگیری سرنخ یا درخواست",
  announce: "اطلاع‌رسانی خبر مهم",
  invite: "دعوت به رویداد یا اقدام",
  offer: "پیشنهاد ویژه و تخفیف",
};

function buildSystemPrompt(mode: string, goal: string): string {
  return `تو یک کپی‌رایتر حرفه‌ای پیام‌های بازاریابی فارسی برای پلتفرم «RasaWeb Messaging Hub» هستی.
وظیفه: بازنویسی متن کاربر به ۳ نسخه متفاوت به سبک «${MODE_LABEL[mode] ?? MODE_LABEL.professional}»${goal ? ` با هدف «${GOAL_LABEL[goal] ?? goal}»` : ""}.

قوانین:
- خروجی فقط ۳ نسخه باشد؛ هر نسخه با --- از نسخه بعدی جدا شود؛ هیچ توضیح یا شماره‌گذاری اضافه ننویس.
- هر نسخه حداکثر ۴۵۰ کاراکتر؛ کوتاه، قابل خواندن در موبایل، مناسب پیام‌رسان (واتساپ/تلگرام/روبیکا).
- لحن فروشندگان ایرانی: گرم، محترمانه، بدون اغراق غیرواقعی.
- از ایموجی به‌صورت ظریف (حداکثر ۴ عدد) استفاده کن.
- اگر کاربر شماره تماس یا لینک گذاشته حفظ کن؛ در غیر این صورت لینک/شماره جعلی نساز.
- در پایان هر نسخه یک دعوت به اقدام کوتاه بیاور.`;
}

export async function POST(req: NextRequest) {
  let text = "";
  let mode = "professional";
  let goal = "";
  try {
    const body = await req.json();
    text = (body?.text ?? "").toString().slice(0, 2000);
    mode = (body?.mode ?? "professional").toString();
    goal = (body?.goal ?? "").toString();

    if (!text.trim()) {
      return NextResponse.json({ error: "متن پیام خالی است" }, { status: 400 });
    }

    // z-ai-web-dev-sdk فقط در بک‌اند استفاده می‌شود
    const { default: ZAI } = await import("z-ai-web-dev-sdk");
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: buildSystemPrompt(mode, goal) },
        { role: "user", content: `متن خام من:\n"""${text}"""` },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const variants = raw
      .split("---")
      .map((v) => v.trim())
      .filter((v) => v.length > 8)
      .slice(0, 3);

    if (variants.length === 0) {
      return NextResponse.json({ variants: fallback(text, mode, goal), source: "fallback" });
    }
    return NextResponse.json({ variants, source: "ai" });
  } catch {
    return NextResponse.json({ variants: fallback(text, mode, goal), source: "fallback" });
  }
}

/** قالب‌های آماده در صورت عدم دسترسی به سرویس AI */
function fallback(text: string, mode: string, goal: string): string[] {
  const t = text.trim().slice(0, 200);
  const base = t || "پیام شما";
  const suffix =
    goal === "sales" ? "همین حالا پاسخ دهید تا نوبت شما رزرو شود 🙌" :
    goal === "offer" ? "فرصت محدود است — تا پایان هفته اعتبار دارد ⏳" :
    goal === "invite" ? "منتظر حضور گرم شما هستیم 🌟" :
    "برای اطلاعات بیشتر، همین پیام را پاسخ دهید.";

  if (mode === "shorter") {
    return [`${base}\n${suffix}`, `${base} — ${suffix}`, `خلاصه: ${base}\n${suffix}`];
  }
  if (mode === "formal") {
    return [
      `با سلام و احترام،\n${base}\nخواهشمند است در صورت تمایل با ما در ارتباط باشید.\n${suffix}`,
      `کاربر گرامی،\n${base}\nاین پیام حاوی اطلاعات مهم برای شماست.\n${suffix}`,
      `سلام و احترام،\n${base}\nدر صورت نیاز به توضیح بیشتر در خدمت شما هستیم.\n${suffix}`,
    ];
  }
  if (mode === "friendly") {
    return [
      `سلام 👋\n${base}\nخوشحال می‌شیم بیشتر توضیح بدیم!\n${suffix}`,
      `سلام رفیق 🌟\n${base}\nاگه سؤالی داری فقط کافیه جواب بدی.\n${suffix}`,
      `درود! 😊\n${base}\nمنتظر پیام تو هستیم.\n${suffix}`,
    ];
  }
  if (mode === "sales") {
    return [
      `🔥 ${base}\n\n✅ پیشنهاد ویژه امروز\n✅ پشتیبانی سریع\n👉 ${suffix}`,
      `${base}\n\nچرا الان بهترین زمانه؟\n🎁 شرایط ویژه این هفته\n⚡ پاسخ‌گویی فوری\n${suffix}`,
      `⭐ ${base}\n\nمشتریان ما قبلاً از این فرصت استفاده کردند.\n${suffix}`,
    ];
  }
  return [
    `سلام وقت بخیر 🌿\n${base}\n${suffix}`,
    `با سلام،\n${base}\n\n${suffix}`,
    `سلام 🙏\n${base}\nدر صورت تمایل، اطلاعات کامل‌تر را برایتان ارسال می‌کنیم.\n${suffix}`,
  ];
}
