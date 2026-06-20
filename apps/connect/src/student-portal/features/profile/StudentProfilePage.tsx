import { useEffect, useState } from "react";
import {
  LogOut,
  Bell,
  Lock,
  Smartphone,
  Mail,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { useApp } from "@/lib/app-state";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, Switch } from "@lumenx/ui";
import { PageSkeleton } from "@/student-portal/shared/ui";
import { SUPPORT_EMAIL } from "./support-content";
import {
  StudentContactSupportDialog,
  StudentFaqDialog,
  StudentFeedbackDialog,
  StudentHelpCenterDialog,
  StudentReportIssueDialog,
} from "./SupportDialogs";
import {
  SettingsLayout,
  SettingsCard,
  SettingsSection,
  SettingsRow,
  SettingsSupportPanel,
} from "@/components/app/settings/SettingsPrimitives";

const APP_VERSION = "2.4.0";

export function StudentProfilePage({ initialSection }: { initialSection?: "support" }) {
  const { user, signOut, theme, toggleTheme } = useApp();
  const portal = useStudentPortal();
  const [supportOpen, setSupportOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);

  useEffect(() => {
    if (initialSection === "support") setSupportOpen(true);
  }, [initialSection]);

  if (!user) return null;
  if (!portal.isStudent) return null;
  if (portal.isLoading || !portal.snapshot) return <PageSkeleton rows={8} />;

  const profile = portal.snapshot.profile;
  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  return (
    <SettingsLayout>
      <PageHeader title="Settings" subtitle="Your profile, preferences, and support" />

      <SettingsCard>
        <div className="flex min-w-0 flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
          <Avatar className="size-20 sm:size-24 ring-4 ring-primary/10 shrink-0">
            {user.avatar ? <AvatarImage src={user.avatar} alt="" className="object-cover" /> : null}
            <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-700 font-display text-2xl text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h3 className="font-display text-xl font-semibold break-words">{user.name}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{user.phone}</p>
            <Badge variant="outline" className="mt-2 text-[10px]">
              Student · Institute managed
            </Badge>
          </div>
        </div>

        <div className="mt-6 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <ReadOnlyField label="Student ID" value={profile.id} />
          <ReadOnlyField label="Roll number" value={profile.rollNo} />
          <ReadOnlyField label="Class & section" value={`${profile.class} · Sec ${profile.section}`} />
          <ReadOnlyField label="House" value={profile.house} />
          <ReadOnlyField label="Class teacher" value={profile.classTeacher} />
          <ReadOnlyField label="Institute" value={profile.institute} />
          <ReadOnlyField label="Email" value={profile.email} />
          <ReadOnlyField label="Blood group" value={profile.bloodGroup} />
          <ReadOnlyField label="Emergency contact" value={profile.emergencyContact} />
          <ReadOnlyField label="Parent / guardian" value={profile.parentName} />
        </div>

        <div className="mt-4">
          <ReadOnlyField label="Bio" value={profile.bio} multiline />
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0 text-success mt-0.5" />
          Personal details are managed by your institute. Contact the school office for corrections.
        </div>
      </SettingsCard>

      <SettingsSection title="Appearance">
        <SettingsRow
          label="Dark mode"
          desc="Easier on the eyes in low light"
          right={<Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />}
        />
      </SettingsSection>

      <SettingsSection title="Notification preferences" icon={Bell}>
        <SettingsRow
          label="Push notifications"
          desc="Real-time alerts on your device"
          right={<Switch defaultChecked />}
          icon={Smartphone}
        />
        <SettingsRow
          label="WhatsApp alerts"
          desc="Attendance, results, and emergencies"
          right={<Switch defaultChecked />}
          icon={MessageSquare}
        />
        <SettingsRow
          label="Email digest"
          desc="Weekly summary every Sunday"
          right={<Switch />}
          icon={Mail}
        />
      </SettingsSection>

      <SettingsSection title="Security & privacy" icon={Lock}>
        <SettingsRow label="App lock" desc="Require biometrics to open the app" right={<Switch />} />
        <SettingsRow
          label="Hide phone number"
          desc="From other parents and students"
          right={<Switch defaultChecked />}
        />
      </SettingsSection>

      <SettingsSupportPanel
        open={supportOpen}
        onToggle={() => setSupportOpen((v) => !v)}
        portalName="LumenX Connect Student Portal"
        version={APP_VERSION}
        supportEmail={SUPPORT_EMAIL}
        onFaq={() => setFaqOpen(true)}
        onHelp={() => setHelpOpen(true)}
        onContact={() => setContactOpen(true)}
        onFeedback={() => setFeedbackOpen(true)}
        onIssue={() => setIssueOpen(true)}
      />

      <Button
        variant="outline"
        className="w-full min-w-0 rounded-xl gap-2 text-destructive border-destructive/30 hover:bg-destructive/5 h-11 touch-manipulation"
        onClick={signOut}
      >
        <LogOut className="size-4" /> Sign out
      </Button>

      <StudentFaqDialog open={faqOpen} onOpenChange={setFaqOpen} />
      <StudentHelpCenterDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <StudentContactSupportDialog open={contactOpen} onOpenChange={setContactOpen} />
      <StudentFeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <StudentReportIssueDialog open={issueOpen} onOpenChange={setIssueOpen} />
    </SettingsLayout>
  );
}

function ReadOnlyField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      <div
        className={
          multiline
            ? "rounded-xl border bg-muted/30 px-3 py-2.5 text-sm leading-relaxed"
            : "rounded-xl border bg-muted/30 px-3 py-2 text-sm font-medium"
        }
      >
        {value}
      </div>
    </div>
  );
}
