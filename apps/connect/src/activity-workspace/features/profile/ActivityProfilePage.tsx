import { useEffect, useState } from "react";
import { getInitials } from "@lumenx/utils";
import { PageHeader } from "@/components/app/PageHeader";
import { useApp } from "@/lib/app-state";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { teacherRepository } from "@/lib/teacher/repositories";
import { PageSkeleton } from "@/activity-workspace/shared/ui/PageSkeleton";
import { ActivityPageShell } from "@/activity-workspace/shared/ui/ActivityPageShell";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Switch,
} from "@lumenx/ui";
import { Bell, HelpCircle, Info, Mail, Phone, Trophy, User } from "lucide-react";
import { toast } from "sonner";
import type { TeacherPreferences } from "@/lib/teacher/types";
import {
  SettingsLayout,
  SettingsCard,
  SettingsSection,
  SettingsRow,
} from "@/components/app/settings/SettingsPrimitives";
import { TeacherPortalSwitcher } from "@/components/app/TeacherPortalSwitcher";
import { useTeacherPortalAccess } from "@/lib/teacher-session";
import { CONNECT_APP_VERSION_LABEL } from "@/lib/app-version";
import {
  ContactSupportDialog,
  FeedbackDialog,
  HelpCenterDialog,
  ReportIssueDialog,
} from "@/teacher-portal/features/profile/SupportDialogs";
import { ActivityHelpTopics } from "./ActivityHelpTopics";

type ProfileSection = "support" | "help" | "feedback" | "report" | undefined;

/**
 * Activity Coordinator Settings — Profile, notification preferences,
 * Dual Role switch, Help, About only. Does not modify Subject Teacher settings page.
 */
