"use client";
import { create } from "zustand";
import { toast } from "sonner";
import {
  Account, AccountEvent, ActivityEvent, ActivityType, AppNotification, Campaign, Contact, ContactGroup,
  PlatformRule, Pool, QueueItem, SystemUser, ViewId, Platform, Role, ErrorClass,
  Conversation, InboxFilter, InboxMessage, MessageTemplate, Project, Segment, SegmentRule,
  SuppressionEntry, SuppressionReason, CampaignJourney, AuditEntry, ConsentStatus, UsageRow,
  ROLE_META, PLATFORMS, PLATFORM_LABEL,
  BrowserWorkerInfo, AgentTaskInfo, WorkerEventInfo, PairingCodeInfo, AgentAction, ScenarioKind,
} from "@/lib/types";
import { faNum } from "@/lib/fa";
import {
  accounts as seedAccounts, contacts as seedContacts, campaigns as seedCampaigns,
  queueItems as seedQueue, activityEvents as seedActivity, notifications as seedNotifications,
  systemUsers as seedUsers, platformRules as seedRules, pools as seedPools,
  contactGroups as seedGroups, conversations as seedConversations,
  suppressionList as seedSuppression, segments as seedSegments,
  messageTemplates as seedTemplates, projects as seedProjects,
  campaignJourney as seedJourney, accountEvents as seedAccountEvents,
  auditEntries as seedAudit, usageRows as seedUsage,
} from "@/lib/mock-data";
import {
  startSimWorkerPersisted, stopSimWorkerPersisted, restoreSimWorkers, setSimOffline, isSimRunning,
} from "@/lib/agent-simulator";

interface NavigateParams {
  accountId?: string;
  contactId?: string;
  campaignId?: string;
  segmentId?: string;
  conversationId?: string;
  templateId?: string;
  workerId?: string;
  taskId?: string;
}

interface AppState {
  /* auth */
  loggedIn: boolean;
  hydrated: boolean;
  pending2FA: boolean;
  twofaCode: string | null;
  currentUser: { name: string; role: string; email: string; roleKey: Role };

  /* routing */
  view: ViewId;
  params: NavigateParams;

  /* ui */
  sidebarCollapsed: boolean;
  activeProjectId: string;

  /* data — core */
  accounts: Account[];
  contacts: Contact[];
  campaigns: Campaign[];
  queue: QueueItem[];
  activity: ActivityEvent[];
  notifications: AppNotification[];
  users: SystemUser[];
  rules: PlatformRule[];
  pools: Pool[];
  groups: ContactGroup[];

  /* data — omnichannel upgrade */
  conversations: Conversation[];
  activeConversationId: string | null;
  inboxFilter: InboxFilter;
  suppression: SuppressionEntry[];
  segments: Segment[];
  templates: MessageTemplate[];
  projects: Project[];
  journey: CampaignJourney;
  accountEvents: AccountEvent[];
  audit: AuditEntry[];
  usageRows: UsageRow[];

  /* data — Browser Agent (Chrome Extension / Workers) */
  agents: {
    workers: BrowserWorkerInfo[];
    tasks: AgentTaskInfo[];
    events: WorkerEventInfo[];
    pairing: PairingCodeInfo[];
    supportOpen: number;
  };
  agentsPoll: ReturnType<typeof setInterval> | null;

