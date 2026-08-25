import { useEffect, useState } from "react";
import { getInitials } from "@lumenx/utils";
import { LogOut, Lock, Pencil, ShieldCheck, X } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { SecuritySettings } from "@/components/app/SecuritySettings";
import { useApp } from "@/lib/app-state";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, Switch, Textarea, TextSizeControl } from "@lumenx/ui";
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
import { CONNECT_APP_VERSION_LABEL } from "@/lib/app-version";
import { toast } from "sonner";

const STUDENT_BIO_KEY = "ues_student_bio";
const BIO_MAX = 160;

type ProfileSection = "support" | "help" | "feedback" | "report" | undefined;

function readStoredBio(fallback: string) {
  try {
    const raw = localStorage.getItem(STUDENT_BIO_KEY);
    if (raw != null) return raw.slice(0, BIO_MAX);
  } catch {
    /* ignore */
  }
  return fallback.slice(0, BIO_MAX);
}

export function StudentProfilePage({ initialSection }: { initialSection?: ProfileSection }) {
  const { user, signOut, theme, toggleTheme } = useApp();
  const portal = useStudentPortal();
  const [supportOpen, setSupportOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState("");
  const [bioDraft, setBioDraft] = useState("");

  useEffect(() => {
    if (initialSection === "support") setSupportOpen(true);
    if (initialSection === "help") setHelpOpen(true);
    if (initialSection === "feedback") setFeedbackOpen(true);
    if (initialSection === "report") setIssueOpen(true);
  }, [initialSection]);

  useEffect(() => {
    if (!portal.snapshot?.profile) return;
    const next = readStoredBio(portal.snapshot.profile.bio);
    setBio(next);
    setBioDraft(next);
  }, [portal.snapshot?.profile]);

  if (!user || !portal.isStudent) {
    return <PageSkeleton rows={8} />;
  }
  if (portal.isLoading || !portal.snapshot) return <PageSkeleton rows={8} />;

  const profile = portal.snapshot.profile;
  const initials = getInitials(user.name, 2);

  const saveBio = () => {
    const next = bioDraft.trim().slice(0, BIO_MAX);
    setBio(next);
    setBioDraft(next);
    try {
      localStorage.setItem(STUDENT_BIO_KEY, next);
    } catch {
      /* ignore */
    }
    setEditingBio(false);
    toast.success("Bio updated");
  };

  const cancelBioEdit = () => {
    setBioDraft(bio);
    setEditingBio(false);
  };

  return (
    <SettingsLayout>
      <PageHeader title="Settings" subtitle="Your profile, preferences, and support" />

      <SettingsCard>
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <Avatar className="size-14 shrink-0 ring-2 ring-primary/10 sm:size-16">
            {user.avatar ? <AvatarImage src={user.avatar} alt="" className="object-cover" /> : null}
            <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-700 font-display text-lg text-white sm:text-xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-display text-lg font-semibold leading-snug break-words sm:text-xl">
                  {user.name}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                  {profile.class} · Sec {profile.section} · Roll {profile.rollNo}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.phone}</p>
              </div>
              {!editingBio ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5 rounded-xl"
                  onClick={() => {
                    setBioDraft(bio);
                    setEditingBio(true);
                  }}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 gap-1 rounded-xl"
                  onClick={cancelBioEdit}
                >
                  <X className="size-3.5" />
                  Cancel
                </Button>
              )}
            </div>
            <Badge variant="outline" className="mt-2 text-[10px] sm:text-xs">
              Student · Institute managed
            </Badge>
          </div>
        </div>

        <div className="mt-4 min-w-0">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div className="settings-field-label mb-0">Bio</div>
            {editingBio ? (
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {bioDraft.length}/{BIO_MAX}
              </span>
            ) : null}
          </div>
          {editingBio ? (
            <div className="space-y-2">
              <Textarea
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value.slice(0, BIO_MAX))}
                rows={3}
                maxLength={BIO_MAX}
                placeholder="A short line about you…"
                className="min-h-[4.5rem] rounded-xl text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={cancelBioEdit}>
                  Cancel
                </Button>
                <Button type="button" size="sm" className="rounded-xl" onClick={saveBio}>
                  Save bio
                </Button>
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm leading-snug text-foreground line-clamp-2 break-words">
              {bio.trim() || "No bio yet. Tap Edit to add a short one."}
            </p>
          )}
        </div>

        <div className="mt-3 settings-info-banner">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          Other profile details are managed by your institute.
        </div>
      </SettingsCard>

      <SettingsSection title="Appearance">
        <SettingsRow
          label="Dark mode"
          desc="Light or Dark only · default is Light · does not follow system"
          right={<Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />}
        />
        <div className="space-y-2 py-3.5 first:pt-0 last:pb-0 sm:py-4">
          <div>
            <div className="text-sm font-medium leading-snug">Text Size</div>
            <div className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              Small, Default, Large, or Extra Large. Default is Default.
            </div>
          </div>
          <TextSizeControl />
        </div>
      </SettingsSection>

      <SettingsSection title="Security & privacy" icon={Lock}>
        <SecuritySettings>
          <SettingsRow
            label="Hide phone number"
            desc="From other parents and students"
            right={<Switch defaultChecked />}
          />
        </SecuritySettings>
      </SettingsSection>

      <SettingsSupportPanel
        open={supportOpen}
        onToggle={() => setSupportOpen((v) => !v)}
        portalName="LumenX Connect Student Portal"
        version={CONNECT_APP_VERSION_LABEL}
        supportEmail={SUPPORT_EMAIL}
        onFaq={() => setFaqOpen(true)}
        onHelp={() => setHelpOpen(true)}
        onContact={() => setContactOpen(true)}
        onFeedback={() => setFeedbackOpen(true)}
        onIssue={() => setIssueOpen(true)}
      />

      <Button
        variant="outline"
        className="settings-sign-out rounded-xl gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
        onClick={signOut}
      >
        <LogOut className="size-4" aria-hidden /> Sign out
      </Button>

      <StudentFaqDialog open={faqOpen} onOpenChange={setFaqOpen} />
      <StudentHelpCenterDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <StudentContactSupportDialog open={contactOpen} onOpenChange={setContactOpen} />
      <StudentFeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <StudentReportIssueDialog open={issueOpen} onOpenChange={setIssueOpen} />
    </SettingsLayout>
  );
}
