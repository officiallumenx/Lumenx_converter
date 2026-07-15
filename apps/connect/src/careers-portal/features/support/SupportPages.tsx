import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@lumenx/ui";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import {
  SettingsLayout,
  SettingsRow,
  SettingsSection,
  SettingsSupportPanel,
} from "@/components/app/settings/SettingsPrimitives";
import { CareersPageHeader } from "@/careers-portal/shared/ui/CareersPageHeader";
import { DocumentUploadCard } from "@/careers-portal/shared/ui/CareersShellWidgets";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import { useCareersTheme } from "@/careers-portal/core/CareersThemeProvider";
import {
  CareersContactSupportDialog,
  CareersFaqDialog,
  CareersFeedbackDialog,
  CareersHelpCenterDialog,
  CareersReportIssueDialog,
} from "@/careers-portal/features/support/CareersSupportDialogs";
import {
  CAREERS_APP_VERSION,
  CAREERS_CONTACT,
} from "@/careers-portal/features/support/careers-support-content";
import {
  getAllDocumentsForUser,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  uploadDocument,
} from "@/lib/careers/repositories";
import { documentStatusLabel } from "@/lib/careers/status-utils";
import type { CareersThemeMode } from "@/lib/careers/types";

export function DocumentsPage() {
  const { user } = useCareersAuth();
  const [tick, setTick] = useState(0);
  const groups = user ? getAllDocumentsForUser(user.id) : [];

  return (
    <div className="animate-in fade-in duration-300" key={tick}>
      <CareersPageHeader title="Document center" subtitle="Upload and track verification status" />
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">Apply to a job to manage documents.</p>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.applicationId} className="space-y-3">
              <h2 className="font-semibold text-sm">{g.jobTitle}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {g.documents.map((d) => (
                  <DocumentUploadCard
                    key={d.id}
                    label={d.label}
                    fileName={d.fileName}
                    status={documentStatusLabel(d.status)}
                    onUpload={(file) => {
                      uploadDocument(g.applicationId, d.type, file.name);
                      toast.success(`${d.label} updated`);
                      setTick((n) => n + 1);
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function NotificationsPage() {
  const { user } = useCareersAuth();
  const [tick, setTick] = useState(0);
  const items = user ? getNotifications(user.id) : [];

  if (items.length === 0) {
    return (
      <div className="animate-in fade-in duration-300 text-center py-16">
        <Bell className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">No notifications</p>
        <p className="text-xs text-muted-foreground mt-1">
          Updates about your applications will appear here.
        </p>
      </div>
    );
  }

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="animate-in fade-in duration-300" key={tick}>
      <CareersPageHeader title="Notifications" subtitle={`${unread} unread`} />
      {unread > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="mb-4"
          onClick={() => {
            if (user) {
              markAllNotificationsRead(user.id);
              setTick((t) => t + 1);
            }
          }}
        >
          Mark all read
        </Button>
      )}
      <div className="space-y-2">
        {items.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => {
              markNotificationRead(n.id);
              setTick((t) => t + 1);
            }}
            className={`w-full rounded-2xl border p-4 text-left transition-colors ${n.read ? "border-border bg-card" : "border-primary/20 bg-primary/5"}`}
          >
            <p className="font-medium text-sm">{n.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>
            <p className="mt-2 text-[10px] text-muted-foreground">
              {new Date(n.createdAt).toLocaleString("en-IN")}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { user, signOut } = useCareersAuth();
  const { theme, setTheme } = useCareersTheme();
  const nav = useNavigate();
  const [supportOpen, setSupportOpen] = useState(true);
  const [faqOpen, setFaqOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);

  return (
    <SettingsLayout>
      <CareersPageHeader title="Settings" subtitle="Appearance, account, and support" />

      {user && (
        <SettingsSection title="Account" description="Signed in to Careers portal">
          <SettingsRow
            label="Name"
            right={<span className="text-sm text-muted-foreground">{user.name}</span>}
          />
          {user.email && (
            <SettingsRow
              label="Email"
              right={<span className="text-sm text-muted-foreground">{user.email}</span>}
            />
          )}
          {user.phone && (
            <SettingsRow
              label="Mobile"
              right={<span className="text-sm text-muted-foreground">{user.phone}</span>}
            />
          )}
        </SettingsSection>
      )}

      <SettingsSection title="Appearance">
        <div className="flex flex-wrap gap-2 py-1">
          {(["light", "dark", "system"] as CareersThemeMode[]).map((mode) => (
            <Button
              key={mode}
              size="sm"
              variant={theme === mode ? "default" : "outline"}
              onClick={() => setTheme(mode)}
              className="capitalize"
            >
              {mode}
            </Button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSupportPanel
        open={supportOpen}
        onToggle={() => setSupportOpen((v) => !v)}
        portalName="LumenX Connect Careers Portal"
        version={CAREERS_APP_VERSION}
        supportEmail={CAREERS_CONTACT.email}
        supportPhone={CAREERS_CONTACT.phone}
        onFaq={() => setFaqOpen(true)}
        onHelp={() => setHelpOpen(true)}
        onContact={() => setContactOpen(true)}
        onFeedback={() => setFeedbackOpen(true)}
        onIssue={() => setIssueOpen(true)}
      />

      <SettingsSection title="Legal">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link to="/careers/terms" className="text-primary font-medium hover:underline">
            Terms & Conditions
          </Link>
          <Link to="/careers/privacy" className="text-primary font-medium hover:underline">
            Privacy Policy
          </Link>
        </div>
      </SettingsSection>

      <Button
        variant="destructive"
        className="w-full rounded-xl"
        onClick={() => {
          signOut();
          nav({ to: "/careers/login" });
        }}
      >
        Log out
      </Button>

      <CareersFaqDialog open={faqOpen} onOpenChange={setFaqOpen} />
      <CareersHelpCenterDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <CareersContactSupportDialog open={contactOpen} onOpenChange={setContactOpen} />
      <CareersFeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <CareersReportIssueDialog open={issueOpen} onOpenChange={setIssueOpen} />
    </SettingsLayout>
  );
}
