import { createFileRoute, useSearch } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { IconChip } from "@/components/IconChip";
import { Card, CardHeader, Button, PageStack, Pill } from "@lumenx/ui-admin";
import { AuditActivityPanel } from "@/components/AuditActivityPanel";
import { useTheme } from "@/components/theme-provider";
import { useState, useRef } from "react";
import {
  User, Palette, Building2, ShieldCheck, Bell, HelpCircle,
  MessageSquarePlus, Phone, LogOut, Camera, Check, ChevronDown,
  ChevronRight, Star, Mail, Globe, MapPin, Clock, Sun, Moon,
  Monitor, Laptop, Smartphone, KeyRound, Lock, Eye, EyeOff,
  BellRing, BellOff, Megaphone, AlertTriangle, Send, ExternalLink,
  BookOpen, Layers, FileText, Linkedin, Twitter, Youtube,
} from "lucide-react";
import { useSignOut } from "@/auth/hooks/useSignOut";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — LumenX Admin" }] }),
  component: SettingsPage,
});

type SettingsTab =
  | "profile"
  | "appearance"
  | "institute"
  | "security"
  | "notifications"
  | "faqs"
  | "feedback"
  | "contact"
  | "audit";

const TABS: { id: SettingsTab; label: string; icon: typeof User }[] = [
  { id: "profile",       label: "My Profile",      icon: User            },
  { id: "appearance",    label: "Appearance",       icon: Palette         },
  { id: "institute",     label: "Institute",        icon: Building2       },
  { id: "security",      label: "Security",         icon: ShieldCheck     },
  { id: "notifications", label: "Notifications",    icon: Bell            },
  { id: "faqs",          label: "FAQs",             icon: HelpCircle      },
  { id: "feedback",      label: "Feedback",         icon: MessageSquarePlus },
  { id: "contact",       label: "Contact & Support",icon: Phone           },
  { id: "audit",         label: "Audit Log",        icon: Layers          },
];

/* ─── Reusable row ─────────────────────────────────────────────── */
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
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

/* ─── Input helper ─────────────────────────────────────────────── */
function Inp({
  defaultValue,
  type = "text",
  placeholder,
  className = "",
}: {
  defaultValue?: string;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className={`h-9 px-3 rounded-md bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-colors ${className}`}
    />
  );
}

/* ─── Select helper ────────────────────────────────────────────── */
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
    <select
      defaultValue={defaultValue}
      className={`h-9 px-3 rounded-md bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 ${className}`}
    >
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}

/* ─── Toggle switch ────────────────────────────────────────────── */
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 transition-colors duration-200 ${
        checked ? "border-primary bg-primary" : "border-border bg-muted"
      }`}
    >
      <span
        className={`pointer-events-none block size-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-3.5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

