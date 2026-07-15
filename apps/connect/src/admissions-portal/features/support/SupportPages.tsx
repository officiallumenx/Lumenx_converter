import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@lumenx/ui";
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
import { Bell, Building2, Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { useAdmissionsTheme } from "@/admissions-portal/core/AdmissionsThemeProvider";
import { DocumentVerificationCard } from "@/admissions-portal/shared/ui/v2/AdmissionsV2Widgets";
import { EmptyState } from "@/admissions-portal/shared/ui/PageSkeleton";
import { AdmissionsPageHeader } from "@/admissions-portal/shared/ui/AdmissionsPageHeader";
import {
  getApplicationsForUser,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  uploadDocument,
} from "@/lib/admissions/repositories";
import { FAQ_ITEMS, ADMISSIONS_CONTACT } from "@/lib/admissions/mock-data";
import { getInstituteById } from "@/lib/admissions/institutes-data";
import type { FaqItem } from "@/lib/admissions/types";

export function DocumentCenterPage() {
  const { user } = useAdmissionsAuth();
  const [tick, setTick] = useState(0);
  const apps = user ? getApplicationsForUser(user.id).filter((a) => a.status !== "draft") : [];
  const [selected, setSelected] = useState(apps[0]?.id ?? "");

  const app = apps.find((a) => a.id === selected);

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
          {app.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
          ) : (
            app.documents.map((d) => (
              <DocumentVerificationCard
                key={d.id}
                doc={d}
                onPreview={() => toast.info(`Preview: ${d.fileName ?? d.label} (demo)`)}
                onUpload={(f) => {
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
  { key: "interview", label: "Interviews" },
  { key: "approval", label: "Decisions" },
  { key: "general", label: "General" },
] as const;

export function AdmissionsNotificationsPage() {
  const { user } = useAdmissionsAuth();
  const [filter, setFilter] = useState<(typeof NOTIF_FILTERS)[number]["key"]>("all");
  const [tick, setTick] = useState(0);
  const items = user ? getNotifications(user.id) : [];
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
                markNotificationRead(n.id);
                setTick((t) => t + 1);
              }}
              className={`w-full rounded-2xl border p-4 text-left transition-colors ${n.read ? "border-border bg-card" : "border-primary/20 bg-primary/5"}`}
            >
              <p className="font-medium text-sm">{n.title}</p>
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
  { key: "interviews", label: "Interviews" },
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
  const { signOut } = useAdmissionsAuth();
  const { theme, setTheme } = useAdmissionsTheme();
  const nav = useNavigate();

  return (
    <div className="animate-in fade-in duration-300">
      <AdmissionsPageHeader title="Settings" />
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-medium mb-3">Theme</p>
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
            Default is light mode for admissions.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-sm space-y-2">
          <p className="font-medium">Legal</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link to="/admissions/terms" className="text-primary font-medium hover:underline">
              Terms & Conditions
            </Link>
            <Link to="/admissions/privacy" className="text-primary font-medium hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => {
            signOut();
            nav({ to: "/admissions/login" });
          }}
        >
          Log out
        </Button>
      </div>
    </div>
  );
}
