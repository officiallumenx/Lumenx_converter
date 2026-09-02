import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button, Input, TextSizeControl } from "@lumenx/ui";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import { getProfile, updateOwnProfile } from "@/lib/identity";
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
import { useCareersApiInbox } from "@/hooks/use-careers-api-inbox";
import { formatCareersNotificationTime } from "@/lib/notification-inbox";

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

const CAREERS_TYPE_LABELS: Record<
  | "application"
  | "interview"
  | "selection"
  | "document"
  | "general"
  | "shortlisted"
  | "demo_class"
  | "offer"
  | "profile_viewed"
  | "job_alert",
  string
> = {
  application: "Application",
  interview: "Interview",
  selection: "Selection",
  document: "Document",
  general: "General",
  shortlisted: "Shortlisted",
  demo_class: "Demo class",
  offer: "Offer",
  profile_viewed: "Profile viewed",
  job_alert: "Job alert",
};

export function NotificationsPage() {
  const { user } = useCareersAuth();
  const apiMode = isApiAuthMode();
  const apiInbox = useCareersApiInbox(user?.id ?? null);
  const [tick, setTick] = useState(0);
  const demoItems = user && !apiMode ? getNotifications(user.id) : [];
  const items = apiMode ? apiInbox.items : demoItems;

  if (apiMode && apiInbox.loading) {
    return (
      <div className="animate-in fade-in duration-300 text-center py-16">
        <p className="text-sm text-muted-foreground">Loading notifications…</p>
      </div>
    );
  }

  if (apiMode && apiInbox.error) {
    return (
      <div className="animate-in fade-in duration-300 text-center py-16">
        <p className="text-sm text-destructive">{apiInbox.error}</p>
      </div>
    );
  }

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
            if (apiMode) {
              void apiInbox.markAllRead();
            } else if (user) {
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
              if (apiMode) {
                void apiInbox.markRead(n.id);
              } else {
                markNotificationRead(n.id);
                setTick((t) => t + 1);
              }
            }}
            className={`w-full rounded-2xl border p-4 text-left transition-colors ${n.read ? "border-border bg-card" : "border-primary/20 bg-primary/5"}`}
          >
            <p
              className={`text-xs font-bold ${n.read ? "text-foreground" : "text-primary"}`}
            >
              {CAREERS_TYPE_LABELS[n.type]}
            </p>
            <p className="mt-0.5 font-medium text-sm">{n.title}</p>
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
  const apiMode = isApiAuthMode();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [profileLoading, setProfileLoading] = useState(apiMode);
  const [profileSaving, setProfileSaving] = useState(false);
  const [supportOpen, setSupportOpen] = useState(true);
  const [faqOpen, setFaqOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);

  useEffect(() => {
    if (!apiMode || !user?.id || !isInstituteUuid(user.id)) {
      setProfileLoading(false);
      return;
    }
    let cancelled = false;
    void getProfile(user.id)
      .then((profile) => {
        if (cancelled) return;
        setName(profile.displayName);
        setPhone(profile.phone ?? "");
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load profile from API");
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiMode, user?.id]);

  const saveProfile = () => {
    if (!user?.id || !isInstituteUuid(user.id)) return;
    setProfileSaving(true);
    void updateOwnProfile(user.id, { displayName: name.trim(), phone: phone.trim() || null })
      .then(() => toast.success("Profile saved"))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to save profile"),
      )
      .finally(() => setProfileSaving(false));
  };

  return (
    <SettingsLayout>
      <CareersPageHeader title="Settings" subtitle="Appearance, account, and support" />

      {user && (
        <SettingsSection title="Account" description="Signed in to Careers portal">
          {apiMode && isInstituteUuid(user.id) ? (
            <>
              <SettingsRow
                label="Display name"
                right={
                  profileLoading ? (
                    <span className="text-sm text-muted-foreground">Loading…</span>
                  ) : (
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-9 w-48"
                    />
                  )
                }
              />
              <SettingsRow
                label="Email"
                right={<span className="text-sm text-muted-foreground">{user.email}</span>}
              />
              <SettingsRow
                label="Mobile"
                right={
                  profileLoading ? (
                    <span className="text-sm text-muted-foreground">Loading…</span>
                  ) : (
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-9 w-48"
                    />
                  )
                }
              />
              <div className="pt-2">
                <Button size="sm" onClick={saveProfile} disabled={profileLoading || profileSaving}>
                  {profileSaving ? "Saving…" : "Save profile"}
                </Button>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </SettingsSection>
      )}

      <SettingsSection title="Appearance">
        <div className="flex flex-wrap gap-2 py-1">
          {(["light", "dark"] as const).map((mode) => (
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
        <p className="pb-2 text-xs text-muted-foreground">
          Light or Dark. Default is Light. Does not follow system theme.
        </p>
        <div className="space-y-2 py-3.5 border-t border-border/80">
          <div>
            <div className="text-sm font-medium leading-snug">Text Size</div>
            <div className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              Small, Default, Large, or Extra Large. Default is Default.
            </div>
          </div>
          <TextSizeControl />
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
          <Link to="/terms" className="text-primary font-medium hover:underline">
            Terms & Conditions
          </Link>
          <Link to="/privacy" className="text-primary font-medium hover:underline">
            Privacy Policy
          </Link>
        </div>
      </SettingsSection>

      <Button
        variant="destructive"
        className="w-full rounded-xl"
        onClick={() => {
          signOut();
          nav({ to: "/" });
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
