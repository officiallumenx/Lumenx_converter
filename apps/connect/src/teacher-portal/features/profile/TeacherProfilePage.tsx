import { useEffect, useRef, useState } from "react";
import { getInitials, processSimpleUpload } from "@lumenx/utils";
import { PageHeader } from "@/components/app/PageHeader";
import { useApp } from "@/lib/app-state";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { teacherRepository } from "@/lib/teacher/repositories";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Switch,
  Input,
  Textarea,
  TextSizeControl,
} from "@lumenx/ui";
import { LogOut, Bell, Shield, Pencil, X, ShieldCheck, Trash2 } from "lucide-react";
import { SecuritySettings } from "@/components/app/SecuritySettings";
import { toast } from "sonner";
import { isTeacherAccessDenied } from "@/lib/teacher/portal-access-guard";
import { useNavigate } from "@tanstack/react-router";
import type { TeacherPreferences } from "@/lib/teacher/types";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import {
  ContactSupportDialog,
  FaqDialog,
  FeedbackDialog,
  HelpCenterDialog,
  ReportIssueDialog,
} from "./SupportDialogs";
import { SUPPORT_EMAIL } from "./support-content";
import {
  SettingsLayout,
  SettingsCard,
  SettingsSection,
  SettingsRow,
  SettingsField,
  SettingsSupportPanel,
} from "@/components/app/settings/SettingsPrimitives";

import { CONNECT_APP_VERSION_LABEL } from "@/lib/app-version";
import { TeacherPortalSwitcher } from "@/components/app/TeacherPortalSwitcher";
import { useTeacherPortalAccess } from "@/lib/teacher-session";

const ABOUT_MAX = 160;

