/**
 * Personal / Profile Settings workspace — signed-in user preferences.
 */
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  User,
  Palette,
  HelpCircle,
  MessageSquarePlus,
  Phone,
  Camera,
  Check,
  Mail,
  Sun,
  Moon,
  Monitor,
  Laptop,
  Smartphone,
  ExternalLink,
  LifeBuoy,
  Lock,
  Type,
  Bell,
} from "lucide-react";
import { Button, Card, CardHeader, PageStack, Pill, Select } from "@lumenx/ui-admin";
import { TextSizeControl, LumenXFeedbackForm } from "@lumenx/ui";
import {
  loadAlertChimesPreference,
  saveAlertChimesPreference,
} from "@lumenx/notifications";
import { useAuth } from "@/auth/AuthContext";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useTheme } from "@/components/theme-provider";
import { IconChip } from "@/components/IconChip";
import { AdminAppLockSettings } from "@/components/settings/AdminAppLockSettings";
import { SettingsProfileApiPanel } from "@/components/settings/SettingsProfileApiPanel";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";

type PersonalTab =
  | "profile"
  | "appearance"
  | "app-lock"
  | "text-sizes"
  | "personal-help"
  | "personal-feedback"
  | "notifications";

const TABS: { id: PersonalTab; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "app-lock", label: "App lock", icon: Lock },
  { id: "text-sizes", label: "Text sizes", icon: Type },
  { id: "personal-help", label: "Help and support", icon: HelpCircle },
  { id: "personal-feedback", label: "Feedback", icon: MessageSquarePlus },
  { id: "notifications", label: "Notifications", icon: Bell },
];

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint ? <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div> : null}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  );
}

function Inp({
  value,
  onChange,
  type = "text",
  placeholder,
  className = "",
}: {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`h-9 px-3 rounded-md bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-colors ${className}`}
    />
  );
}

function Sel({
  options,
  defaultValue,
  className = "w-44",
}: {
  options: string[];
  defaultValue?: string;
  className?: string;
}) {
  return (
    <Select fieldSize="md" defaultValue={defaultValue} className={className}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </Select>
  );
}

const SETTINGS_PROFILE_KEY = "lumenx.admin.settings-profile.v1";

function loadSettingsProfile() {
  try {
    const raw = localStorage.getItem(SETTINGS_PROFILE_KEY);
    if (raw) return JSON.parse(raw) as { name?: string; title?: string; email?: string; phone?: string };
  } catch {
    /* ignore */
  }
  return {};
}

function ProfileTab() {
  if (isApiAuthMode()) return <SettingsProfileApiPanel />;
  return <ProfileTabDemo />;
}

function ProfileTabDemo() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);
  const overlay = loadSettingsProfile();

  const [name, setName] = useState(overlay.name ?? user?.name ?? "Admin User");
  const [title, setTitle] = useState(overlay.title ?? user?.title ?? "Administrator");
  const [email, setEmail] = useState(overlay.email ?? user?.email ?? "");
  const [phone, setPhone] = useState(overlay.phone ?? user?.phone ?? "");
  const initials = user?.initials ?? name.slice(0, 2).toUpperCase();
  const institute = user?.instituteName ?? "—";
  const roleLabel = user?.role?.replace(/_/g, " ") ?? "admin";

  const handleSave = () => {
    try {
      localStorage.setItem(SETTINGS_PROFILE_KEY, JSON.stringify({ name, title, email, phone }));
    } catch {
      /* ignore */
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Logged-in profile" hint="Your identity for this Admin session" />
        <div className="px-5 pb-5">
          <div className="flex items-center gap-5 py-4 border-b border-border mb-1">
            <div className="relative group">
              <div className="size-16 rounded-full bg-gradient-to-br from-primary to-chart-5 flex items-center justify-center text-xl font-bold text-primary-foreground select-none">
                {initials}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                aria-label="Upload photo"
              >
                <Camera className="size-4 text-white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" />
            </div>
            <div>
              <div className="text-sm font-semibold">{name}</div>
              <div className="text-[11px] text-muted-foreground">
                {title} · {institute}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-1.5 text-[11px] text-primary hover:underline"
              >
                Change photo
              </button>
            </div>
          </div>

          <Row label="Full name" hint="Shown across Admin">
            <Inp value={name} onChange={(e) => setName(e.target.value)} className="w-52" />
          </Row>
          <Row label="Title / Designation">
            <Inp value={title} onChange={(e) => setTitle(e.target.value)} className="w-44" />
          </Row>
          <Row label="Email address" hint="Login identity">
            <Inp type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-56" />
          </Row>
          <Row label="Phone number">
            <Inp type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-44" />
          </Row>
          <Row label="Role">
            <Pill tone="info">{roleLabel.replace(/\b\w/g, (c) => c.toUpperCase())}</Pill>
          </Row>

          <div className="pt-4 flex gap-2">
            <Button variant="primary" onClick={handleSave}>
              {saved ? (
                <>
                  <Check className="size-3.5" /> Saved
                </>
              ) : (
                "Save changes"
              )}
            </Button>
            <Button>Cancel</Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Account" hint="Session details for the signed-in user" />
        <div className="px-5 pb-5">
          <Row label="Institute">
            <span className="text-xs text-muted-foreground">{institute}</span>
          </Row>
          <Row label="Last login">
            <span className="text-xs text-muted-foreground">
              {user?.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleString("en-IN")
                : "This session"}
            </span>
          </Row>
        </div>
      </Card>
    </div>
  );
}

