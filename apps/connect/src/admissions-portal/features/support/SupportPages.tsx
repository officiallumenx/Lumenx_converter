import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button, TextSizeControl, LumenXFeedbackDialog } from "@lumenx/ui";
import { getInitials } from "@lumenx/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Input,
  Label,
  Textarea,
} from "@lumenx/ui";
import { Bell, Building2, Mail, MapPin, MessageSquarePlus, Phone } from "lucide-react";
import { toast } from "sonner";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { useAdmissionsTheme } from "@/admissions-portal/core/AdmissionsThemeProvider";
import { DocumentVerificationCard } from "@/admissions-portal/shared/ui/v2/AdmissionsV2Widgets";
import { EmptyState } from "@/admissions-portal/shared/ui/PageSkeleton";
import { AdmissionsPageHeader } from "@/admissions-portal/shared/ui/AdmissionsPageHeader";
import {
  getApplicationsForUser,
  getNotifications,
  getTransientParentConfirmationReminders,
  markNotificationRead,
  markAllNotificationsRead,
  uploadDocument,
} from "@/lib/admissions/repositories";
import { isApiAuthMode } from "@/auth/auth-mode";
import {
  loadApplicationDocuments,
  uploadApplicationDocument,
  openAdmissionDocumentPreview,
} from "@/lib/admissions/documents-service";
import type { ApplicationDocument } from "@/lib/admissions/types";
import { FAQ_ITEMS, ADMISSIONS_CONTACT } from "@/lib/admissions/mock-data";
import { getInstituteById } from "@/lib/admissions/institutes-data";
import type { FaqItem } from "@/lib/admissions/types";

