# Worklog

---
Task ID: 1
Agent: Main Agent (Super Z)
Task: ساخت محصول کامل SaaS «RasaWeb Messaging Hub» — پلتفرم مدیریت اکانت‌های پیام‌رسان، مخاطبان، کمپین‌ها، صف ارسال، زمان‌بندی و مانیتورینگ با UI فارسی RTL

Work Log:
- بارگذاری skill های fullstack-dev و LLM؛ اجرای init-fullstack.sh
- دانلود فونت Vazirmatn (4 وزن) در public/fonts
- globals.css: تم برند teal، فونت وزیرمتن، RTL، dark mode، اسکرول‌بار و انیمیشن‌های ظریف
- layout.tsx: html dir=rtl lang=fa + metadata فارسی
- lib/types.ts: مدل دامنه کامل (Account, Contact, Campaign, QueueItem, PlatformRule, Pool و...)
- lib/fa.ts: فرمت‌دهنده فارسی (اعداد، درصد، تاریخ جلالی، ماسک شماره، PRNG)
- lib/mock-data.ts: داده seeded در مقیاس واقعی — 1,247 اکانت، 58,420 مخاطب، 7 کمپین، 3,464 رکورد صف، رخدادها، اعلان‌ها، کاربران، قوانین، استخرها + سناریوی واقعی (بله 012 محدود، روبیکا 021 resume، واتساپ 004 خطای اتصال)
- store/app-store.ts: Zustand با اکشن‌های محصول (addAccount, resumeAccount, importContacts, createCampaign, updateRule و...)
- کامپوننت‌های مشترک: PlatformIcon (لوگوی ۶ پیام‌رسان)، StatusBadge، HealthBar، AnimatedCounter، EmptyState، Skeleton، MessagePreview (شبیه‌سازی UI پیام‌رسان‌ها)
- Layout: Sidebar قابل جمع‌شونده با گروه‌بندی منطقی + Topbar (جستجو، اعلان popover، تم شب) + AppShell مسیریاب SPA (فقط route /)
- ۲۰ نما کامل: Login، Dashboard، Accounts، AddAccountWizard (فلوهای phone_code/QR)، AccountDetails (۵ تب)، Contacts، ContactDetails، ImportContacts (پردازش واقعی)، Campaigns، CreateCampaign (۵ مرحله + AI + Preview + توزیع ساعتی)، CampaignDetails (گزارش + Timeline)، Queue، Scheduling، Reports (نمودارها)، AiAssistant، Notifications، Limits (قوانین + Pools)، Users (ماتریس دسترسی)، Security (Session/2FA/Audit)، Settings
- API واقعی AI: /api/ai/message با z-ai-web-dev-sdk (بک‌اند) + fallback قالب‌ها
- رفع ایرادها: آیکون‌های مفقود lucide (Smartphones→Smartphone, Source→Inbox)، Badge مفقود در scheduling، نام تابع نامعتبر Select-like→GroupPicker، هماهنگ‌سازی منطق invalidSample با پردازش اصلی
- راستی‌آزمایی مرورگر (agent-browser): Login→Dashboard→همه صفحات، اجرای کمپین از مرحله ۱ تا ۵، فراخوانی واقعی AI (200 در 3.4s)، فلوی کامل OTP+2FA+Success wizard، ورود گروهی (20 خط → 15 معتبر/3 تکراری/2 نامعتبر)، Resume اکانت محدود، Sidebar collapse، تم شب، موبایل 390px

Stage Summary:
- محصول کامل و یکپارچه روی Next.js 16 + Tailwind 4 + shadcn/ui + Zustand + recharts ساخته شد
- فلو اصلی User Journey (اکانت→مخاطب→کمپین→AI→زمان‌بندی→اجرا→نتیجه→Resume) به‌صورت end-to-end در مرورگر تست و تأیید شد
- lint پاس؛ سرور روی پورت 3000 سالم؛ تنها خطای ثبت‌شده در dev.log مربوط به آیکون قبلاً رفع‌شده است
- دمو Login: هر ایمیل معتبر + گذرواژه ≥۴ کاراکتر

---
Task ID: 2
Agent: Main Agent (Super Z)
Task: ارتقای RasaWeb Messaging Hub به Omnichannel Messaging & Campaign Management Platform — رفع باگ ورود + ۳۶ قابلیت جدید یکپارچه با معماری قبلی

Work Log:
- تشخیص و رفع باگ‌های ورود: (۱) دکمه «فراموشی گذرواژه» مرده بود → دیالوگ کامل بازیابی با اعتبارسنجی + حالت موفقیت؛ (۲) نشست پس از رفرش از بین می‌رفت → ماندگاری در localStorage + hydrate با splash؛ (۳) افزودن autoComplete/type=email/inputMode + آیکون در پیام خطا
- types.ts: +۲۵ مدل جدید (Conversation, InboxMessage, Segment/Rule, SuppressionEntry, MessageTemplate, Project, CampaignJourney/Node/Edge, WorkflowTrigger, AccountEvent, AuditEntry, UsageRow, ConsentStatus, ErrorClass + متادیتاها)؛ وضعیت‌های جدید کمپین (pending_approval/approved/rejected/changes_requested) و اکانت (auth_required)؛ Role به ۵ نقش + سفارشی
- mock-data.ts: ۱۲ مکالمه کامل با تاریخچه، ۸ رکورد عدم ارسال، ۷ سگمنت، ۷ قالب، ۴ پروژه، Journey بصری کمپین مهر (۸ نود + ۷ یال + ۴ Trigger)، ۹ رخداد Health اکانت‌ها، ۱۲ رکورد Audit، مصرف/هزینه پلتفرم‌ها؛ کمپین سئو زمستان در وضعیت pending_approval
- app-store.ts: +۲۵ اکشن (switchProject, openConversation, sendReply با شبیه‌سازی تحویل، assignConversation, addToSuppression, addSegment با شمارش زنده, submitCampaignForApproval, decideCampaign, removeFromQueue, addAudit, hydrate و...)
- ۸ نمای جدید: Inbox سه‌ستونه (فیلترهای همه/خوانده‌نشده/پاسخ داده‌نشده/مهم/من/تیم + Composer با Template/Emoji/فایل/AI Reply واقعی + پنل پروفایل مخاطب + غیرفعال‌سازی Composer برای کانال بدون پاسخ‌دهی مجاز)، لیست عدم ارسال (افزودن/حذف با تأیید)، سگمنت‌ها (Rule Builder با AND و شمارش زنده روی ۵۸٬۴۲۰ مخاطب)، تأیید کمپین (Review حرفه‌ای: مخاطبان/سگمنت/Limit/بازه/Preview + تأیید/رد/اصلاح)، قالب‌ها (۶ دسته + متغیرها)، سفر کمپین (Canvas بصری با یال‌های سبز/قرمز و پنل Trigger)، گزارش فعالیت‌ها (فیلتر نوع/پروژه)، مصرف و هزینه (KPI + نمودار + تفکیک پلتفرم/کمپین)
- Topbar: Project Switcher (۴ پروژه با داده مجزا) + جستجوی سراسری دسته‌بندی‌شده (مخاطب/اکانت/کمپین/مکالمه/پروژه)
- Sidebar: صندوق ورودی (badge خوانده‌نشده)، سگمنت‌ها، لیست عدم ارسال، قالب‌ها، سفر کمپین، مصرف و هزینه، تأیید کمپین‌ها، گزارش فعالیت‌ها
- CreateCampaign: حالت سگمنت + پیشنهاد مخاطب AI، متغیرهای شخصی‌سازی با نمونه واقعی در Preview، AI Copilot کامل (متن/CTA/لحن/سگمنت/Follow-up/نسخه کوتاه)، پیشنهاد زمان‌بندی AI، محاسبه حذف‌شدگان رضایت/عدم ارسال، دکمه «ارسال برای تأیید»
- Queue: طبقه‌بندی هوشمند خطا (۵ کلاس با کارت‌های فیلتر) + Retry هوشمند (۳ تلاش، منع Retry برای Restriction/Auth، حذف Invalid Recipient)
- Campaigns/Details: بنر تأیید، تگ‌های سگمنت/شخصی‌سازی/Follow-up، صف در سطح اکانت، نتیجه بازبینی
- Contacts/Details: ستون و فیلتر وضعیت دریافت پیام (مجاز/نامشخص/عدم دریافت) + تغییر دستی + افزودن به عدم ارسال
- Dashboard: نوار پروژه فعال + چیپ تأییدها + لینک Inbox؛ Notifications: ۴ دسته با آیکون و اکشن؛ Users: ماتریس ۱۲ دسترسی × ۶ نقش + نقش سفارشی + مجوز تأیید
- رفع خطاهای type: faNum برای رشته‌ها، InboxMessage import، isImportant، usageRows در store، rename useTemplate→markTemplateUsed (خطای rules-of-hooks)
- رفع هندسه Canvas سفر: مختصات درصدی + viewBox ثابت ۷۶۰px + برچسب‌های HTML
- راستی‌آزمایی مرورگر: ورود→داشبورد پروژه‌ای، Inbox (باز کردن/پاسخ/AI Reply واقعی)، ساخت سگمنت با Rule Builder، کمپین ۵ مرحله‌ای تا «ارسال برای تأیید»، تأیید کمپین، طبقه‌بندی خطا و حذف Invalid، سوییچ پروژه رفت‌وبرگشت، جستجوی سراسری، موبایل ۳۹۰px، ۸/۸ نمای جدید OK