  /* actions — auth & routing */
  hydrate: () => Promise<void>;
  navigate: (view: ViewId, params?: NavigateParams) => void;
  loginEmail: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  registerEmail: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  requestReset: (email: string) => Promise<{ ok: boolean; error?: string; devCode?: string }>;
  resetPassword: (email: string, code: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  verify2FA: (code: string) => boolean;
  cancel2FA: () => void;
  logout: () => void;
  toggleSidebar: () => void;
  switchProject: (id: string) => void;

  /* actions — فضای کاری */
  onboarded: boolean;
  loadWorkspace: (email: string) => Promise<void>;
  loadSampleData: () => void;
  resetWorkspace: () => void;

  /* actions — موتور ارسال زنده */
  startCampaign: (id: string) => void;
  tick: () => void;
  startEngine: () => void;
  _engine: ReturnType<typeof setInterval> | null;

  /* actions — accounts */
  addAccount: (acc: { platform: Platform; name: string; phone: string }) => void;
  setAccountStatus: (id: string, status: Account["status"], reason?: string) => void;
  resumeAccount: (id: string) => void;
  updateAccountLimit: (id: string, limit: number) => void;
  updateRule: (platform: Platform, patch: Partial<PlatformRule>) => void;

  /* actions — contacts */
  importContacts: (validCount: number, dupCount: number, invalidCount: number) => void;
  addContact: (input: { name: string; phone: string; city?: string; category?: string }) => void;
  applyTagToContacts: (ids: string[], tag: string) => void;
  addContactsToGroup: (groupId: string, count: number) => void;
  setContactConsent: (id: string, consent: ConsentStatus) => void;

  /* actions — campaigns */
  createCampaign: (c: Omit<Campaign, "id" | "timeline" | "createdAt">) => string;
  setCampaignStatus: (id: string, status: Campaign["status"]) => void;
  submitCampaignForApproval: (id: string) => void;
  decideCampaign: (id: string, decision: "approved" | "rejected" | "changes_requested", note?: string) => void;

  /* actions — queue */
  retryQueueItem: (id: string) => void;
  pauseQueueItems: (ids: string[]) => void;
  removeFromQueue: (ids: string[]) => void;

  /* actions — notifications & activity */
  markRead: (id: string) => void;
  markAllRead: () => void;
  addActivity: (e: Omit<ActivityEvent, "id" | "at" | "minutesAgo">) => void;
  pushNotification: (n: Omit<AppNotification, "id" | "at" | "minutesAgo" | "read">) => void;
  addAudit: (action: string, object: string, objectType: AuditEntry["objectType"]) => void;
  updateSystemUser: (id: string, patch: Partial<SystemUser>) => void;

  /* actions — inbox */
  openConversation: (id: string) => void;
  setInboxFilter: (f: InboxFilter) => void;
  sendReply: (conversationId: string, body: string, sender?: string, fromAI?: boolean) => void;
  assignConversation: (conversationId: string, to: string) => void;
  toggleImportant: (conversationId: string) => void;
  closeConversation: (conversationId: string) => void;

  /* actions — suppression & segments & templates */
  addToSuppression: (entry: { name: string; phone: string; reason: SuppressionReason; note?: string }) => void;
  removeFromSuppression: (id: string) => void;
  addSegment: (seg: { name: string; color?: string; rules: SegmentRule[]; matchCount: number }) => string;
  deleteSegment: (id: string) => void;
  addTemplate: (t: { name: string; category: MessageTemplate["category"]; body: string }) => void;
  markTemplateUsed: (id: string) => void;
  deleteTemplate: (id: string) => void;

  /* actions — journey */
  toggleJourney: () => void;
  toggleTrigger: (id: string) => void;

  /* actions — Browser Agent (Workers / Tasks / Extension) */
  refreshAgents: () => Promise<void>;
  startAgentsPoll: () => void;
  createPairing: (workerName?: string) => Promise<{ ok: boolean; code?: string; error?: string }>;
  revokeWorker: (workerId: string) => Promise<void>;
  dispatchTask: (input: {
    workerId: string;
    action: AgentAction;
    platform: Platform;
    accountId?: string;
    accountName?: string;
    target?: string;
    payload?: Record<string, unknown>;
  }, opts?: { silent?: boolean }) => Promise<{ ok: boolean; refNo?: number; error?: string }>;
  bulkTaskOp: (op: "pause" | "resume" | "cancel" | "retry", ids: string[]) => Promise<number>;
  workerOnline: (workerId: string) => Promise<void>;
  bindAccountToWorker: (accountId: string, workerId: string) => void;
  unbindAccount: (accountId: string) => void;
  createSimWorker: (name?: string) => Promise<{ ok: boolean; error?: string }>;
  toggleSimOffline: (workerId: string, durationMs?: number) => void;
  runScenario: (workerId: string, scenario: ScenarioKind) => Promise<void>;
}

const nowTime = () =>
  new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
const nowDate = () =>
  new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

/* شناسه‌های یکتا — ضدتصادم: تگ تصادفیِ هر نشست + شمارندهٔ صعودی.
   قبلاً شمارندهٔ ساده بود (x-1001، x-1015، …) که با هر رفرش صفحه از ۱۰۰۰ ریست می‌شد؛
   چون فضای کاری (اعلان‌ها، رویدادها، اکانت‌ها و…) در سرور ذخیره و در ورود بعدی بازیابی می‌شود،
   شناسه‌های تازه با شناسه‌های ذخیره‌شدهٔ نشست‌های قبل برخورد می‌کرد → خطای React:
   "Encountered two children with the same key" — مخصوصاً هنگام اتصال اکانت که چند
   رکورد (رویداد، اعلان، فعالیت) همزمان ساخته می‌شود. */
const SESSION_TAG = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
let seq = 0;
const nextId = () => `x-${SESSION_TAG}-${++seq}`;

/* حذف رکوردهای هم‌شناسهٔ برخاسته از باگ قبلیِ شناسه (ریست شدن seq با رفرش صفحه)
   — اولین رکورد نگه داشته می‌شود؛ اگر تکراری نبود همان آرایهٔ اصلی برمی‌گردد. */
function dedupeById<T>(rows: T[] | undefined): T[] | undefined {
  if (!Array.isArray(rows)) return rows;
  const seen = new Set<string>();
  let changed = false;
  const out: T[] = [];
  for (const r of rows) {
    const id = (r as { id?: unknown }).id;
    if (typeof id !== "string") { out.push(r); continue; }
    if (seen.has(id)) { changed = true; continue; }
    seen.add(id);
    out.push(r);
  }
  return changed ? out : rows;
}

const WS_VERSION = 4;
const wsKey = (email: string) => `rasaweb-ws:${email.toLowerCase()}`;

/* قفل re-entrancy موتور tick — چون tick حالا async است (dispatch واقعی) */
let _ticking = false;

/* نگارش خطای عامل (errorKind) → کلاس خطای صف برای فیلتر و Retry هوشمند */
const ERR_KIND_TO_CLASS: Record<string, ErrorClass> = {
  chat_not_found: "invalid_recipient",
  input_not_found: "temporary",
  upload_failed: "temporary",
  send_button_missing: "temporary",
  session_expired: "auth",
  auth_required: "auth",
  network: "temporary",
  unsupported_action: "temporary",
  platform_ui_changed: "temporary",
  human_action: "temporary",
};

/* فیلدهایی از state که در فضای کاری ذخیره می‌شوند */
function pickWorkspace(s: AppState) {
  return {
    accounts: s.accounts,
    contacts: s.contacts,
    campaigns: s.campaigns,
    queue: s.queue,
    activity: s.activity,
    notifications: s.notifications,
    users: s.users,
    rules: s.rules,
    pools: s.pools,
    groups: s.groups,
    conversations: s.conversations,
    suppression: s.suppression,
    segments: s.segments,
    templates: s.templates,
    projects: s.projects,
    journey: s.journey,
    accountEvents: s.accountEvents,
    audit: s.audit,
    usageRows: s.usageRows,
    activeProjectId: s.activeProjectId,
    sidebarCollapsed: s.sidebarCollapsed,
    view: s.view,
    params: s.params,
    onboarded: s.onboarded,
  };
}

const DEFAULT_USER = { name: "کاربر", role: "کاربر", email: "", roleKey: "operator" as Role };

/* فضای کاری خالی — رفتار محصول واقعی: کاربر تازه‌وارد با داده صفر شروع می‌کند */
function freshWorkspace(user: { name: string; email: string; roleKey: Role }): Partial<AppState> {
  return {
    accounts: [],
    contacts: [],
    campaigns: [],
    queue: [],
    activity: [],
    notifications: [],
    users: [{
      id: "u-self", name: user.name, email: user.email, role: user.roleKey,
      status: "active", lastLogin: "همین حالا", avatarColor: "bg-teal-600",
      canApprove: user.roleKey === "owner" || user.roleKey === "admin",
    }],
    rules: seedRules,
    pools: PLATFORMS.map((p) => ({ id: `pool-${p}`, platform: p, name: `استخر ${PLATFORM_LABEL[p]}`, accountIds: [] })),
    groups: [],
    conversations: [],
    activeConversationId: null,
    inboxFilter: "all",
    suppression: [],
    segments: [],
    templates: [],
    projects: [{ id: "prj-main", name: "فضای کاری اصلی", color: "bg-teal-600", accounts: 0, contacts: 0, activeCampaigns: 0, messagesToday: 0, issues: 0 }],
    journey: { campaignId: "", campaignName: "", enabled: false, nodes: [], edges: [], triggers: [] },
    accountEvents: [],
    audit: [],
    usageRows: [],
    onboarded: false,
    activeProjectId: "prj-main",
    view: "dashboard",
    params: {},
  };
}

/* تطبیق قوانین سگمنت — همان معناشناسی Rule Builder */
function matchSegment(seg: Segment, ct: Contact): boolean {
  return seg.rules.every((r) => {
    let actual: string | undefined;
    switch (r.field) {
      case "category": actual = ct.category; break;
      case "city": actual = ct.city; break;
      case "consent": actual = ct.consent === "allowed" ? "مجاز" : ct.consent === "unknown" ? "نامشخص" : "عدم دریافت پیام"; break;
      case "tag": actual = ct.tags.join("|"); break;
      case "source": actual = ct.source; break;
      case "replied": actual = ct.replied ? "پاسخ داده" : "پاسخ نداده"; break;
      case "lastCampaign": actual = ct.lastCampaign ?? "—"; break;
    }
    if (actual === undefined) return r.operator === "is_not";
    const hit = r.field === "tag" ? actual.split("|").includes(r.value) : actual === r.value;
    return r.operator === "is" ? hit : !hit;
  });
}

export const useApp = create<AppState>((set, get) => ({
  loggedIn: false,
  hydrated: false,
  pending2FA: false,
  twofaCode: null,
  currentUser: DEFAULT_USER,

  view: "dashboard",
  params: {},
  sidebarCollapsed: false,
  activeProjectId: "prj-rasa",

  accounts: seedAccounts,
  contacts: seedContacts,
  campaigns: seedCampaigns,
  queue: seedQueue,
  activity: seedActivity,
  notifications: seedNotifications,
  users: seedUsers,
  rules: seedRules,
  pools: seedPools,
  groups: seedGroups,

  conversations: [],
  activeConversationId: null,
  inboxFilter: "all",
  suppression: [],
  segments: [],
  templates: [],
  projects: [{ id: "prj-main", name: "فضای کاری اصلی", color: "bg-teal-600", accounts: 0, contacts: 0, activeCampaigns: 0, messagesToday: 0, issues: 0 }],
  journey: { campaignId: "", campaignName: "", enabled: false, nodes: [], edges: [], triggers: [] },
  accountEvents: [],
  audit: [],
  usageRows: [],

  agents: { workers: [], tasks: [], events: [], pairing: [], supportOpen: 0 },
  agentsPoll: null,

  onboarded: false,
  _engine: null,

  /* ── auth واقعی: نشست سمت سرور با کوکی httpOnly ── */
  hydrate: async () => {
    if (get().hydrated) return;
    try {
      window.localStorage.removeItem("rasaweb-session"); /* پاک‌سازی کلید نسخه دمو */
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const u = await res.json();
        set({ loggedIn: true, currentUser: { name: u.name, role: u.roleLabel, email: u.email, roleKey: u.roleKey } });
        await get().loadWorkspace(u.email);
        get().startEngine();
      }
    } catch {
      /* سرور در دسترس نیست */
    }
    set({ hydrated: true });
  },

  navigate: (view, params = {}) => set({ view, params }),

  loginEmail: async (email, password) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data?.error ?? "ورود ناموفق بود." };
      set({ currentUser: { name: data.name, role: ROLE_META[data.roleKey as Role]?.label ?? "کاربر", email: data.email, roleKey: data.roleKey } });
      /* اگر 2FA فعال باشد، قبل از ورود کد یک‌بارمصرف پرسیده می‌شود */
      try {
        if (window.localStorage.getItem(`rw-2fa:${data.email.toLowerCase()}`) !== "off") {
          const code = String(Math.floor(100000 + Math.random() * 900000));
          set({ pending2FA: true, twofaCode: code });
          return { ok: true };
        }
      } catch {
        /* storage نبود — 2FA نادیده گرفته می‌شود */
      }
      set({
        loggedIn: true,
        view: "dashboard",
      });
      await get().loadWorkspace(data.email);
      get().startEngine();
      get().addAudit("وارد پنل شد", "نشست کاربر", "system");
      return { ok: true };
    } catch {
      return { ok: false, error: "ارتباط با سرور برقرار نشد. اتصال خود را بررسی کنید." };
    }
  },

  registerEmail: async (name, email, password) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data?.error ?? "ثبت‌نام ناموفق بود." };
      set({
        loggedIn: true,
        view: "dashboard",
        currentUser: { name: data.name, role: ROLE_META[data.roleKey as Role]?.label ?? "کاربر", email: data.email, roleKey: data.roleKey },
      });
      get().loadWorkspace(data.email).then(() => get().startEngine());
      get().addAudit("حساب کاربری ایجاد شد و وارد پنل شد", "نشست کاربر", "system");
      return { ok: true };
    } catch {
      return { ok: false, error: "ارتباط با سرور برقرار نشد. اتصال خود را بررسی کنید." };
    }
  },

  requestReset: async (email) => {
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data?.error ?? "ارسال کد ناموفق بود." };
      return { ok: true, devCode: data?.devCode };
    } catch {
      return { ok: false, error: "ارتباط با سرور برقرار نشد." };
    }
  },

  resetPassword: async (email, code, password) => {
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data?.error ?? "بازیابی ناموفق بود." };
      return { ok: true };
    } catch {
      return { ok: false, error: "ارتباط با سرور برقرار نشد." };
    }
  },

  logout: () => {
    const eng = get()._engine;
    if (eng) clearInterval(eng);
    const poll = get().agentsPoll;
    if (poll) clearInterval(poll);
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    set({ loggedIn: false, view: "dashboard", activeConversationId: null, _engine: null, agentsPoll: null, pending2FA: false, twofaCode: null });
  },

  verify2FA: (code) => {
    const s = get();
    if (!s.pending2FA || !s.twofaCode || code.trim() !== s.twofaCode) return false;
    /* کد صحیح — ورود کامل می‌شود (کاربر از سمت سرور احراز شده است) */
    const u = s.currentUser;
    set({ loggedIn: true, pending2FA: false, twofaCode: null, view: "dashboard" });
    get().loadWorkspace(u.email).then(() => get().startEngine());
    get().addAudit("ورود موفق با 2FA", "نشست کاربر", "system");
    return true;
  },

  cancel2FA: () => set({ pending2FA: false, twofaCode: null }),

  /* ── فضای کاری: ماندگاری واقعی داده‌ها روی سرور (SQLite) به‌ازای هر کاربر ── */
  loadWorkspace: async (email) => {
    try {
      const res = await fetch("/api/workspace", { cache: "no-store" });
      if (res.ok) {
        const { data } = await res.json();
        if (data && data.v === WS_VERSION) {
          delete data.v;
          /* پاک‌سازی شناسه‌های تکراریِ به‌جامانده از نسخه‌های قبلی (باگ seq ریست‌شونده) */
          const d = data as Record<string, unknown>;
          for (const key of [
            "accounts", "contacts", "campaigns", "queue", "activity", "notifications",
            "users", "accountEvents", "audit", "groups", "templates", "segments",
            "suppression", "usageRows", "pools",
          ]) {
            d[key] = dedupeById(d[key] as { id?: unknown }[] | undefined);
          }
          if (Array.isArray(d.conversations)) {
            d.conversations = (d.conversations as { messages?: { id?: unknown }[] }[]).map((c) => ({
              ...c,
              messages: dedupeById(c.messages),
            }));
          }
          set(data as Partial<AppState>);
          return;
        }
      }
    } catch {
      /* سرور در دسترس نیست — شروع تازه */
    }
    set(freshWorkspace(get().currentUser));
  },

  loadSampleData: () => {
    set({
      accounts: seedAccounts, contacts: seedContacts, campaigns: seedCampaigns, queue: seedQueue,
      activity: seedActivity, notifications: seedNotifications, users: seedUsers, rules: seedRules,
      pools: seedPools, groups: seedGroups, conversations: seedConversations, suppression: seedSuppression,
      segments: seedSegments, templates: seedTemplates, projects: seedProjects, journey: seedJourney,
      accountEvents: seedAccountEvents, audit: seedAudit, usageRows: seedUsage,
      activeProjectId: "prj-rasa", onboarded: true,
    });
    get().addAudit("داده‌های نمونه برای تست بارگذاری شد", "فضای کاری", "system");
  },

  resetWorkspace: () => {
    set({ ...freshWorkspace(get().currentUser), onboarded: true });
    get().addAudit("فضای کاری به حالت خالی برگردانده شد", "فضای کاری", "system");
  },
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  switchProject: (id) => {
    set({ activeProjectId: id });
    const p = seedProjects.find((x) => x.id === id);
    get().addAudit(`پروژه فعال تغییر کرد به «${p?.name ?? id}»`, `پروژه ${p?.name ?? id}`, "project");
  },

  /* ── accounts ── */
  addAccount: ({ platform, name, phone }) => {
    const id = nextId();
    const acc: Account = {
      id,
      platform,
      name,
      phone,
      status: "active",
      health: 95,
      sentToday: 0,
      dailyLimit: 20,
      remaining: 20,
      lastActive: nowTime(),
      lastError: null,
      authMethod: platform === "whatsapp" ? "qr" : "phone_code",
      connectedAt: "امروز",
      poolId: `pool-${platform}`,
    };
    set((s) => ({
      accounts: [acc, ...s.accounts],
      pools: s.pools.map((p) => (p.platform === platform ? { ...p, accountIds: [...p.accountIds, id] } : p)),
      accountEvents: [
        { id: nextId(), accountId: id, type: "status_change", title: "اکانت متصل شد", detail: "احراز هویت موفق و افزودن به استخر پلتفرم", time: nowTime(), date: "امروز" },
        ...s.accountEvents,
      ],
    }));
    get().addActivity({
      type: "account_resumed",
      title: `اکانت ${name} متصل شد`,
      detail: "احراز هویت با موفقیت انجام شد و اکانت به چرخه ارسال اضافه شد",
    });
    get().pushNotification({
      type: "success",
      category: "account",
      title: `اکانت ${name} متصل شد`,
      body: "اکانت جدید فعال است و آماده دریافت کمپین می‌باشد.",
    });
    get().addAudit(`اکانت ${name} را متصل کرد`, name, "account");
  },

  setAccountStatus: (id, status, reason) =>
    set((s) => ({
      accounts: s.accounts.map((a) =>
        a.id === id
          ? {
              ...a,
              status,
              lastError: status === "active" ? null : reason ?? a.lastError,
              pausedReason: status === "limited" || status === "blocked" ? reason : undefined,
            }
          : a
      ),
    })),

  resumeAccount: (id) => {
    const acc = get().accounts.find((a) => a.id === id);
    if (!acc) return;
    get().setAccountStatus(id, "active");
    set((s) => ({
      queue: s.queue.map((q) =>
        q.accountId === acc.id && (q.status === "stopped" || q.status === "paused")
          ? { ...q, status: "queued", lastError: null }
          : q
      ),
      accountEvents: [
        { id: nextId(), accountId: id, type: "resume", title: "اکانت دوباره فعال شد", detail: "پس از تأیید سیگنال سرویس مقصد، ارسال از صف ادامه یافت", time: nowTime(), date: "امروز" },
        ...s.accountEvents,
      ],
    }));
    get().addActivity({
      type: "account_resumed",
      title: `اکانت ${acc.name} دوباره فعال شد`,
      detail: "پس از تأیید سیگنال سرویس مقصد، ارسال‌های باقی‌مانده از صف ادامه پیدا کرد",
    });
    get().pushNotification({
      type: "success",
      category: "account",
      title: `اکانت ${acc.name} دوباره فعال شد`,
      body: "پیام‌های باقی‌مانده از صف ادامه پیدا کردند.",
    });
    get().addAudit(`اکانت ${acc.name} را دوباره فعال کرد`, acc.name, "account");
  },

  updateAccountLimit: (id, limit) =>
    set((s) => ({
      accounts: s.accounts.map((a) => (a.id === id ? { ...a, dailyLimit: limit, remaining: Math.max(0, limit - a.sentToday) } : a)),
    })),

  updateRule: (platform, patch) =>
    set((s) => ({
      rules: s.rules.map((r) => (r.platform === platform ? { ...r, ...patch } : r)),
    })),

  /* ── contacts ── */
  importContacts: (validCount, dupCount, invalidCount) => {
    set((s) => {
      const newContacts: Contact[] = Array.from({ length: Math.min(validCount, 500) }, (_, i) => ({
        id: nextId() + `-${i}`,
        name: "مخاطب جدید",
        phone: `091${2 + (i % 8)}${String(1000000 + ((i * 6397 + seq * 31) % 8999999)).slice(0, 7)}`,
        channels: ["telegram", "rubika", "bale"] as Contact["channels"],
        tags: ["مخاطبان کمپین مهر"],
        city: "تهران",
        category: "عمومی",
        source: "ورود گروهی",
        addedAt: "امروز",
        consent: "unknown" as ConsentStatus,
        company: undefined,
        satisfaction: "unknown" as const,
        replied: false,
      }));
      return {
        contacts: [...newContacts, ...s.contacts],
        groups: s.groups.map((g) => (g.id === "g5" ? { ...g, count: g.count + validCount } : g)),
      };
    });
    get().addActivity({
      type: "import",
      title: `${validCount.toLocaleString("fa-IR")} شماره وارد شد`,
      detail: `${validCount.toLocaleString("fa-IR")} معتبر — ${dupCount.toLocaleString("fa-IR")} تکراری — ${invalidCount.toLocaleString("fa-IR")} نامعتبر`,
    });
    get().pushNotification({
      type: "success",
      category: "system",
      title: "ورود گروهی با موفقیت انجام شد",
      body: `${validCount.toLocaleString("fa-IR")} مخاطب معتبر به لیست «مخاطبان کمپین مهر» اضافه شد.`,
    });
    get().addAudit(
      `${validCount.toLocaleString("fa-IR")} مخاطب وارد کرد (${dupCount.toLocaleString("fa-IR")} تکراری، ${invalidCount.toLocaleString("fa-IR")} نامعتبر)`,
      "ورود گروهی مخاطبان",
      "contact"
    );
  },

  setContactConsent: (id, consent) => {
    set((s) => ({ contacts: s.contacts.map((c) => (c.id === id ? { ...c, consent } : c)) }));
    const c = seedContactsMeta(get(), id);
    get().addAudit(`وضعیت دریافت پیام «${c?.name ?? id}» به «${consentLabel(consent)}» تغییر کرد`, c?.name ?? id, "contact");
  },

  addContact: ({ name, phone, city, category }) => {
    const id = nextId();
    const contact: Contact = {
      id,
      name,
      phone,
      channels: ["telegram", "rubika", "bale"],
      tags: [],
      city: city ?? "نامشخص",
      category: category ?? "عمومی",
      source: "ورود دستی",
      addedAt: "امروز",
      consent: "unknown",
      company: undefined,
      satisfaction: "unknown",
      replied: false,
    };
    set((s) => ({ contacts: [contact, ...s.contacts] }));
    get().addActivity({
      type: "import",
      title: `مخاطب جدید «${name}» اضافه شد`,
      detail: `شماره ${phone} — ورود دستی`,
    });
    get().addAudit(`مخاطب «${name}» را به‌صورت دستی افزود`, name, "contact");
  },

  applyTagToContacts: (ids, tag) => {
    set((s) => ({
      contacts: s.contacts.map((c) => (ids.includes(c.id) && !c.tags.includes(tag) ? { ...c, tags: [...c.tags, tag] } : c)),
    }));
    get().addAudit(`برچسب «${tag}» به ${faNum(ids.length)} مخاطب اعمال کرد`, `برچسب ${tag}`, "contact");
  },

  addContactsToGroup: (groupId, count) => {
    set((s) => ({ groups: s.groups.map((g) => (g.id === groupId ? { ...g, count: g.count + count } : g)) }));
    const g = get().groups.find((x) => x.id === groupId);
    get().addAudit(`${faNum(count)} مخاطب به گروه «${g?.name ?? groupId}» اضافه کرد`, `گروه ${g?.name ?? ""}`, "contact");
  },

  /* ── campaigns ── */
  createCampaign: (c) => {
    const id = nextId();
    const campaign: Campaign = {
      ...c,
      id,
      createdAt: "امروز",
      timeline: [
        { time: nowTime(), label: "کمپین ایجاد شد", type: "info" },
        ...(c.status === "running" ? [{ time: nowTime(), label: "کمپین شروع شد", type: "start" as const }] : []),
        ...(c.status === "pending_approval" ? [{ time: nowTime(), label: `کمپین توسط ${c.requestedBy ?? "کاربر"} برای تأیید ارسال شد`, type: "info" as const }] : []),
      ],
    };
    set((s) => ({ campaigns: [campaign, ...s.campaigns] }));
    get().addActivity({
      type: "campaign_started",
      title: c.status === "running" ? `کمپین «${c.name}» شروع شد` : c.status === "pending_approval" ? `کمپین «${c.name}» برای تأیید ارسال شد` : `کمپین «${c.name}» ایجاد شد`,
      detail: `${c.audienceCount.toLocaleString("fa-IR")} مخاطب — ${c.platforms.length} پلتفرم`,
    });
    if (c.status === "pending_approval") {
      get().pushNotification({
        type: "warning",
        category: "campaign",
        title: `کمپین «${c.name}» منتظر تأیید است`,
        body: `${c.audienceCount.toLocaleString("fa-IR")} مخاطب — ${c.platforms.length} پلتفرم — بازه ${c.startAt} تا ${c.endAt}`,
      });
    }
    get().addAudit(
      c.status === "running" ? `کمپین «${c.name}» را ایجاد و شروع کرد` : c.status === "pending_approval" ? `کمپین «${c.name}» را برای تأیید ارسال کرد` : `کمپین «${c.name}» را ایجاد کرد`,
      `کمپین ${c.name}`,
      "campaign"
    );
    return id;
  },

  setCampaignStatus: (id, status) => {
    const c = get().campaigns.find((x) => x.id === id);
    set((s) => ({
      campaigns: s.campaigns.map((x) => (x.id === id ? { ...x, status } : x)),
    }));
    if (c) get().addAudit(`وضعیت کمپین «${c.name}» تغییر کرد`, `کمپین ${c.name}`, "campaign");
  },

  submitCampaignForApproval: (id) => {
    const c = get().campaigns.find((x) => x.id === id);
    if (!c) return;
    set((s) => ({
      campaigns: s.campaigns.map((x) =>
        x.id === id
          ? { ...x, status: "pending_approval" as const, requestedBy: get().currentUser.name, timeline: [...x.timeline, { time: nowTime(), label: `کمپین توسط ${get().currentUser.name} برای تأیید ارسال شد`, type: "info" as const }] }
          : x
      ),
    }));
    get().pushNotification({
      type: "warning",
      category: "campaign",
      title: `کمپین «${c.name}» منتظر تأیید است`,
      body: `${get().currentUser.name} کمپین را برای تأیید ارسال کرد.`,
    });
    get().addAudit(`کمپین «${c.name}» را برای تأیید ارسال کرد`, `کمپین ${c.name}`, "campaign");
  },

  decideCampaign: (id, decision, note) => {
    const c = get().campaigns.find((x) => x.id === id);
    if (!c) return;
    const user = get().currentUser;
    const statusMap = { approved: "approved", rejected: "rejected", changes_requested: "changes_requested" } as const;
    const labelMap = { approved: "تأیید کرد", rejected: "رد کرد", changes_requested: "درخواست اصلاح داد" } as const;
    set((s) => ({
      campaigns: s.campaigns.map((x) =>
        x.id === id
          ? { ...x, status: statusMap[decision], reviewNote: note, timeline: [...x.timeline, { time: nowTime(), label: `${user.name} کمپین را ${labelMap[decision]}${note ? ` — ${note}` : ""}`, type: decision === "approved" ? ("resume" as const) : decision === "rejected" ? ("warning" as const) : ("info" as const) }] }
          : x
      ),
    }));
    get().pushNotification({
      type: decision === "approved" ? "success" : decision === "rejected" ? "error" : "warning",
      category: "campaign",
      title: decision === "approved" ? `کمپین «${c.name}» تأیید شد` : decision === "rejected" ? `کمپین «${c.name}» رد شد` : `درخواست اصلاح برای «${c.name}»`,
      body: decision === "changes_requested" && note ? note : `${user.name} این کمپین را ${labelMap[decision]}.`,
    });
    get().addAudit(`کمپین «${c.name}» را ${labelMap[decision]}`, `کمپین ${c.name}`, "campaign");
  },

  /* ── queue ── */
  retryQueueItem: (id) =>
    set((s) => ({
      queue: s.queue.map((q) => (q.id === id ? { ...q, status: "queued", attempts: q.attempts + 1, lastError: null, errorClass: undefined, agentRef: undefined } : q)),
    })),

  pauseQueueItems: (ids) =>
    set((s) => ({ queue: s.queue.map((q) => (ids.includes(q.id) ? { ...q, status: "paused" } : q)) })),

  removeFromQueue: (ids) =>
    set((s) => ({ queue: s.queue.filter((q) => !ids.includes(q.id)) })),

  /* ── notifications & activity & audit ── */
  markRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
  markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

  addActivity: (e) =>
    set((s) => ({
      activity: [{ id: nextId(), type: e.type, title: e.title, detail: e.detail, at: nowTime(), minutesAgo: 0 }, ...s.activity],
    })),

  pushNotification: (n) =>
    set((s) => ({
      notifications: [{ id: nextId(), type: n.type, category: n.category, title: n.title, body: n.body, at: nowTime(), minutesAgo: 0, read: false }, ...s.notifications],
    })),

  addAudit: (action, object, objectType) =>
    set((s) => {
      const u = s.currentUser;
      return {
        audit: [
          { id: nextId(), user: u.name, role: u.role, action, object, objectType, projectName: s.projects.find((p) => p.id === s.activeProjectId)?.name ?? "RasaWeb", date: nowDate(), time: nowTime() },
          ...s.audit,
        ],
      };
    }),

  updateSystemUser: (id, patch) => {
    const u = get().users.find((x) => x.id === id);
    set((s) => ({ users: s.users.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
    if (u) get().addAudit(`اطلاعات کاربر «${patch.name ?? u.name}» را ویرایش کرد`, `کاربر ${patch.name ?? u.name}`, "settings");
  },

  /* ── inbox ── */
  openConversation: (id) =>
    set((s) => ({
      activeConversationId: id,
      conversations: s.conversations.map((c) => (c.id === id ? { ...c, unread: 0 } : c)),
    })),

  setInboxFilter: (f) => set({ inboxFilter: f }),

  sendReply: (conversationId, body, sender, fromAI) => {
    const user = get().currentUser;
    const msg: InboxMessage = {
      id: nextId(),
      conversationId,
      direction: "out",
      sender: sender ?? user.name,
      body: fromAI ? `〔پیشنهاد AI〕 ${body}` : body,
      at: nowTime(),
      date: "امروز",
      status: "sending",
      fromAI: !!fromAI,
    };
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, msg], lastMessage: body, lastAt: msg.at, minutesAgo: 0, replied: true }
          : c
      ),
    }));
    /* شبیه‌سازی تحویل پس از ۱.۲ ثانیه */
    setTimeout(() => {
      set((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, messages: c.messages.map((m) => (m.id === msg.id ? { ...m, status: "delivered" as const } : m)) }
            : c
        ),
      }));
    }, 1200);
    get().addAudit(`به گفتگوی «${get().conversations.find((c) => c.id === conversationId)?.contactName}» پاسخ داد`, "صندوق ورودی", "contact");
  },

  assignConversation: (conversationId, to) => {
    const c = get().conversations.find((x) => x.id === conversationId);
    set((s) => ({
      conversations: s.conversations.map((x) => (x.id === conversationId ? { ...x, assignedTo: to } : x)),
    }));
    get().pushNotification({
      type: "info",
      category: "messages",
      title: `گفتگو به ${to} اختصاص یافت`,
      body: c ? `گفتگوی «${c.contactName} — ${c.platform}» به ${to} اختصاص یافت.` : "گفتگو اختصاص یافت.",
    });
    get().addAudit(`گفتگوی «${c?.contactName ?? conversationId}» را به ${to} اختصاص داد`, `گفتگوی ${c?.contactName ?? ""}`, "contact");
  },

  toggleImportant: (conversationId) =>
    set((s) => ({
      conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, isImportant: !c.isImportant } : c)),
    })),

  closeConversation: (conversationId) =>
    set((s) => ({
      conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, state: "resolved" } : c)),
    })),

  /* ── suppression / segments / templates ── */
  addToSuppression: ({ name, phone, reason, note }) => {
    const entry: SuppressionEntry = {
      id: nextId(),
      name,
      phone,
      reason,
      note,
      addedBy: get().currentUser.name,
      addedAt: `امروز ${nowTime()}`,
      source: "manual",
    };
    set((s) => ({ suppression: [entry, ...s.suppression] }));
    get().addAudit(`«${name}» را به لیست عدم ارسال افزود`, name, "contact");
    get().pushNotification({
      type: "info",
      category: "system",
      title: "به لیست عدم ارسال اضافه شد",
      body: `${name} (${phone}) از تمام ارسال‌های کمپین مستثنی شد.`,
    });
  },

  removeFromSuppression: (id) => {
    const e = get().suppression.find((x) => x.id === id);
    set((s) => ({ suppression: s.suppression.filter((x) => x.id !== id) }));
    if (e) get().addAudit(`«${e.name}» را از لیست عدم ارسال حذف کرد`, e.name, "contact");
  },

  addSegment: ({ name, color, rules, matchCount }) => {
    const id = nextId();
    set((s) => ({
      segments: [...s.segments, { id, name, color: color ?? "bg-teal-500", rules, matchCount, createdAt: "امروز" }],
    }));
    get().addAudit(`سگمنت «${name}» را ایجاد کرد (${matchCount.toLocaleString("fa-IR")} مخاطب)`, `سگمنت ${name}`, "segment");
    return id;
  },

  deleteSegment: (id) => {
    const seg = get().segments.find((x) => x.id === id);
    set((s) => ({ segments: s.segments.filter((x) => x.id !== id) }));
    if (seg) get().addAudit(`سگمنت «${seg.name}» را حذف کرد`, `سگمنت ${seg.name}`, "segment");
  },

  addTemplate: ({ name, category, body }) => {
    set((s) => ({
      templates: [{ id: nextId(), name, category, body, uses: 0 }, ...s.templates],
    }));
    get().addAudit(`قالب «${name}» را ذخیره کرد`, `قالب ${name}`, "template");
  },

  markTemplateUsed: (id) =>
    set((s) => ({
      templates: s.templates.map((t) => (t.id === id ? { ...t, uses: t.uses + 1, lastUsed: "امروز" } : t)),
    })),

  deleteTemplate: (id) => {
    const t = get().templates.find((x) => x.id === id);
    set((s) => ({ templates: s.templates.filter((x) => x.id !== id) }));
    if (t) get().addAudit(`قالب «${t.name}» را حذف کرد`, `قالب ${t.name}`, "template");
  },

  /* ── journey ── */
  toggleJourney: () =>
    set((s) => ({ journey: { ...s.journey, enabled: !s.journey.enabled } })),

  toggleTrigger: (id) =>
    set((s) => ({
      journey: { ...s.journey, triggers: s.journey.triggers.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)) },
    })),

  /* ═════════ موتور ارسال زنده — اجرای واقعی کمپین روی صف ═════════ */

  startCampaign: (id) => {
    const s = get();
    const camp = s.campaigns.find((c) => c.id === id);
    if (!camp) return;

    /* ۱) مخاطبان هدف: سگمنت انتخابی یا کل مخاطبان */
    let audience = s.contacts;
    if (camp.segmentId) {
      const seg = s.segments.find((x) => x.id === camp.segmentId);
      if (seg) audience = audience.filter((ct) => matchSegment(seg, ct));
    }

    /* ۲) فیلتر اجباری پیش از ورود به صف: لیست عدم ارسال + رضایت دریافت */
    const supp = new Set(s.suppression.map((e) => e.phone));
    const eligible = audience.filter((ct) => !supp.has(ct.phone) && ct.consent !== "opted_out");
    const suppressed = audience.length - eligible.length;

    /* ۳) اکانت‌های قابل ارسال: فعال با ظرفیت + متصل به Worker «آنلاین»
       ارسال واقعی فقط از مسیر عامل مرورگر انجام می‌شود — بدون Worker، نتیجه تقلبی ساخته نمی‌شود */
    const usable = s.accounts.filter((a) => camp.platforms.includes(a.platform) && a.status === "active" && a.remaining > 0);
    const onlineWorkerIds = new Set(s.agents.workers.filter((w) => w.status === "online").map((w) => w.id));
    const sendable = usable.filter((a) => a.workerId && onlineWorkerIds.has(a.workerId));
    if (!eligible.length || !sendable.length) {
      const msg = !eligible.length
        ? "هیچ مخاطب واجد شرایطی (بدون عدم ارسال و با رضایت) یافت نشد. ابتدا مخاطب وارد کنید."
        : !usable.length
          ? "هیچ اکانت فعالی با ظرفیت باقی‌مانده در پلتفرم‌های این کمپین وجود ندارد. ابتدا اکانت متصل کنید."
          : "ارسال واقعی فقط توسط عامل مرورگر (Worker) انجام می‌شود و هیچ اکانتی به Worker آنلاین متصل نیست. در «Browser Workers» اکانت‌ها را به Worker متصل کنید.";
      get().pushNotification({
        type: "error",
        category: "campaign",
        title: `اجرای کمپین «${camp.name}» ممکن نیست`,
        body: msg,
      });
      toast.error(`اجرای کمپین «${camp.name}» ممکن نیست`, { description: msg });
      return;
    }
    const skippedNoWorker = usable.length - sendable.length;

    /* ۴) ساخت صف واقعی — توزیع کم‌بار (Least-loaded) روی اکانت‌های متصل به Worker آنلاین */
    const CAP = 240;
    const working = sendable.map((a) => ({ ...a }));
    const items: QueueItem[] = [];
    for (const ct of eligible) {
      if (items.length >= CAP) break;
      const preferred = camp.platforms.filter((p) => ct.channels.includes(p));
      const plats = preferred.length ? preferred : camp.platforms;
      let best: (typeof working)[number] | null = null;
      for (const p of plats) {
        for (const a of working) {
          if (a.platform === p && a.remaining > 0 && (!best || a.remaining > best.remaining)) best = a;
        }
      }
      if (!best) break;
      best.remaining -= 1;
      best.sentToday += 1;
      items.push({
        id: nextId(),
        campaignId: camp.id,
        campaignName: camp.name,
        contactName: ct.name,
        phone: ct.phone,
        platform: best.platform,
        accountId: best.id,
        accountName: best.name,
        status: "queued",
        scheduledAt: nowTime(),
        attempts: 0,
        lastError: null,
      });
    }

    const accountsUpdated = s.accounts.map((a) => {
      const w = working.find((x) => x.id === a.id);
      return w ? { ...a, sentToday: w.sentToday, remaining: w.remaining } : a;
    });

    set((st) => ({
      accounts: accountsUpdated,
      queue: [...items, ...st.queue],
      campaigns: st.campaigns.map((c) =>
        c.id !== id
          ? c
          : {
              ...c,
              status: "running" as const,
              plannedCount: items.length,
              queuedCount: items.length,
              sentCount: 0,
              successCount: 0,
              failedCount: 0,
              stoppedCount: 0,
              suppressedCount: suppressed,
              timeline: [
                ...c.timeline,
                { time: nowTime(), label: `${faNum(items.length)} پیام در صف ارسال قرار گرفت`, type: "info" as const },
                ...(suppressed ? [{ time: nowTime(), label: `${faNum(suppressed)} مخاطب به‌دلیل لیست عدم ارسال یا عدم رضایت از صف خارج شد`, type: "warning" as const }] : []),
                { time: nowTime(), label: "کمپین شروع شد", type: "start" as const },
              ],
            }
      ),
    }));
    get().addActivity({
      type: "campaign_started",
      title: `کمپین «${camp.name}» شروع شد`,
      detail: `${faNum(items.length)} پیام در صف — ${faNum(sendable.length)} اکانت متصل به Worker آنلاین در چرخه ارسال واقعی`,
    });
    get().pushNotification({
      type: "success",
      category: "campaign",
      title: `کمپین «${camp.name}» شروع شد`,
      body: `${faNum(items.length)} پیام به صف ارسال اضافه شد و به‌تدریج توسط عامل مرورگر ارسال واقعی می‌شود.`,
    });
    toast.success(`کمپین «${camp.name}» شروع شد`, { description: `${faNum(items.length)} پیام در صف — ارسال واقعی توسط عامل مرورگر انجام می‌شود` });
    if (skippedNoWorker > 0) {
      get().pushNotification({
        type: "warning",
        category: "campaign",
        title: `${faNum(skippedNoWorker)} اکانت در چرخه ارسال واقعی نیست`,
        body: "این اکانت‌ها به Worker آنلاین متصل نیستند؛ پیام‌هایشان در صف می‌ماند تا Worker متصل شود — هیچ نتیجه تقلبی تولید نمی‌شود.",
      });
      toast.warning(`${faNum(skippedNoWorker)} اکانت در چرخه ارسال واقعی نیست`, { description: "به Worker آنلاین متصل نیستند — پیام‌هایشان در صف می‌ماند" });
    }
    get().addAudit(`کمپین «${camp.name}» را اجرا کرد (${faNum(items.length)} پیام در صف روی ${faNum(sendable.length)} اکانت متصل به Worker)`, `کمپین ${camp.name}`, "campaign");
  },

  /* ── موتور ارسال زنده + پایش زنده Workerها ──
     صداقت خط‌لوله: نتیجه «sent» فقط از اجرای واقعی عامل مرورگر می‌آید.
     هیچ نتیجه‌ای تولید/شبیه‌سازی نمی‌شود — بدون Worker آنلاین، آیتم در صف می‌ماند. */
  startEngine: () => {
    if (get()._engine) return;
    const t = setInterval(() => get().tick(), 2200);
    set({ _engine: t });
    get().startAgentsPoll();
    restoreSimWorkers(); /* شبیه‌سازهای فعال بعد از رفرش دوباره بالا می‌آیند */
  },

  tick: async () => {
    if (_ticking) return;
    _ticking = true;
    try {
    const s = get();
    if (!s.loggedIn) return;

    const running = s.campaigns.filter((c) => c.status === "running");
    const hasWork = running.length > 0 || s.queue.some((q) => q.status === "sending");

    if (hasWork) {
      /* سرعت صف از قوانین پلتفرم خوانده می‌شود — قابل تنظیم، بدون مقدار هاردکد */
      const speedOf: Record<string, number> = {};
      s.rules.forEach((r) => {
        speedOf[r.platform] = r.queueSpeed === "fast" ? 6 : r.queueSpeed === "slow" ? 2 : 4;
      });

      let queue = [...s.queue];
      let accounts = [...s.accounts];
      const notifications: Omit<AppNotification, "id" | "at" | "minutesAgo" | "read">[] = [];
      const activities: { type: ActivityType; title: string; detail: string }[] = [];
      let accountEvents = [...s.accountEvents];
      let campaigns = [...s.campaigns];

      for (const camp of running) {
        /* ۱) نتیجه واقعی — فقط از وظایف عامل مرورگر؛ هیچ نتیجه‌ای تولید/شبیه‌سازی نمی‌شود */
        queue = queue.map((q) => {
          if (q.campaignId !== camp.id || !q.agentRef || (q.status !== "sending" && q.status !== "paused")) return q;
          const task = s.agents.tasks.find((t) => t.refNo === q.agentRef);
          if (!task) return q;
          if (task.status === "success") return { ...q, status: "sent" as const, lastError: null };
          if (task.status === "failed") {
            return {
              ...q,
              status: "failed" as const,
              attempts: q.attempts + 1,
              lastError: task.error || "اجرای وظیفه توسط عامل مرورگر ناموفق بود",
              errorClass: ERR_KIND_TO_CLASS[task.errorKind] ?? ("temporary" as const),
            };
          }
          if (task.status === "canceled") return { ...q, status: "stopped" as const, lastError: "وظیفه عامل لغو شد", errorClass: "temporary" as const };
          return q; /* received/running/verifying/paused/human_action — هنوز در جریان است */
        });

        /* ۲) برداشتن آیتم از صف = ارسال واقعی به Worker آنلاینِ متصل به اکانت
           بدون Worker آنلاین، آیتم در صف می‌ماند — هیچ «ارسال‌شده» تقلبی ساخته نمی‌شود */
        const take = Math.max(...camp.platforms.map((p) => speedOf[p] ?? 3));
        let picked = 0;
        for (const q of [...queue]) {
          if (picked >= take) break;
          if (q.campaignId !== camp.id || q.status !== "queued") continue;
          const acc = accounts.find((a) => a.id === q.accountId);
          if (!acc || acc.status !== "active" || acc.remaining <= 0) continue;
          /* اگر وظیفه قبلی عامل هنوز زنده است، دوباره ارسال نکن — پیام تکراری می‌شود */
          if (q.agentRef) {
            const t = s.agents.tasks.find((x) => x.refNo === q.agentRef);
            if (t && !["success", "failed", "canceled"].includes(t.status)) {
              const idxAdopt = queue.findIndex((x) => x.id === q.id);
              queue[idxAdopt] = { ...queue[idxAdopt], status: "sending" as const };
              continue;
            }
            const idxClear = queue.findIndex((x) => x.id === q.id);
            queue[idxClear] = { ...queue[idxClear], agentRef: undefined };
          }
          /* ارسال واقعی فقط از مسیر عامل مرورگر: اکانت باید به Worker آنلاین متصل باشد */
          const worker = acc.workerId ? s.agents.workers.find((w) => w.id === acc.workerId) : null;
          if (!worker || worker.status !== "online") continue; /* در انتظار Worker آنلاین */
          const inFlight = queue.filter((x) => x.accountId === acc.id && x.status === "sending").length;
          if (inFlight >= 2) continue; /* حداکثر ۲ وظیفه هم‌زمان روی هر Worker */
          picked++;
          const disp = await get().dispatchTask(
            {
              workerId: acc.workerId!,
              action: "SEND_TEXT",
              platform: q.platform,
              accountId: acc.id,
              accountName: acc.name,
              target: q.contactName,
              /* § Contact Resolution — شماره کلید پایدار است: عامل با شماره جستجو می‌کند
                 (ذخیره‌بودن در مخاطبینِ گوشی لازم نیست) و displayName فقط برای تطبیق
                 هویت مقصد استفاده می‌شود، نه جستجو */
              payload: { text: camp.message, phone: q.phone, displayName: q.contactName },
            },
            { silent: true }
          );
          const idx = queue.findIndex((x) => x.id === q.id);
          if (disp.ok && disp.refNo) {
            /* ظرفیت در زمان ساخت صف رزرو شده — اینجا فقط dispatch واقعی ثبت می‌شود */
            queue[idx] = { ...queue[idx], status: "sending" as const, agentRef: disp.refNo };
            accounts = accounts.map((a) => (a.id === acc.id ? { ...a, lastActive: nowTime() } : a));
          } else {
            queue[idx] = {
              ...queue[idx],
              status: "failed" as const,
              attempts: queue[idx].attempts + 1,
              lastError: disp.error || "ارسال وظیفه به عامل مرورگر ناموفق بود",
              errorClass: "temporary" as const,
            };
          }
        }

        /* ۳) شمارنده‌های کمپین و تشخیص تکمیل — فقط از نتایج واقعی عامل */
        const items = queue.filter((q) => q.campaignId === camp.id);
        const sent = items.filter((q) => q.status === "sent").length;
        const failed = items.filter((q) => q.status === "failed").length;
        const done = sent + failed;
        const finished = items.length > 0 && done >= items.length;
        if (sent !== camp.successCount || failed !== camp.failedCount || finished) {
          campaigns = campaigns.map((c) =>
            c.id !== camp.id
              ? c
              : {
                  ...c,
                  sentCount: done,
                  successCount: sent,
                  failedCount: failed,
                  status: finished ? ("completed" as const) : c.status,
                  timeline: finished ? [...c.timeline, { time: nowTime(), label: `کمپین تکمیل شد — ${faNum(sent)} موفق، ${faNum(failed)} ناموفق`, type: "end" as const }] : c.timeline,
                }
          );
        }
        if (finished) {
          notifications.push({
            type: "success",
            category: "campaign",
            title: `کمپین «${camp.name}» تکمیل شد`,
            body: `${faNum(sent)} پیام موفق و ${faNum(failed)} پیام ناموفق از مجموع ${faNum(items.length)} پیام.`,
          });
          activities.push({
            type: "campaign_started",
            title: `کمپین «${camp.name}» تکمیل شد`,
            detail: `${faNum(sent)} موفق، ${faNum(failed)} ناموفق`,
          });
        }
      }

      set({
        queue,
        accounts,
        campaigns,
        accountEvents,
        notifications: notifications.length ? [...notifications.map((n) => ({ ...n, id: nextId(), at: nowTime(), minutesAgo: 0, read: false })), ...s.notifications] : s.notifications,
        activity: activities.length ? [...activities.map((a) => ({ ...a, id: nextId(), at: nowTime(), minutesAgo: 0 })), ...s.activity] : s.activity,
      });
    }

    /* ۵) شبیه‌سازی پیام ورودی — تا فلوی Inbox هم زنده و قابل تست باشد */
    if (Math.random() < 0.12) {
      const candidates = get().conversations.filter((c) => c.replySupported && c.state !== "resolved");
      if (candidates.length) {
        const conv = candidates[Math.floor(Math.random() * candidates.length)];
        const texts = [
          "سلام، ممنون از پیام‌تون. می‌شه بیشتر توضیح بدید؟",
          "قیمت‌ها رو می‌شه بفرستید؟",
          "وقت دارید برای جلسه این هفته؟",
          "این پیشنهاد برای کسب‌وکار ما مناسب هست؟",
          "نمونه کارها رو کجا می‌تونم ببینم؟",
          "دریافت شد، مرسی 🙏",
          "فقط یک سؤال: پشتیبانی بعد از تحویل چطوریه؟",
        ];
        const body = texts[Math.floor(Math.random() * texts.length)];
        const msg: InboxMessage = {
          id: nextId(),
          conversationId: conv.id,
          direction: "in",
          sender: conv.contactName,
          body,
          at: nowTime(),
          date: "امروز",
          status: "received",
        };
        set((st) => ({
          conversations: st.conversations.map((c) =>
            c.id === conv.id
              ? { ...c, messages: [...c.messages, msg], lastMessage: body, lastAt: msg.at, minutesAgo: 0, unread: c.unread + 1, replied: false, state: "pending" as const }
              : c
          ),
        }));
      }
    }
    } finally {
      _ticking = false;
    }
  },

  /* ═════════ Browser Agent — Workers / Tasks / Extension ═════════ */

  refreshAgents: async () => {
    if (!get().loggedIn) return;
    try {
      const res = await fetch("/api/panel/agents", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      set({
        agents: {
          workers: data.workers ?? [],
          tasks: data.tasks ?? [],
          events: data.events ?? [],
          pairing: data.pairing ?? [],
          supportOpen: data.supportOpen ?? 0,
        },
      });
    } catch {
      /* سرور در دسترس نیست */
    }
  },

  startAgentsPoll: () => {
    if (get().agentsPoll) return;
    get().refreshAgents();
    const t = setInterval(() => get().refreshAgents(), 3000);
    set({ agentsPoll: t });
  },

  createPairing: async (workerName) => {
    try {
      const res = await fetch("/api/panel/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "new-pairing", workerName }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data?.error ?? "صدور کد ناموفق بود." };
      get().refreshAgents();
      get().addAudit(`کد جفت‌سازی ${data.code} برای افزونه صادر کرد`, "Browser Worker", "system");
      return { ok: true, code: data.code };
    } catch {
      return { ok: false, error: "ارتباط با سرور برقرار نشد." };
    }
  },

  revokeWorker: async (workerId) => {
    try {
      const w = get().agents.workers.find((x) => x.id === workerId);
      stopSimWorkerPersisted(workerId);
      await fetch(`/api/panel/agents?workerId=${encodeURIComponent(workerId)}`, { method: "DELETE" });
      await get().refreshAgents();
      get().addAudit(`Worker ${w ? `#${faNum(String(w.workerNo).padStart(3, "0"))}` : ""} را ابطال کرد`, "Browser Worker", "system");
    } catch {
      /* تلاش بعدی */
    }
  },

  dispatchTask: async (input, opts) => {
    try {
      const res = await fetch("/api/panel/agents/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data?.error ?? "ایجاد وظیفه ناموفق بود." };
      if (!opts?.silent) {
        await get().refreshAgents();
        get().addAudit(`دستور ${input.action} را برای Worker ارسال کرد (TASK-${faNum(data.refNo)})`, "Agent Task", "system");
      }
      return { ok: true, refNo: data.refNo };
    } catch {
      return { ok: false, error: "ارتباط با سرور برقرار نشد." };
    }
  },

  bulkTaskOp: async (op, ids) => {
    try {
      const res = await fetch("/api/panel/agents/task", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op, ids }),
      });
      const data = await res.json();
      await get().refreshAgents();
      return data?.changed ?? 0;
    } catch {
      return 0;
    }
  },

  workerOnline: async (workerId) => {
    try {
      await fetch("/api/panel/agents/task", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "worker-online", workerId }),
      });
      await get().refreshAgents();
    } catch {
      /* تلاش بعدی */
    }
  },

  bindAccountToWorker: (accountId, workerId) => {
    const w = get().agents.workers.find((x) => x.id === workerId);
    if (!w) return;
    set((s) => ({
      accounts: s.accounts.map((a) =>
        a.id === accountId
          ? { ...a, workerId, workerNo: w.workerNo, profileLabel: w.profileLabel || `Profile-${w.workerNo + 1}`, tabId: `${w.workerNo}-${a.id}` }
          : a
      ),
    }));
    get().addAudit(`اکانت را به Worker #${faNum(String(w.workerNo).padStart(3, "0"))} متصل کرد`, get().accounts.find((a) => a.id === accountId)?.name ?? "اکانت", "account");
  },

  unbindAccount: (accountId) => {
    set((s) => ({
      accounts: s.accounts.map((a) => (a.id === accountId ? { ...a, workerId: null, workerNo: null, profileLabel: null, tabId: null } : a)),
    }));
    get().addAudit("اتصال اکانت به Worker حذف شد", get().accounts.find((a) => a.id === accountId)?.name ?? "اکانت", "account");
  },

  createSimWorker: async (name) => {
    /* ساخت Worker شبیه‌ساز: کد جفت‌سازی → جفت‌سازی با API واقعی → اجرای حلقه sync */
    try {
      const pairing = await get().createPairing(name ?? "Worker شبیه‌ساز");
      if (!pairing.ok || !pairing.code) return { ok: false, error: pairing.error ?? "صدور کد ناموفق بود" };

      const platforms = Array.from(new Set(get().accounts.filter((a) => a.status === "active").map((a) => a.platform))).slice(0, 5);
      const res = await fetch("/api/agent/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: pairing.code,
          device: { chrome: "Chrome ۱۳۱", ext: "1.0.0", profile: "Simulator", simulated: true },
        }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data?.error ?? "جفت‌سازی ناموفق بود" };

      startSimWorkerPersisted({ workerId: data.workerId, token: data.token, platforms: platforms.length ? platforms : ["telegram", "whatsapp", "rubika"] });
      await get().refreshAgents();
      get().pushNotification({
        type: "success",
        category: "system",
        title: `Worker #${faNum(String(data.workerNo).padStart(3, "0"))} متصل شد`,
        body: "Worker شبیه‌ساز از طریق API واقعی افزونه متصل شد و آماده دریافت وظایف است.",
      });
      return { ok: true };
    } catch {
      return { ok: false, error: "ارتباط با سرور برقرار نشد." };
    }
  },

  toggleSimOffline: (workerId, durationMs = 70000) => {
    setSimOffline(workerId, durationMs);
    get().pushNotification({
      type: "warning",
      category: "system",
      title: "اتصال Worker قطع شد",
      body: "Heartbeat متوقف شد — در پنل Offline نمایش داده می‌شود و پس از اتصال مجدد، Sync انجام می‌گردد.",
    });
  },

  runScenario: async (workerId, scenario) => {
    /* سناریوهای A تا M — هر سناریو یک وظیفه واقعی در همان خط‌لوله اجرا می‌کند */
    const w = get().agents.workers.find((x) => x.id === workerId);
    if (!w) return;
    const platformOf: Record<ScenarioKind, Platform> = {
      chat_private: "telegram", chat_group: "telegram", send_text: "telegram",
      send_image: "whatsapp", send_file: "whatsapp", send_image_caption: "whatsapp",
      create_group: "telegram", session_expired: "rubika", ui_changed: "rubika",
      human_action: "telegram", worker_offline: "bale", task_failed: "telegram", task_success: "telegram",
    };
    const actionOf = (sc: ScenarioKind): AgentAction => {
      switch (sc) {
        case "chat_private": case "chat_group": return "READ_CHAT_CONTEXT";
        case "send_image": return "SEND_IMAGE";
        case "send_file": return "SEND_FILE";
        case "send_image_caption": return "SEND_IMAGE_WITH_CAPTION";
        case "create_group": return "CREATE_GROUP";
        default: return "SEND_TEXT";
      }
    };
    const payloadFor = (sc: ScenarioKind): Record<string, unknown> => {
      switch (sc) {
        case "chat_private": case "chat_group": return { scenario: sc };
        case "send_text": case "task_failed": case "task_success": case "session_expired": case "ui_changed": case "human_action":
          return { scenario: sc === "task_success" ? "send_text" : sc, text: "سلام، وقت بخیر! این پیام از طریق عامل مرورگر ارسال می‌شود." };
        case "send_image": return { scenario: sc, image: "product-photo.jpg" };
        case "send_file": return { scenario: sc, file: "catalog-1404.pdf" };
        case "send_image_caption": return { scenario: sc, image: "offer-banner.jpg", caption: "پیشنهاد ویژه این هفته — تا ۳۰٪ تخفیف" };
        case "create_group": return { scenario: sc, groupName: "گروه پشتیبانی مشتریان", members: ["علی رضایی", "سارا محمدی", "مهدی نوری"] };
        default: return {};
      }
    };

    /* سناریوی K: قطع Heartbeat به‌جای ارسال وظیفه — بیشتر از پنجره Online (۴۵ ثانیه) */
    if (scenario === "worker_offline") {
      get().toggleSimOffline(workerId, 70000);
      await get().dispatchTask({ workerId, action: "SEND_TEXT", platform: "bale", target: "علی رضایی", payload: { text: "پیام آزمایشی هنگام قطعی" } });
      return;
    }

    const accounts = get().accounts.filter((a) => a.platform === platformOf[scenario] && a.status === "active");
    const acc = accounts[0];
    await get().dispatchTask({
      workerId,
      action: actionOf(scenario),
      platform: platformOf[scenario],
      accountId: acc?.id ?? "",
      accountName: acc?.name ?? "",
      target: scenario === "create_group" ? "" : "علی رضایی",
      payload: payloadFor(scenario),
    });
  },
}));