/* ─── FAQ accordion item ───────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 py-4 text-left text-sm font-medium hover:text-primary transition-colors"
      >
        {q}
        <ChevronDown
          className={`size-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="pb-4 text-[12px] text-muted-foreground leading-relaxed">{a}</p>
      )}
    </div>
  );
}

/* ─── Star rating ──────────────────────────────────────────────── */
function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
        >
          <Star
            className={`size-6 transition-colors ${
              n <= (hovered || value) ? "text-warning fill-warning" : "text-border"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TAB PANELS
═══════════════════════════════════════════════════════════════════ */

function ProfileTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Personal Information" hint="Your identity across LumenX Admin" />
        <div className="px-5 pb-5">
          {/* Avatar upload */}
          <div className="flex items-center gap-5 py-4 border-b border-border mb-1">
            <div className="relative group">
              <div className="size-16 rounded-full bg-gradient-to-br from-primary to-chart-5 flex items-center justify-center text-xl font-bold text-primary-foreground select-none">
                AV
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Upload photo"
              >
                <Camera className="size-4 text-white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" />
            </div>
            <div>
              <div className="text-sm font-semibold">Dr. Ananya Verma</div>
              <div className="text-[11px] text-muted-foreground">Principal · LumenX International School</div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-1.5 text-[11px] text-primary hover:underline"
              >
                Change photo
              </button>
            </div>
          </div>

          <Row label="Full name" hint="Shown across all admin views">
            <Inp defaultValue="Dr. Ananya Verma" className="w-52" />
          </Row>
          <Row label="Title / Designation" hint="Principal, VP, Coordinator…">
            <Inp defaultValue="Principal" className="w-44" />
          </Row>
          <Row label="Email address" hint="Used for login and alerts">
            <Inp type="email" defaultValue="ananya.verma@lumenx.edu" className="w-56" />
          </Row>
          <Row label="Phone number" hint="For OTP and emergency contact">
            <Inp type="tel" defaultValue="+91 98765 43210" className="w-44" />
          </Row>
          <Row label="Department / Role" hint="Organizational classification">
            <Sel options={["Administration", "Academics", "Finance", "HR"]} defaultValue="Administration" />
          </Row>
          <Row label="Language" hint="Interface language">
            <Sel options={["English (India)", "Hindi", "Tamil", "Telugu", "Kannada"]} />
          </Row>

          <div className="pt-4 flex gap-2">
            <Button variant="primary" onClick={handleSave}>
              {saved ? <><Check className="size-3.5" /> Saved</> : "Save changes"}
            </Button>
            <Button>Cancel</Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Account" hint="Login credentials and linked accounts" />
        <div className="px-5 pb-5">
          <Row label="Account ID" hint="Read-only unique identifier">
            <span className="text-xs font-mono text-muted-foreground">LX-ADMIN-00142</span>
          </Row>
          <Row label="Account type" hint="Your current access level">
            <Pill tone="info">Super Admin</Pill>
          </Row>
          <Row label="Last login" hint="Most recent session">
            <span className="text-xs text-muted-foreground">Today, 5:42 PM · Chrome · Windows</span>
          </Row>
          <Row label="Active sessions" hint="Devices currently signed in">
            <Button size="sm">View all sessions</Button>
          </Row>
        </div>
      </Card>
    </div>
  );
}

function AppearanceTab() {
  const { theme, set } = useTheme();
  const [density, setDensity] = useState<"compact" | "default" | "comfortable">("default");
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">("md");
  const [colorScheme, setColorScheme] = useState("indigo");

  const themes = [
    { id: "light",  label: "Light",  icon: Sun     },
    { id: "dark",   label: "Dark",   icon: Moon    },
    { id: "system", label: "System", icon: Monitor },
  ] as const;

  const colors = [
    { id: "indigo",  hex: "#6366f1", label: "Indigo"  },
    { id: "blue",    hex: "#3b82f6", label: "Blue"    },
    { id: "emerald", hex: "#10b981", label: "Emerald" },
    { id: "violet",  hex: "#8b5cf6", label: "Violet"  },
    { id: "rose",    hex: "#f43f5e", label: "Rose"    },
    { id: "amber",   hex: "#f59e0b", label: "Amber"   },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Theme" hint="Choose how LumenX Admin looks" />
        <div className="px-5 pb-5">
          <div className="grid grid-cols-3 gap-3 pt-2">
            {themes.map(({ id, label, icon: Icon }) => {
              const active = theme === id || (id === "system" && false);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => id !== "system" && set(id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    theme === id
                      ? "border-primary bg-primary/8"
                      : "border-border hover:border-border-strong bg-surface"
                  }`}
                >
                  <IconChip icon={Icon} size="sm" variant="brand" active={theme === id} />
                  <span className="text-xs font-medium">{label}</span>
                  {theme === id && (
                    <span className="size-1.5 rounded-full bg-primary" />
                  )}
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
                  colorScheme === c.id ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: c.hex }}
              >
                {colorScheme === c.id && (
                  <Check className="size-3.5 text-white mx-auto" />
                )}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">Color changes apply after page refresh.</p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Layout & Density" hint="Control spacing and information density" />
        <div className="px-5 pb-5">
          <Row label="Interface density" hint="Compact fits more; comfortable gives more breathing room">
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
          <Row label="Font size" hint="Base size for body text">
            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
              {(["sm", "md", "lg"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFontSize(s)}
                  className={`px-4 py-1.5 uppercase transition-colors ${
                    fontSize === s ? "bg-primary text-primary-foreground" : "hover:bg-surface-hover"
                  }`}
                >
                  {s}
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
            { icon: Monitor,    label: "Desktop",  desc: "1440px+"   },
            { icon: Laptop,     label: "Laptop",   desc: "1024-1440" },
            { icon: Smartphone, label: "Mobile",   desc: "375-768"   },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex-1 min-w-[120px] p-4 rounded-xl border border-border bg-surface text-center">
              <Icon className="size-5 mx-auto text-muted-foreground mb-2" />
              <div className="text-xs font-medium">{label}</div>
              <div className="text-[10px] text-muted-foreground font-mono">{desc}</div>
              <Pill tone="success" className="mt-2">Responsive</Pill>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function InstituteTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Institute Details" hint="Core identity of your institute" />
        <div className="px-5 pb-5">
          <Row label="Institute name" hint="Displayed across all portals and documents">
            <Inp defaultValue="LumenX International School" className="w-64" />
          </Row>
          <Row label="Tagline / Motto" hint="Shown on certificates and correspondence">
            <Inp defaultValue="Excellence Through Knowledge" className="w-64" />
          </Row>
          <Row label="Type" hint="School, College, University…">
            <Sel options={["School (K-12)", "Junior College", "Degree College", "University"]} defaultValue="School (K-12)" />
          </Row>
          <Row label="Affiliation board" hint="Governing educational board">
            <Sel options={["CBSE", "ICSE", "State Board", "IB", "Cambridge"]} defaultValue="CBSE" />
          </Row>
          <Row label="Established year" hint="Year of establishment">
            <Inp defaultValue="1998" className="w-28" />
          </Row>
          <Row label="UDISE code" hint="Unique identifier issued by MoE">
            <Inp defaultValue="09140104601" className="w-40" />
          </Row>
          <div className="pt-4">
            <Button variant="primary">Save details</Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Academic Configuration" hint="Session, calendar, and operational days" />
        <div className="px-5 pb-5">
          <Row label="Academic session" hint="Current academic year">
            <Sel options={["2025 — 2026", "2024 — 2025", "2026 — 2027"]} defaultValue="2025 — 2026" />
          </Row>
          <Row label="Term structure" hint="Semester or term-based curriculum">
            <Sel options={["2 Terms", "3 Terms", "Semester system", "Annual"]} defaultValue="2 Terms" />
          </Row>
          <Row label="Working days" hint="Mon – Sat by default">
            <Button size="sm">Configure</Button>
          </Row>
          <Row label="Class periods per day" hint="Number of instructional periods">
            <Inp defaultValue="8" className="w-20" />
          </Row>
          <Row label="Period duration" hint="Minutes per class period">
            <Sel options={["40 min", "45 min", "50 min", "60 min"]} defaultValue="45 min" />
          </Row>
        </div>
      </Card>

      <Card>
        <CardHeader title="Location & Contact" hint="Address and communication details" />
        <div className="px-5 pb-5">
          <Row label="Address" hint="Registered institute address">
            <Inp defaultValue="12 Education Ave, Hyderabad, TG 500032" className="w-72" />
          </Row>
          <Row label="City / District" hint="">
            <Inp defaultValue="Hyderabad" className="w-40" />
          </Row>
          <Row label="State" hint="">
            <Sel options={["Telangana", "Andhra Pradesh", "Karnataka", "Maharashtra", "Tamil Nadu"]} />
          </Row>
          <Row label="Official phone" hint="Main reception number">
            <Inp defaultValue="+91 40 2345 6789" className="w-44" />
          </Row>
          <Row label="Official email" hint="Correspondence email">
            <Inp type="email" defaultValue="info@lumenx.edu" className="w-52" />
          </Row>
          <Row label="Website" hint="Institute website URL">
            <Inp defaultValue="www.lumenx.edu" className="w-52" />
          </Row>
          <div className="pt-4">
            <Button variant="primary">Save contact</Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Branches" hint="Multi-branch management" action={
          <Button variant="primary" size="sm">Add branch</Button>
        } />
        <div className="px-5 pb-5 space-y-2 pt-1">
          {[
            { name: "Branch Alpha · Headquarters", city: "Hyderabad",  students: 1240, status: "Active"   },
            { name: "Branch Beta · Downtown",       city: "Secunderabad", students: 860, status: "Active" },
            { name: "Branch Gamma · North Campus",  city: "Kompally",   students: 640, status: "Active"   },
          ].map((b) => (
            <div key={b.name} className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-background/40 gap-3">
              <div>
                <div className="text-xs font-medium">{b.name}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{b.city} · {b.students.toLocaleString()} students</div>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone="success">{b.status}</Pill>
                <Button size="sm">Manage</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SecurityTab() {
  const [showPwd, setShowPwd] = useState(false);
  const [twoFa, setTwoFa] = useState(true);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const signOut = useSignOut();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Change Password" hint="Keep your account secure with a strong password" />
        <div className="px-5 pb-5 space-y-3 pt-2">
          <div>
            <label className="block text-xs font-medium mb-1.5">Current password</label>
            <div className="relative w-full max-w-xs">
              <input
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                className="w-full h-9 px-3 pr-10 rounded-md bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPwd ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">New password</label>
            <Inp type="password" placeholder="Min 8 characters" className="w-full max-w-xs" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Confirm new password</label>
            <Inp type="password" placeholder="Re-enter new password" className="w-full max-w-xs" />
          </div>
          <div className="pt-2">
            <Button variant="primary">Update password</Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Two-Factor Authentication" hint="Add an extra layer of security to your account" />
        <div className="px-5 pb-5">
          <Row label="SMS OTP" hint="Receive a one-time code via SMS on login">
            <Toggle checked={twoFa} onChange={setTwoFa} />
          </Row>
          <Row label="Authenticator app" hint="Google Authenticator, Authy, etc.">
            <Button size="sm">Configure</Button>
          </Row>
          <Row label="Backup codes" hint="Download one-time backup codes">
            <Button size="sm">Generate</Button>
          </Row>
        </div>
      </Card>

      <Card>
        <CardHeader title="Sessions & Access" hint="Manage active sessions and access rules" />
        <div className="px-5 pb-5">
          <Row label="Session timeout" hint="Auto-logout after inactivity">
            <Sel options={["15 min", "30 min", "1 hour", "4 hours", "Never"]} defaultValue="30 min" />
          </Row>
          <Row label="Login alerts" hint="Email notification on new sign-in">
            <Toggle checked={loginAlerts} onChange={setLoginAlerts} />
          </Row>
          <Row label="Audit log retention" hint="How long admin activity is stored">
            <Sel options={["30 days", "90 days", "1 year", "Forever"]} defaultValue="90 days" />
          </Row>
          <Row label="Active sessions" hint="2 devices currently signed in">
            <Button size="sm">Manage sessions</Button>
          </Row>
          <Row label="IP allowlist" hint="Restrict access to specific IP ranges">
            <Button size="sm">Configure</Button>
          </Row>
        </div>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader title="Danger Zone" hint="Irreversible account actions" />
        <div className="px-5 pb-5 space-y-3">
          <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/[0.04]">
            <div>
              <div className="text-xs font-semibold text-destructive">Sign out all devices</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">End all active sessions immediately</div>
            </div>
            <Button size="sm" onClick={signOut}>Sign out all</Button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/[0.04]">
            <div>
              <div className="text-xs font-semibold text-destructive">Sign out</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">End your current session</div>
            </div>
            <Button size="sm" onClick={signOut}>
              <LogOut className="size-3.5" /> Sign out
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    emailAlerts: true,
    smsAlerts: false,
    pushAlerts: true,
    attendanceDigest: true,
    examReminders: true,
    feeAlerts: true,
    complaintUpdates: true,
    announcementCopies: false,
    systemUpdates: true,
    weeklyReport: true,
  });
  const set = (k: keyof typeof prefs) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Delivery Channels" hint="How you receive notifications" />
        <div className="px-5 pb-5">
          <Row label="Email notifications" hint="Sent to your registered email address">
            <Toggle checked={prefs.emailAlerts} onChange={() => set("emailAlerts")} />
          </Row>
          <Row label="SMS alerts" hint="Critical alerts via text message">
            <Toggle checked={prefs.smsAlerts} onChange={() => set("smsAlerts")} />
          </Row>
          <Row label="Push notifications" hint="In-browser desktop push alerts">
            <Toggle checked={prefs.pushAlerts} onChange={() => set("pushAlerts")} />
          </Row>
          <Row label="Quiet hours" hint="Pause notifications during specific hours">
            <Button size="sm">Configure</Button>
          </Row>
        </div>
      </Card>

      <Card>
        <CardHeader title="Academic Alerts" hint="Module-specific notification preferences" />
        <div className="px-5 pb-5">
          <Row label="Attendance digest" hint="Daily summary of attendance across all classes">
            <Toggle checked={prefs.attendanceDigest} onChange={() => set("attendanceDigest")} />
          </Row>
          <Row label="Exam reminders" hint="Alerts before scheduled examinations">
            <Toggle checked={prefs.examReminders} onChange={() => set("examReminders")} />
          </Row>
          <Row label="Fee payment alerts" hint="Due date reminders and payment confirmations">
            <Toggle checked={prefs.feeAlerts} onChange={() => set("feeAlerts")} />
          </Row>
          <Row label="Complaint updates" hint="Status changes on open complaints">
            <Toggle checked={prefs.complaintUpdates} onChange={() => set("complaintUpdates")} />
          </Row>
          <Row label="Announcement copies" hint="Copy of all outgoing announcements">
            <Toggle checked={prefs.announcementCopies} onChange={() => set("announcementCopies")} />
          </Row>
        </div>
      </Card>

      <Card>
        <CardHeader title="System & Reports" hint="Platform-level notification preferences" />
        <div className="px-5 pb-5">
          <Row label="System updates" hint="Product updates, maintenance windows, new features">
            <Toggle checked={prefs.systemUpdates} onChange={() => set("systemUpdates")} />
          </Row>
          <Row label="Weekly performance report" hint="Automated weekly summary delivered on Monday">
            <Toggle checked={prefs.weeklyReport} onChange={() => set("weeklyReport")} />
          </Row>
          <Row label="Report frequency" hint="How often you receive automated reports">
            <Sel options={["Daily", "Weekly", "Bi-weekly", "Monthly"]} defaultValue="Weekly" />
          </Row>
        </div>
      </Card>
    </div>
  );
}

function FaqsTab() {
  const faqs = [
    {
      q: "How do I add a new student to the system?",
      a: "Go to Students in the sidebar, click 'Add student', fill in the admission form, and click Save. You can also bulk-import students using a CSV file from the Import option in the toolbar.",
    },
    {
      q: "How do I generate a Transfer Certificate (TC)?",
      a: "Navigate to Documents & Records Studio → Generate. Select the student(s), choose the 'Transfer Certificate' template, preview the generated document, and proceed to publish it. The student and parent portals will automatically reflect it once published.",
    },
    {
      q: "How do I set up or change the timetable?",
      a: "Go to Timetable in the sidebar. Click 'New timetable' to start from scratch or edit an existing one. Use the visual drag-and-drop scheduler to assign subjects and teachers to periods. Click 'Publish' to make it visible in the student and parent portals.",
    },
    {
      q: "How do I approve a leave request?",
      a: "Navigate to Leave Center. Open the pending request, review the details, then click 'Approve' or 'Reject'. An automatic notification will be sent to the requesting teacher or student.",
    },
    {
      q: "How do I export attendance or marks reports?",
      a: "From the Reporting Center (sidebar → Reports), select the report type, apply date and class filters, then click 'Export' to download as PDF or Excel. You can also schedule automated report emails.",
    },
    {
      q: "How do I manage admin roles and permissions?",
      a: "Go to Permissions in the sidebar. Create or edit roles, assign modules each role can access, and specify read/write/delete permissions per module. Assign these roles to individual accounts from the Accounts & Access page.",
    },
    {
      q: "What are the different subscription plans?",
      a: "LumenX Admin offers Core (up to 500 students), Plus (up to 5,000 students / 3 branches), Max (up to 20,000 students / 10 branches), and Custom (unlimited scale). You can compare and switch plans from Modules & Plan.",
    },
    {
      q: "How do I configure branch settings?",
      a: "Under Settings → Institute, scroll to the Branches section. Click 'Add branch' to create a new branch or 'Manage' to edit an existing one. Each branch has its own data, timetables, and staff configurations.",
    },
    {
      q: "Can I connect LumenX Admin to the parent and student portals?",
      a: "Yes. LumenX Admin is the backend platform for the Connect portals. Data published in Admin (attendance, marks, documents, announcements) automatically syncs to the student, parent, and teacher views in Connect.",
    },
    {
      q: "How do I contact support?",
      a: "Click the 'Contact & Support' tab in Settings, or write to support@lumenx.app. For urgent issues, use the live chat or call the support hotline during business hours.",
    },
  ];

  return (
    <Card>
      <CardHeader
        title="Frequently Asked Questions"
        hint="Common queries about using LumenX Admin"
      />
      <div className="px-5 pb-5">
        {faqs.map((f) => (
          <FaqItem key={f.q} q={f.q} a={f.a} />
        ))}
      </div>
    </Card>
  );
}

function FeedbackTab() {
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState("General");
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Card>
        <div className="px-6 py-16 text-center">
          <div className="size-14 mx-auto rounded-full bg-success/15 border border-success/25 flex items-center justify-center mb-4">
            <Check className="size-6 text-success" />
          </div>
          <h3 className="text-base font-semibold">Thank you for your feedback!</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            Your input helps us improve LumenX Admin for every institute. We read every submission.
          </p>
          <Button className="mt-6" onClick={() => { setSubmitted(false); setRating(0); setText(""); }}>
            Submit another
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Share Your Feedback" hint="Help us improve LumenX Admin" />
        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-5 pt-2">
          {/* Rating */}
          <div>
            <label className="block text-xs font-medium mb-2">How would you rate your experience?</label>
            <StarRating value={rating} onChange={setRating} />
            <div className="text-[11px] text-muted-foreground mt-1.5">
              {rating === 0 ? "Tap to rate" : ["", "Poor", "Fair", "Good", "Very good", "Excellent!"][rating]}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium mb-1.5">Category</label>
            <div className="flex flex-wrap gap-2">
              {["General", "Bug report", "Feature request", "UI/UX", "Performance", "Documentation"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                    category === c
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-surface hover:bg-surface-hover"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Text */}
          <div>
            <label className="block text-xs font-medium mb-1.5">Your message</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe your experience, suggest improvements, or report an issue…"
              rows={5}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-colors"
            />
            <div className="text-[10px] text-muted-foreground mt-1 text-right">{text.length} / 1000</div>
          </div>

          {/* Attach screenshot */}
          <div>
            <label className="block text-xs font-medium mb-1.5">Attach screenshot (optional)</label>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <div className="h-9 px-4 rounded-lg border border-dashed border-border bg-surface hover:bg-surface-hover text-xs flex items-center gap-1.5 transition-colors">
                  <Camera className="size-3.5 text-muted-foreground" /> Choose file
                </div>
                <input type="file" accept="image/*" className="sr-only" />
              </label>
              <span className="text-[11px] text-muted-foreground">PNG, JPG up to 5 MB</span>
            </div>
          </div>

          <Button variant="primary" type="submit" disabled={rating === 0}>
            <Send className="size-3.5" /> Submit feedback
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Feature Requests" hint="Vote on upcoming improvements" />
        <div className="px-5 pb-5 space-y-2 pt-1">
          {[
            { title: "Bulk student document generation",     votes: 128, status: "In progress" },
            { title: "Parent attendance view in Connect",    votes: 94,  status: "Planned"     },
            { title: "AI-powered analytics insights",        votes: 87,  status: "Exploring"   },
            { title: "WhatsApp notification integration",    votes: 76,  status: "Planned"     },
            { title: "Dark mode for Connect portals",        votes: 64,  status: "In progress" },
          ].map((f) => (
            <div key={f.title} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-background/40">
              <button
                type="button"
                className="flex flex-col items-center min-w-[3rem] py-1 px-2 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/8 transition-all group"
              >
                <ChevronDown className="size-3.5 rotate-180 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs font-mono font-semibold mt-0.5">{f.votes}</span>
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium">{f.title}</div>
              </div>
              <Pill tone={f.status === "In progress" ? "info" : f.status === "Planned" ? "neutral" : "warning"}>
                {f.status}
              </Pill>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ContactTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            icon: Mail,
            title: "Email Support",
            value: "support@lumenx.app",
            hint: "We reply within 4 business hours",
            action: "Send email",
          },
          {
            icon: Phone,
            title: "Phone Support",
            value: "+91 80 4567 8900",
            hint: "Mon – Fri, 9 AM – 6 PM IST",
            action: "Call now",
          },
          {
            icon: Globe,
            title: "Help Center",
            value: "help.lumenx.app",
            hint: "Guides, tutorials, release notes",
            action: "Visit docs",
          },
        ].map(({ icon: Icon, title, value, hint, action }) => (
          <Card key={title} className="p-5">
            <IconChip icon={Icon} size="md" variant="brand" className="mb-3" />
            <div className="text-sm font-semibold mb-0.5">{title}</div>
            <div className="text-xs font-medium text-primary">{value}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>
            <Button size="sm" className="mt-3">
              {action} <ExternalLink className="size-3" />
            </Button>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Office Address" hint="Visit or send correspondence" />
        <div className="px-5 pb-5">
          <div className="flex gap-4 py-3">
            <IconChip icon={MapPin} size="sm" variant="soft" />
            <div>
              <div className="text-xs font-semibold">LumenX Technologies Pvt. Ltd.</div>
              <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                4th Floor, Innovation Tower<br />
                HITEC City, Madhapur<br />
                Hyderabad, Telangana 500081<br />
                India
              </div>
            </div>
          </div>
          <div className="flex gap-4 py-3 border-t border-border">
            <IconChip icon={Clock} size="sm" variant="soft" />
            <div>
              <div className="text-xs font-semibold">Business Hours</div>
              <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                Monday – Friday: 9:00 AM – 6:00 PM IST<br />
                Saturday: 10:00 AM – 2:00 PM IST<br />
                Sunday: Closed
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Send a Message" hint="We'll get back to you within one business day" />
        <div className="px-5 pb-5 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium mb-1.5">Your name</label>
              <Inp defaultValue="Dr. Ananya Verma" className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Email</label>
              <Inp type="email" defaultValue="ananya.verma@lumenx.edu" className="w-full" />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1.5">Subject</label>
            <Inp placeholder="What is your message about?" className="w-full" />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5">Message</label>
            <textarea
              rows={4}
              placeholder="Describe your query or issue in detail…"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-colors"
            />
          </div>
          <Button variant="primary">
            <Send className="size-3.5" /> Send message
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Follow Us" hint="Stay updated with LumenX news and releases" />
        <div className="px-5 pb-5 flex flex-wrap gap-3 pt-2">
          {[
            { icon: Linkedin, label: "LinkedIn",  handle: "@lumenxapp"       },
            { icon: Twitter,  label: "X (Twitter)", handle: "@lumenxhq"   },
            { icon: Youtube,  label: "YouTube",    handle: "LumenX Academy"     },
            { icon: BookOpen, label: "Blog",       handle: "blog.lumenx.app" },
          ].map(({ icon: Icon, label, handle }) => (
            <a
              key={label}
              href="#"
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-border hover:border-border-strong bg-surface hover:bg-surface-hover transition-all`}
            >
              <IconChip icon={Icon} size="sm" variant="soft" />
              <div>
                <div className="text-xs font-medium">{label}</div>
                <div className="text-[10px] text-muted-foreground">{handle}</div>
              </div>
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════ */

function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("profile");

  return (
    <AppShell title="Settings" subtitle="Profile, appearance, institute configuration, and support">
      <PageStack>
        {/* Tab navigation */}
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

        {/* Tab content */}
        <div>
          {tab === "profile"       && <ProfileTab />}
          {tab === "appearance"    && <AppearanceTab />}
          {tab === "institute"     && <InstituteTab />}
          {tab === "security"      && <SecurityTab />}
          {tab === "notifications" && <NotificationsTab />}
          {tab === "faqs"          && <FaqsTab />}
          {tab === "feedback"      && <FeedbackTab />}
          {tab === "contact"       && <ContactTab />}
          {tab === "audit"         && <AuditActivityPanel id="audit" />}
        </div>
      </PageStack>
    </AppShell>
  );
}