Stage Summary:
- محصول از Bulk Messaging Tool به Omnichannel Platform ارتقا یافت: Inbox + AI Reply + Personalization + Suppression/Consent + Segments + Journey/Trigger + Approval + Copilot + Health + Pool + Project + Templates + Global Search + Audit + Usage
- تمام قابلیت‌ها به هم متصل‌اند: Contact↔Campaign↔Account↔Queue↔Inbox↔Report و AI در سه نقطه (Copilot/Reply/بهبود) با بک‌اند واقعی
- lint و tsc پاس؛ سرور روی 3000 پایدار؛ اسکرین‌شات‌ها در download/ ذخیره شد

---
Task ID: 3
Agent: Main Agent (Super Z)
Task: خروج از حالت دمو — تبدیل به محصول واقعی قابل تست (احراز هویت واقعی، ماندگاری سرور، موتور ارسال زنده)

Work Log:
- Prisma: مدل‌های AppUser (هش scrypt)، Session (توکن + کوکی httpOnly، انقضای ۷ روز)، PasswordResetCode (۶ رقمی، ۱۰ دقیقه)، Workspace (snapshot JSON به‌ازای هر کاربر)
- API واقعی: /api/auth/register|login|logout|logout-all|me|forgot|reset + /api/workspace (GET/PUT) — نقش اولین کاربر owner و بعدی admin؛ پیام خطای یکسان برای ایمیل/گذرواژه غلط
- LoginView بازنویسی شد: تب «ورود / ساخت حساب»، سنجش قوی گذرواژه، گیت 2FA واقعی بعد از گذرواژه (کد در UI چون سرویس پیامک متصل نیست)، بازیابی گذرواژه ۳ مرحله‌ای (ایمیل ← کد ← گذرواژه جدید با خروج از همه نشست‌ها)، حذف کامل جعبه و پیش‌فرض‌های دمو
- ماندگاری داده: workspace هر کاربر به‌صورت snapshot JSON روی SQLite (/api/workspace) با throttle ۲.۵ ثانیه + skip اگر payload تغییر نکرده + mirror کوچک در localStorage؛ باگ رفع‌شده: debounce ساده با tick موتور هرگز آتش نمی‌شد و داده ۵۸٬۴۲۰ مخاطب از سهمی localStorage عبور می‌کرد
- رفتار محصول واقعی: کاربر تازه با فضای کاری خالی شروع می‌کند؛ کارت Onboarding در داشبورد (اتصال اکانت / ورود مخاطب / بارگذاری داده نمونه)؛ Settings: خروجی JSON واقعی، بارگذاری نمونه، پاک‌سازی کامل با AlertDialog دقیق، خروج از حساب
- موتور ارسال زنده: startCampaign صف واقعی از مخاطبان می‌سازد (فیلتر اجباری Suppression + رضایت، توزیع Least-loaded روی اکانت‌های فعال با احترام به Daily Limit و کانال مخاطب، سقف ۲۴۰ آیتم)؛ tick هر ۲.۲ ثانیه: queued→sending→sent/failed با توزیع واقع‌گرایانه ۵ کلاس خطا، سناریوی محدودیت اکانت با احتمال کم طبق پروتکل، تشخیص تکمیل کمپین؛ سرعت از قوانین پلتفرم (slow/normal/fast)
- شبیه‌سازی پیام ورودی به Inbox با احتمال کم تا فلوی پاسخ‌گویی زنده باشد
- رفع دمو-ایزم‌ها: دکمه‌های مرده Security (کدهای بازیابی واقعی، خروج از همه دستگاه‌ها با API، چرخش کلید API با ذخیره، لغو دستگاه)، ویرایش کاربر در Users (دیالوگ + تغییر نقش + مجوز تأیید)، افزودن مخاطب دستی، برچسب‌گذاری گروهی، افزودن به گروه، خروجی CSV واقعی، OTP ویزارد با کد تصادفی در قالب پیامک شبیه‌سازی‌شده + چک‌باکس 2FA، برچسب «نمونه دمو»→«نمونه فرمت»
- دکمه «شروع ارسال» برای کمپین‌های approved/scheduled در لیست و جزئیات کمپین
- راستی‌آزمایی: smoke تست curl هر ۷ endpoint احراز هویت (ثبت‌نام/تکراری/me/logout/401/فراموشی/ریست)؛ تست مرورگری E2E: ثبت‌نام ← کارت خوش‌آمد ← داده نمونه (۱٬۲۴۷ اکانت ذخیره سرور) ← اجرای کمپین ← صف زنده (۳٬۴۳۰→۳٬۱۴۲ با موفقیت‌های صعودی) ← رفرش ← بازیابی کامل نشست و داده و ادامه موتور؛ ورود غلط ← پیام خطای فارسی؛ 2FA ← گیت و ورود موفق؛ خروج/ورود مجدد OK
- اشکال محیط: پردازش‌های background بین فراخوانی‌ها kill می‌شوند — سرور در هر اسکریپت تست بالا آمد (scripts/ensure-server.sh)؛ پایگاه داده در انتها پاک‌سازی شد (حذف کاربران تست)

Stage Summary:
- محصول از «دمو» به نسخه واقعی قابل تست تبدیل شد: هویت واقعی (ثبت‌نام/ورود/2FA/بازیابی)، داده ماندگار روی سرور به‌ازای هر کاربر، موتور ارسال زمان‌محور با خطاهای طبقه‌بندی‌شده و پروتکل محدودیت
- مسیر تست واقعی کاربر: ثبت‌نام ← اتصال اکانت (ویزارد) ← ورود مخاطب ← ساخت کمپین ← تأیید ← شروع ارسال ← تماشای صف زنده ← رفرش (داده می‌ماند) ← Inbox با پیام ورودی زنده
- lint و tsc پاس؛ سرور روی 3000 سالم؛ اسکرین‌شات‌ها در scripts/verify/

---
Task ID: 4
Agent: Main Agent (Super Z)
Task: طراحی و ساخت Chrome Extension حرفه‌ای Production-Ready متصل به پنل مرکزی RasaWeb — معماری Central Panel (مغز) + Browser Worker (عامل اجرایی) + Platform Adapter

