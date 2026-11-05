import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "RasaWeb Messaging Hub | مرکز مدیریت پیام‌رسان‌ها",
  description:
    "پلتفرم حرفه‌ای مدیریت متمرکز اکانت‌های پیام‌رسان، مخاطبان، کمپین‌های پیام‌رسانی، صف ارسال و مانیتورینگ وضعیت اکانت‌ها",
  keywords: ["RasaWeb", "Messaging Hub", "مدیریت اکانت", "کمپین پیام‌رسانی", "SaaS"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f766e",
};

/* اعمال تم ذخیره‌شده پیش از هیدریشن — جلوگیری از فلش تم اشتباه (FOUC).
   حالت «سیستمی»: Graphite در ترجیح تیرهٔ OS، Daylight در غیر آن. */
const THEME_BOOT = `(function(){try{var t=localStorage.getItem("rw-theme")||"system";var ids=["continental","graphite","midnight_indigo","daylight","saramad_rose","lavande","sakura","forest"];var dark;if(t==="system"){dark=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;}else{dark=t==="continental"||t==="graphite"||t==="midnight_indigo";}var r=(t==="system")?(dark?"graphite":"daylight"):t;if(ids.indexOf(r)<0)r="daylight";var d=document.documentElement;d.dataset.theme=r;d.classList.toggle("dark",!!dark);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster position="bottom-left" richColors dir="rtl" />
      </body>
    </html>
  );
}
