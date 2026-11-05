/* ─── Domain Types – RasaWeb Messaging Hub ─── */

export type Platform =
  | "whatsapp"
  | "telegram"
  | "rubika"
  | "bale"
  | "eitaa"
  | "soroush";

export type AccountStatus =
  | "active" // 🟢 فعال / سالم
  | "limited" // 🟡 محدود شده
  | "blocked" // 🔴 مسدود
  | "auth_required" // 🟠 نیازمند احراز هویت
  | "connection_error" // ⚠️ خطای اتصال
  | "inactive" // ⚪ غیرفعال
  | "checking"; // 🔵 در حال بررسی

export type AuthMethod = "phone_code" | "api_token" | "bot_token" | "oauth" | "qr";

export interface Account {
  id: string;
  platform: Platform;
  name: string;
  phone: string;
  status: AccountStatus;
  health: number; // 0..100
  sentToday: number;
  dailyLimit: number;
  remaining: number;
  lastActive: string; // HH:mm
  lastError: string | null;
  authMethod: AuthMethod;
  connectedAt: string;
  poolId: string | null;
  pausedReason?: string;
  remainingMessages?: number;
  /* Browser Worker Binding — این اکانت در کدام Worker/Chrome Profile باز است */
  workerId?: string | null;
  workerNo?: number | null;
  profileLabel?: string | null;
  tabId?: string | null;
}

export type QueueStatus = "queued" | "sending" | "sent" | "failed" | "stopped" | "paused";

export type ErrorClass =
  | "temporary" // خطای موقت → Retry
  | "rate_limit" // محدودیت ارسال → Pause
  | "auth" // احراز هویت → بررسی اتصال
  | "restriction" // محدودیت اکانت → توقف اتصال
  | "invalid_recipient" // مخاطب نامعتبر → حذف از صف
  | "no_worker"; // اکانت بدون Worker متصل → اتصال به Worker

export const ERROR_CLASS_META: Record<
  ErrorClass,
  { label: string; action: string; color: string; bg: string; desc: string; autoRetry: boolean }
> = {
  temporary: {
    label: "خطای موقت",
    action: "تلاش مجدد خودکار",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    desc: "مشکل لحظه‌ای شبکه یا پاسخ‌نگرفتن سرویس مقصد. سیستم تا ۳ بار خودکار تلاش می‌کند.",
    autoRetry: true,
  },
  rate_limit: {
    label: "محدودیت ارسال",
    action: "توقف موقت صف",
    color: "text-orange-700",
    bg: "bg-orange-50 border-orange-200",
    desc: "سرویس مقصد سقف ارسال اعلام کرده است. ارسال متوقف می‌شود و پس از رفع محدودیت ادامه می‌یابد.",
    autoRetry: false,
  },
  auth: {
    label: "خطای احراز هویت",
    action: "نیازمند بررسی اتصال",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    desc: "نشست یا توکن اکانت نامعتبر شده است. تلاش مجدد خودکار انجام نمی‌شود؛ اتصال باید بررسی شود.",
    autoRetry: false,
  },
  restriction: {
    label: "محدودیت اکانت",
    action: "توقف اتصال اکانت",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    desc: "سرویس مقصد اکانت را محدود کرده است. اکانت از چرخه ارسال خارج و پیام‌ها به صف منتقل می‌شوند.",
    autoRetry: false,
  },
  invalid_recipient: {
    label: "مخاطب نامعتبر",
    action: "حذف از صف",
    color: "text-slate-600",
    bg: "bg-slate-100 border-slate-200",
    desc: "شماره مخاطب در سرویس مقصد وجود ندارد یا قابلیت دریافت پیام را خیر اعلام کرده است.",
    autoRetry: false,
  },
  no_worker: {
    label: "بدون Worker متصل",
    action: "اتصال اکانت به Worker",
    color: "text-violet-700",
    bg: "bg-violet-50 border-violet-200",
    desc: "ارسال واقعی فقط توسط عامل مرورگر (Worker) انجام می‌شود؛ این اکانت به هیچ Worker آنلاین متصل نیست و پیام به‌جای نتیجه تقلبی، در صف منتظر می‌ماند.",
    autoRetry: false,
  },
};

export interface QueueItem {
  id: string;
  campaignId: string;
  campaignName: string;
  contactName: string;
  phone: string;
  platform: Platform;
  accountId: string;
  accountName: string;
  status: QueueStatus;
  agentRef?: number; // شماره وظیفه عامل (TASK-refNo) — ارسال واقعی از این مسیر نتیجه می‌گیرد
  scheduledAt: string; // HH:mm
  attempts: number;
  lastError: string | null;
  errorClass?: ErrorClass;
}

export type ConsentStatus = "allowed" | "unknown" | "opted_out";

export const CONSENT_META: Record<
  ConsentStatus,
  { label: string; dot: string; color: string; bg: string }
