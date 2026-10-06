import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ModuleHero } from "@/components/module-shell";
import { IconChip } from "@/components/IconChip";
import { Card, CardHeader, Button, PageStack, Pill } from "@lumenx/ui-admin";
import { useState } from "react";
import {
  User, MessageSquarePlus, Phone, ChevronDown,
  Mail, Globe, Send, ExternalLink, BookOpen, LifeBuoy, FileText,
  GraduationCap, Layers, Landmark,
  Bug, Lightbulb,
} from "lucide-react";
import { ADMIN_MODULE_LABELS as M, adminPageTitle } from "@/lib/admin-module-labels";
import { useAdminToast } from "@/components/AdminActionToast";
import { OfflineSyncStatusBar } from "@/components/OfflineSyncStatusBar";
import { PlatformReadOnlyBanner, LumenXFeedbackForm } from "@lumenx/ui";
import type { LumenXFeedbackKind } from "@lumenx/utils";
import {
  RECYCLE_BIN_RETENTION_DAYS,
  isPlatformReadOnly,
  loadPlatformReadOnlyState,
  notificationRetentionSummary,
  savePlatformReadOnlyState,
} from "@lumenx/utils";
import { InstituteProfilePanel } from "@/components/institute/InstituteProfilePanel";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: adminPageTitle("/settings") }] }),
  component: SettingsPage,
});

type SettingsTab =
  | "institute-profile"
  | "platform"
  | "contact"
  | "feature-request"
  | "report-issue"
  | "lumenx-feedback"
  | "help-faqs";

