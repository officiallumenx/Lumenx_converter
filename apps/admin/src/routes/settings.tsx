import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { IconChip } from "@/components/IconChip";
import { Card, CardHeader, Button, PageStack, Pill, Select } from "@lumenx/ui-admin";
import { useTheme } from "@/components/theme-provider";
import { useState, useRef, useEffect } from "react";
import {
  User, Palette, HelpCircle, MessageSquarePlus, Phone, Camera, Check, ChevronDown,
  ChevronRight, Mail, Globe, MapPin, Clock, Sun, Moon,
  Monitor, Laptop, Smartphone, Send, ExternalLink, BookOpen, Linkedin, Twitter, Youtube,
  LifeBuoy, FileText, GraduationCap, Layers, School,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";
import { useAdminToast } from "@/components/AdminActionToast";
import { AuditActivityPanel } from "@/components/AuditActivityPanel";
import { OfflineSyncStatusBar } from "@/components/OfflineSyncStatusBar";
import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiReadUnavailablePanel } from "@/components/ApiReadUnavailablePanel";
import { AttendanceConfigApiPanel } from "@/components/settings/AttendanceConfigApiPanel";
import { SettingsProfileApiPanel } from "@/components/settings/SettingsProfileApiPanel";
import { AttendanceConfigurationPanel } from "@/components/academic-management/views/AttendanceConfigurationPanel";
import { AttendanceNotificationConfigPanel } from "@/components/academic-management/views/AttendanceNotificationConfigPanel";
import { PlatformReadOnlyBanner, TextSizeControl, LumenXFeedbackForm } from "@lumenx/ui";
import {
  RECYCLE_BIN_RETENTION_DAYS,
  isPlatformReadOnly,
  loadPlatformReadOnlyState,
  notificationRetentionSummary,
  savePlatformReadOnlyState,
} from "@lumenx/utils";
import {
  loadAlertChimesPreference,
  saveAlertChimesPreference,
} from "@lumenx/notifications";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — LumenX Admin" }] }),
  component: SettingsPage,
});

type SettingsTab =
  | "profile"
  | "appearance"
  | "academic"
  | "platform"
  | "audit"
  | "contact"
  | "feedback"
  | "help"
  | "faqs";

