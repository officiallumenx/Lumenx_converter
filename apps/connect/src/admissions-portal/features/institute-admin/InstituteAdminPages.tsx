import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Badge,
} from "@lumenx/ui";
import {
  Building2,
  Calendar,
  ClipboardList,
  FileText,
  Plus,
  Trash2,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { AdmissionsPageHeader } from "@/admissions-portal/shared/ui/AdmissionsPageHeader";
import { StatCard } from "@/components/app/StatCard";
import { ApplicationStatusTimeline } from "@/admissions-portal/shared/ui/AdmissionsShellWidgets";
import {
  FORM_FIELD_TYPES,
  formFieldTypeLabel,
  getAdmissionForm,
  getApplicationsForInstitute,
  getInstituteApplicationStats,
  getInstituteProfileForAdmin,
  newFormFieldId,
  saveAdmissionForm,
  saveInstituteSettingsOverride,
  updateApplicationByInstituteAdmin,
} from "@/lib/admissions/institute-admin";
import { getAllApplications, updateApplication } from "@/lib/admissions/repositories";
import { statusLabel } from "@/lib/admissions/mock-data";
import { statusTone } from "@/lib/admissions/status-utils";
import type { AdmissionFormField, ApplicationStatus } from "@/lib/admissions/types";

const REVIEW_STATUSES: ApplicationStatus[] = [
  "submitted",
  "under_review",
  "document_verification",
  "interview_scheduled",
  "approved",
  "waitlisted",
  "rejected",
];

function useInstituteContext() {
  const { user } = useAdmissionsAuth();
  const instituteId = user?.instituteId ?? "";
  const profile = instituteId
    ? getInstituteProfileForAdmin(instituteId, user?.instituteName)
    : undefined;
  return { user, instituteId, profile };
}

export function InstituteAdminDashboardPage() {
  const { user, instituteId, profile } = useInstituteContext();
  const apps = getAllApplications();
  const stats = useMemo(() => getInstituteApplicationStats(instituteId, apps), [instituteId, apps]);
  const recent = useMemo(
    () => getApplicationsForInstitute(instituteId, apps).slice(0, 5),
    [instituteId, apps],
  );

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <AdmissionsPageHeader
        title={profile?.name ?? user?.instituteName ?? "Institute dashboard"}
        subtitle="Admissions overview · manage applications & forms"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total applications" value={String(stats.total)} icon={Users} />
        <StatCard label="Pending review" value={String(stats.pending)} icon={Clock} />
        <StatCard
          label="Approved"
          value={String(stats.approved)}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard label="Rejected" value={String(stats.rejected)} icon={XCircle} tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Calendar className="size-4 text-primary" /> Admission dates
          </h2>
          {profile?.admissionDates.length ? (
            <ul className="space-y-2 text-sm">
              {profile.admissionDates.map((d) => (
                <li
                  key={d.label}
                  className="flex justify-between border-b border-border pb-2 last:border-0"
                >
                  <span className="text-muted-foreground">{d.label}</span>
                  <span className="font-medium">{d.date}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No dates configured.</p>
          )}
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link to="/admissions/institute/profile">Edit institute profile</Link>
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <FileText className="size-4 text-primary" /> Admission form
          </h2>
          <p className="text-sm text-muted-foreground">
            {getAdmissionForm(instituteId).fields.length} custom field
            {getAdmissionForm(instituteId).fields.length !== 1 ? "s" : ""} configured for
            applicants.
          </p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link to="/admissions/institute/form">Manage form fields</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Recent applications</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admissions/institute/applications">View all</Link>
          </Button>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No applications yet.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((a) => (
              <Link
                key={a.id}
                to="/admissions/institute/applications/$applicationId"
                params={{ applicationId: a.id }}
                className="flex items-center justify-between rounded-xl border border-border p-3 text-sm hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-medium">{a.student.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.programName} · {a.grade}
                  </p>
                </div>
                <Badge variant={statusTone(a.status)}>{statusLabel(a.status)}</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function InstituteApplicationsPage() {
  const { instituteId } = useInstituteContext();
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const apps = getAllApplications();
  const list = useMemo(() => {
    const base = getApplicationsForInstitute(instituteId, apps);
    if (statusFilter === "all") return base;
    return base.filter((a) => a.status === statusFilter);
  }, [instituteId, apps, statusFilter]);

  return (
    <div className="animate-in fade-in duration-300">
      <AdmissionsPageHeader
        title="Review applications"
        subtitle={`${list.length} application${list.length !== 1 ? "s" : ""}`}
      />

      <div className="mb-4">
        <Label className="text-xs text-muted-foreground">Filter by status</Label>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as ApplicationStatus | "all")}
        >
          <SelectTrigger className="mt-1 max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {REVIEW_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {list.map((a) => (
          <Link
            key={a.id}
            to="/admissions/institute/applications/$applicationId"
            params={{ applicationId: a.id }}
            className="block rounded-2xl border border-border bg-card p-4 hover:border-primary/30 transition-colors"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{a.student.name}</p>
                <p className="text-sm text-muted-foreground">
                  {a.id} · {a.programName} · {a.grade}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Submitted{" "}
                  {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString("en-IN") : "—"}
                </p>
              </div>
              <Badge variant={statusTone(a.status)}>{statusLabel(a.status)}</Badge>
            </div>
          </Link>
        ))}
        {list.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No applications match this filter.
          </p>
        )}
      </div>
    </div>
  );
}

export function InstituteApplicationReviewPage({ applicationId }: { applicationId: string }) {
  const { instituteId } = useInstituteContext();
  const apps = getAllApplications();
  const app = apps.find((a) => a.id === applicationId);

  const [status, setStatus] = useState<ApplicationStatus>(app?.status ?? "submitted");
  const [adminNote, setAdminNote] = useState("");
  const [savedNotes, setSavedNotes] = useState<string[]>(app?.adminNotes ?? []);

  if (!app || (app.instituteId ?? "ins-lumenx-academy") !== instituteId) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Application not found.</p>
        <Button className="mt-4" asChild>
          <Link to="/admissions/institute/applications">Back to list</Link>
        </Button>
      </div>
    );
  }

  const saveReview = () => {
    const notes = adminNote.trim() ? [...savedNotes, adminNote.trim()] : savedNotes;
    const updated = updateApplicationByInstituteAdmin(applicationId, apps, {
      status,
      adminNotes: notes,
    });
    if (updated) {
      updateApplication(updated);
      setSavedNotes(notes);
      setAdminNote("");
      toast.success("Review saved");
    }
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <AdmissionsPageHeader
        title={app.student.name}
        subtitle={`${app.id} · ${app.programName} · ${app.grade}`}
        backTo="/admissions/institute/applications"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3 text-sm">
          <h3 className="font-semibold">Student</h3>
          <Row label="Name" value={app.student.name} />
          <Row label="DOB" value={app.student.dateOfBirth} />
          <Row label="Gender" value={app.student.gender} />
          <Row label="Blood group" value={app.student.bloodGroup} />
          <h3 className="font-semibold pt-2">Parent / guardian</h3>
          <Row label="Father" value={app.parent.fatherName} />
          <Row label="Mother" value={app.parent.motherName} />
          <Row label="Mobile" value={app.parent.mobile} />
          <Row label="Email" value={app.parent.email} />
          <h3 className="font-semibold pt-2">Academic</h3>
          <Row label="Current school" value={app.academic.currentSchool} />
          <Row label="Performance" value={app.academic.performance} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="font-semibold text-sm mb-3">Update status</h3>
            <Select value={status} onValueChange={(v) => setStatus(v as ApplicationStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REVIEW_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-4 space-y-2">
              <Label className="text-xs">Add admin note</Label>
              <Textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Internal note for this application…"
                rows={3}
              />
            </div>
            {savedNotes.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {savedNotes.map((n, i) => (
                  <li key={i}>• {n}</li>
                ))}
              </ul>
            )}
            <Button className="mt-4 w-full" onClick={saveReview}>
              Save review
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="font-semibold text-sm mb-3">Timeline</h3>
            <ApplicationStatusTimeline
              events={app.timeline.map((e) => ({ label: e.label, at: e.at, note: e.note }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function InstituteSettingsPage() {
  const { user, instituteId, profile } = useInstituteContext();
  const display = profile ?? {
    name: user?.instituteName ?? "Your institute",
    code: "—",
    city: "",
    state: "",
    tagline: "",
    about: "",
    contact: { phone: "", email: "", address: "" },
    admissionDates: [] as { label: string; date: string }[],
  };

  const [tagline, setTagline] = useState(display.tagline);
  const [about, setAbout] = useState(display.about);
  const [phone, setPhone] = useState(display.contact.phone);
  const [email, setEmail] = useState(display.contact.email);
  const [address, setAddress] = useState(display.contact.address);
  const [dates, setDates] = useState(display.admissionDates);

  if (!user || user.accountType !== "institute_admin") {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Institute admin access required.
      </div>
    );
  }

  if (!instituteId) {
    return (
      <div className="py-12 text-center space-y-3">
        <p className="text-muted-foreground">No institute linked to this account.</p>
        <Button asChild>
          <Link to="/admissions/institute">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  const save = () => {
    saveInstituteSettingsOverride(instituteId, {
      tagline,
      about,
      contact: { phone, email, address },
      admissionDates: dates,
    });
    toast.success("Institute profile saved");
  };

  const addDate = () => setDates((d) => [...d, { label: "", date: "" }]);
  const removeDate = (i: number) => setDates((d) => d.filter((_, idx) => idx !== i));
  const updateDate = (i: number, field: "label" | "date", value: string) => {
    setDates((d) => d.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <AdmissionsPageHeader
        title="Institute profile"
        subtitle="Edit public profile & admission dates"
        backTo="/admissions/institute"
      />

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-border">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="size-6 text-primary" />
          </div>
          <div>
            <p className="font-bold">{display.name}</p>
            <p className="text-xs text-muted-foreground">
              {display.code}
              {display.city || display.state
                ? ` · ${display.city}${display.city && display.state ? ", " : ""}${display.state}`
                : ""}
            </p>
          </div>
        </div>

        <Field label="Tagline">
          <Input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Short catchy line"
          />
        </Field>
        <Field label="About">
          <Textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={4} />
        </Field>
        <Field label="Phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Address">
          <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
        </Field>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">Important admission dates</Label>
            <Button type="button" variant="outline" size="sm" onClick={addDate}>
              <Plus className="size-4 mr-1" /> Add date
            </Button>
          </div>
          <div className="space-y-2">
            {dates.map((d, i) => (
              <div key={i} className="flex gap-2 items-start">
                <Input
                  className="flex-1"
                  placeholder="Label"
                  value={d.label}
                  onChange={(e) => updateDate(i, "label", e.target.value)}
                />
                <Input
                  className="flex-1"
                  placeholder="Date"
                  value={d.date}
                  onChange={(e) => updateDate(i, "date", e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDate(i)}
                  aria-label="Remove"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Button className="w-full sm:w-auto" onClick={save}>
          Save changes
        </Button>
      </div>
    </div>
  );
}

export function AdmissionFormBuilderPage() {
  const { instituteId } = useInstituteContext();
  const [fields, setFields] = useState<AdmissionFormField[]>(() =>
    instituteId ? getAdmissionForm(instituteId).fields : [],
  );
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<AdmissionFormField["type"]>("text");
  const [newRequired, setNewRequired] = useState(false);
  const [newOptions, setNewOptions] = useState("");
  const [newPlaceholder, setNewPlaceholder] = useState("");

  const selectedTypeMeta = FORM_FIELD_TYPES.find((t) => t.value === newType);

  const addField = () => {
    if (!newLabel.trim()) return toast.error("Enter a field name");
    if (newType === "select" && !newOptions.trim()) {
      return toast.error("Add dropdown options (comma-separated)");
    }
    const field: AdmissionFormField = {
      id: newFormFieldId(),
      label: newLabel.trim(),
      type: newType,
      required: newRequired,
      ...(newPlaceholder.trim() ? { placeholder: newPlaceholder.trim() } : {}),
      ...(newType === "select" && newOptions.trim()
        ? {
            options: newOptions
              .split(",")
              .map((o) => o.trim())
              .filter(Boolean),
          }
        : {}),
    };
    setFields((f) => [...f, field]);
    setNewLabel("");
    setNewOptions("");
    setNewPlaceholder("");
    setNewRequired(false);
    toast.success("Field added — save form to persist");
  };

  const removeField = (id: string) => setFields((f) => f.filter((x) => x.id !== id));

  const toggleRequired = (id: string) => {
    setFields((f) => f.map((x) => (x.id === id ? { ...x, required: !x.required } : x)));
  };

  const save = () => {
    saveAdmissionForm(instituteId, fields);
    toast.success("Admission form saved");
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <AdmissionsPageHeader
        title="Admission form builder"
        subtitle="Add custom fields · mark mandatory or optional"
        backTo="/admissions/institute"
      />

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <ClipboardList className="size-4 text-primary" /> Add new field
        </h3>
        <Field label="Field name / label">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Previous school TC number"
          />
        </Field>
        <Field label="Field type">
          <Select
            value={newType}
            onValueChange={(v) => setNewType(v as AdmissionFormField["type"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORM_FIELD_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTypeMeta?.hint && (
            <p className="text-xs text-muted-foreground mt-1">{selectedTypeMeta.hint}</p>
          )}
        </Field>
        {(newType === "text" ||
          newType === "textarea" ||
          newType === "number" ||
          newType === "phone" ||
          newType === "email") && (
          <Field label="Placeholder (optional)">
            <Input
              value={newPlaceholder}
              onChange={(e) => setNewPlaceholder(e.target.value)}
              placeholder={
                newType === "phone"
                  ? "e.g. 9876543210"
                  : newType === "email"
                    ? "you@email.com"
                    : "Hint text for applicant"
              }
            />
          </Field>
        )}
        {newType === "select" && (
          <Field label="Options (comma-separated)">
            <Input
              value={newOptions}
              onChange={(e) => setNewOptions(e.target.value)}
              placeholder="Yes, No, Maybe"
            />
          </Field>
        )}
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={newRequired}
            onChange={(e) => setNewRequired(e.target.checked)}
            className="rounded border-border"
          />
          Mandatory field
        </label>
        <Button type="button" variant="outline" onClick={addField}>
          <Plus className="size-4 mr-1" /> Add field
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h3 className="font-semibold text-sm mb-4">Form fields ({fields.length})</h3>
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No fields yet. Add your first field above.
          </p>
        ) : (
          <div className="space-y-2">
            {fields.map((f) => (
              <div
                key={f.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3"
              >
                <div className="flex-1 min-w-[140px]">
                  <p className="font-medium text-sm">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{formFieldTypeLabel(f.type)}</p>
                  {f.placeholder && (
                    <p className="text-[10px] text-muted-foreground">
                      Placeholder: {f.placeholder}
                    </p>
                  )}
                </div>
                <button type="button" onClick={() => toggleRequired(f.id)} className="text-xs">
                  <Badge variant={f.required ? "default" : "secondary"}>
                    {f.required ? "Mandatory" : "Optional"}
                  </Badge>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeField(f.id)}
                  aria-label="Remove field"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <Button className="mt-4 w-full sm:w-auto" onClick={save}>
          Save form
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value || "—"}</span>
    </div>
  );
}