Work Log:
- Prisma: ۵ مدل جدید — BrowserWorker (tokenHash=sha256، workerNo نمایشی، simulated flag، lastHeartbeat)، PairingCode (RX-XXXXX با انقضای ۱۵ دقیقه)، AgentTask (refNo، action، payload JSON، steps تایم‌لاین، errorKind، چرخه کامل queued→received→running→verifying→success/failed + paused/human_action/canceled)، WorkerEvent (۱۲ نوع رویداد)، WorkerTab (snapshot تب‌ها با chatName/chatType/session)
- API افزونه (Worker Token Auth — توکن خام هرجا ذخیره نمی‌شود): /api/agent/pair (صدور کد از پنل + جفت‌سازی افزونه با device info و simulated flag)، /api/agent/sync (Heartbeat + Pull وظایف + Ack خودکار queued→received + جایگزینی snapshot تب‌ها)، /api/agent/task-update (گزارش وضعیت/مراحل/خطا + پروتکل انقضای نشست: توقف وظایف دیگر همان Worker + needs_action + خطای Adapter برای platform_ui_changed)، /api/agent/event (Event Log)
- API پنل: GET /api/panel/agents (workers با وضعیت مؤثر effectiveStatus بر اساس پنجره ۴۵ ثانیه Heartbeat + tasks + events + pairing codes فعال)، POST (صدور کد)، DELETE (ابطال)؛ /api/panel/agents/task POST (dispatch) + PATCH (pause/resume/cancel/retry گروهی + op:worker-online برای آزادسازی وظایف پس از ورود مجدد)
- types.ts: AGENT_ACTION_META (۸ Action استاندارد Universal Action Model)، AGENT_TASK_STATUS_META، AgentLoopStep (۶ مرحله Observe→Understand→Decide→Act→Verify→Report)، AGENT_ERROR_META (۱۰ خطای دوستانه با پیام و توصیه)، CHAT_TYPE_META، WORKER_STATUS_META/TAB/SESSION، WorkerEvent، SCENARIO_META (۱۳ سناریو A تا M)، فیلدهای workerId/workerNo/tabId روی Account برای Binding
- agent-simulator.ts: شبیه‌ساز Worker با همان پروتکل افزونه (sync هر ۲.۶ ثانیه، Ack، اجرای Agent Loop با تأخیر واقع‌گرایانه، گزارش هر مرحله به API واقعی، persist در sessionStorage با humanActionDone برای باقی‌ماندن پس از رفرش، offline موقت برای سناریوی K)
- Store: agents state + poll هر ۳ ثانیه (startAgentsPoll همراه startEngine)، createPairing/dispatchTask/bulkTaskOp/workerOnline/bind-unbindAccountToWorker/createSimWorker/runScenario (سناریوها به‌صورت وظیفه واقعی در همان خط‌لوله)
- ۴ نمای جدید: WorkersView (KPI، دیالوگ جفت‌سازی با کد بزرگ + شمارش معکوس، کارت‌ها با تب‌چیپ‌ها و Heartbeat زنده)، WorkerDetails (۵ تب: اطلاعات/تب‌ها/اکانت‌ها با Binding/وظایف/رویدادها + بنر «نیاز به ورود مجدد» + ارسال دستور + گرید ۱۳ سناریو)، AgentTasksView (فیلتر وضعیت با شمارنده، جستجو، عملیات گروهی، جدول زنده، دیالوگ جزئیات با تایم‌لاین Agent Loop و Payload و خطای دوستانه و Retry/ادامه، دیالوگ دستور جدید)، ConnectionMapView (Workspace→Worker→Profile→Account→Platform→Tasks با کانکتور)، ExtensionView (دانلود ZIP، ۵ مرحله نصب، ۷ مجوز با دلیل، امنیت MV3، Update System)
- Sidebar: گروه «عامل مرورگر» (Browser Workers با badge نیاز به اقدام، وظایف عامل، نقشه اتصال، افزونه کروم)؛ Dashboard: کارت Browser Agents (§۴۶)
- افزونه کروم واقعی MV3 در public/extension (۱۹ فایل): manifest.json (permissions حداقلی + optional_host_permissions برای پنل + content_scripts روی ۶ پیام‌رسان)، service-worker.js (جفت‌سازی، sync loop هر ۸ ثانیه + alarm فال‌بک، badge زنده، dispatch به تب پلتفرم یا باز کردن تب جدید، ensureInjected با scripting API، بازیابی وضعیت از storage.session §۳۹)، content/adapters.js (۶ Adapter + Finder چندلایه مقاوم به تغییر UI + heuristicChatType)، content/agent.js (Perceive/Understand/Decide/Act/Verify/Report کامل، Safety Layer، Overlay «عامل در حال کار» با مراحل، خطای دوستانه، execCommand + DataTransfer برای آپلود، Verify با lastOutgoing، Man-in-loop برای session/CAPTCHA)، popup (جفت‌سازی + وضعیت + Open Control Panel)، sidepanel (Context صفحه جاری + ۶ Action سریع + لاگ فعالیت)، آیکون‌های PNG با PIL، README فارسی، ZIP (۳۰KB) در public + download
- راستی‌آزمایی مرورگر E2E: ثبت‌نام → گروه جدید منو → Worker شبیه‌ساز متصل شد → سناریو C (TASK-9281 موفق ۴ ثانیه با تایم‌لاین کامل) → سناریو H (انقضا: توقف وظایف + بنر «ورود انجام شد» + بازیابی) → سناریو J (human_action → «ادامه وظیفه» → موفق؛ باگ humanActionDone پس از رفرش رفع شد) → سناریو I (platform_ui_changed + رویداد Adapter + پیام دوستانه §۲۹) → Retry (اجرای مجدد واقعی) → نقشه اتصال → جفت‌سازی واقعی با curl (RX-93432 → workerNo 1 → token) → dispatch/panel + sync/extension + task-update (TASK-9285 کامل) → داشبورد کارت Agent → ZIP دانلود 200
- رفع باگ‌ها: workerNo از ۱ شروع شود، platformOf به‌صورت Record index، payload.members cast، سه warning lint در JS افزونه

Stage Summary:
- معماری سه‌لایه کامل شد: Central Control Plane (پنل) + Browser Worker (افزونه واقعی MV3 + شبیه‌ساز با همان پروتکل) + Platform Adapters (۶ سرویس)
- هر ۱۳ سناریو A تا M اجراپذیر و ۸ وضعیت وظیفه (Queued/Running/Verifying/Success/Failed/Paused/Human Action/Offline) زنده قابل مشاهده است
- خط‌لوله کاملاً واقعی: پنل → API → صف → Ack → Agent Loop → Verify → گزارش؛ هم شبیه‌ساز و هم افزونه واقعی از یک مسیر عبور می‌کنند
- lint و tsc پاس؛ سرور 3000 پایدار؛ ۸ اسکرین‌شات در scripts/verify/؛ ZIP افزونه در public/extension و download/

---
Task ID: 5
Agent: Main Agent (Super Z)
Task: رفع خطای نصب افزونه کروم («نمی‌توانم افزونه را نصب کنم»)