export function DocumentCenterPage() {
  const { user } = useAdmissionsAuth();
  const apiMode = isApiAuthMode();
  const [tick, setTick] = useState(0);
  const apps = user ? getApplicationsForUser(user.id).filter((a) => a.status !== "draft") : [];
  const [selected, setSelected] = useState(apps[0]?.id ?? "");
  const [apiDocs, setApiDocs] = useState<ApplicationDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const app = apps.find((a) => a.id === selected);

  useEffect(() => {
    if (!apiMode || !app?.id || !/^[0-9a-f-]{36}$/i.test(app.id)) {
      setApiDocs([]);
      return;
    }
    let cancelled = false;
    setDocsLoading(true);
    void loadApplicationDocuments(app.id)
      .then((rows) => {
        if (!cancelled) setApiDocs(rows);
      })
      .catch(() => {
        if (!cancelled) setApiDocs([]);
      })
      .finally(() => {
        if (!cancelled) setDocsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiMode, app?.id, tick]);

  const displayDocs = apiMode && app && /^[0-9a-f-]{36}$/i.test(app.id) ? apiDocs : app?.documents ?? [];

  if (apps.length === 0) {
    return (
      <EmptyState
        title="No documents yet"
        hint="Submit an application to manage documents."
        action={
          <Button asChild>
            <Link to="/admissions/apply">Apply now</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <AdmissionsPageHeader
        title="Required documents"
        subtitle="Upload, replace, and track verification"
      />
      <div className="mb-4 space-y-2">
        <Label className="text-xs">Application</Label>
        <select
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {apps.map((a) => (
            <option key={a.id} value={a.id}>
              {a.id} — {a.student.name}
            </option>
          ))}
        </select>
      </div>
      {app && (
        <div className="space-y-3" key={`${app.id}-${tick}`}>
          {docsLoading ? (
            <p className="text-sm text-muted-foreground">Loading documents…</p>
          ) : displayDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
          ) : (
            displayDocs.map((d) => (
              <DocumentVerificationCard
                key={d.id}
                doc={d}
                onPreview={() => {
                  if (apiMode && /^[0-9a-f-]{36}$/i.test(d.id)) {
                    void openAdmissionDocumentPreview({ documentId: d.id })
                      .then((url) => {
                        if (!url) {
                          toast.error("Preview unavailable.");
                          return;
                        }
                        window.open(url, "_blank", "noopener,noreferrer");
                      })
                      .catch(() => toast.error("Preview unavailable."));
                    return;
                  }
                  toast.info(`Preview: ${d.fileName ?? d.label} (demo)`);
                }}
                onUpload={(f) => {
                  if (apiMode && app.instituteId && /^[0-9a-f-]{36}$/i.test(app.id)) {
                    void uploadApplicationDocument({
                      applicationId: app.id,
                      instituteId: app.instituteId,
                      type: d.type,
                      file: f,
                    })
                      .then(() => {
                        toast.success(`${d.label} updated`);
                        setTick((n) => n + 1);
                      })
                      .catch(() => toast.error("Upload failed"));
                    return;
                  }
                  uploadDocument(app.id, d.type, f.name);
                  toast.success(`${d.label} updated`);
                  setTick((n) => n + 1);
                }}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

const NOTIF_FILTERS = [
  { key: "all", label: "All" },
  { key: "application", label: "Applications" },
  { key: "document", label: "Documents" },
  { key: "confirmation", label: "Confirmations" },
  { key: "approval", label: "Decisions" },
  { key: "general", label: "General" },
] as const;

const ADMISSIONS_TYPE_LABELS: Record<
  | "application"
  | "document"
  | "confirmation"
  | "approval"
  | "rejection"
  | "reminder"
  | "general",
  string
> = {
  application: "Application",
  document: "Document",
  confirmation: "Parent Confirmation",
  approval: "Approval",
  rejection: "Rejection",
  reminder: "Reminder",
  general: "General",
};

export function AdmissionsNotificationsPage() {
  const { user } = useAdmissionsAuth();
  const [filter, setFilter] = useState<(typeof NOTIF_FILTERS)[number]["key"]>("all");
  const [tick, setTick] = useState(0);
  const persistedItems = user ? getNotifications(user.id) : [];
  const transientReminders = user ? getTransientParentConfirmationReminders(user.id) : [];
  const items = [...transientReminders, ...persistedItems].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const filtered =
    filter === "all"
      ? items
      : items.filter((n) =>
          filter === "approval"
            ? n.type === "approval" || n.type === "rejection"
            : n.type === filter,
        );

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Bell className="size-6" />}
        title="No notifications"
        hint="Updates about your applications will appear here."
      />
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <AdmissionsPageHeader
        title="Notifications"
        subtitle={`${items.filter((n) => !n.read).length} unread`}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (user) {
                markAllNotificationsRead(user.id);
                setTick((t) => t + 1);
              }
            }}
          >
            Mark all read
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {NOTIF_FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>
      <div className="space-y-2" key={tick}>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No notifications in this category.
          </p>
        ) : (
          filtered.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                if (!n.id.startsWith("transient-reminder-")) {
                  markNotificationRead(n.id);
                }
                setTick((t) => t + 1);
              }}
              className={`w-full rounded-2xl border p-4 text-left transition-colors ${n.read ? "border-border bg-card" : "border-primary/20 bg-primary/5"}`}
            >
              <p
                className={`text-xs font-bold ${n.read ? "text-foreground" : "text-primary"}`}
              >
                {ADMISSIONS_TYPE_LABELS[n.type]}
              </p>
              <p className="mt-0.5 font-medium text-sm">{n.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>
              <p className="mt-2 text-[10px] text-muted-foreground">
                {new Date(n.createdAt).toLocaleString("en-IN")}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

const FAQ_CATEGORIES: { key: FaqItem["category"]; label: string }[] = [
  { key: "admissions", label: "Admissions" },
  { key: "programs", label: "Programs" },
  { key: "fees", label: "Fees" },
  { key: "documents", label: "Documents" },
  { key: "process", label: "Application process" },
];

export function FaqPage() {
  return (
    <div className="animate-in fade-in duration-300">
      <AdmissionsPageHeader title="FAQs" subtitle="Common questions about admissions" />
      {FAQ_CATEGORIES.map((cat) => {
        const items = FAQ_ITEMS.filter((f) => f.category === cat.key);
        if (items.length === 0) return null;
        return (
          <div key={cat.key} className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {cat.label}
            </h2>
            <Accordion
              type="single"
              collapsible
              className="rounded-2xl border border-border bg-card px-4"
            >
              {items.map((f) => (
                <AccordionItem key={f.id} value={f.id}>
                  <AccordionTrigger className="text-sm text-left">{f.question}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {f.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        );
      })}
    </div>
  );
}

export function ContactAdmissionsPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="animate-in fade-in duration-300">
      <AdmissionsPageHeader title="Contact admissions" subtitle="We're here to help" />
      <div className="mb-6 space-y-3 rounded-2xl border border-border bg-card p-4 text-sm">
        <p>
          <strong>Phone:</strong> {ADMISSIONS_CONTACT.phone}
        </p>
        <p>
          <strong>Email:</strong> {ADMISSIONS_CONTACT.email}
        </p>
        <p>
          <strong>Office hours:</strong> {ADMISSIONS_CONTACT.officeHours}
        </p>
        <p>
          <strong>Address:</strong> {ADMISSIONS_CONTACT.address}
        </p>
      </div>

      {sent ? (
        <div className="rounded-2xl bg-success/10 p-6 text-center text-sm">
          <Mail className="mx-auto size-8 text-success" />
          <p className="mt-2 font-medium">Inquiry sent!</p>
          <p className="text-muted-foreground">We will respond within 1–2 business days.</p>
        </div>
      ) : (
        <form
          className="space-y-4 rounded-2xl border border-border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
            toast.success("Inquiry submitted");
          }}
        >
          <div className="space-y-2">
            <Label>Name</Label>
            <Input required placeholder="Your name" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" required placeholder="you@email.com" />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea required placeholder="How can we help?" rows={4} />
          </div>
          <Button type="submit" className="w-full">
            Send inquiry
          </Button>
        </form>
      )}
    </div>
  );
}

export function AdmissionsProfilePage() {
  const { user } = useAdmissionsAuth();
  const apps = user ? getApplicationsForUser(user.id) : [];
  const institute = user?.instituteId ? getInstituteById(user.instituteId) : undefined;

  if (!user) return null;

  const isInstituteAdmin = user.accountType === "institute_admin";

  return (
    <div className="animate-in fade-in duration-300">
      <AdmissionsPageHeader
        title="Profile"
        subtitle={isInstituteAdmin ? "Institute admin account" : "Parent / applicant account"}
      />
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
          {isInstituteAdmin ? (
            <Building2 className="size-8" />
          ) : (
            getInitials(user.name, 2)
          )}
        </div>
        <h2 className="mt-4 text-xl font-bold">{user.name}</h2>
        {user.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
        {user.phone && <p className="text-sm text-muted-foreground">{user.phone}</p>}

        {isInstituteAdmin && (
          <div className="mt-6 space-y-4 rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Institute details
            </p>
            <p className="font-semibold">
              {user.instituteName ?? institute?.name ?? "Your institute"}
            </p>
            {institute && (
              <>
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-4 shrink-0 mt-0.5" /> {institute.contact.address}
                </p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="size-4 shrink-0" /> {institute.contact.phone}
                </p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="size-4 shrink-0" /> {institute.contact.email}
                </p>
              </>
            )}
            <Button asChild>
              <Link to="/admissions/institute">Open institute dashboard</Link>
            </Button>
          </div>
        )}

        {!isInstituteAdmin && (
          <div className="mt-6 space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Profile completion</span>
                <span className="font-medium">{user.profileComplete}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${user.profileComplete}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {apps.length} application{apps.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdmissionsSettingsPage() {
  const { user, signOut } = useAdmissionsAuth();
  const { theme, setTheme } = useAdmissionsTheme();
  const nav = useNavigate();
  const isInstitute = user?.accountType === "institute_admin";
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const sections: {
    title: string;
    items: { label: string; to: string; desc?: string }[];
  }[] = [
    {
      title: "Appearance",
      items: [],
    },
    {
      title: "Help & support",
      items: [
        { label: "FAQs", to: "/admissions/faq", desc: "Common admission questions" },
        { label: "Help center", to: "/admissions/contact", desc: "Contact admissions support" },
      ],
    },
    {
      title: "Legal",
      items: [
        { label: "Terms & Conditions", to: "/admissions/terms" },
        { label: "Privacy Policy", to: "/admissions/privacy" },
      ],
    },
  ];

  if (isInstitute) {
    sections.splice(1, 0, {
      title: "Institute",
      items: [
        {
          label: "Institute profile",
          to: "/admissions/institute/profile",
          desc: "Public school information",
        },
        {
          label: "Admission openings",
          to: "/admissions/institute/openings",
          desc: "Publish classes and seats",
        },
        {
          label: "Application form",
          to: "/admissions/institute/form",
          desc: "Fields parents fill when applying",
        },
        {
          label: "Applications",
          to: "/admissions/institute/applications",
          desc: "Review and assign stages",
        },
      ],
    });
    sections.splice(2, 0, {
      title: "Reports",
      items: [
        {
          label: "Applications summary",
          to: "/admissions/institute",
          desc: "Dashboard KPIs and recent activity",
        },
      ],
    });
  }

  return (
    <div className="animate-in fade-in duration-300 space-y-4">
      <AdmissionsPageHeader
        title="Settings"
        subtitle={isInstitute ? "Institute admissions preferences" : "Your admissions preferences"}
      />

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-medium mb-3">Appearance</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={theme === "light" ? "default" : "outline"}
            onClick={() => setTheme("light")}
          >
            Light
          </Button>
          <Button
            size="sm"
            variant={theme === "dark" ? "default" : "outline"}
            onClick={() => setTheme("dark")}
          >
            Dark
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Light or Dark. Default is Light. Does not follow system theme.
        </p>
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <p className="text-sm font-medium">Text Size</p>
          <p className="text-xs text-muted-foreground">
            Small, Default, Large, or Extra Large. Default is Default.
          </p>
          <TextSizeControl />
        </div>
      </div>

      {sections
        .filter((s) => s.title !== "Appearance")
        .map((section) => (
          <div key={section.title} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-medium mb-3">{section.title}</p>
            <div className="space-y-1">
              {section.items.map((item) => (
                <Link
                  key={`${section.title}-${item.label}`}
                  to={item.to}
                  className="flex items-start justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/60 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    {item.desc ? (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    ) : null}
                  </div>
                  <span className="text-muted-foreground text-sm shrink-0">→</span>
                </Link>
              ))}
              {section.title === "Help & support" ? (
                <button
                  type="button"
                  onClick={() => setFeedbackOpen(true)}
                  className="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted/60 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium inline-flex items-center gap-1.5">
                      <MessageSquarePlus className="size-3.5 text-primary" aria-hidden />
                      LumenX Feedback
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Rating, bug, feature request, experience — goes to LumenX, not the school
                    </p>
                  </div>
                  <span className="text-muted-foreground text-sm shrink-0">→</span>
                </button>
              ) : null}
            </div>
          </div>
        ))}

      <LumenXFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        source="admissions"
      />

      {user ? (
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => {
            signOut();
            nav({ to: "/admissions/institutes" });
          }}
        >
          Log out
        </Button>
      ) : (
        <Button className="w-full" asChild>
          <Link to="/admissions/login">Sign in</Link>
        </Button>
      )}
    </div>
  );
}
