import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { useApp } from "@/lib/app-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import type { LucideIcon } from "lucide-react";
import {
  Camera,
  LogOut,
  Bell,
  Lock,
  Smartphone,
  Mail,
  MessageSquare,
  UserCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { compressImageToDataUrl } from "@/lib/image-compress";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Unify" }] }),
  component: () => (
    <AppShell>
      <ProfilePage />
    </AppShell>
  ),
});

function ProfilePage() {
  const {
    user,
    signOut,
    theme,
    toggleTheme,
    role,
    updateProfile,
    studentIncludedMode,
    setStudentIncludedMode,
  } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [address, setAddress] = useState(user?.address ?? "");

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email ?? "");
    setAddress(user.address ?? "");
  }, [user]);

  if (!user) return null;

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
    <div className="min-w-0 max-w-full">
      <PageHeader title="Profile & settings" />

      <div className="mb-6 min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-6">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <div className="relative shrink-0">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={onAvatarPick}
            />
            <Avatar className="size-20 ring-4 ring-primary/10">
              {user.avatar ? (
                <AvatarImage src={user.avatar} alt="" className="object-cover" />
              ) : null}
              <AvatarFallback className="bg-gradient-primary font-display text-2xl text-primary-foreground">
                {user.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              aria-label="Change profile photo"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow touch-manipulation"
            >
              <Camera className="size-4" />
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-xl font-semibold break-words">{user.name}</h3>
            <div className="text-sm text-muted-foreground">{user.phone}</div>
          </div>
        </div>
        <div className="mt-5 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Full name">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Field>
          <Field label="Mobile">
            <Input value={user.phone} readOnly className="bg-muted/50" />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </Field>
          <Field label="Address">
            <Input
              placeholder="Street, City"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              autoComplete="street-address"
            />
          </Field>
        </div>
        <div className="mt-4 flex min-w-0 flex-wrap justify-end gap-2">
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
          <Button type="button" className="rounded-xl" onClick={saveProfile}>
            Save changes
          </Button>
        </div>
      </div>

      {role === "parent" && (
        <Section title="Family access" icon={UserCircle2}>
          <Row
            label="Student included mode"
            desc="When on, Growth, Digital ID, and assignment submission (on behalf of your learner) appear in navigation—useful when they do not carry their own phone. Messages and search stay scoped to the active child."
            right={
              <Switch checked={studentIncludedMode} onCheckedChange={setStudentIncludedMode} />
            }
          />
        </Section>
      )}

      <Section title="Appearance">
        <Row
          label="Dark mode"
          desc="Premium dark palette with high contrast"
          right={<Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />}
        />
      </Section>

      <Section title="Notification preferences" icon={Bell}>
        <Row
          label="Push notifications"
          desc="Real-time alerts on your device"
          right={<Switch defaultChecked />}
          icon={Smartphone}
        />
        <Row
          label="WhatsApp alerts"
          desc="For attendance, results & emergencies"
          right={<Switch defaultChecked />}
          icon={MessageSquare}
        />
        <Row
          label="Email digest"
          desc="Weekly summary every Sunday"
          right={<Switch />}
          icon={Mail}
        />
      </Section>

      <Section title="Security & privacy" icon={Lock}>
        <Row label="App lock" desc="Require biometrics to open the app" right={<Switch />} />
        <Row
          label="Hide phone number"
          desc="From other parents and students"
          right={<Switch defaultChecked />}
        />
      </Section>

      <Button
        variant="outline"
        className="w-full min-w-0 rounded-xl gap-2 text-destructive hover:text-destructive"
        onClick={signOut}
      >
        <LogOut className="size-4" /> Sign out
      </Button>
    </div>
  );
}

function Section({
  title,
  children,
  icon: Icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="mb-4 min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <h3 className="mb-3 flex min-w-0 items-center gap-2 font-semibold">
        {Icon && <Icon className="size-4 shrink-0 text-primary" />}
        <span className="min-w-0 break-words">{title}</span>
      </h3>
      <div className="min-w-0 divide-y divide-border">{children}</div>
    </div>
  );
}
function Row({
  label,
  desc,
  right,
  icon: Icon,
}: {
  label: string;
  desc?: string;
  right: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 py-3 first:pt-0 last:pb-0">
      {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium break-words">{label}</div>
        {desc && <div className="text-xs text-muted-foreground break-words">{desc}</div>}
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