Work Log:
- بررسی پکیج افزونه: JS ها سالم (node --check)، manifest.json معتبر، آیکون‌ها موجود، ZIP سالم
- یافتن علت واقعی: کلید "default_locale": "fa" در manifest بدون وجود پوشه _locales → کروم با خطای «Could not load default locale» از نصب امتناع می‌کرد
- رفع: حذف default_locale + افزودن minimum_chrome_version: 114
- بازساخت هر دو ZIP (public/extension/rasaweb-agent-v1.0.0.zip و download/rasaweb-agent-extension.zip) — فایل‌ها در ریشه ZIP (ساختار درست برای Load unpacked)
- راستی‌آزمایی واقعی با Playwright + Chromium: بارگذاری افزونه با --load-extension → Service Worker ثبت شد (chrome-extension://…/background/service-worker.js) → نصب بدون خطا تأیید
- اسکریپت verify در scripts/verify-ext-load.js برای تست‌های بعدی

Stage Summary:
- عامل نصب‌نشدن کلید default_locale بدون _locales بود؛ رفع شد و نصب در Chromium واقعی تست و تأیید شد
- کاربر باید ZIP را استخراج و پوشه حاوی manifest.json را با Load unpacked انتخاب کند (کشیدن ZIP در chrome://extensions کار نمی‌کند)

---
Task ID: 6
Agent: Main Agent (Super Z)
Task: رفع باگ popup افزونه — دکمه مرده «کپی آدرس پنل» + سردرگمی کاربر در فیلد آدرس پنل (کاربر ایمیل وارد می‌کرد)

Work Log:
- بررسی screenshot کاربر: صفحه خوش‌آمد popup باز شده بود اما دکمه «کپی آدرس پنل از دستورالعمل» هیچ هندلری نداشت (دکمه مرده) و آدرس واردشده در welcome به فرم جفت‌سازی منتقل نمی‌شد؛ کاربر نمی‌دانست چه چیزی وارد کند (ایمیل به‌جای URL تایپ کرده بود)
- popup.js: افزودن DEFAULT_PANEL_URL (آدرس پنل استقرارشده) + تابع normalizeUrl (افزودن https:// خودکار، حذف / انتهایی)
- هندلر واقعی برای welcome-open-panel: کپی آدرس در کلیپ‌بورد + بازخورد «✓ کپی شد» + فال‌بک select متن
- welcome-continue: حالا آدرس را نرمال و به pair-url منتقل می‌کند قبل از نمایش فرم
- pair-btn: نرمال‌سازی URL + اعتبارسنجی https + پیام‌های خطای فارسی بر اساس کد خطا (کد نامعتبر/منقضی، پنل در دسترس نیست) + try/catch روی sendMessage
- پیش‌پر کردن هر دو فیلد آدرس با panelUrl ذخیره‌شده یا DEFAULT_PANEL_URL
- popup.html: hint زیر فیلد آدرس + hint مسیر گرفتن کد RX؛ popup.css: کلاس .hint
- نکته: MultiEdit با anchor اشتباه تا حدی اعمال شده بود — با Read مجدد وضعیت دقیق گرفته شد و ادامه ویرایش‌ها با رشته‌های دقیق انجام شد
- بازساخت هر دو ZIP + تست نصب Playwright (Service Worker ثبت شد ✓) + endpoint دانلود پنل 200 (30904B نسخه جدید)

Stage Summary:
- باگ دکمه مرده و انتقال آدرس رفع شد؛ فیلد آدرس حالا از پیش پر می‌شود و کاربر فقط کد RX را وارد می‌کند
- راهنمای کاربر: آدرس پنل = آدرس پنلی که افزونه از آن دانلود شد؛ کد RX = پنل ← عامل مرورگر ← Browser Workers ← افزودن Worker

---
Task ID: 7
Agent: Main Agent (Super Z)
Task: رفع «پیام روبیکا ارسال نمی‌شود» — تحلیل TASK-9281 واقعی کاربر و فیکس ۳ باگ افزونه

Work Log:
- تحلیل داده واقعی DB کاربر arefeamini9@gmail.com: Worker واقعی «عارفه1» آنلاین (heartbeat سالم)، اکانت روبیکا x-1008 فعال، وظیفه TASK-9281 SEND_TEXT به «علی رضایی» failed با errorKind=session_expired و خطای «نشست اکانت منقضی است — هیچ گفتگویی باز نیست»
- باگ ۱ (اصلی): Safety Layer در agent.js اجرای SEND را قبل از openChat متوقف می‌کرد چون chatName خالی بود — در حالی که باز کردن گفتگوی مقصد وظیفه خود عامل است → شرط حذف شد؛ خطای درست حالا chat_not_found از openChat می‌آید
- باگ ۲: rubika loginCheck با [class*='login'] روی هر المان مخفی false-positive «نشست منقضی» می‌ساخت → تابع isVisible اضافه شد و هر ۶ loginCheck فقط نشانه‌های «قابل مشاهده» صفحه ورود را چک می‌کنند (whatsapp هم canvas خام داشت)
- باگ ۳: findPlatformTab ممکن بود تب سایت اصلی rubika.ir (بدون UI چت) را انتخاب کند → حالا تب اپ وب (web.rubika.ir) اولویت دارد و تب سایت اصلی به اپ وب هدایت می‌شود
- بهبود openChat: الگوهای بیشتر برای نتایج جستجو + searchBox روبیکا با ۵ fallback
- node --check هر ۵ فایل ✓؛ بازساخت هر دو ZIP؛ تست نصب Playwright ✓؛ endpoint پنل 200 (31601B)

Stage Summary:
- علت واقعی شکست TASK-9281 ترکیب باگ ۱+۲ بود: تشخیص اشتباه «نشست منقضی» + توقف قبل از تلاش برای باز کردن گفتگو
- کاربر باید: web.rubika.ir را در همان پروفایل کروم Login کند، افزونه را Reload کند، وظیفه را Retry کند
- اکانت روبیکا x-1008 هنوز به Worker بایند نشده (workerId=null) — پیشنهاد بایند در Connection Map/Worker Details

---
Task ID: 8
Agent: Main Agent (Super Z)
Task: رفع «گزارش می‌گوید ارسال شده ولی واقعاً ارسال نشده» — حذف کامل نتایج تقلبی از موتور کمپین و اتصال آن به خط‌لوله واقعی عامل

Work Log:
- ریشه‌یابی: tick موتور کمپین (app-store.ts) نتیجه را با Math.random() می‌ساخت (۹۳٪ sent تقلبی) + سناریوی محدودیت تصادفی — هیچ اتصالی به عامل واقعی نداشت (میراث دوره قبل از افزونه)
- types.ts: کلاس خطای جدید no_worker + QueueItem.agentRef (شماره وظیفه عامل) + meta کامل
- tick بازنویسی شد (async + قفل re-entrancy):
  ۱) نتیجه فقط از وظایف واقعی عامل (agents.tasks poll) به آیتم صف می‌رسد — sent/failed/canceled
  ۲) pickup = dispatch واقعی به Worker آنلاینِ بایندشده (SEND_TEXT با متن کمپین، target مخاطب) — سقف ۲ وظیفه هم‌زمان هر Worker، بدون Worker آنلاین آیتم در صف می‌ماند
  ۳) سناریوی محدودیت تصادفی حذف شد (تقلبی بود) — خطای واقعی از عامل می‌آید
  ۴) نگاشت errorKind عامل → ErrorClass صف (session_expired→auth, chat_not_found→invalid_recipient و...)
  ۵) پیش‌گیری از دوباره‌ارسال: آیتم resumed با وظیفه زنده → دوباره adopt می‌شود نه dispatch جدید؛ retry صف agentRef را پاک می‌کند
  ۶) رفع شمارش دوگانه remaining/sentToday (قبلاً هم در ساخت صف و هم در pickup کسر می‌شد)
- startCampaign: پیش‌شرط صادقانه — فقط اکانت‌های متصل به Worker آنلاین وارد چرخه می‌شوند؛ بدون هیچ Worker آنلاین → بلاک با toast.error + اعلان؛ toast موفقیت فقط در صورت شروع واقعی (از view به store منتقل شد)
- دیباگ محیطی مهم: سرور dev مدام OOM-kill می‌شد (dmesg: next-server RSS 1.9GB) — عامل واقعی «نشون نمیده»های تکراری؛ راه‌حل: bun run build (standalone) + bun run start — production server پایدار روی :3000
- E2E کامل (scripts/e2e-honest-engine.js، کاربر تازه هر ران): NEGATIVE بدون Worker → بلاک صادقانه ✅؛ POSITIVE با Worker شبیه‌ساز + ۱۴ بایند → ۲۰ وظیفه واقعی SEND_TEXT همه success با تایم‌لاین واقع‌گرایانه، کمپین sent:31/failed:0، ۳۹ آیتم صف با agentRef، binding پایدار در workspace ✅
- اسکریپت تشخیصی scripts/freeze-probe.js (فریز ظاهری = مرگ سرور بود نه کلاینت)
- پاک‌سازی ۱۰ کاربر تست از DB — فقط کاربر واقعی باقی ماند

Stage Summary:
- «sent» دیگر هرگز تقلبی نیست: نتیجه فقط از اجرای واقعی Worker می‌آید؛ بدون Worker → صف منتظر می‌ماند یا بلاک صادقانه
- معماری جدید: کمپین → صف → dispatch وظیفه عامل → اجرا → Verify → نتیجه واقعی در صف/گزارش/اکانت
- سرور از dev به production standalone切换 شد — پایداری preview به‌طور ریشه‌ای بهتر شد

---
Task ID: 9
Agent: Main Agent (Super Z)
Task: رفع «پلتفرم رو باز نمی‌کنه» + ریشه‌کنی نهایی Success کاذب — تحلیل داده واقعی کاربر