> = {
  allowed: { label: "مجاز", dot: "bg-emerald-500", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  unknown: { label: "نامشخص", dot: "bg-amber-500", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  opted_out: { label: "عدم دریافت پیام", dot: "bg-red-500", color: "text-red-700", bg: "bg-red-50 border-red-200" },
};

export interface Contact {
  id: string;
  name: string;
  phone: string;
  channels: Platform[]; // کانال‌های قابل دسترسی (طبق اطلاعات رسمی سرویس‌ها)
  tags: string[];
  city: string;
  category: string;
  source: string;
  addedAt: string;
  lastCampaign?: string;
  /* ارتقاء: رضایت و شخصی‌سازی */
  consent: ConsentStatus;
  company?: string; // نام کسب‌وکار
  lastInteraction?: string;
  satisfaction?: "satisfied" | "neutral" | "angry" | "unknown";
  notes?: string;
  expert?: string; // نام کارشناس
  replied?: boolean; // آیا به آخرین کمپین پاسخ داده است
}

export type CampaignStatus =
  | "draft"
  | "pending_approval" // نیازمند تأیید
  | "approved" // تأیید شده
  | "rejected" // رد شده
  | "changes_requested" // نیازمند اصلاح
  | "scheduled"
  | "running"
  | "paused"
  | "completed"
  | "stopped";

export interface CampaignTimelineEvent {
  time: string;
  label: string;
  type: "start" | "sent" | "warning" | "resume" | "end" | "info";
}

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  audienceCount: number;
  platforms: Platform[];
  accountsUsed: number;
  message: string;
  plannedCount: number;
  sentCount: number;
  successCount: number;
  failedCount: number;
  queuedCount: number;
  stoppedCount: number;
  startAt: string;
  endAt: string;
  startDate: string;
  createdAt: string;
  timeline: CampaignTimelineEvent[];
  /* ارتقاء: سگمنت، تأیید و Journey */
  segmentId?: string;
  segmentName?: string;
  requestedBy?: string; // درخواست‌دهنده تأیید
  reviewNote?: string; // یادداشت مدیر هنگام رد/اصلاح
  hasJourney?: boolean; // Follow-up فعال است
  personalization?: boolean; // شخصی‌سازی متغیر فعال است
  suppressedCount?: number; // مخاطبان حذف‌شده توسط لیست عدم ارسال
}

export type ActivityType =
  | "account_stopped"
  | "campaign_started"
  | "messages_sent"
  | "messages_failed"
  | "account_resumed"
  | "import"
  | "warning";

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  title: string;
  detail: string;
  at: string; // HH:mm
  minutesAgo: number;
}

export type NotificationType = "error" | "warning" | "success" | "info";
export type NotificationCategory = "account" | "campaign" | "system" | "messages";

export const NOTIFICATION_CATEGORY_META: Record<
  NotificationCategory,
  { label: string }
> = {
  account: { label: "هشدارهای اکانت" },
  campaign: { label: "هشدارهای کمپین" },
  system: { label: "هشدارهای سیستم" },
  messages: { label: "پیام‌ها" },
};

export interface AppNotification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  at: string;
  minutesAgo: number;
  read: boolean;
}

export type Role = "owner" | "admin" | "campaign_manager" | "operator" | "viewer" | "custom";

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "suspended";
  lastLogin: string;
  avatarColor: string;
  customRoleName?: string; // برای نقش سفارشی
  canApprove?: boolean; // اجازه تأیید کمپین
}

export type ErrorBehavior = "stop_account" | "retry_then_stop" | "skip_contact";
export type ResumeBehavior = "auto_resume" | "manual_review";

export interface PlatformRule {
  platform: Platform;
  enabled: boolean;
  dailyLimit: number;
  windowStart: string; // "08:00"
  windowEnd: string; // "18:00"
  queueSpeed: "slow" | "normal" | "fast";
  errorBehavior: ErrorBehavior;
  resumeBehavior: ResumeBehavior;
}

export interface Pool {
  id: string;
  platform: Platform;
  name: string;
  accountIds: string[];
}

export interface ContactGroup {
  id: string;
  name: string;
  count: number;
  color: string;
}

export interface ImportResult {
  total: number;
  valid: number;
  duplicates: number;
  invalid: number;
  processed: boolean;
}

/* ═════════ Projects / Workspaces ═════════ */

export interface Project {
  id: string;
  name: string;
  color: string;
  accounts: number;
  contacts: number;
  activeCampaigns: number;
  messagesToday: number;
  issues: number;
}

/* ═════════ Suppression List ═════════ */

export type SuppressionReason =
  | "opt_out_request" // درخواست عدم دریافت پیام
  | "invalid_number" // شماره نامعتبر
  | "deleted_contact" // مخاطب حذف‌شده
  | "blocked_number" // شماره مسدود
  | "internal_customer" // مشتری داخلی
  | "manual_list"; // لیست عدم ارسال دستی

export const SUPPRESSION_REASON_META: Record<
  SuppressionReason,
  { label: string; color: string; bg: string }