export function ActivityProfilePage({ initialSection }: { initialSection?: ProfileSection }) {
  const { user } = useApp();
  const portal = useTeacherPortal();
  const portalAccess = useTeacherPortalAccess();
  const [prefs, setPrefs] = useState<TeacherPreferences | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);

  useEffect(() => {
    if (portal.isTeacher) {
      void teacherRepository.getPreferences().then(setPrefs);
    }
  }, [portal.isTeacher]);

  useEffect(() => {
    if (initialSection === "help" || initialSection === "support") setHelpOpen(true);
    if (initialSection === "feedback") setFeedbackOpen(true);
    if (initialSection === "report") setIssueOpen(true);
  }, [initialSection]);

  if (!portal.isTeacher || !user) {
    return <PageSkeleton variant="page" rows={4} />;
  }
  if (portal.isLoading || !("profile" in portal) || !portal.profile) {
    return <PageSkeleton variant="page" rows={4} />;
  }

  const profile = portal.profile;

  const savePrefs = async () => {
    if (!prefs) return;
    await teacherRepository.savePreferences(prefs);
    toast.success("Notification preferences saved");
  };

  return (
    <ActivityPageShell>
    <SettingsLayout>
      <PageHeader
        title="Settings"
        subtitle="Activity Coordinator profile and preferences."
      />

      {/* Profile */}
      <SettingsCard>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
          <Avatar className="size-20 shrink-0 ring-4 ring-primary/15 sm:size-24">
            {profile.avatar || user.avatar ? (
              <AvatarImage src={profile.avatar || user.avatar} alt="" />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-teal-600 to-emerald-700 font-display text-2xl text-white">
              {getInitials(profile.name, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h2 className="font-display text-xl font-semibold">{profile.name}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Employee ID: {profile.employeeId}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Badge className="border-0 bg-teal-500/15 text-teal-800 dark:text-teal-300">
                Activity Coordinator
              </Badge>
              {portalAccess.assignmentType === "dual_role" ? (
                <Badge variant="outline">Dual Role</Badge>
              ) : null}
              <Badge variant="outline">{profile.department}</Badge>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <InfoRow icon={Mail} label="Email" value={profile.email} />
          <InfoRow icon={Phone} label="Phone" value={profile.phone} />
          <InfoRow
            icon={Trophy}
            label="Workspace"
            value="Sports · ECA · Practice · Calendar"
          />
          <InfoRow icon={User} label="Joined" value={profile.joinedOn} />
        </div>
        {profile.bio ? (
          <div className="mt-4 space-y-2">
            <p className="settings-section-label">About you</p>
            <div className="settings-readonly-value is-multiline">{profile.bio}</div>
          </div>
        ) : null}
      </SettingsCard>

      {/* Notification Preferences — shared teacher prefs store */}
      <SettingsSection
        title="Notification preferences"
        icon={Bell}
        description="Alerts for Activity messages, practice, and calendar."
      >
        {prefs ? (
          <>
            <SettingsRow
              label="Push notifications"
              right={
                <Switch
                  checked={prefs.push}
                  onCheckedChange={(v) => setPrefs({ ...prefs, push: v })}
                />
              }
            />
            <SettingsRow
              label="Email notifications"
              right={
                <Switch
                  checked={prefs.email}
                  onCheckedChange={(v) => setPrefs({ ...prefs, email: v })}
                />
              }
            />
            <SettingsRow
              label="Message & announcement alerts"
              right={
                <Switch
                  checked={prefs.messageAlerts}
                  onCheckedChange={(v) => setPrefs({ ...prefs, messageAlerts: v })}
                />
              }
            />
            <SettingsRow
              label="Practice & calendar alerts"
              right={
                <Switch
                  checked={prefs.eventAlerts}
                  onCheckedChange={(v) => setPrefs({ ...prefs, eventAlerts: v })}
                />
              }
            />
            <div className="pt-3">
              <Button
                className="settings-primary-action w-full rounded-xl sm:w-auto"
                onClick={() => void savePrefs()}
              >
                Save notification settings
              </Button>
            </div>
          </>
        ) : (
          <p className="py-2 text-sm text-muted-foreground">Loading preferences…</p>
        )}
      </SettingsSection>

      {/* Role Switch (Dual Role) — shared switcher */}
      {portalAccess.assignmentType === "dual_role" ? (
        <SettingsSection
          title="Role switch"
          description="Switch between Subject Teacher and Activity Coordinator."
        >
          <div className="pt-1">
            <TeacherPortalSwitcher variant="settings" />
          </div>
        </SettingsSection>
      ) : (
        <SettingsSection
          title="Role switch"
          description="Available when your assignment is Dual Role."
        >
          <p className="py-2 text-sm text-muted-foreground">
            You are signed in as Activity Coordinator only. Dual Role teachers can switch
            workspaces here.
          </p>
        </SettingsSection>
      )}

      {/* Help */}
      <SettingsSection
        title="Help"
        icon={HelpCircle}
        description="How Activity Coordinator works in LumenX Connect."
      >
        <ActivityHelpTopics />
        <div className="flex flex-wrap gap-2 pt-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => setHelpOpen(true)}
          >
            Teacher help center
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => setContactOpen(true)}
          >
            Contact support
          </Button>
        </div>
      </SettingsSection>

      {/* About */}
      <SettingsSection title="About" icon={Info}>
        <div className="space-y-3 py-1 text-sm">
          <p className="leading-relaxed text-muted-foreground">
            LumenX Connect — Activity Coordinator workspace for school Sports teams and
            Extra-Curricular groups: attendance, practice, messages, events, achievements, and
            calendar.
          </p>
          <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
            <p className="text-xs font-medium text-muted-foreground">App version</p>
            <p className="mt-0.5 font-medium">{CONNECT_APP_VERSION_LABEL}</p>
          </div>
        </div>
      </SettingsSection>

      <HelpCenterDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <ContactSupportDialog open={contactOpen} onOpenChange={setContactOpen} />
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <ReportIssueDialog open={issueOpen} onOpenChange={setIssueOpen} />
    </SettingsLayout>
    </ActivityPageShell>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5 rounded-xl border border-border/80 bg-muted/20 px-3 py-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="mt-0.5 break-words text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