Work Log:
- تشخیص بحران محیطی: سرور production مرده بود (پورت 3000 خالی، همه endpointهای preview 404 «404 page not found» گوپروتکلی از gateway بیرونی) → کاربر نه پنل را می‌دید و نه افزونه sync می‌کرد
- ریشه‌یابی «باز نشدن پلتفرم» در داده واقعی: TASK-9281 با workerId=null در DB — sync فقط `where workerId: worker.id` تحویل می‌داد → وظایف یتیم (بعد از Retry یا dispatch بدون Worker) برای همیشه گیر می‌کردند؛ PATCH retry هم workerId نمی‌گذاشت
- فیکس سرور ۱ (sync/route.ts): وظایف یتیم (workerId=null) هم دیده می‌شوند و با updateMany اتمیک `{id, workerId:null}` به Worker syncکننده claim می‌شوند (در چند-Worker فقط یکی برنده است) + رویداد «واگذار شد»
- فیکس سرور ۲ (panel/agents/task/route.ts): POST بدون workerId → بهترین Worker آنلاین (آخرین heartbeat) خودکار اختصاص می‌یابد؛ PATCH retry → اگر وظیفه یتیم است Worker آنلاین می‌گیرد
- فیکس افزونه ۱ (service-worker.js): تب پلتفرم حالا `active:true` باز می‌شود + `windows.update(focused)` — عامل جلوی چشم کاربر کار می‌کند؛ findPlatformTab حالا `{tab, navigated}` برمی‌گرداند و بعد از redirect به اپ وب، waitForTabLoad + 3.5s انتظار SPA؛ ensureInjected با حلقه retry تا 10 ثانیه (document_idle تأخیر دارد)
- فیکس افزونه ۲ (agent.js) — Success کاذب ریشه‌کن شد: snapshot حباب‌های خروجی قبل از ارسال (union selector هر ۶ آداپتر + fallback lastOutgoing) → بعد از ارسال انتظار واقعی تا ۹ ثانیه برای «حباب خروجی جدید» (المان آخر تغییر کند یا count بیشتر شود) + تطبیق متن نرمال‌شده (ZWNJ/فاصله)؛ عدم تأیید = failed با errorKind جدید send_not_verified و پیام دوستانه — هرگز Success بدون حباب
- فیکس پنل: send_not_verified به AgentErrorKind و AGENT_ERROR_META (label/friendly/advice فارسی) اضافه شد
- Build standalone پس از رفع duplicate `workerId` پاس شد؛ سرور production دوباره بالا آمد (localhost:3000 → 200)
- E2E واقعی (scripts/e2e-task-delivery.js): ثبت‌نام → صدور RX → pair → dispatch بدون workerId → sync → claim و تحویل ✅ → گزارش failed → Retry پنل → sync دوم → تحویل مجدد ✅ → Worker دوم وظیفه Worker اول را نمی‌رباید ✅؛ کاربر تست پاک‌سازی شد
- node --check هر ۵ فایل افزونه ✓؛ بازساخت هر دو ZIP (32969B)؛ تست نصب Playwright: Service Worker ثبت شد ✅
- gateway بیرونی preview تا لحظه پایان کار هنوز 404 می‌داد (بازگشت خودکار با health-check بعدی انتظار می‌رود؛ زنجیره داخلی Caddy:81→3000 سالم و 200)

Stage Summary:
- سه عامل «پلتفرم باز نمی‌شود» هم‌زمان رفع شدند: ① سرور مرده ② وظایف یتیم بدون workerId هرگز تحویل نمی‌شدند ③ تب با active:false در پس‌زمینه باز می‌شد
- Success کاذب رسماً ناممکن شد: verified حباب جدید + تطبیق متن؛ در غیر این صورت send_not_verified
- راهنمای کاربر: Reload افزونه (↻) + Retry وظیفه TASK-9281 از پنل — تب web.rubika.ir جلوی چشمش باز می‌شود و اگر ارسال تأیید نشود، گزارش صادقانه failed می‌دهد

---
Task ID: 3 (نشست فعلی — باگ duplicate key + تکمیل زنجیره تحویل وظیفه)
Agent: Main Agent (Super Z)
Task: رفع خطای React «Encountered two children with the same key, x-1015» در notifications-view + ادامه زنجیره فیکس‌های تحویل وظیفه از نشست قبل

Work Log:
- ریشه‌یابی duplicate key: notifications-view.tsx از key={n.id} استفاده می‌کند و idها از nextId() می‌آیند
- ریشه واقعی در app-store.ts خط ۱۹۵: `let seq = 1000; const nextId = () => \`x-${++seq}\`` — شمارنده ماژول‌سطح که با هر رفرش/HMR ریست می‌شد؛ چون فضای کاری در سرور ذخیره و هیدریت می‌شود، idهای تازه (x-1001…) با idهای ذخیره‌شده نشست قبل برخورد می‌کردند → ۸ اعلان تکراری = ۸ خطای کنسول
- فیکس: SESSION_TAG تصادفی هر نشست + شمارنده صعودی در nextId + تابع dedupeById که در loadWorkspace روی ۱۵ آرایه (notifications, accounts, contacts, …) و پیام‌های conversations اجرا می‌شود تا داده‌های قبلاً آلوده هم پاک شوند
- رفع ۱۸ خطای TS در api/agent/sync/route.ts (deliverable به never[] اینفر می‌شد) با type صریح PendingTask
- فیکس ۲ (dispatch/retry): بررسی شد — قبلاً اعمال بود (pickOnlineWorker در POST)؛ گپ باقی‌مانده بسته شد: resume/retry اگر Worker فعلی آفلاین باشد حالا Worker آنلاین می‌گیرد (resolveOnlineWorkerFor) و اگر هیچ Worker آنلاین نیست workerId=null می‌ماند تا در sync بعدی claim شود
- کشف: فیکس تب visible در service-worker.js و فیکس Verify (verifyNewOutgoing + send_not_verified) از قبل اعمال بودند — تایید کامل کد
- تست E2E واقعی روی DB زنده: Worker «عارفه1» آنلاین (heartbeat ثانیه‌های قبل)، TASK-9284 از dispatch تا claim و deliver و اجرا رفت و خطای واقعی platform_ui_changed گزارش شد (نه Success کاذب) — زنجیره کامل کار می‌کند
- Version bump افزونه 1.0.0 → 1.1.0 (manifest.json + EXTENSION_LATEST_VERSION/EXTENSION_DOWNLOAD_URL در types.ts)
- بازساخت ZIP: public/extension/rasaweb-agent-v1.1.0.zip + کپی به download/ + حذف ZIPهای قدیمی؛ endpoint پنل HTTP 200
- تست نصب Playwright (verify-ext-load.js): ✅ INSTALL OK — Service Worker ثبت شد
- tsc --noEmit: صفر خطا در src/ (خطاهای examples/ و skills/ از قبل موجود و خارج از اسکوپ)
- سرور dev (Turbopack) روی پورت 3000 در حال اجراست و همه فیکس‌ها را سرو می‌کند

Stage Summary:
- باگ duplicate key اعلان‌ها کاملاً رفع شد (ریشه: ریست شدن شمارنده id با رفرش + هیدریت داده قدیم)
- زنجیره تحویل وظیفه اکنون سرتاسر سالم است: dispatch (با/بدون workerId) → sync claim اتمیک → اجرای واقعی → Verify DOM → گزارش واقعی موفق/ناموفق
- کاربر باید افزونه نسخه 1.1.0 را دوباره نصب کند (ZIP از پنل) تا فیکس‌های سمت افزونه (تب visible + Verify) اعمال شوند
- نکته باقی‌مانده: TASK-9356/9357/9358 زامبی (verifying/running با workerId=null از موتور شبیه‌ساز روز قبل) — از پنل Retry شدنی است؛ آداپتر واتساپ نیاز به بهبود selector دارد (platform_ui_changed)

---
Task ID: 4 (نشست فعلی — مخاطب پیدا می‌شود ولی پیام ارسال نمی‌شود)
Agent: Main Agent (Super Z)
Task: رفع «میتونه مخاطب‌ها رو از روبیکا پیدا کنه ولی پیام رو بهشون نمیفرسته»