> = {
  opt_out_request: { label: "درخواست عدم دریافت", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  invalid_number: { label: "شماره نامعتبر", color: "text-slate-600", bg: "bg-slate-100 border-slate-200" },
  deleted_contact: { label: "مخاطب حذف‌شده", color: "text-slate-600", bg: "bg-slate-100 border-slate-200" },
  blocked_number: { label: "شماره مسدود", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  internal_customer: { label: "مشتری داخلی", color: "text-sky-700", bg: "bg-sky-50 border-sky-200" },
  manual_list: { label: "افزوده دستی", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
};

export interface SuppressionEntry {
  id: string;
  name: string;
  phone: string;
  reason: SuppressionReason;
  note?: string;
  addedBy: string;
  addedAt: string;
  source: "automatic" | "manual";
}

/* ═════════ Smart Segments ═════════ */

export type SegmentField = "category" | "city" | "consent" | "tag" | "source" | "replied" | "lastCampaign";

export const SEGMENT_FIELD_META: Record<SegmentField, { label: string; options: string[] }> = {
  category: { label: "صنف", options: ["طلا و جواهر", "پوشاک", "املاک", "خدمات وب", "رستوران", "آموزش", "پزشکی", "خودرو", "مبلمان"] },
  city: { label: "شهر", options: ["تهران", "مشهد", "اصفهان", "شیراز", "تبریز", "کرج", "اهواز", "قم", "رشت", "یزد"] },
  consent: { label: "وضعیت دریافت پیام", options: ["مجاز", "نامشخص", "عدم دریافت پیام"] },
  tag: { label: "برچسب", options: ["VIP", "سرنخ", "مشتری فعلی", "پیگیری فوری", "عمده‌فروش", "عضو باشگاه", "نمایشگاه مهر"] },
  source: { label: "منبع", options: ["ورود دستی", "فایل اکسل", "نمایشگاه", "وب‌سایت", "معرفی مشتری", "کمپین مهر"] },
  replied: { label: "وضعیت پاسخ", options: ["پاسخ داده", "پاسخ نداده"] },
  lastCampaign: { label: "آخرین کمپین", options: ["پیشنهاد ویژه مهر", "معرفی خدمات مهر", "جشنواره پاییزه", "—"] },
};

export interface SegmentRule {
  id: string;
  field: SegmentField;
  operator: "is" | "is_not";
  value: string;
}

export interface Segment {
  id: string;
  name: string;
  color: string;
  rules: SegmentRule[]; // با AND به هم متصل می‌شوند
  matchCount: number;
  isSystem?: boolean;
  createdAt: string;
}

/* ═════════ Unified Inbox ═════════ */

export type MessageDirection = "in" | "out";
export type MessageStatus = "received" | "sending" | "sent" | "delivered" | "read" | "failed";

export const MESSAGE_STATUS_META: Record<MessageStatus, { label: string }> = {
  received: { label: "دریافت شد" },
  sending: { label: "در حال ارسال" },
  sent: { label: "ارسال شد" },
  delivered: { label: "تحویل شد" },
  read: { label: "خوانده شد" },
  failed: { label: "ناموفق" },
};

export interface InboxMessage {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  sender: string; // نام فرستنده (مخاطب یا اکانت)
  body: string;
  at: string; // HH:mm
  date: string; // امروز / دیروز
  status: MessageStatus;
  relatedCampaign?: string;
  fromAI?: boolean;
}

export type ConversationState = "open" | "pending" | "resolved";

export const CONVERSATION_STATE_META: Record<ConversationState, { label: string; color: string; bg: string }> = {
  open: { label: "باز", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  pending: { label: "در انتظار پاسخ", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  resolved: { label: "بسته شده", color: "text-slate-600", bg: "bg-slate-100 border-slate-200" },
};

export type InboxFilter = "all" | "unread" | "unanswered" | "important" | "mine" | "team";

export const INBOX_FILTER_META: Record<InboxFilter, { label: string }> = {
  all: { label: "همه" },
  unread: { label: "خوانده‌نشده" },
  unanswered: { label: "پاسخ داده‌نشده" },
  important: { label: "مهم" },
  mine: { label: "من" },
  team: { label: "تیم" },
};

export interface Conversation {
  id: string;
  contactId: string;
  contactName: string;
  phone: string;
  platform: Platform;
  lastMessage: string;
  lastAt: string;
  minutesAgo: number;
  unread: number;
  tags: string[];
  state: ConversationState;
  assignedTo: string | null; // null = اختصاص نیافته
  isImportant: boolean;
  replied: boolean; // آخرین پیام ورودی پاسخ گرفته است؟
  campaign?: string;
  replySupported: boolean; // آیا روش اتصال این کانال پاسخ‌دهی مجاز و پشتیبانی‌شده دارد؟
  messages: InboxMessage[];
}

/* ─── Navigation ─── */

export type ViewId =
  | "dashboard"
  | "accounts"
  | "account-details"
  | "add-account"
  | "contacts"
  | "contact-details"
  | "import-contacts"
  | "campaigns"
  | "create-campaign"
  | "campaign-details"
  | "queue"
  | "scheduling"
  | "reports"
  | "ai"
  | "notifications"
  | "limits"
  | "users"
  | "security"
  | "settings"
  | "login"
  /* ارتقاء Omnichannel */
  | "inbox"
  | "suppression"
  | "segments"
  | "approval"
  | "templates"
  | "journey"
  | "audit"
  | "usage"
  /* Browser Agent — افزونه کروم و Workerها */
  | "workers"
  | "agent-tasks"
  | "connection-map"
  | "extension"
  /* پشتیبانی — سیستم تیکت */
  | "tickets";

export const PLATFORMS: Platform[] = ["whatsapp", "telegram", "rubika", "bale", "eitaa", "soroush"];

export const PLATFORM_LABEL: Record<Platform, string> = {
  whatsapp: "واتساپ",
  telegram: "تلگرام",
  rubika: "روبیکا",
  bale: "بله",
  eitaa: "ایتا",
  soroush: "سروش",
};

export const PLATFORM_AUTH: Record<Platform, AuthMethod> = {
  whatsapp: "qr",
  telegram: "phone_code",
  rubika: "phone_code",
  bale: "phone_code",
  eitaa: "phone_code",
  soroush: "phone_code",
};

export const ACCOUNT_STATUS_META: Record<
  AccountStatus,
  { label: string; color: string; dot: string; bg: string }
> = {
  active: { label: "فعال", color: "text-emerald-700", dot: "bg-emerald-500", bg: "bg-emerald-50 border-emerald-200" },
  limited: { label: "محدود", color: "text-amber-700", dot: "bg-amber-500", bg: "bg-amber-50 border-amber-200" },
  blocked: { label: "مسدود", color: "text-red-700", dot: "bg-red-500", bg: "bg-red-50 border-red-200" },
  auth_required: { label: "نیازمند احراز هویت", color: "text-orange-700", dot: "bg-orange-500", bg: "bg-orange-50 border-orange-200" },
  connection_error: { label: "خطای اتصال", color: "text-orange-700", dot: "bg-orange-500", bg: "bg-orange-50 border-orange-200" },
  inactive: { label: "غیرفعال", color: "text-slate-600", dot: "bg-slate-400", bg: "bg-slate-50 border-slate-200" },
  checking: { label: "در حال بررسی", color: "text-sky-700", dot: "bg-sky-500", bg: "bg-sky-50 border-sky-200" },
};

export const QUEUE_STATUS_META: Record<
  QueueStatus,
  { label: string; color: string; bg: string }
> = {
  queued: { label: "در صف", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  sending: { label: "در حال ارسال", color: "text-sky-700", bg: "bg-sky-50 border-sky-200" },
  sent: { label: "ارسال موفق", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  failed: { label: "خطا", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  stopped: { label: "متوقف", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  paused: { label: "توقف موقت", color: "text-slate-600", bg: "bg-slate-100 border-slate-200" },
};

export const CAMPAIGN_STATUS_META: Record<
  CampaignStatus,
  { label: string; color: string; bg: string }
> = {
  draft: { label: "پیش‌نویس", color: "text-slate-600", bg: "bg-slate-100 border-slate-200" },
  pending_approval: { label: "نیازمند تأیید", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  approved: { label: "تأیید شده", color: "text-teal-700", bg: "bg-teal-50 border-teal-200" },
  rejected: { label: "رد شده", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  changes_requested: { label: "نیازمند اصلاح", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  scheduled: { label: "زمان‌بندی‌شده", color: "text-sky-700", bg: "bg-sky-50 border-sky-200" },
  running: { label: "در حال اجرا", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  paused: { label: "متوقف موقت", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  completed: { label: "تکمیل‌شده", color: "text-teal-700", bg: "bg-teal-50 border-teal-200" },
  stopped: { label: "متوقف‌شده", color: "text-red-700", bg: "bg-red-50 border-red-200" },
};

export const ROLE_META: Record<Role, { label: string; desc: string }> = {
  owner: { label: "مالک", desc: "دسترسی کامل به همه پروژه‌ها، صورت‌حساب و مالکیت" },
  admin: { label: "مدیر کل", desc: "دسترسی کامل به همه بخش‌ها، تأیید کمپین‌ها و تنظیمات" },
  campaign_manager: { label: "مدیر کمپین", desc: "ساخت و مدیریت کمپین، مشاهده گزارش‌ها" },
  operator: { label: "اپراتور", desc: "پاسخ‌گویی Inbox و اجرای عملیات روزانه" },
  viewer: { label: "مشاهده‌گر", desc: "فقط مشاهده داشبورد و گزارش‌ها" },
  custom: { label: "نقش سفارشی", desc: "دسترسی‌های انتخابی توسط مدیر" },
};

/* ═════════ Message Templates ═════════ */

export type TemplateCategory = "intro" | "sales" | "followup" | "invite" | "congrats" | "announce";

export const TEMPLATE_CATEGORY_META: Record<TemplateCategory, { label: string; color: string }> = {
  intro: { label: "معرفی", color: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
  sales: { label: "فروش", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  followup: { label: "پیگیری", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  invite: { label: "دعوت", color: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
  congrats: { label: "تبریک", color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
  announce: { label: "اطلاع‌رسانی", color: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300" },
};

export interface MessageTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  body: string;
  uses: number;
  lastUsed?: string;
}

/* ═════════ Personalization Variables ═════════ */

export interface PersonalizationVar {
  key: string;
  label: string;
  sample: string;
}

export const PERSONALIZATION_VARS: PersonalizationVar[] = [
  { key: "{{نام}}", label: "نام مخاطب", sample: "علی رضایی" },
  { key: "{{نام کسب‌وکار}}", label: "نام کسب‌وکار", sample: "مبلمان آرا" },
  { key: "{{صنف}}", label: "صنف", sample: "مبلمان" },
  { key: "{{شهر}}", label: "شهر", sample: "تهران" },
  { key: "{{نام کارشناس}}", label: "نام کارشناس", sample: "سارا محمدی" },
];

export function applyPersonalization(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (m, key) => vars[key.trim()] ?? m);
}

/* ═════════ Campaign Journey / Follow-up ═════════ */

export type JourneyNodeType = "message" | "condition" | "action";

export interface JourneyNode {
  id: string;
  type: JourneyNodeType;
  title: string;
  subtitle?: string;
  body?: string;
  delayLabel?: string;
  x: number; // درصد افقی روی canvas
  y: number; // درصد عمودی روی canvas
}

export interface JourneyEdge {
  from: string;
  to: string;
  label: string; // «اگر پاسخ داد» / «اگر پاسخ نداد»
  tone: "positive" | "negative" | "neutral";
}

export interface CampaignJourney {
  campaignId: string;
  campaignName: string;
  enabled: boolean;
  nodes: JourneyNode[];
  edges: JourneyEdge[];
  triggers: WorkflowTrigger[];
}

/* ═════════ Workflow Triggers ═════════ */

export type TriggerEvent =
  | "message_received"
  | "no_reply"
  | "campaign_completed"
  | "send_error"
  | "specific_time"
  | "tag_changed"
  | "contact_status_changed";

export const TRIGGER_EVENT_META: Record<TriggerEvent, { label: string }> = {
  message_received: { label: "پیام دریافت شد" },
  no_reply: { label: "مخاطب پاسخ نداد" },
  campaign_completed: { label: "کمپین تکمیل شد" },
  send_error: { label: "خطای ارسال" },
  specific_time: { label: "زمان مشخص" },
  tag_changed: { label: "تغییر Tag" },
  contact_status_changed: { label: "تغییر وضعیت مخاطب" },
};

export type TriggerActionType =
  | "stop_followup"
  | "assign_operator"
  | "add_tag"
  | "send_notification"
  | "move_to_inbox"
  | "pause_campaign";

export const TRIGGER_ACTION_META: Record<TriggerActionType, { label: string }> = {
  stop_followup: { label: "توقف Follow-up" },
  assign_operator: { label: "اختصاص به اپراتور" },
  add_tag: { label: "افزودن Tag" },
  send_notification: { label: "ارسال اعلان" },
  move_to_inbox: { label: "انتقال به Inbox" },
  pause_campaign: { label: "توقف کمپین" },
};

export interface WorkflowTrigger {
  id: string;
  event: TriggerEvent;
  condition?: string;
  actions: TriggerActionType[];
  enabled: boolean;
}

/* ═════════ Account Events (Health) ═════════ */

export interface AccountEvent {
  id: string;
  accountId: string;
  type: "status_change" | "error" | "resume" | "limit" | "reconnect" | "info";
  title: string;
  detail?: string;
  time: string;
  date: string;
}

/* ═════════ Audit Log ═════════ */

export type AuditObjectType =
  | "campaign"
  | "account"
  | "contact"
  | "segment"
  | "template"
  | "settings"
  | "system"
  | "queue"
  | "project";

export interface AuditEntry {
  id: string;
  user: string;
  role: string;
  action: string;
  object: string;
  objectType: AuditObjectType;
  projectName: string;
  date: string; // ۱۴۰۴/۰۷/۱۰
  time: string; // ۱۳:۴۵
}

/* ═════════ Usage & Cost ═════════ */

export interface UsageRow {
  platform: Platform;
  sent: number;
  success: number;
  failed: number;
  costPerMessage: number; // تومان — در صورت ارائه سرویس
}

/* ═══════════════════════════════════════════════════════════
   Browser Agent — Chrome Extension / Browser Workers
   Central Panel = مغز مدیریت | Extension = Execution Agent
   ═══════════════════════════════════════════════════════════ */

/* ─── Universal Action Model — لایه استاندارد Actionها ─── */

export type AgentAction =
  | "OPEN_CHAT"
  | "SEND_TEXT"
  | "SEND_IMAGE"
  | "SEND_FILE"
  | "SEND_IMAGE_WITH_CAPTION"
  | "CREATE_GROUP"
  | "READ_CHAT_CONTEXT"
  | "GET_CHAT_TYPE";

export const AGENT_ACTION_META: Record<
  AgentAction,
  { label: string; desc: string; needsTarget: boolean; payload: ("text" | "image" | "file" | "caption" | "groupName" | "members")[] }
> = {
  OPEN_CHAT: { label: "باز کردن گفتگو", desc: "جستجو و باز کردن چت مخاطب در سرویس مقصد", needsTarget: true, payload: [] },
  SEND_TEXT: { label: "ارسال پیام متنی", desc: "ارسال پیام متنی به گفتگوی باز", needsTarget: true, payload: ["text"] },
  SEND_IMAGE: { label: "ارسال عکس", desc: "آپلود و ارسال تصویر", needsTarget: true, payload: ["image"] },
  SEND_FILE: { label: "ارسال فایل", desc: "آپلود و ارسال فایل", needsTarget: true, payload: ["file"] },
  SEND_IMAGE_WITH_CAPTION: { label: "ارسال عکس + کپشن", desc: "آپلود تصویر، درج کپشن در Preview و ارسال", needsTarget: true, payload: ["image", "caption"] },
  CREATE_GROUP: { label: "ساخت گروه", desc: "ساخت گروه با اعضای مشخص (در سرویس‌هایی که پشتیبانی می‌شود)", needsTarget: false, payload: ["groupName", "members"] },
  READ_CHAT_CONTEXT: { label: "خواندن Context صفحه", desc: "تشخیص پلتفرم، اکانت، مخاطب و نوع چت صفحه جاری", needsTarget: false, payload: [] },
  GET_CHAT_TYPE: { label: "تشخیص نوع چت", desc: "تشخیص Private / Group / Channel / Bot / Business", needsTarget: false, payload: [] },
};

/* ─── وضعیت Task — چرخه کامل با Acknowledgement ─── */

export type AgentTaskStatus =
  | "queued" // در صف پنل
  | "received" // دریافت شد (Ack)
  | "running" // در حال اجرا
  | "verifying" // در حال بررسی نتیجه
  | "success" // موفق
  | "failed" // ناموفق
  | "paused" // توقف موقت
  | "human_action" // نیاز به اقدام انسانی
  | "canceled"; // لغوشده

export const AGENT_TASK_STATUS_META: Record<
  AgentTaskStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  queued: { label: "در صف", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", dot: "bg-amber-500" },
  received: { label: "دریافت شد", color: "text-sky-700", bg: "bg-sky-50 border-sky-200", dot: "bg-sky-500" },
  running: { label: "در حال اجرا", color: "text-teal-700", bg: "bg-teal-50 border-teal-200", dot: "bg-teal-500" },
  verifying: { label: "در حال بررسی", color: "text-violet-700", bg: "bg-violet-50 border-violet-200", dot: "bg-violet-500" },
  success: { label: "موفق", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  failed: { label: "ناموفق", color: "text-red-700", bg: "bg-red-50 border-red-200", dot: "bg-red-500" },
  paused: { label: "متوقف موقت", color: "text-slate-600", bg: "bg-slate-100 border-slate-200", dot: "bg-slate-400" },
  human_action: { label: "نیاز به اقدام انسانی", color: "text-orange-700", bg: "bg-orange-50 border-orange-200", dot: "bg-orange-500" },
  canceled: { label: "لغوشده", color: "text-slate-600", bg: "bg-slate-100 border-slate-200", dot: "bg-slate-400" },
};

/* ─── مراحل Agent Loop: Observe → Understand → Decide → Act → Verify → Report ─── */

export interface AgentLoopStep {
  key: "observe" | "understand" | "decide" | "act" | "verify" | "report";
  label: string;
  state: "pending" | "active" | "done" | "failed";
  detail?: string;
}

export const AGENT_LOOP_STEPS: { key: AgentLoopStep["key"]; label: string }[] = [
  { key: "observe", label: "مشاهده صفحه" },
  { key: "understand", label: "درک Context" },
  { key: "decide", label: "تصمیم‌گیری" },
  { key: "act", label: "اجرای Action" },
  { key: "verify", label: "بررسی نتیجه" },
  { key: "report", label: "گزارش به پنل" },
];

/* ─── خطاهای قابل فهم عامل ─── */

export type AgentErrorKind =
  | "chat_not_found" // چت پیدا نشد
  | "input_not_found" // کادر پیام پیدا نشد
  | "upload_failed" // آپلود ناموفق
  | "send_button_missing" // دکمه ارسال در دسترس نیست
  | "send_not_verified" // ارسال در صفحه تأیید نشد — هرگز Success کاذب نمی‌سازیم
  | "session_expired" // نشست منقضی شده
  | "auth_required" // نیازمند ورود
  | "network" // خطای شبکه
  | "unsupported_action" // Action پشتیبانی نمی‌شود
  | "platform_ui_changed" // ساختار UI تغییر کرده
  | "human_action"; // مانع امنیتی — نیاز به انسان

export const AGENT_ERROR_META: Record<
  AgentErrorKind,
  { label: string; friendly: string; advice: string }
> = {
  chat_not_found: {
    label: "گفتگو پیدا نشد",
    friendly: "گفتگوی مخاطب موردنظر در سرویس مقصد پیدا نشد.",
    advice: "نام یا شناسه مخاطب را بررسی کنید یا صفحه را باز کرده و دستی جستجو کنید.",
  },
  input_not_found: {
    label: "کادر پیام پیدا نشد",
    friendly: "نتوانستیم کادر نوشتن پیام را در صفحه پیدا کنیم.",
    advice: "احتمالاً ساختار صفحه تغییر کرده یا گفتگو به‌صورت کامل باز نیست.",
  },
  upload_failed: {
    label: "آپلود ناموفق",
    friendly: "بارگذاری فایل روی سرویس مقصد ناموفق بود.",
    advice: "حجم و فرمت فایل را بررسی کنید و دوباره تلاش کنید.",
  },
  send_button_missing: {
    label: "دکمه ارسال در دسترس نیست",
    friendly: "دکمه ارسال پیام فعال نشد؛ ممکن است پیام خالی باشد.",
    advice: "محتوای پیام را بررسی کنید یا کنترل را دستی در دست بگیرید.",
  },
  send_not_verified: {
    label: "ارسال تأیید نشد",
    friendly: "افزونه نتوانست ظاهر شدن پیام در گفتگو را تأیید کند؛ Success کاذب ثبت نمی‌کنیم.",
    advice: "در تب پلتفرم وضعیت پیام را بررسی کنید؛ اگر ارسال نشده بود دوباره تلاش کنید.",
  },
  session_expired: {
    label: "نشست منقضی شده",
    friendly: "نشست اکانت در سرویس مقصد منقضی شده است.",
    advice: "در تب مربوطه وارد شوید؛ وظایف تا ورود مجدد متوقف می‌مانند.",
  },
  auth_required: {
    label: "نیازمند ورود",
    friendly: "سرویس مقصد احراز هویت مجدد می‌خواهد.",
    advice: "در تب مربوطه وارد شوید؛ وظایف تا ورود مجدد متوقف می‌مانند.",
  },
  network: {
    label: "خطای شبکه",
    friendly: "ارتباط با سرویس مقصد برقرار نشد.",
    advice: "اتصال اینترنت مرورگر را بررسی کنید و دوباره تلاش کنید.",
  },
  unsupported_action: {
    label: "Action پشتیبانی نمی‌شود",
    friendly: "این عملیات توسط Adapter این سرویس پشتیبانی نمی‌شود.",
    advice: "از Adapterهای به‌روزشده استفاده کنید یا عملیات را دستی انجام دهید.",
  },
  platform_ui_changed: {
    label: "تغییر ساختار UI سرویس",
    friendly: "ساختار UI سرویس تغییر کرده و عامل نتوانست عنصر موردنیاز را پیدا کند.",
    advice: "این خطا برای تیم فنی ثبت شد تا Adapter به‌روزرسانی شود.",
  },
  human_action: {
    label: "نیاز به اقدام انسانی",
    friendly: "مانعی امنیتی (CAPTCHA، کد تأیید یا بررسی امنیتی) ظاهر شده است.",
    advice: "عامل هرگز مانع امنیتی را دور نمی‌زند. در تب مرورگر اقدام کنید و سپس ادامه دهید.",
  },
};

/* ─── نوع چت ─── */

export type ChatType = "private" | "group" | "channel" | "bot" | "business" | "unknown";

export const CHAT_TYPE_META: Record<ChatType, { label: string; icon: string }> = {
  private: { label: "گفتگوی خصوصی", icon: "User" },
  group: { label: "گروه", icon: "Users" },
  channel: { label: "کانال", icon: "Megaphone" },
  bot: { label: "بات", icon: "Bot" },
  business: { label: "حساب تجاری", icon: "Briefcase" },
  unknown: { label: "ناشناخته", icon: "HelpCircle" },
};

/* ─── وضعیت Worker و تب ─── */

export type WorkerStatus = "pending" | "online" | "offline" | "needs_action";

export const WORKER_STATUS_META: Record<WorkerStatus, { label: string; color: string; bg: string; dot: string }> = {
  pending: { label: "در انتظار جفت‌سازی", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", dot: "bg-amber-500" },
  online: { label: "متصل", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  offline: { label: "خارج از اتصال", color: "text-red-700", bg: "bg-red-50 border-red-200", dot: "bg-red-500" },
  needs_action: { label: "نیاز به اقدام", color: "text-orange-700", bg: "bg-orange-50 border-orange-200", dot: "bg-orange-500" },
};

export type TabStatus = "ready" | "working" | "error" | "disconnected";
export type SessionState = "active" | "expiring" | "expired";

export const TAB_STATUS_META: Record<TabStatus, { label: string; dot: string }> = {
  ready: { label: "آماده", dot: "bg-emerald-500" },
  working: { label: "در حال کار", dot: "bg-amber-500" },
  error: { label: "خطا", dot: "bg-red-500" },
  disconnected: { label: "قطع", dot: "bg-slate-300" },
};

export const SESSION_STATE_META: Record<SessionState, { label: string; dot: string; color: string }> = {
  active: { label: "فعال", dot: "bg-emerald-500", color: "text-emerald-700" },
  expiring: { label: "نزدیک انقضا", dot: "bg-amber-500", color: "text-amber-700" },
  expired: { label: "منقضی", dot: "bg-red-500", color: "text-red-700" },
};

/* ─── مدل‌های UI پنل ─── */

export interface WorkerTabInfo {
  platform: Platform | "other";
  url: string;
  title: string;
  status: TabStatus;
  chatName: string;
  chatType: ChatType;
  session: SessionState;
}

export interface BrowserWorkerInfo {
  id: string;
  workerNo: number;
  name: string;
  status: WorkerStatus;
  chromeVersion: string;
  extVersion: string;
  profileLabel: string;
  simulated: boolean;
  lastHeartbeat: string | null; // ISO
  createdAt: string; // ISO
  tabs: WorkerTabInfo[];
  boundAccounts: number;
  activeTasks: number;
  errorTasks: number;
}

export interface AgentTaskInfo {
  id: string;
  refNo: number;
  workerId: string | null;
  workerName: string;
  workerNo: number | null;
  action: AgentAction;
  platform: Platform;
  accountId: string;
  accountName: string;
  target: string;
  payload: {
    text?: string;
    image?: string;
    file?: string;
    caption?: string;
    groupName?: string;
    members?: string[];
    scenario?: ScenarioKind;
  };
  status: AgentTaskStatus;
  steps: AgentLoopStep[];
  result: string;
  error: string;
  errorKind: AgentErrorKind | "";
  createdAt: string; // ISO
  startedAt: string | null;
  finishedAt: string | null;
  chatType?: ChatType; // برای READ_CHAT_CONTEXT
}

export type WorkerEventType =
  | "pairing"
  | "connected"
  | "disconnected"
  | "account_detected"
  | "task_received"
  | "task_started"
  | "message_sent"
  | "task_failed"
  | "session_expired"
  | "worker_offline"
  | "adapter_error"
  | "human_action_required";

export const WORKER_EVENT_META: Record<WorkerEventType, { label: string; color: string; bg: string }> = {
  pairing: { label: "جفت‌سازی", color: "text-teal-700", bg: "bg-teal-50" },
  connected: { label: "اتصال", color: "text-emerald-700", bg: "bg-emerald-50" },
  disconnected: { label: "قطع اتصال", color: "text-slate-600", bg: "bg-slate-100" },
  account_detected: { label: "تشخیص اکانت", color: "text-sky-700", bg: "bg-sky-50" },
  task_received: { label: "دریافت وظیفه", color: "text-amber-700", bg: "bg-amber-50" },
  task_started: { label: "شروع وظیفه", color: "text-teal-700", bg: "bg-teal-50" },
  message_sent: { label: "ارسال موفق", color: "text-emerald-700", bg: "bg-emerald-50" },
  task_failed: { label: "وظیفه ناموفق", color: "text-red-700", bg: "bg-red-50" },
  session_expired: { label: "انقضای نشست", color: "text-orange-700", bg: "bg-orange-50" },
  worker_offline: { label: "Worker آفلاین", color: "text-red-700", bg: "bg-red-50" },
  adapter_error: { label: "خطای Adapter", color: "text-red-700", bg: "bg-red-50" },
  human_action_required: { label: "اقدام انسانی", color: "text-orange-700", bg: "bg-orange-50" },
};

export interface WorkerEventInfo {
  id: string;
  workerId: string | null;
  workerName: string;
  type: WorkerEventType;
  title: string;
  detail: string;
  at: string; // ISO
}

export interface PairingCodeInfo {
  id: string;
  code: string;
  workerName: string;
  expiresAt: string; // ISO
  used: boolean;
}

/* ─── سناریوهای تست A تا M ─── */

export type ScenarioKind =
  | "chat_private" // A: تشخیص گفتگوی خصوصی
  | "chat_group" // B: تشخیص گروه
  | "send_text" // C: ارسال متن
  | "send_image" // D: ارسال عکس
  | "send_file" // E: ارسال فایل
  | "send_image_caption" // F: عکس + کپشن
  | "create_group" // G: ساخت گروه
  | "session_expired" // H: انقضای نشست
  | "ui_changed" // I: تغییر UI پلتفرم
  | "human_action" // J: نیاز به اقدام انسانی
  | "worker_offline" // K: Worker آفلاین
  | "task_failed" // L: وظیفه ناموفق
  | "task_success"; // M: وظیفه موفق

export const SCENARIO_META: Record<ScenarioKind, { label: string; code: string; action: AgentAction; desc: string }> = {
  chat_private: { label: "تشخیص گفتگوی خصوصی", code: "A", action: "READ_CHAT_CONTEXT", desc: "عامل صفحه را Observe و نوع چت را Private تشخیص می‌دهد" },
  chat_group: { label: "تشخیص گروه", code: "B", action: "READ_CHAT_CONTEXT", desc: "عامل نوع چت را Group تشخیص می‌دهد" },
  send_text: { label: "ارسال متن", code: "C", action: "SEND_TEXT", desc: "چرخه کامل: پیدا کردن چت، ورود متن، ارسال و Verify" },
  send_image: { label: "ارسال عکس", code: "D", action: "SEND_IMAGE", desc: "File Picker، آپلود، Preview و ارسال" },
  send_file: { label: "ارسال فایل", code: "E", action: "SEND_FILE", desc: "آپلود فایل و Verify تحویل" },
  send_image_caption: { label: "ارسال عکس + کپشن", code: "F", action: "SEND_IMAGE_WITH_CAPTION", desc: "آپلود عکس، درج کپشن در Preview و ارسال" },
  create_group: { label: "ساخت گروه", code: "G", action: "CREATE_GROUP", desc: "ساخت گروه با نام و اعضا و Verify ایجاد" },
  session_expired: { label: "انقضای نشست", code: "H", action: "SEND_TEXT", desc: "نشست منقضی → توقف وظایف + نیاز به ورود مجدد" },
  ui_changed: { label: "تغییر UI پلتفرم", code: "I", action: "SEND_TEXT", desc: "Adapter عنصر را پیدا نمی‌کند → Platform UI Changed" },
  human_action: { label: "نیاز به اقدام انسانی", code: "J", action: "SEND_TEXT", desc: "مانع امنیتی → PAUSE + Human Action Required → ادامه دستی" },
  worker_offline: { label: "قطع اتصال Worker", code: "K", action: "SEND_TEXT", desc: "Heartbeat قطع می‌شود → Offline → اتصال مجدد" },
  task_failed: { label: "وظیفه ناموفق", code: "L", action: "SEND_TEXT", desc: "خطای اجرا با امکان Retry و کنترل دستی" },
  task_success: { label: "وظیفه موفق", code: "M", action: "SEND_TEXT", desc: "چرخه کامل موفق: Queued → Running → Verifying → Success" },
};

/* نسخه آخر افزونه — برای Update System (§۴۹) */
export const EXTENSION_LATEST_VERSION = "1.2.7";
export const EXTENSION_DOWNLOAD_URL = "/extension/rasaweb-agent-v1.2.7.zip";
