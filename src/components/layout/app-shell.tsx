"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/store/app-store";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

import { LoginView } from "@/components/views/login-view";
import { DashboardView } from "@/components/views/dashboard-view";
import { AccountsView } from "@/components/views/accounts-view";
import { AddAccountWizard } from "@/components/views/add-account-wizard";
import { AccountDetails } from "@/components/views/account-details";
import { ContactsView } from "@/components/views/contacts-view";
import { ContactDetails } from "@/components/views/contact-details";
import { ImportContactsView } from "@/components/views/import-contacts-view";
import { CampaignsView } from "@/components/views/campaigns-view";
import { CreateCampaignView } from "@/components/views/create-campaign-view";
import { CampaignDetails } from "@/components/views/campaign-details";
import { QueueView } from "@/components/views/queue-view";
import { SchedulingView } from "@/components/views/scheduling-view";
import { ReportsView } from "@/components/views/reports-view";
import { AiAssistantView } from "@/components/views/ai-assistant-view";
import { NotificationsView } from "@/components/views/notifications-view";
import { LimitsView } from "@/components/views/limits-view";
import { UsersView } from "@/components/views/users-view";
import { SecurityView } from "@/components/views/security-view";
import { SettingsView } from "@/components/views/settings-view";

/* Omnichannel upgrade views */
import { InboxView } from "@/components/views/inbox-view";
import { SuppressionView } from "@/components/views/suppression-view";
import { SegmentsView } from "@/components/views/segments-view";
import { ApprovalView } from "@/components/views/approval-view";
import { TemplatesView } from "@/components/views/templates-view";
import { JourneyView } from "@/components/views/journey-view";
import { AuditView } from "@/components/views/audit-view";
import { UsageView } from "@/components/views/usage-view";

/* Browser Agent views */
import { WorkersView } from "@/components/views/workers-view";
import { AgentTasksView } from "@/components/views/agent-tasks-view";
import { ConnectionMapView } from "@/components/views/connection-map-view";
import { ExtensionView } from "@/components/views/extension-view";

/* Support tickets */
import { TicketsView } from "@/components/views/tickets-view";

export function AppShell() {
  const { loggedIn, view, hydrate, hydrated } = useApp();
  const [mobileNav, setMobileNav] = useState(false);

  /* بازیابی نشست از localStorage (رفع باگ: رفرش صفحه کاربر را خارج نمی‌کند) */
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-lg">RW</div>
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!loggedIn) return <LoginView />;

  const views: Record<string, React.ReactNode> = {
    dashboard: <DashboardView />,
    accounts: <AccountsView />,
    "add-account": <AddAccountWizard />,
    "account-details": <AccountDetails />,
    contacts: <ContactsView />,
    "contact-details": <ContactDetails />,
    "import-contacts": <ImportContactsView />,
    campaigns: <CampaignsView />,
    "create-campaign": <CreateCampaignView />,
    "campaign-details": <CampaignDetails />,
    queue: <QueueView />,
    scheduling: <SchedulingView />,
    reports: <ReportsView />,
    ai: <AiAssistantView />,
    notifications: <NotificationsView />,
    limits: <LimitsView />,
    users: <UsersView />,
    security: <SecurityView />,
    settings: <SettingsView />,
    /* omnichannel */
    inbox: <InboxView />,
    suppression: <SuppressionView />,
    segments: <SegmentsView />,
    approval: <ApprovalView />,
    templates: <TemplatesView />,
    journey: <JourneyView />,
    audit: <AuditView />,
    usage: <UsageView />,
    /* browser agent */
    workers: <WorkersView />,
    "agent-tasks": <AgentTasksView />,
    "connection-map": <ConnectionMapView />,
    extension: <ExtensionView />,
    /* support */
    tickets: <TicketsView />,
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background" dir="rtl">
      {/* Desktop sidebar */}
      <div className="hidden lg:block h-full shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="right" className="p-0 w-72 bg-sidebar border-sidebar-border">
          <SheetTitle className="sr-only">منوی ناوبری</SheetTitle>
          <Sidebar onNavigate={() => setMobileNav(false)} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onOpenMobileNav={() => setMobileNav(true)} />
        <main className="flex-1 overflow-y-auto" role="main">
          <div className="p-4 lg:p-6 max-w-[1600px] mx-auto w-full">{views[view] ?? views.dashboard}</div>
        </main>
      </div>
    </div>
  );
}