const TABS: { id: SettingsTab; label: string; icon: typeof User }[] = [
  { id: "institute-profile", label: "Institute profile", icon: Landmark },
  { id: "platform", label: "Platform", icon: Layers },
  { id: "contact", label: "Contact and support", icon: Phone },
  { id: "feature-request", label: "Feature request", icon: Lightbulb },
  { id: "report-issue", label: "Report issue", icon: Bug },
  { id: "lumenx-feedback", label: "LumenX feedback", icon: MessageSquarePlus },
  { id: "help-faqs", label: "Help center and FAQs", icon: LifeBuoy },
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

function InstituteProfileTab() {
  return <InstituteProfilePanel embedded />;
}

function HelpCenterAndFaqsTab({ onOpenContact }: { onOpenContact: () => void }) {
  const guides = [
    { icon: GraduationCap, title: "Students and admissions", body: "Add students, bulk import, and manage profiles from Students in the sidebar." },
    { icon: Layers, title: "Modules and Plan", body: "See your institute plan, pay securely, and turn optional modules on or off." },
    { icon: FileText, title: "Documents and certificates", body: "Generate TCs and certificates from Documents and Records Studio." },
    { icon: BookOpen, title: "Getting started", body: `Use Home for KPIs, then configure ${M.institute} for public branding.` },
  ];

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
      a: "Open Institute Settings → Institute profile. Edit name, logo, contact, history, and awards. That content is used on Connect and certificates.",
    },
    {
      q: "Where are attendance settings?",
      a: `Open ${M.attendance} in the sidebar, then choose Attendance settings beside Take attendance.`,
    },
    {
      q: "How do I contact support?",
      a: "Open Institute Settings → Contact and support, or write to lumenxtech.official@gmail.com. For common how-tos, use Help center and FAQs.",
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Help center" hint="Guides and shortcuts for LumenX Admin" />
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
        <CardHeader
          title="Frequently asked questions"
          hint="Common queries about using LumenX Admin"
        />
        <div className="px-5 pb-5">
          {faqs.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </Card>
      <Card>
        <CardHeader title="Need more help?" />
        <div className="px-5 pb-5 flex flex-wrap gap-2">
          <Button onClick={onOpenContact}>
            <Phone className="size-3.5" /> Contact support
          </Button>
        </div>
      </Card>
    </div>
  );
}

function FeedbackKindTab({
  title,
  hint,
  fixedKind,
}: {
  title: string;
  hint: string;
  fixedKind?: LumenXFeedbackKind;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title={title} hint={hint} />
        <div className="px-5 pb-5 pt-1">
          <LumenXFeedbackForm source="admin" fixedKind={fixedKind} />
        </div>
      </Card>
    </div>
  );
}

const SUPPORT_EMAIL = "lumenxtech.official@gmail.com";
const SUPPORT_PHONE_DISPLAY = "+91 91826 70362";
const SUPPORT_PHONE_TEL = "+919182670362";

function ContactTab({ onOpenHelp }: { onOpenHelp: () => void }) {
  const notify = useAdminToast();
  const [supportName, setSupportName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");

  const channels: {
    icon: typeof Mail;
    title: string;
    value: string;
    hint: string;
    action: string;
    href: string | null;
    onAction?: () => void;
  }[] = [
    {
      icon: Mail,
      title: "Email Support",
      value: SUPPORT_EMAIL,
      hint: "We reply within 4 business hours",
      action: "Send email",
      href: `mailto:${SUPPORT_EMAIL}`,
    },
    {
      icon: Phone,
      title: "Phone Support",
      value: SUPPORT_PHONE_DISPLAY,
      hint: "Mon – Fri, 9 AM – 6 PM IST",
      action: "Call now",
      href: `tel:${SUPPORT_PHONE_TEL}`,
    },
    {
      icon: Globe,
      title: "Help Center",
      value: "In-app guides & FAQs",
      hint: "Guides, tutorials, and common questions",
      action: "Open help center",
      href: null,
      onAction: onOpenHelp,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.map(({ icon: Icon, title, value, hint, action, href, onAction }) => (
          <Card key={title} className="p-5">
            <IconChip icon={Icon} size="md" variant="brand" className="mb-3" />
            <div className="text-sm font-semibold mb-0.5">{title}</div>
            {href ? (
              <a
                href={href}
                className="text-xs font-medium text-primary hover:underline break-all"
              >
                {value}
              </a>
            ) : (
              <button
                type="button"
                onClick={onAction}
                className="text-xs font-medium text-primary hover:underline text-left"
              >
                {value}
              </button>
            )}
            <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>
            {href ? (
              <a
                href={href}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-surface-hover"
              >
                {action} <ExternalLink className="size-3" />
              </a>
            ) : (
              <Button size="sm" className="mt-3" onClick={onAction}>
                {action}
              </Button>
            )}
          </Card>
        ))}
      </div>

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
              const body = [
                `Name: ${supportName.trim()}`,
                `Email: ${supportEmail.trim()}`,
                "",
                supportMessage.trim(),
              ].join("\n");
              const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(supportSubject.trim())}&body=${encodeURIComponent(body)}`;
              window.location.href = mailto;
            }}
          >
            <Send className="size-3.5" /> Send message
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Follow Us" hint="Social channels will appear here when available" />
        <div className="px-5 pb-5 text-xs text-muted-foreground">
          No channels yet.
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

function SettingsTabRow({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: SettingsTab; label: string; icon: typeof User }[];
  active: SettingsTab;
  onChange: (id: SettingsTab) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 -mb-1 lx-sidebar-scroll">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
            active === id
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <IconChip icon={Icon} size="xs" variant="soft" active={active === id} />
          {label}
        </button>
      ))}
    </div>
  );
}

function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("institute-profile");

  return (
    <AppShell title={M.settings} subtitle="School-wide profile, platform, and support">
      <ModuleHero
        eyebrow="Settings"
        title={M.settings}
        subtitle="School-wide profile, platform, and support"
      />
      <PageStack>
        <SettingsTabRow tabs={TABS} active={tab} onChange={setTab} />

        <div>
          {tab === "institute-profile" && <InstituteProfileTab />}
          {tab === "platform" && <PlatformTab />}
          {tab === "contact" && (
            <ContactTab onOpenHelp={() => setTab("help-faqs")} />
          )}
          {tab === "feature-request" && (
            <FeedbackKindTab
              title="Feature request"
              hint="Suggest an improvement — goes to LumenX, not your school"
              fixedKind="feature"
            />
          )}
          {tab === "report-issue" && (
            <FeedbackKindTab
              title="Report issue"
              hint="Report a bug or broken flow — goes to LumenX"
              fixedKind="bug"
            />
          )}
          {tab === "lumenx-feedback" && (
            <FeedbackKindTab
              title="LumenX feedback"
              hint="Rating, bug, feature, or experience — goes to LumenX"
            />
          )}
          {tab === "help-faqs" && (
            <HelpCenterAndFaqsTab onOpenContact={() => setTab("contact")} />
          )}
        </div>
      </PageStack>
    </AppShell>
  );
}