export function TeacherProfilePage({
  initialSection,
}: {
  initialSection?: "support" | "help" | "feedback" | "report";
}) {
  const { user, signOut, toggleTheme, theme } = useApp();
  const portal = useTeacherPortal();
  const portalAccess = useTeacherPortalAccess();
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [prefs, setPrefs] = useState<TeacherPreferences | null>(null);
  const [editing, setEditing] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [name, setName] = useState("");
  const [privacyShare, setPrivacyShare] = useState(true);
  const [subjectsText, setSubjectsText] = useState("");
  const [classesText, setClassesText] = useState("");
  const [experienceYears, setExperienceYears] = useState("0");
  const [about, setAbout] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (initialSection === "support") setSupportOpen(true);
    if (initialSection === "help") setHelpOpen(true);
    if (initialSection === "feedback") setFeedbackOpen(true);
    if (initialSection === "report") setIssueOpen(true);
  }, [initialSection]);

  useEffect(() => {
    if (portal.isTeacher) {
      teacherRepository.getPreferences().then(setPrefs);
    }
  }, [portal.isTeacher]);

  useEffect(() => {
    if (portal.isTeacher && "profile" in portal && portal.profile) {
      setName(portal.profile.name);
      setSubjectsText(portal.profile.subjects.join(", "));
      setClassesText(portal.profile.classes.join(", "));
      setExperienceYears(String(portal.profile.experienceYears));
      setAbout((portal.profile.bio ?? "").slice(0, ABOUT_MAX));
      setAvatarPreview(portal.profile.avatar);
    }
  }, [portal]);

  if (!portal.isTeacher || !user) {
    return <PageSkeleton rows={4} />;
  }
  if (portal.isLoading || !portal.profile) return <PageSkeleton rows={4} />;

  const profile = portal.profile;

  const beginEdit = () => {
    setName(profile.name);
    setSubjectsText(profile.subjects.join(", "));
    setClassesText(profile.classes.join(", "));
    setExperienceYears(String(profile.experienceYears));
    setAbout((profile.bio ?? "").slice(0, ABOUT_MAX));
    setAvatarPreview(profile.avatar);
    setEditing(true);
  };

  const cancelEdit = () => {
    setName(profile.name);
    setSubjectsText(profile.subjects.join(", "));
    setClassesText(profile.classes.join(", "));
    setExperienceYears(String(profile.experienceYears));
    setAbout((profile.bio ?? "").slice(0, ABOUT_MAX));
    setAvatarPreview(profile.avatar);
    setEditing(false);
  };

  const savePrefs = async () => {
    if (!prefs) return;
    try {
      await teacherRepository.savePreferences(prefs);
    } catch (error) {
      if (isTeacherAccessDenied(error)) return;
      throw error;
    }
    toast.success("Notification preferences saved");
  };

  const saveProfile = async () => {
    try {
      await teacherRepository.updateProfile({
        name: name.trim() || profile.name,
        phone: profile.phone,
        email: profile.email,
        subjects: subjectsText
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        classes: classesText
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        experienceYears: Math.max(0, Number(experienceYears) || 0),
        bio: about.trim().slice(0, ABOUT_MAX),
        avatar: avatarPreview,
      });
    } catch (error) {
      if (isTeacherAccessDenied(error)) return;
      throw error;
    }
    toast.success("Profile updated");
    setEditing(false);
    portal.refresh();
  };

  return (
    <SettingsLayout>
      <PageHeader title="Settings" subtitle="Your teacher account, preferences, and support" />

      <SettingsCard>
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="relative shrink-0">
            <Avatar className="size-14 shrink-0 ring-2 ring-primary/10 sm:size-16">
              {avatarPreview || user.avatar ? (
                <AvatarImage src={avatarPreview || user.avatar} alt="" className="object-cover" />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-violet-600 to-indigo-700 font-display text-lg text-white sm:text-xl">
                {getInitials(profile.name, 2)}
              </AvatarFallback>
            </Avatar>
            {editing ? (
              <>
                <button
                  type="button"
                  aria-label="Change profile photo"
                  onClick={() => fileRef.current?.click()}
                  className="settings-avatar-action border bg-card shadow-soft"
                >
                  <Pencil className="size-3.5" aria-hidden />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    void (async () => {
                      try {
                        const processed = await processSimpleUpload(file, "image");
                        setAvatarPreview(processed.dataUrl);
                        toast.success("Profile photo updated");
                      } catch (err) {
                        toast.error(
                          err instanceof Error ? err.message : "Could not process that photo.",
                        );
                      }
                    })();
                  }}
                />
                {(avatarPreview || user.avatar) && (
                  <button
                    type="button"
                    aria-label="Delete profile photo"
                    className="absolute -bottom-1 -left-1 grid size-7 place-items-center rounded-full border bg-card text-destructive shadow-soft"
                    onClick={() => {
                      setAvatarPreview("");
                      toast.success("Profile photo removed");
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </>
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                {editing ? (
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-9 rounded-xl font-display text-base font-semibold sm:text-lg"
                    placeholder="Full name"
                    autoComplete="name"
                  />
                ) : (
                  <h3 className="font-display text-lg font-semibold leading-snug break-words sm:text-xl">
                    {profile.name}
                  </h3>
                )}
                <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                  {profile.employeeId} · {profile.department}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{profile.phone}</p>
              </div>
              {!editing ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5 rounded-xl"
                  onClick={beginEdit}
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
                  onClick={cancelEdit}
                >
                  <X className="size-3.5" />
                  Cancel
                </Button>
              )}
            </div>
            <Badge variant="outline" className="mt-2 text-[10px] sm:text-xs">
              Teacher · Institute managed
            </Badge>
          </div>
        </div>

        {editing ? (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <SettingsField label="Subjects">
                <Input
                  value={subjectsText}
                  onChange={(e) => setSubjectsText(e.target.value)}
                  placeholder="e.g. Mathematics, Physics"
                  className="rounded-xl"
                />
              </SettingsField>
              <SettingsField label="Classes">
                <Input
                  value={classesText}
                  onChange={(e) => setClassesText(e.target.value)}
                  placeholder="e.g. 10-B, 10-A"
                  className="rounded-xl"
                />
              </SettingsField>
              <SettingsField label="Experience (years)">
                <Input
                  type="number"
                  min={0}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  className="rounded-xl"
                />
              </SettingsField>
              <SettingsField label="Email">
                <Input value={profile.email} readOnly disabled className="rounded-xl bg-muted/40" />
              </SettingsField>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="settings-field-label mb-0">About</div>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {about.length}/{ABOUT_MAX}
                </span>
              </div>
              <Textarea
                value={about}
                onChange={(e) => setAbout(e.target.value.slice(0, ABOUT_MAX))}
                rows={3}
                maxLength={ABOUT_MAX}
                placeholder="A short line about your teaching…"
                className="min-h-[4.5rem] rounded-xl text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={cancelEdit}>
                Cancel
              </Button>
              <Button type="button" size="sm" className="rounded-xl" onClick={saveProfile}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 min-w-0 space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <CompactMeta label="Subjects" value={profile.subjects.join(", ") || "—"} />
              <CompactMeta label="Classes" value={profile.classes.join(", ") || "—"} />
              <CompactMeta label="Experience" value={`${profile.experienceYears} years`} />
              <CompactMeta label="Email" value={profile.email} />
            </div>
            <div>
              <div className="settings-field-label mb-1.5">About</div>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm leading-relaxed text-foreground break-words whitespace-pre-wrap">
                {(profile.bio ?? "").trim() || "No about yet. Tap Edit to add a short one."}
              </p>
            </div>
            <div className="settings-info-banner">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              Phone and email are managed by your institute.
            </div>
          </div>
        )}
      </SettingsCard>

      {portalAccess.assignmentType === "dual_role" ? (
        <SettingsCard>
          <TeacherPortalSwitcher variant="settings" />
        </SettingsCard>
      ) : null}

      <SettingsSection
        title="Notification preferences"
        icon={Bell}
        description="Choose what reaches you during the school day."
      >
        {prefs && (
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
              label="Attendance alerts"
              right={
                <Switch
                  checked={prefs.attendanceAlerts}
                  onCheckedChange={(v) => setPrefs({ ...prefs, attendanceAlerts: v })}
                />
              }
            />
            <SettingsRow
              label="Message alerts"
              right={
                <Switch
                  checked={prefs.messageAlerts}
                  onCheckedChange={(v) => setPrefs({ ...prefs, messageAlerts: v })}
                />
              }
            />
            <SettingsRow
              label="Event alerts"
              right={
                <Switch
                  checked={prefs.eventAlerts}
                  onCheckedChange={(v) => setPrefs({ ...prefs, eventAlerts: v })}
                />
              }
            />
            <SettingsRow
              label="Exam alerts"
              right={
                <Switch
                  checked={prefs.examAlerts}
                  onCheckedChange={(v) => setPrefs({ ...prefs, examAlerts: v })}
                />
              }
            />
          </>
        )}
        <div className="pt-3">
          <Button className="settings-primary-action rounded-xl w-full sm:w-auto" onClick={savePrefs}>
            Save notification settings
          </Button>
        </div>
      </SettingsSection>

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

      <SettingsSection title="Privacy & security" icon={Shield}>
        <SecuritySettings>
          <SettingsRow
            label="Show profile to parents"
            desc="Let parents view your bio and office hours"
            right={
              <Switch
                checked={privacyShare}
                onCheckedChange={(v) => {
                  setPrivacyShare(v);
                  toast.success("Privacy settings updated");
                }}
              />
            }
          />
          <div className="pt-2 pb-1">
            <Button
              variant="outline"
              className="settings-primary-action rounded-xl w-full sm:w-auto"
              onClick={() => setPwdOpen(true)}
            >
              Change password
            </Button>
          </div>
        </SecuritySettings>
      </SettingsSection>

      <SettingsSupportPanel
        open={supportOpen}
        onToggle={() => setSupportOpen((v) => !v)}
        portalName="LumenX Connect Teacher Portal"
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
        onClick={() => {
          signOut();
          nav({ to: "/login" });
        }}
      >
        <LogOut className="size-4" aria-hidden /> Sign out
      </Button>

      <ChangePasswordDialog open={pwdOpen} onOpenChange={setPwdOpen} phone={profile.phone} />

      <FaqDialog open={faqOpen} onOpenChange={setFaqOpen} />
      <HelpCenterDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <ContactSupportDialog open={contactOpen} onOpenChange={setContactOpen} />
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <ReportIssueDialog open={issueOpen} onOpenChange={setIssueOpen} />
    </SettingsLayout>
  );
}

function CompactMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-muted/30 px-3 py-2">
      <div className="settings-field-label mb-0.5">{label}</div>
      <div className="truncate text-sm font-medium">{value}</div>
    </div>
  );
}
