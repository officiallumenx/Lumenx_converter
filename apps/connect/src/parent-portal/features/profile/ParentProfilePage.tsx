import { useEffect, useRef, useState } from "react";
import { getInitials } from "@lumenx/utils";
import {
  LogOut,
  Bell,
  Lock,
  Smartphone,
  Mail,
  MessageSquare,
  UserCircle2,
  Camera,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { useApp } from "@/lib/app-state";
import { Avatar, AvatarFallback, AvatarImage, Button, Input, Switch } from "@lumenx/ui";
import { compressImageToDataUrl } from "@/lib/image-compress";
import { AppLockSettings } from "@/components/app/AppLockSettings";
import { toast } from "sonner";
import { SUPPORT_EMAIL } from "./support-content";
import {
  ParentContactSupportDialog,
  ParentFaqDialog,
  ParentFeedbackDialog,
  ParentHelpCenterDialog,
  ParentReportIssueDialog,
} from "./SupportDialogs";
import {
  SettingsLayout,
  SettingsCard,
  SettingsSection,
  SettingsRow,
  SettingsField,
  SettingsSupportPanel,
} from "@/components/app/settings/SettingsPrimitives";

import { CONNECT_APP_VERSION_LABEL } from "@/lib/app-version";

export function ParentProfilePage({ initialSection }: { initialSection?: "support" }) {
  const {
    user,
    signOut,
    theme,
    toggleTheme,
    updateProfile,
    studentIncludedMode,
    setStudentIncludedMode,
  } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [address, setAddress] = useState(user?.address ?? "");
  const [supportOpen, setSupportOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email ?? "");
    setAddress(user.address ?? "");
  }, [user]);

  useEffect(() => {
    if (initialSection === "support") setSupportOpen(true);
  }, [initialSection]);

  if (!user) {
    return (
      <SettingsLayout>
        <div className="animate-pulse space-y-4">
          <div className="settings-loading-block h-8 w-40 rounded-lg" />
          <div className="settings-loading-block h-48 rounded-2xl" />
        </div>
      </SettingsLayout>
    );
  }

  const onAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (JPG, PNG, or WebP).");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error("Photo must be 12 MB or smaller before upload.");
      return;
    }
    const tid = toast.loading("Optimizing photo…");
    try {
      const data = await compressImageToDataUrl(file);
      updateProfile({ avatar: data });
      toast.success("Profile photo updated.", { id: tid });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not process that photo.", {
        id: tid,
      });
    }
  };

  const clearAvatar = () => {
    updateProfile({ avatar: undefined });
    toast.success("Profile photo removed.");
  };

  const saveProfile = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Enter your full name.");
      return;
    }
    updateProfile({
      name: trimmed,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
    });
    toast.success("Profile saved.");
  };

  return (
    <SettingsLayout>
      <PageHeader
        title="Settings"
        subtitle="Profile, on-behalf access for your child, and preferences"
      />

      <SettingsCard>
        <div className="flex min-w-0 flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div className="relative shrink-0">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              aria-label="Upload profile photo"
              onChange={onAvatarPick}
            />
            <Avatar className="size-20 sm:size-24 ring-4 ring-primary/10">
              {user.avatar ? (
                <AvatarImage src={user.avatar} alt="" className="object-cover" />
              ) : null}
              <AvatarFallback className="bg-gradient-primary font-display text-2xl text-primary-foreground">
                {getInitials(user.name, 2)}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              aria-label="Change profile photo"
              onClick={() => fileRef.current?.click()}
              className="settings-avatar-action bg-primary text-primary-foreground shadow-glow"
            >
              <Camera className="size-4" aria-hidden />
            </button>
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h3 className="font-display text-xl font-semibold break-words">{user.name}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{user.phone}</p>
          </div>
        </div>

        <div className="mt-6 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <SettingsField label="Full name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="rounded-xl"
            />
          </SettingsField>
          <SettingsField label="Mobile">
            <Input value={user.phone} readOnly className="rounded-xl bg-muted/50" />
          </SettingsField>
          <SettingsField label="Email">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="rounded-xl"
            />
          </SettingsField>
          <SettingsField label="Address">
            <Input
              placeholder="Street, City"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              autoComplete="street-address"
              className="rounded-xl"
            />
          </SettingsField>
        </div>

        <div className="mt-5 flex min-w-0 flex-wrap justify-end gap-2 border-t border-border pt-4">
          {user.avatar && (
            <Button
              type="button"
              variant="outline"
              className="rounded-xl gap-2"
              onClick={clearAvatar}
            >
              <UserCircle2 className="size-4" /> Remove photo
            </Button>
          )}
          <Button type="button" className="settings-primary-action rounded-xl" onClick={saveProfile}>
            Save changes
          </Button>
        </div>
      </SettingsCard>

      <SettingsSection
        title="On behalf of child"
        description="Use student modules from your parent account when your child does not have their own device."
        icon={Sparkles}
      >
        <SettingsRow
          label="Include student modules"
          desc="Adds Growth to your menu — read-only learner views when your child does not have their own device. ID cards stay available for all children."
          right={<Switch checked={studentIncludedMode} onCheckedChange={setStudentIncludedMode} />}
        />
      </SettingsSection>

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
        <AppLockSettings />
        <SettingsRow
          label="Hide phone number"
          desc="From other parents and students"
          right={<Switch defaultChecked />}
        />
      </SettingsSection>

      <SettingsSupportPanel
        open={supportOpen}
        onToggle={() => setSupportOpen((v) => !v)}
        portalName="LumenX Connect Parent Portal"
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

      <ParentFaqDialog open={faqOpen} onOpenChange={setFaqOpen} />
      <ParentHelpCenterDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <ParentContactSupportDialog open={contactOpen} onOpenChange={setContactOpen} />
      <ParentFeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <ParentReportIssueDialog open={issueOpen} onOpenChange={setIssueOpen} />
    </SettingsLayout>
  );
}