/* helpers */
function seedContactsMeta(state: AppState, id: string): Contact | undefined {
  return state.contacts.find((c) => c.id === id);
}
function consentLabel(c: ConsentStatus): string {
  return c === "allowed" ? "مجاز" : c === "unknown" ? "نامشخص" : "عدم دریافت پیام";
}

/* ═════════ ماندگاری واقعی فضای کاری روی سرور ═════════
   هر تغییر با تاخیر ۲.۵ ثانیه به /api/workspace ذخیره می‌شود تا پس از
   رفرش، خروج/ورود یا تغییر مرورگر، داده‌های همان کاربر باقی بماند.
   اگر payload تغییر نکرده باشد، نوشتن تکرار نمی‌شود. */
if (typeof window !== "undefined") {
  let wsSaveTimer: ReturnType<typeof setTimeout> | null = null;
  let lastSaved = "";
  let saving = false;
  let rerunNeeded = false;

  const doWsSave = async () => {
    wsSaveTimer = null;
    const s = useApp.getState();
    if (!s.loggedIn || !s.currentUser.email) return;
    if (saving) {
      rerunNeeded = true;
      return;
    }
    try {
      const body = JSON.stringify({ v: WS_VERSION, ...pickWorkspace(s) });
      if (body === lastSaved) return;
      saving = true;
      const res = await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (res.ok) {
        lastSaved = body;
        /* mirror کوچک در localStorage برای شروع سریع پیش از fetch */
        try {
          if (body.length < 1_500_000) window.localStorage.setItem(wsKey(s.currentUser.email), body);
        } catch {
          /* سهمی پر — بی‌اهمیت، منبع اصلی سرور است */
        }
      }
    } catch {
      /* شبکه قطع — تلاش بعدی */
    } finally {
      saving = false;
      if (rerunNeeded) {
        rerunNeeded = false;
        wsSaveTimer = setTimeout(doWsSave, 600);
      }
    }
  };

  useApp.subscribe(() => {
    if (!useApp.getState().loggedIn || !useApp.getState().currentUser?.email) return;
    /* throttle با لبه انتهایی: اگر تایمر در جریان است، تغییر جدید در همان ذخیره اعمال می‌شود.
       (debounce ساده با tick موتور هر ۲.۲ ثانیه هرگز آتش نمی‌شد) */
    if (wsSaveTimer) return;
    wsSaveTimer = setTimeout(doWsSave, 2500);
  });
}