function AppearanceTab() {
  const { theme, set } = useTheme();
  const [density, setDensity] = useState<"compact" | "default" | "comfortable">("default");
  const [colorScheme, setColorScheme] = useState("indigo");

  const themes = [
    { id: "light" as const, label: "Light", icon: Sun },
    { id: "dark" as const, label: "Dark", icon: Moon },
  ];

  const colors = [
    { id: "indigo", hex: "#6366f1", label: "Indigo" },
    { id: "blue", hex: "#3b82f6", label: "Blue" },
    { id: "emerald", hex: "#10b981", label: "Emerald" },
    { id: "violet", hex: "#8b5cf6", label: "Violet" },
    { id: "rose", hex: "#f43f5e", label: "Rose" },
    { id: "amber", hex: "#f59e0b", label: "Amber" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Theme"
          hint="Light or Dark · default Light · does not follow system"
        />
        <div className="px-5 pb-5">
          <div className="grid grid-cols-2 gap-3 pt-2 max-w-sm">
            {themes.map(({ id, label, icon: Icon }) => {
              const active = theme === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => set(id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    active
                      ? "border-primary bg-primary/8"
                      : "border-border hover:border-border-strong bg-surface"
                  }`}
                >
                  <IconChip icon={Icon} size="sm" variant="brand" active={active} />
                  <span className="text-xs font-medium">{label}</span>
                  {active ? <span className="size-1.5 rounded-full bg-primary" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Accent Color" hint="Primary color used across the interface" />
        <div className="px-5 pb-5 pt-2">
          <div className="flex flex-wrap gap-3">
            {colors.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setColorScheme(c.id)}
                title={c.label}
                className={`size-8 rounded-full border-2 transition-all ${
                  colorScheme === c.id
                    ? "border-foreground scale-110"
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: c.hex }}
              >
                {colorScheme === c.id ? (
                  <Check className="size-3.5 text-white mx-auto" />
                ) : null}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Color changes apply after page refresh.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Layout & Density" hint="Control spacing and information density" />
        <div className="px-5 pb-5">
          <Row
            label="Interface density"
            hint="Compact fits more; comfortable gives more breathing room"
          >
            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
              {(["compact", "default", "comfortable"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDensity(d)}
                  className={`px-3 py-1.5 capitalize transition-colors ${
                    density === d ? "bg-primary text-primary-foreground" : "hover:bg-surface-hover"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Sidebar" hint="Show or collapse the navigation sidebar">
            <Sel options={["Always visible", "Auto-collapse", "Icon only"]} />
          </Row>
          <Row label="Animations" hint="Page transitions and micro-interactions">
            <Sel options={["Enabled", "Reduced", "Disabled"]} />
          </Row>
        </div>
      </Card>

      <Card>
        <CardHeader title="Device Preview" hint="How the interface looks on different screens" />
        <div className="px-5 pb-5 flex flex-wrap gap-3 pt-2">
          {[
            { icon: Monitor, label: "Desktop", desc: "1440px+" },
            { icon: Laptop, label: "Laptop", desc: "1024-1440" },
            { icon: Smartphone, label: "Mobile", desc: "375-768" },
          ].map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="flex-1 min-w-[120px] p-4 rounded-xl border border-border bg-surface text-center"
            >
              <Icon className="size-5 mx-auto text-muted-foreground mb-2" />
              <div className="text-xs font-medium">{label}</div>
              <div className="text-[10px] text-muted-foreground font-mono">{desc}</div>
              <Pill tone="success">Responsive</Pill>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function TextSizesTab() {
  return (
    <Card>
      <CardHeader
        title="Text sizes"
        hint="Small, Default, Large, or Very Large · default is Default"
      />
      <div className="px-5 pb-5 space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Applies across Admin on this device. Does not follow system font scale.
        </p>
        <TextSizeControl className="max-w-lg" />
      </div>
    </Card>
  );
}

function NotificationsPrefsTab() {
  const [alertChimes, setAlertChimes] = useState(() => loadAlertChimesPreference());

  useEffect(() => {
    saveAlertChimesPreference(alertChimes);
  }, [alertChimes]);

  return (
    <Card>
      <CardHeader title="Notifications" hint="Personal alert preferences on this device" />
      <div className="px-5 pb-5">
        <Row
          label="Play alert chime"
          hint="Urgent tone for red alerts · soft tone for normal notifications"
        >
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={alertChimes}
              onChange={(e) => setAlertChimes(e.target.checked)}
              className="size-4 rounded border-border"
            />
            {alertChimes ? "On" : "Off"}
          </label>
        </Row>
        <Row label="Inbox" hint="Open the notification center to manage broadcasts">
          <Link
            to="/notifications"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Open {M.notifications}
            <ExternalLink className="size-3 opacity-70" />
          </Link>
        </Row>
      </div>
    </Card>
  );
}

function PersonalHelpTab() {
  return (
    <Card>
      <CardHeader
        title="Help and support"
        hint="Shortcuts for your signed-in Admin session"
      />
      <div className="px-5 pb-5 flex flex-wrap gap-2">
        <Link
          to="/settings"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          <LifeBuoy className="size-3.5" /> Help center and FAQs
        </Link>
        <Link
          to="/settings"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-surface-hover"
        >
          <Phone className="size-3.5" /> Contact support
        </Link>
        <a
          href="mailto:lumenxtech.official@gmail.com"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-surface-hover"
        >
          <Mail className="size-3.5" /> Email support
        </a>
      </div>
    </Card>
  );
}

function FeedbackTab() {
  return (
    <Card>
      <CardHeader title="Feedback" hint="Your personal product feedback to LumenX" />
      <div className="px-5 pb-5 pt-1">
        <LumenXFeedbackForm source="admin" />
      </div>
    </Card>
  );
}

export function PersonalSettingsWorkspace() {
  const [tab, setTab] = useState<PersonalTab>("profile");

  return (
    <PageStack>
      <div className="flex gap-1 overflow-x-auto pb-1 -mb-1 lx-sidebar-scroll">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
              tab === id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
            }`}
          >
            <IconChip icon={Icon} size="xs" variant="soft" active={tab === id} />
            {label}
          </button>
        ))}
      </div>

      <div>
        {tab === "profile" ? <ProfileTab /> : null}
        {tab === "appearance" ? <AppearanceTab /> : null}
        {tab === "app-lock" ? <AdminAppLockSettings /> : null}
        {tab === "text-sizes" ? <TextSizesTab /> : null}
        {tab === "personal-help" ? <PersonalHelpTab /> : null}
        {tab === "personal-feedback" ? <FeedbackTab /> : null}
        {tab === "notifications" ? <NotificationsPrefsTab /> : null}
      </div>
    </PageStack>
  );
}
