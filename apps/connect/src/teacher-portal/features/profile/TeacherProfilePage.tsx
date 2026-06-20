import { useEffect, useRef, useState } from "react";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lumenx/ui";
import { BookOpen, Briefcase, Mail, Phone, LogOut, Bell, Shield, Camera } from "lucide-react";
import { toast } from "sonner";
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

const APP_VERSION = "2.4.0";

export function TeacherProfilePage({ initialSection }: { initialSection?: "support" }) {
  const { user, signOut, toggleTheme, theme } = useApp();
  const portal = useTeacherPortal();
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [prefs, setPrefs] = useState<TeacherPreferences | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [privacyShare, setPrivacyShare] = useState(true);
  const [subjectsText, setSubjectsText] = useState("");
  const [classesText, setClassesText] = useState("");
  const [experienceYears, setExperienceYears] = useState("0");
  const [about, setAbout] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (initialSection === "support") setSupportOpen(true);
  }, [initialSection]);

  useEffect(() => {
    if (portal.isTeacher) {
      teacherRepository.getPreferences().then(setPrefs);
    }
  }, [portal.isTeacher]);

  useEffect(() => {
    if (portal.isTeacher && portal.profile) {
      setName(portal.profile.name);
      setPhone(portal.profile.phone);
      setEmail(portal.profile.email);
      setSubjectsText(portal.profile.subjects.join(", "));
      setClassesText(portal.profile.classes.join(", "));
      setExperienceYears(String(portal.profile.experienceYears));
      setAbout(portal.profile.bio ?? "");
      setAvatarPreview(portal.profile.avatar);
    }
  }, [portal.isTeacher, portal.profile]);

  if (!portal.isTeacher || !user) return null;
  if (portal.isLoading || !portal.profile) return <PageSkeleton rows={4} />;

  const profile = portal.profile;

  const savePrefs = async () => {
    if (!prefs) return;
    await teacherRepository.savePreferences(prefs);
    toast.success("Notification preferences saved");
  };

  const saveProfile = async () => {
    await teacherRepository.updateProfile({
      name,
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
      bio: about.trim(),
      avatar: avatarPreview,
    });
    toast.success("Profile updated");
    setEditOpen(false);
    portal.refresh();
  };

  return (
    <SettingsLayout>
      <PageHeader title="Settings" subtitle="Your teacher account, preferences, and support" />

      <SettingsCard>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div className="relative shrink-0">
            <Avatar className="size-20 sm:size-24 ring-4 ring-violet-500/20">
              {avatarPreview || user.avatar ? (
                <AvatarImage src={avatarPreview || user.avatar} alt="" />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-violet-600 to-indigo-700 text-2xl text-white font-display">
                {profile.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 grid size-9 place-items-center rounded-full border bg-card shadow-soft touch-manipulation"
            >
              <Camera className="size-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const next = typeof reader.result === "string" ? reader.result : undefined;
                  setAvatarPreview(next);
                  toast.success("Profile photo updated (demo)");
                };
                reader.readAsDataURL(file);
              }}
            />
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h2 className="font-display text-xl font-semibold">{profile.name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Employee ID: {profile.employeeId}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Badge className="border-0 bg-violet-500/15 text-violet-700 dark:text-violet-300">
                Teacher
              </Badge>
              <Badge variant="outline">{profile.department}</Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 rounded-xl"
              onClick={() => setEditOpen(true)}
            >
              Edit profile
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <InfoRow icon={BookOpen} label="Subjects" value={profile.subjects.join(", ")} />
          <InfoRow icon={Briefcase} label="Classes" value={profile.classes.join(", ")} />
          <InfoRow icon={Mail} label="Email" value={profile.email} />
          <InfoRow icon={Phone} label="Phone" value={profile.phone} />
          <InfoRow icon={Briefcase} label="Experience" value={`${profile.experienceYears} years`} />
          <InfoRow icon={Briefcase} label="Joined" value={profile.joinedOn} />
        </div>
        {profile.bio && (
          <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
            <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
              About
            </p>
            <p className="text-sm leading-relaxed">{profile.bio}</p>
          </div>
        )}
      </SettingsCard>

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
          <Button className="rounded-xl w-full sm:w-auto" onClick={savePrefs}>
            Save notification settings
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection title="Appearance">
        <SettingsRow
          label="Dark mode"
          desc="Easier on the eyes in low light"
          right={<Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />}
        />
      </SettingsSection>

      <SettingsSection title="Privacy & security" icon={Shield}>
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
            className="rounded-xl w-full sm:w-auto"
            onClick={() => setPwdOpen(true)}
          >
            Change password
          </Button>
        </div>
      </SettingsSection>

      <SettingsSupportPanel
        open={supportOpen}
        onToggle={() => setSupportOpen((v) => !v)}
        portalName="LumenX Connect Teacher Portal"
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
        className="w-full rounded-xl gap-2 text-destructive border-destructive/30 hover:bg-destructive/5 h-11 touch-manipulation"
        onClick={() => {
          signOut();
          nav({ to: "/login" });
        }}
      >
        <LogOut className="size-4" /> Sign out
      </Button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
          </DialogHeader>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <SettingsField label="Full name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ananya Iyer"
                autoComplete="name"
                className="rounded-xl"
              />
            </SettingsField>
            <SettingsField label="Experience (years)">
              <Input
                type="number"
                min={0}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                placeholder="e.g. 8"
                className="rounded-xl"
              />
            </SettingsField>
            <SettingsField label="Email">
              <Input
                value={email}
                readOnly
                disabled
                placeholder="School email"
                className="rounded-xl bg-muted/40"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Managed by your school admin</p>
            </SettingsField>
            <SettingsField label="Phone">
              <Input
                value={phone}
                readOnly
                disabled
                placeholder="Registered mobile"
                className="rounded-xl bg-muted/40"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Managed by your school admin</p>
            </SettingsField>
            <SettingsField label="Subjects">
              <Input
                value={subjectsText}
                onChange={(e) => setSubjectsText(e.target.value)}
                placeholder="e.g. Mathematics, Physics"
                className="rounded-xl"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Separate multiple subjects with commas</p>
            </SettingsField>
            <SettingsField label="Classes">
              <Input
                value={classesText}
                onChange={(e) => setClassesText(e.target.value)}
                placeholder="e.g. 10-B, 10-A, 9-A"
                className="rounded-xl"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Class sections you teach — comma separated</p>
            </SettingsField>
            <div className="sm:col-span-2">
              <SettingsField label="About">
                <Textarea
                  rows={4}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Brief introduction, teaching style, or class teacher note"
                  className="rounded-xl"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Shown on your profile when parents view teacher details
                </p>
              </SettingsField>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveProfile}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ChangePasswordDialog open={pwdOpen} onOpenChange={setPwdOpen} phone={profile.phone} />

      <FaqDialog open={faqOpen} onOpenChange={setFaqOpen} />
      <HelpCenterDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <ContactSupportDialog open={contactOpen} onOpenChange={setContactOpen} />
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <ReportIssueDialog open={issueOpen} onOpenChange={setIssueOpen} />
    </SettingsLayout>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-muted/30 p-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium break-words">{value}</div>
      </div>
    </div>
  );
}