Work Log:
- بررسی DB زنده: وظایف روبیکا (TASK-9294..9299) با chat_not_found و human_action شکست خورده‌اند
- ریشه ۱ — chat_not_found: سلکتورهای نتیجه جستجو ([class*='chat-item'] و…) با DOM روبیکا نمی‌خواند → روی نتیجه کلیک نمی‌شد → عنوان چت تطبیق نمی‌کرد. تطبیق عنوان هم فقط «کلمه اول» را چک می‌کرد (با پیشوندهایی مثل «آقای …» می‌شکست)
- فیکس openChat در content/agent.js: helperهای normFa (ی/ي، ک/ك، اعراب، نیم‌فاصله) + isVisEl + pickSearchResult (روش متنی مستقل از کلاس: داخلی‌ترین عنصر قابل‌مشاهده شامل نام هدف، بالاترین = اولین نتیجه، مستثنی‌کردن header/message) + پاک‌سازی جستجوی قبلی + فال‌بک Enter + تطبیق عنوان با کلمات ≥۳ حرف
- ریشه ۲ — human_action «عامل مشغول است»: syncOnce وظایف دسته را موازی شلیک می‌کرد (executeTask بدون await) → عامل وظیفه دوم را رد می‌کرد
- فیکس service-worker.js: صف سریالی taskChain + pendingChain Set (ضد enqueue تکراری)، خارج از قفل sync تا heartbeat قطع نشود + خودترمیمی runningTasks کهنه (۵ دقیقه، startedAt) + chatTitle قوی‌تر روبیکا در adapters.js (h1/کلاس‌های حالت‌دار/خط اول عنوان)
- فیکس ۳ — فال‌بک تأیید ارسال: اگر حباب با کلاس‌ها پیدا نشد ولی input خالی شده و متن پیام در بدنه گفتگو ظاهر شده → تأیید؛ وگرنه send_not_verified (بدون Success کاذب)
- Version 1.1.1 + ZIP جدید + تست Playwright: INSTALL OK + endpoint پنل HTTP 200

Stage Summary:
- سه لایه فیکس شد: پیدا کردن و کلیک روی مخاطب در روبیکا (روش متنی)، صف سریالی وظایف، تأیید ارسال مستقل از کلاس UI
- افزونه 1.1.1 آماده دانلود از پنل — کاربر باید دوباره نصب/reload کند

---
Task ID: 5 (نشست فعلی — سرچ می‌کند ولی وارد دایرکت نمی‌شود)
Agent: Main Agent (Super Z)
Task: رفع «مخاطب‌ها رو سرچ می‌کنه ولی وارد دایرکت هر مخاطب نمیشه» (روبیکا + بله)

Work Log:
- بررسی DB: وظایف جدید (TASK-9314..9319) روی بله با همان chat_not_found — یعنی مشکل سرتاسری است: کلیک روی نتیجه یا تشخیص باز شدن گفتگو شکست می‌خورد
- فیکس ۱ — deepClick: توالی کامل pointerdown/mousedown/pointerup/mouseup/click با مختصات واقعی — el.click() خالی در UIهایی که به mousedown/pointerdown گوش می‌دهند (واتساپ/بله/روبیکا) اثر ندارد
- فیکس ۲ — collectResultCandidates: اسکن متنیِ همه عناصر صفحه (body *) با فیلترهای محافظه‌کارانه (کوچک، قابل‌مشاهده، خارج از header/message) — کاملاً مستقل از نام کلاس‌ها؛ المان کلاس‌محور فقط وقتی معتبر که متن هدف را داشته باشد؛ تلاش روی تا ۳ کاندید اول با بررسی باز شدن گفتگو بعد از هر کلیک
- فیکس ۳ — فال‌بک هویتی: اگر عنصر کلیک‌شده نام کامل هدف (یا همه کلمات ≥۳ حرف) را داشت و الان composer باز است → گفتگو باز شده حتی اگر chatTitle selector نخواند (رفع کور selector عنوان در بله/روبیکا)
- Version 1.1.2 + ZIP جدید + Playwright INSTALL OK + endpoint HTTP 200

Stage Summary:
- ورود به گفتگو حالا سه‌لایه تضمین شده: deepClick واقعی + اسکن متنی سراسری + فال‌بک هویتی composer
- افزونه 1.1.2 آماده دانلود — کاربر باید reinstall کند و دوباره تست کند

---
Task ID: 5
Agent: Main Agent (Super Z)
Task: رفع باگ «مخاطب‌ها سرچ می‌شوند ولی وارد دایرکت نمی‌شوند / پیام ارسال نمی‌شود» — نسخه 1.1.3