const TABS: { id: SettingsTab; label: string; icon: typeof User }[] = [
  { id: "profile",    label: "My Profile",         icon: User             },
  { id: "appearance", label: "Appearance",         icon: Palette          },
  { id: "academic",   label: "Academic Settings",  icon: School           },
  { id: "platform",   label: "Platform",           icon: Layers           },
  { id: "audit",      label: "Audit Log",          icon: FileText         },
  { id: "contact",    label: "Contact & Support",  icon: Phone            },
  { id: "feedback",   label: "LumenX Feedback",    icon: MessageSquarePlus },
  { id: "help",       label: "Help Center",        icon: LifeBuoy         },
  { id: "faqs",       label: "FAQs",               icon: HelpCircle       },
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
  value,
  onChange,
  type = "text",
  placeholder,
  className = "",
}: {
  defaultValue?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      defaultValue={value === undefined ? defaultValue : undefined}
      value={value}
      onChange={onChange}
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
    <Select fieldSize="md" defaultValue={defaultValue} className={className}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </Select>
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

/* ══════════════════════════════════════════════════════════════════
   TAB PANELS
═══════════════════════════════════════════════════════════════════ */

function AcademicSettingsTab() {
  const apiMode = isApiAuthMode();
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Academic Settings"
          hint="Institute academic policies — Attendance Configuration, notifications, promotion, and more"
          action={
            <Link
              to="/academic-management"
              search={{ view: "settings" }}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Open {M.academics}
              <ExternalLink className="size-3 opacity-70" />
            </Link>
          }
        />
      </Card>
      {apiMode ? (
        <>
          <AttendanceConfigApiPanel />
          <ApiReadUnavailablePanel
            title="Attendance notifications unavailable"
            domainLabel="Attendance notification configuration"
            hint="Notification routing for attendance has no institute-scoped read API. Demo configuration is not shown in API mode."
          />
        </>
      ) : (
        <>
          <AttendanceConfigurationPanel />
          <AttendanceNotificationConfigPanel />
        </>
      )}
    </div>
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
  if (isApiAuthMode()) {
    return <SettingsProfileApiPanel />;
  }
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
          <Row label="Account ID" hint="Read-only">
            <span className="text-xs font-mono text-muted-foreground">{user?.id ?? "—"}</span>
          </Row>
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
  const [alertChimes, setAlertChimes] = useState(() => loadAlertChimesPreference());

  useEffect(() => {
    saveAlertChimesPreference(alertChimes);
  }, [alertChimes]);

  const themes = [
    { id: "light" as const, label: "Light", icon: Sun },
    { id: "dark" as const, label: "Dark", icon: Moon },
  ];

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
                  {active && <span className="size-1.5 rounded-full bg-primary" />}
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
        <CardHeader
          title="Alert sounds"
          hint="Urgent double-tone for red alerts · soft tone for normal notifications"
        />
        <div className="px-5 pb-5">
          <Row
            label="Play alert chime"
            hint="Applies to holidays, emergencies, and other important broadcasts"
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
          <Row label="Text Size" hint="Small, Default, Large, or Extra Large. Default is Default.">
            <TextSizeControl size="compact" className="min-w-[16rem]" />
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
              <Pill tone="success">Responsive</Pill>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}


function HelpCenterTab({ onOpenFaqs, onOpenContact }: { onOpenFaqs: () => void; onOpenContact: () => void }) {
  const guides = [
    { icon: GraduationCap, title: "Students and admissions", body: "Add students, bulk import, and manage profiles from Students in the sidebar." },
    { icon: Layers, title: "Modules and Plan", body: "See your institute plan, pay securely, and turn optional modules on or off." },
    { icon: FileText, title: "Documents and certificates", body: "Generate TCs and certificates from Documents and Records Studio." },
    { icon: BookOpen, title: "Getting started", body: `Use Home for KPIs, then configure ${M.institute} for public branding.` },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Help Center" hint="Guides and shortcuts for LumenX Admin" />
        <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {guides.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <IconChip icon={Icon} size="sm" variant="soft" />
                <div className="text-xs font-semibold">{title}</div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <CardHeader title="Need more help?" />
        <div className="px-5 pb-5 flex flex-wrap gap-2">
          <Button variant="primary" onClick={onOpenFaqs}>
            <HelpCircle className="size-3.5" /> Browse FAQs
          </Button>
          <Button onClick={onOpenContact}>
            <Phone className="size-3.5" /> Contact support
          </Button>
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
      a: "Certificates is under development. You can open Certificates from the sidebar to see upcoming certificate types. Generation and issue are not available yet.",
    },
    {
      q: "How do I set up or change the timetable?",
      a: "Go to Timetable in the sidebar. Click 'New timetable' to start from scratch or edit an existing one. Use the visual drag-and-drop scheduler to assign subjects and teachers to periods. Click 'Publish' to make it visible in the student and parent portals.",
    },
    {
      q: "How do I approve a leave request?",
      a: `Navigate to ${M.leave}. Open the pending request, review the details, then click 'Approve' or 'Reject'. An automatic notification will be sent to the requesting teacher or student.`,
    },
    {
      q: "How do I export attendance or marks reports?",
      a: `Use ${M.reports} (sidebar → ${M.reports}). Pick a report, then download Excel, PDF, or CSV. Analytics is for live dashboards and charts only — it has no export. Module screens may offer one-off CSV helpers; institute-wide exports belong in ${M.reports}.`,
    },
    {
      q: "How do I manage admin roles and permissions?",
      a: "Go to Roles & Access in the sidebar. Create a role, select the modules it can handle, then assign a user with an email or mobile number and an Admin-controlled password.",
    },
    {
      q: "What are the different subscription plans?",
      a: `Nexus assigns each institute a monthly or yearly cost (based on students). In Admin, open ${M.modules} to see amount, renewal date, and pay. All modules are on by default; turn any off to restrict.`,
    },
    {
      q: "How do I update institute branding?",
      a: `Open ${M.institute} from the sidebar. Edit name, logo, contact, history, and awards. That content is used on Connect and certificates.`,
    },
    {
      q: "How do I contact support?",
      a: "Open Settings → Contact & Support, or write to support@lumenx.app. For common how-tos, use Help Center or FAQs in Settings.",
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
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="LumenX Feedback"
          hint="Goes to LumenX — not your school"
        />
        <div className="px-5 pb-5 pt-1">
          <LumenXFeedbackForm source="admin" />
        </div>
      </Card>
    </div>
  );
}

function ContactTab() {
  const notify = useAdminToast();
  const [supportName, setSupportName] = useState("Dr. Ananya Verma");
  const [supportEmail, setSupportEmail] = useState("ananya.verma@lumenx.edu");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");

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
              <Inp value={supportName} onChange={(e) => setSupportName(e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Email</label>
              <Inp type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} className="w-full" />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1.5">Subject</label>
            <Inp
              placeholder="What is your message about?"
              className="w-full"
              value={supportSubject}
              onChange={(e) => setSupportSubject(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5">Message</label>
            <textarea
              rows={4}
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              placeholder="Describe your query or issue in detail…"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-colors"
            />
          </div>
          <Button
            variant="primary"
            onClick={() => {
              if (!supportName.trim() || !supportEmail.trim() || !supportSubject.trim() || supportMessage.trim().length < 10) {
                notify("Fill name, email, subject, and a message of at least 10 characters.");
                return;
              }
              notify("Support is not connected yet. Your message was validated and not sent.");
            }}
          >
            <Send className="size-3.5" /> Send message
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Follow Us" hint="Stay updated with LumenX news and releases" />
        <div className="px-5 pb-5 flex flex-wrap gap-3 pt-2">
          {[
            { icon: Linkedin, label: "LinkedIn", handle: "@lumenxapp", href: "https://www.linkedin.com/company/lumenx" },
            { icon: Twitter, label: "X (Twitter)", handle: "@lumenxhq", href: "https://x.com/lumenxhq" },
            { icon: Youtube, label: "YouTube", handle: "Test1School", href: "https://www.youtube.com/@lumenx" },
            { icon: BookOpen, label: "Blog", handle: "blog.lumenx.app", href: "https://lumenx.app" },
          ].map(({ icon: Icon, label, handle, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
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
   PLATFORM TAB
═══════════════════════════════════════════════════════════════════ */

function PlatformTab() {
  const retention = notificationRetentionSummary();
  const [ro, setRo] = useState(() => loadPlatformReadOnlyState());

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Offline queue & sync"
          hint="Automatic sync when online · last synced · pending count"
        />
        <div className="px-5 pb-5">
          <OfflineSyncStatusBar />
        </div>
      </Card>

      <Card>
        <CardHeader title="Retention policy" hint="Soft delete and notification lifecycle" />
        <div className="px-5 pb-5 space-y-0 text-sm">
          <Row label="Recycle Bin" hint="Soft-deleted records">
            <Pill tone="info">{RECYCLE_BIN_RETENTION_DAYS} days</Pill>
          </Row>
          <Row label="Notifications" hint="Auto-delete non-starred">
            <Pill tone="info">{retention.activeRetentionDays} days</Pill>
          </Row>
          <Row label="Notification recycle bin" hint="After soft-delete">
            <Pill tone="warning">{retention.recycleBinDays} days</Pill>
          </Row>
          <Row label="Starred notifications" hint="Never auto-delete">
            <Pill tone="success">Keep forever</Pill>
          </Row>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Read only locks"
          hint="Subscription expired · Academic year locked"
        />
        <div className="px-5 pb-5 space-y-3">
          <PlatformReadOnlyBanner state={ro} />
          {!isPlatformReadOnly(ro) ? (
            <p className="text-xs text-muted-foreground">
              Platform is writable. Locks activate when subscription is unpaid or no academic year
              is active.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const next = savePlatformReadOnlyState({
                  subscriptionExpired: !ro.subscriptionExpired,
                });
                setRo(next);
              }}
            >
              Toggle subscription expired
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const next = savePlatformReadOnlyState({
                  academicYearLocked: !ro.academicYearLocked,
                });
                setRo(next);
              }}
            >
              Toggle academic year locked
            </Button>
          </div>
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
    <AppShell title="Settings" subtitle="Your profile, appearance, platform, and support">
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
          {tab === "profile" && <ProfileTab />}
          {tab === "appearance" && <AppearanceTab />}
          {tab === "academic" && <AcademicSettingsTab />}
          {tab === "platform" && <PlatformTab />}
          {tab === "audit" && <AuditActivityPanel />}
          {tab === "contact" && <ContactTab />}
          {tab === "feedback" && <FeedbackTab />}
          {tab === "help" && (
            <HelpCenterTab
              onOpenFaqs={() => setTab("faqs")}
              onOpenContact={() => setTab("contact")}
            />
          )}
          {tab === "faqs" && <FaqsTab />}
        </div>
      </PageStack>
    </AppShell>
  );
}