Work Log:
- check-delivery-flow: همه وظایف اخیر (TASK-9321..9326) با chat_not_found شکست خورده بودند در حالی که کاربر 1.1.2 را نصب کرده بود (zip 09:12، وظایف 09:18-09:19)
- ریشه باگ ۱: collectResultCandidates داخلی‌ترین عنصرِ حاوی متن هدف را برمی‌گرداند که «خودِ کادر جستجو» بود (متن تایپ‌شده داخل آن است) → افزونه به‌جای نتیجه روی کادر جستجو کلیک می‌کرد
- ریشه باگ ۲: کلیک فقط روی داخلی‌ترین عنصر متنی بود؛ هندلر UIها روی والد (li/role=button) است
- ریشه باگ ۳: فال‌بک Enter فقط keydown بدون keypress/keyup و بدون ArrowDown
- بازنویسی openChat: استثنای کادر جستجو/فرزندانش از کاندیدها + استثنای overlay (#rw-agent-overlay که برچسب «کادر پیام» دارد) + clickableAncestors (۳ سطح والد) + کیبورد کامل (ArrowDown+Enter سه‌فازی keydown/keypress/keyup) + اسکن مجدد بعد از Enter + انتظار ۶ ثانیه برای نتایج سراسری روبیکا
- افزودن کلیک «مورد اعتماد مرورگر»: chrome.debugger.attach + Input.dispatchMouseEvent در Service Worker (کیس RW_TRUSTED_CLICK + پرمیشن debugger در manifest) برای UIهایی که رویداد سینتتیک (isTrusted=false) را رد می‌کنند
- دیاگنوستیک فارسی در خطای chat_not_found: [اشکال‌یابی: کادر جستجو | تایپ | نتایج | کلیک | کلیک مرورگر | کیبورد | کادر پیام | عنوان]
- ساخت scripts/test-openchat-sim.js (Playwright): پیام‌رسان جعلی با نتایج تأخیری و هندلر روی والد
  - TEST-1 فلو کامل موفق (جستجو→دایرکت→ارسال→تأیید واقعی) PASS
  - TEST-2 مخاطب ناموجود: Success کاذب کشف شد! چون composerVisible گفتگوی قبلی کافی تلقی می‌شد → پیام به گفتگوی اشتباه می‌رفت
  - گارد گفتگوی اشتباه: opened() حالا تغییر عنوان نسبت به شروع را الزام می‌کند (startTitle) و فال‌بک هویتی هم titleChanged || !composerWasOpen
  - TEST-2 پس از گارد: chat_not_found + دیاگنوستیک، بدون پیام اشتباه PASS؛ TEST-3 تعویض امن گفتگو PASS
- typeAndSend: فال‌بک Enter سه‌فازی شد
- نسخه 1.1.3 (manifest + types.ts)، ZIP بازسازی، تست نصب Playwright OK، tsc بدون خطا

Stage Summary:
- v1.1.3 آماده: public/extension/rasaweb-agent-v1.1.3.zip + download/
- سه لایه کلیک (سینتتیک → والدین → trusted debugger) + گارد ارسال به گفتگوی اشتباه
- خطای chat_not_found از این پس دیاگنوستیک دقیق DOM را در پنل نشان می‌دهد → عیب‌یابی دور بعد سریع می‌شود

---
Task ID: 6
Agent: Main Agent (Super Z)
Task: رفع ریشه‌ای «جستجو می‌کند ولی وارد دایرکت نمی‌شود» با دیاگنوستیک زنده — نسخه 1.1.4

Work Log:
- دیاگنوستیک 1.1.3 داده طلایی داد (TASK-9334): نتایج=5، کلیک=24، کلیک مرورگر=انجام شد، کادر پیام=خیر، عنوان=«گفتگوی صوتی»
- تشخیص: کلیک‌ها حتی trusted هم اجرا می‌شوند ولی «تشخیص باز شدن گفتگو» وابسته به selector عنوان/کادر آداپتر است که با DOM فعلی روبیکا (کلاس‌های obfuscate) نمی‌خوانند → ناوبری نامرئی بود و ۲۴ کلیک بی‌اثر تکرار می‌شد
- کشف زامبی: TASK-9335..9338 در received گیر کردند — chrome.tabs.sendMessage اگر content script پاسخ ندهد برای همیشه معلق می‌ماند و زنجیرهٔ سریالی SW قفل می‌شود
- فیکس‌های agent.js:
  * findComposer عمومی: پایین‌ترین contenteditable/textarea قابل‌مشاهده (مستقل از کلاس) — فال‌بک adapter.input
  * opened() با ۳ سیگنال: تطبیق عنوان | کادر تازه باز شده (titleChanged || !composerWasOpen) | جدا شدن عناصر نتیجه از DOM + نام مخاطب در نوار بالا (topStripHasTarget) + کادر موجود
  * تشخیص بسته شدن کشوی نتایج از روی isConnected عناصر (چون بعد از باز شدن گفتگو نام مخاطب در عنوان هم هست)
  * waitFor مقاوم به خطای fn (منشأ تعلیق/zombie)
  * watchdog ۱۶۰ ثانیه در شنونده RW_TASK — پاسخ هیچ‌وقت معلق نمی‌ماند
  * typeAndSend پارامتر inputOverride؛ SEND_TEXT از findComposer فال‌بک می‌گیرد
  * domSnapshotDebug: در خطای chat_not_found/input_not_found ساختار فیلدهای متنی + عناصر عنوان + iframe در فیلد result وظیفه ذخیره می‌شود (تا selector روبیکا را دقیق ببندیم)
- فیکس‌های service-worker.js: تایم‌اوت ۱۴۰ ثانیه sendMessage + سقف ۱۵۰ ثانیه برای کل executeTask در زنجیره
- فیکس sync route: احیای وظایف received/running/verifying بی‌تحرکِ >۵ دقیقه به queued (Stale Reclaim)
- تست شبیه‌سازی TEST-4 اضافه شد: عنوان خراب («گفتگوی صوتی») + input=null — دقیقاً سناریوی روبیکا؛ با تشخیص عمومی PASS
- هر ۴ تست PASS؛ نصب Playwright OK؛ tsc پاک

Stage Summary:
- v1.1.4: public/extension/rasaweb-agent-v1.1.4.zip + download/
- عامل حتی با selectorهای خراب، باز شدن گفتگو را تشخیص می‌دهد و پیام را با کادر عمومی می‌فرستد
- زنجیره SW دیگر با یک وظیفه معلق قفل نمی‌شود؛ وظایف زامبی ۵ دقیقه‌ای احیا می‌شوند
- بعد از اجرای بعدی کاربر، domSnapshotDebug در DB می‌نشیند → selector دقیق روبیکا در نسخه بعد

---
Task ID: 19
Agent: Main Agent (Super Z)
Task: ① ریشه‌یابی نهایی «ارسال نشدن به شماره ذخیره‌نشده» + فیکس dispatch ② سیستم تیکت پشتیبانی کامل ③ سیستم تم رنگی (۸ تم + سیستمی) ④ نسخه 1.2.6 و ری‌استارت تمیز سرور

Work Log:
- دیباگ DB: آخرین وظایف کاربر (TASK-9351..9355 از ۴ اکتبر) در وضعیت received گیر کرده بودند و Worker ثبت‌شده‌ای وجود ندارد (لیست Workerها خالی — کاربر باید افزونه را دوباره جفت کند)
- ★ ریشه واقعی باگ: dispatch های پنل اصلاً شماره تلفن را در payload نمی‌فرستادند — موتور کمپین فقط {text}، دیالوگ «دستور جدید» فقط {text}، worker-details فقط {text} → عامل ناچار بود با «نام» جستجو کند که برای مخاطب ذخیره‌نشده شکست می‌خورد
- فیکس ۱ (app-store tick): payload کمپین ← { text, phone: q.phone, displayName: q.contactName }
- فیکس ۲ (NewTaskDialog): فیلد «شماره مخاطب» + ارسال payload.phone/displayName + اگر target خودش ≥۱۰ رقم باشد خودش شماره حساب می‌شود
- فیکس ۳ (worker-details sendCommand): فیلد شماره + ارسال phone/displayName
- فیکس ۴ (افزونه v1.2.6): buildTargetPlan حالا variants فرمت‌های «همان شماره» می‌سازد (۰۹… / ۹… / +98…) و openChatSmart همه را به‌ترتیب امتحان می‌کند — همچنان فقط جستجوی شماره‌ای (منطبق با درخواست کاربر)، سرچ با نام ممنوع
- سیستم تیکت: مدل‌های Ticket + TicketMessage در Prisma (db push + generate)؛ API: GET/POST /api/tickets + GET/POST/PATCH /api/tickets/[id] (مالک: همهٔ تیکت‌ها + تغییر وضعیت، کاربر: تیکت خودش + بستن)؛ پاسخ مالک ← in_progress خودکار؛ پاسخ کاربر روی waiting/resolved ← open
- UI تیکت: tickets-view.tsx (لیست + فیلتر وضعیت + گفتگوی حبابی + پاسخ با Ctrl+Enter + اقدامات مالک + دیالوگ ثبت با دسته‌بندی/اهمیت)؛ گروه «پشتیبانی» در سایدبار با نشان تعداد باز (supportOpen از /api/panel/agents piggyback)؛ ثبت در app-shell + ViewId + VIEW_TITLES
- سیستم تم: src/lib/themes.ts (۸ تم از فایل آپلودی کاربر: continental/graphite/midnight_indigo/daylight/saramad_rose/lavande/sakura/forest + system)؛ override کامل توکن‌های shadcn در globals.css برای هر تم (data-theme) + --success/--warning/--info جدید؛ کلاس dark فقط برای تم‌های تیره؛ حالت سیستمی = Graphite تیره / Daylight روشن
- applyTheme + useTheme (همگام‌سازی چند نمونه + matchMedia listener) + اسکریپت anti-FOUC در layout.tsx head + localStorage key «rw-theme»
- انتخابگر تم: Popover در تاپ‌بار (جایگزین دکمهٔ شب/روز — سواچ سه‌رنگ هر تم) + کارت «ظاهر و تم رنگی» در تنظیمات با پیش‌نمایش مینیاتوری ۹ گزینه
- نسخه: manifest 1.2.6 + EXTENSION_LATEST_VERSION/URL در types.ts؛ ZIP ساخته شد (۱۴ فایل، گاردها OK، grep تأیید کد variants) و در public/extension + download
- ری‌استارت تمیز: pkill next + rm -rf .next + ensure-server.sh (درس چانک کهنهٔ Turbopack)؛ سرور 200 پایدار بین tool call ها
- تست E2E تیکت با کاربر تستی: ثبت (refNo 1001) → پاسخ → PATCH وضعیت → supportOpen=1 → پاک‌سازی کامل
- تست مرورگری Playwright: پنل بالا می‌آید، تم بوت (daylight در headless روشن)، انتخاب continental ← data-theme + dark class + body bg = #1D1410 دقیق؛ تنها خطای کنسول: 401 مورد انتظار پیش از ورود
- tsc --noEmit: صفر خطا در src/

Stage Summary:
- ریشه باگ «ذخیره‌نشده» دو لایه بود: ① پنل هرگز شماره را به افزونه نمی‌داد (فیکس شد — همهٔ مسیرهای dispatch حالا phone+displayName می‌فرستند) ② فرمت شماره ممکن است با ایندکس پلتفرم فرق داشته باشد (v1.2.6 با سه فرمت همان شماره تلاش می‌کند)
- کاربر باید: از بخش «افزونه کروم» نسخهٔ 1.2.6 را دانلود، افزونه را Reload و Worker را دوباره جفت کند (لیست Workerها خالی است)
- سیستم تیکت کامل فعال است: کاربران ثبت می‌کنند، مالک در «تیکت پشتیبانی» می‌بیند/پاسخ می‌دهد/وضعیت را عوض می‌کند
- ۹ گزینهٔ تم (سیستمی + ۸ تم) در تاپ‌بار و تنظیمات — انتخاب هر کاربر مستقل و ماندگار

---
Task ID: 20
Agent: Main Agent (Super Z)
Task: پیگیری «نمایش نمیده» — راستی‌آزمایی سرتاسری پنل (تیکت + افزونهٔ 1.2.6 + تم) بعد از Task 19

Work Log:
- بررسی ریشه: grep «1.1.4» در src/ → هیچ هاردکدی نیست؛ همهٔ کامپوننت‌ها (extension-view، worker-details، workers-view) به EXTENSION_LATEST_VERSION از types.ts (1.2.6) وصل‌اند
- وضعیت فایل‌ها: manifest.json=1.2.6، ZIP v1.2.6 در public/extension + download (v1.2.5 حذف شده — 404 می‌دهد که طبیعی است)، سرور 200
- دانلود ۳۸ چانک جاری صفحه از سرور و grep: «تیکت پشتیبانی» ✓، «1.2.6» ✓ (۲ مورد)، «تم رنگی» ✓ (۵ مورد) → سِرو کامل
- کاربر تستی uitest2@rasaweb.ir ساخته شد و با agent-browser ورود کامل (شامل OTP dev) انجام شد
- راستی‌آزمایی چشمی (اسکرین‌شات در scripts/verify/):
  * 25-dashboard.png: داشبورد + آیکون پالت تم در تاپ‌بار ✓
  * 28-ext-view.png: «نسخهٔ فعلی v۱.۲.۶» + «آخرین نسخهٔ منتشرشده v۱.۲.۶» + دکمهٔ سبز «دانلود افزونه (v۱.۲.۶)» + هر ۵ مرحلهٔ نصب با نام فایل 1.2.6 ✓
  * 29-tickets.png: نمای «پشتیبانی و تیکت» با دکمهٔ «تیکت جدید»، ۴ کارت آمار، فیلترها ✓
- درس فنی: find text click در agent-browser روی سایدبار «covered» می‌شود → الگوی کارآمد: eval با JS querySelectorAll + textContent.includes + click()
- پاک‌سازی: کاربر تستی + تیکت‌هایش حذف شد؛ سرور بعد از همهٔ تست‌ها 200

Stage Summary:
- سرور و UI صددرصد سالم‌اند: هر سهٔ فیچر Task 19 (تیکت، تم‌ها، افزونهٔ 1.2.6) در مرورگر تازه نمایش داده می‌شوند
- «نمایش نمیده» کاربر = کش مرورگر خود کاربر است (صفحه/چانک کهنه) → راه‌حل: Hard Refresh (Ctrl+Shift+R)، بعد خروج/ورود
- برای رفع باگ ۲۳ کاربر باید: دانلود v1.2.6 از بخش افزونه کروم → حذف نسخهٔ قدیمی در chrome://extensions → Load unpacked جدید → اتصال Worker (لیست Workerها خالی بود در Task 19) → تست ارسال به شمارهٔ ذخیره‌نشده

---
Task ID: 21
Agent: Main Agent (Super Z)
Task: باگ ۲۴ «هیچ پیامی ارسال نمی‌شود» — ریشه‌یابی از دادهٔ واقعی DB + فیکس سه‌لایه + کشف «بامپ ناقص v1.2.7» + انتقال کل پروژه به GitHub

Work Log:
- کشف بحرانی (۱): بامپ v1.2.7 جلسهٔ قبل هرگز روی دیسک ننشسته بود — types.ts=1.2.6، manifest=1.2.6، ZIP سرو‌شده=1.2.6، بدون verPatch در sync، بدون stamp در build script، بدون sidepanel verSuffix → کاربر عملاً افزونهٔ 1.2.6 (کد فاقد فیکس‌ها) نصب کرده بود
- کشف بحرانی (۲): علت از دست رفتن کارهای سشن‌ها پیدا شد — محیط سندباکس بین پیام‌ها به آخرین commit گیت برمی‌گردد (فایل‌های untracked/تغییر‌یافته‌ی commit‌نشده پاک می‌شوند؛ حتی db/custom.db به نسخهٔ commit‌شده برمی‌گردد). راه‌حل: بعد از هر تغییر، commit دستی + push به GitHub
- تشخیص از ۱۵۹ وظیفهٔ واقعی DB (scripts/diag-bug24.mjs): ۰ Worker متصل (آخرین ابطال Oct 7 «عارفه1» — الگوی ۵ بار جفت‌سازی/ابطال در Oct 3-4)، ۷۲ failed با غلبهٔ chat_not_found=۵۳ (۴۶ روبیکا) و platform_ui_changed=۱۱ (همهٔ تلگرام)، ۷۶ success (شبیه‌سازی Oct 2)، ۱۱ وظیفهٔ یتیم فعال (workerId=null از Oct 2/4)
- کالبدشکافی رشتهٔ اشکال‌یابی chat_not_found: «کادر جستجو: پیدا شد | تایپ ✓ | نتایج ۸ | کلیک ✓ | کیبورد ✓ | کادر پیام (آداپتر): خیر | کادر پیام (عمومی): بله | عنوان: «گفتگوی صوتی»» → composer واقعاً باز بوده ولی عنوان از برچسب دکمهٔ تماس خوانده می‌شده (NOISE فیلترشده در کد فعلی) + شکاف selector contenteditable
- فیکس ۱ (زنجیرهٔ نسخه): manifest/types→1.2.7، stamp خودکار README+popup در build-extension-zip.sh، verPatch در sync (extVersion+chrome در هر heartbeat، Event فقط در تغییر)، payload heartbeat در service-worker، verSuffix در sidepanel
- فیکس ۲ (گارد Stale Orphan در /api/agent/sync): وظایف workerId=null قدیمی‌تر از ۲۴ ساعت هنگام اولین sync بعد از جفت‌سازی، خودکار canceled با errorKind=stale_canceled + Event؛ وظایف <۲۴ ساعت عادی claim؛ ۱۱ یتیم لغو شدند → ۰ in-flight
- فیکس ۳ (service-worker executeTask): حلقهٔ retry اتصال ×۳ با تزریق مجدد content script بین تلاش‌ها — sendMessage throw («گیرنده نیست») دیگر شکست فوری platform_ui_changed نیست (باگ تلگرام ×۱۱)
- فیکس ۴ (agent.js/adapters.js): selectorهای composer از [contenteditable='true'] به [contenteditable]:not([contenteditable='false']) در findComposer + domSnapshotDebug + rubika.input — پوشش contenteditable="" خالی (الگوی DOM واقعی روبیکا)
- E2E (۱۱ اظهار، همه پاس): test-version-heartbeat.mjs (پرشدن نسخه، Event بدون اسپم، حفظ بدون extVersion، 401) + test-stale-orphan-guard.mjs (لغو کهنه، عدم تحویل، تحویل تازه، Event)
- ZIP v1.2.7 ساخته/راستی‌آزمایی (manifest=1.2.7، README=1.2.7، popup=1.2.7، فیکس‌ها داخل ZIP، سرو 200)؛ tsc: ۰ خطا در src/
- انتقال به GitHub: push کل پروژه به ArefehAmini/DirectMarketing با PAT کاربر (توکن فقط یک‌بار در URL push استفاده شد، در .git/config ذخیره نشد) — نکتهٔ شفافیت: db/custom.db (دادهٔ کاربر) و .env (فقط DATABASE_URL لوکال، بدون secret) در ریپو هستند چون مکانیزم بازیابی سندباکس بدون tracked بودن آن‌ها داده‌ها را از دست می‌دهد
- پاک‌سازی: کاربران/Workerهای تستی حذف (cleanup کامل وظایف/رویدادها هم)

Stage Summary:
- «هیچ پیامی ارسال نمی‌شود» سه لایه بود: ① افزونهٔ نصب‌شده کاربر واقعاً 1.2.6 بدون فیکس‌ها بود (بامپ ناقص) ② ۱۱ وظیفهٔ یتیم کهنه منتظر claim ناخواسته ③ شکست اتصال content script در تلگرام بدون retry
- از این به بعد قانون سشن: هر تغییر مهم → commit دستی فوری؛ اگر کار سشنی گم شد، از GitHub دوباره pull/clone شود
- قدم بعدی کاربر: دانلود v1.2.7 از بخش «افزونه کروم» → حذف افزونهٔ قبلی در chrome://extensions → Load unpacked جدید → جفت‌سازی Worker → تست ارسال
