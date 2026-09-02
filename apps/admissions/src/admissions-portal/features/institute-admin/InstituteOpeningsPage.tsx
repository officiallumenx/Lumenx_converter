import { useEffect, useState, type MouseEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@lumenx/ui";
import { DoorOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { toLocalIsoDate } from "@lumenx/utils";
import { toast } from "sonner";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { ConnectDatePicker } from "@/components/app/attendance/AttendanceDatePicker";
import { AdmissionsPageHeader } from "@/admissions-portal/shared/ui/AdmissionsPageHeader";
import type { AdmissionOpening, AdmissionOpeningStatus } from "@/lib/admissions/types";
import {
  createAdmissionOpening,
  deleteAdmissionOpening,
  updateAdmissionOpening,
} from "@/lib/admissions/api";
import { useAdmissionsOpenings } from "@/hooks/use-admissions-openings";
import { useAdmissionsPrograms } from "@/hooks/use-admissions-programs";
import {
  createOpening,
  deleteOpening,
  ensureDemoOpenings,
  getOpeningsForInstitute,
  setOpeningStatus,
  updateOpening,
  type AdmissionOpeningInput,
} from "@/lib/admissions/openings-store";

const STATUS_LABEL: Record<AdmissionOpeningStatus, string> = {
  draft: "Draft",
  open: "Published",
  closed: "Closed",
};

const CLASS_OPTIONS = [
  "Nursery",
  "LKG",
  "UKG",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
] as const;

const emptyForm = (): AdmissionOpeningInput & { programId?: string } => ({
  name: "",
  description: "",
  grades: [],
  seatsAvailable: 20,
  academicYear: "2026–27",
  applicationDeadline: "",
  eligibility: "",
  ageCriteria: "",
  duration: "1 year",
  status: "draft",
  programId: "",
});

function toDateInputValue(raw: string): string {
  const value = raw.trim();
  if (!value || value === "TBA") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "";
  const d = new Date(parsed);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDeadline(raw: string): string {
  const iso = toDateInputValue(raw);
  if (!iso) return raw.trim() || "TBA";
  const d = new Date(`${iso}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function classFromOpening(opening: AdmissionOpening): string {
  const fromName = opening.name.trim();
  if (CLASS_OPTIONS.includes(fromName as (typeof CLASS_OPTIONS)[number])) return fromName;
  const fromGrade = opening.grades[0]?.trim() ?? "";
  if (CLASS_OPTIONS.includes(fromGrade as (typeof CLASS_OPTIONS)[number])) return fromGrade;
  const gradeMatch = fromGrade.match(/^Grade\s+(\d+)$/i);
  if (gradeMatch) return `Class ${gradeMatch[1]}`;
  return fromName || fromGrade;
}

export function InstituteOpeningsPage() {
  const { user } = useAdmissionsAuth();
  const instituteId = user?.instituteId ?? "";
  const apiMode = isApiAuthMode();

  const {
    openings: apiOpenings,
    reload: reloadApiOpenings,
    loading: apiLoading,
  } = useAdmissionsOpenings({ instituteId: apiMode ? instituteId : null });
  const { programs: apiPrograms } = useAdmissionsPrograms({
    instituteId: apiMode ? instituteId : null,
  });

  const [demoItems, setDemoItems] = useState<AdmissionOpening[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdmissionOpening | null>(null);
  const [saving, setSaving] = useState(false);

  const items = apiMode ? apiOpenings : demoItems;

  const reloadDemo = () => {
    if (!instituteId) return;
    setDemoItems(getOpeningsForInstitute(instituteId));
  };

  useEffect(() => {
    if (apiMode || !instituteId) return;
    ensureDemoOpenings(instituteId);
    setDemoItems(getOpeningsForInstitute(instituteId));
  }, [apiMode, instituteId]);

  useEffect(() => {
    if (!apiMode || !showForm || form.programId) return;
    const first = apiPrograms[0];
    if (first) {
      setForm((prev) => ({ ...prev, programId: first.id }));
    }
  }, [apiMode, showForm, form.programId, apiPrograms]);

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
          <Link to="/institute">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  const selectedClass = form.name.trim();

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const startEdit = (opening: AdmissionOpening) => {
    const className = classFromOpening(opening);
    setEditingId(opening.id);
    setForm({
      name: className,
      description: opening.description,
      grades: [className],
      seatsAvailable: opening.seatsAvailable,
      academicYear: opening.academicYear,
      applicationDeadline: toDateInputValue(opening.applicationDeadline),
      eligibility: opening.eligibility,
      ageCriteria: opening.ageCriteria,
      duration: opening.duration,
      status: opening.status,
      programId: apiPrograms[0]?.id ?? "",
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const setClass = (className: string) => {
    setForm((prev) => ({
      ...prev,
      name: className,
      grades: [className],
      description:
        (prev.description ?? "").trim() && prev.name
          ? prev.description
          : `${className} admissions for ${prev.academicYear || "2026–27"}`,
    }));
  };

  const save = async () => {
    if (!selectedClass) return toast.error("Select a class");
    if (form.seatsAvailable < 0) {
      return toast.error("Seats cannot be negative");
    }

    const duplicate = items.find(
      (o) =>
        o.id !== editingId &&
        classFromOpening(o).toLowerCase() === selectedClass.toLowerCase(),
    );
    if (duplicate) {
      return toast.error(`${selectedClass} opening already exists`);
    }

    if (apiMode) {
      const programId = form.programId?.trim() || apiPrograms[0]?.id;
      if (!programId) {
        return toast.error("Create an admission program in Admin first, then add openings.");
      }

      setSaving(true);
      try {
        const deadline = form.applicationDeadline?.trim() || undefined;
        if (editingId) {
          await updateAdmissionOpening(editingId, {
            name: selectedClass,
            description: form.description?.trim() || null,
            seatsAvailable: form.seatsAvailable,
            academicYearLabel: form.academicYear?.trim() || null,
            applicationDeadline: deadline ?? null,
            status: form.status,
          });
          toast.success("Opening updated");
        } else {
          await createAdmissionOpening({
            instituteId,
            programId,
            name: selectedClass,
            description: form.description?.trim() || null,
            seatsAvailable: form.seatsAvailable,
            academicYearLabel: form.academicYear?.trim() || null,
            applicationDeadline: deadline,
            openNow: form.status === "open",
          });
          toast.success("Opening created");
        }
        cancelForm();
        reloadApiOpenings();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save opening");
      } finally {
        setSaving(false);
      }
      return;
    }

    const payload: AdmissionOpeningInput = {
      ...form,
      name: selectedClass,
      grades: [selectedClass],
    };

    if (editingId) {
      updateOpening(editingId, payload);
      toast.success("Opening updated");
    } else {
      createOpening(instituteId, payload);
      toast.success("Opening created");
    }
    cancelForm();
    reloadDemo();
  };

  const changeStatus = async (id: string, status: AdmissionOpeningStatus) => {
    if (apiMode) {
      try {
        await updateAdmissionOpening(id, { status });
        toast.success(
          status === "open"
            ? "Opening published — parents can apply"
            : status === "closed"
              ? "Opening closed"
              : "Moved to draft",
        );
        reloadApiOpenings();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update status");
      }
      return;
    }

    setOpeningStatus(id, status);
    toast.success(
      status === "open"
        ? "Opening published — parents can apply"
        : status === "closed"
          ? "Opening closed"
          : "Moved to draft",
    );
    reloadDemo();
  };

  const askDelete = (opening: AdmissionOpening, e?: MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setDeleteTarget(opening);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;

    if (apiMode) {
      try {
        await deleteAdmissionOpening(id);
        toast.success("Opening deleted");
        if (editingId === id) cancelForm();
        else setShowForm(false);
        reloadApiOpenings();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete opening");
      } finally {
        setDeleteTarget(null);
      }
      return;
    }

    const ok = deleteOpening(id);
    setDeleteTarget(null);
    if (!ok) {
      toast.error("Could not delete opening");
      return;
    }
    toast.success("Opening deleted");
    if (editingId === id) cancelForm();
    else setShowForm(false);
    reloadDemo();
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <AdmissionsPageHeader
        title="Admission openings"
        subtitle="Publish seats by class — e.g. Class 10 · 20 seats"
        backTo="/institute"
      />

      {apiMode && apiPrograms.length === 0 && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-muted-foreground">
          No admission programs yet. Ask your school admin to add a program from LumenX Admin →
          Admissions, then return here to publish class openings.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {items.filter((i) => i.status === "open").length} published · {items.length} total
          {apiLoading ? " · loading…" : ""}
        </p>
        {!showForm && (
          <Button onClick={startCreate} disabled={apiMode && apiPrograms.length === 0}>
            <Plus className="size-4 mr-1" /> Add opening
          </Button>
        )}
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <DoorOpen className="size-4 text-primary" />
            {editingId ? "Edit opening" : "New opening"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {apiMode && apiPrograms.length > 1 && (
              <div className="sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Program</Label>
                <Select
                  value={form.programId || undefined}
                  onValueChange={(v) => setForm({ ...form, programId: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {apiPrograms.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Class</Label>
              <Select value={selectedClass || undefined} onValueChange={setClass}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select one class" />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                One opening = one class (e.g. Class 10 with 20 seats).
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Seats</Label>
              <Input
                className="mt-1"
                type="number"
                min={0}
                value={form.seatsAvailable}
                onChange={(e) =>
                  setForm({ ...form, seatsAvailable: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Academic year</Label>
              <Input
                className="mt-1"
                placeholder="2026–27"
                value={form.academicYear}
                onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Application deadline</Label>
              <div className="mt-1">
                <ConnectDatePicker
                  label="Application deadline"
                  hideLabel
                  value={toDateInputValue(form.applicationDeadline)}
                  min={toLocalIsoDate(new Date())}
                  onChange={(iso) => setForm({ ...form, applicationDeadline: iso })}
                />
              </div>
              {form.applicationDeadline ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDeadline(form.applicationDeadline)}
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">Pick a date from the calendar</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select
                value={form.status ?? "draft"}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as AdmissionOpeningStatus })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="open">Published (accepting applications)</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Description (optional)</Label>
              <Textarea
                className="mt-1"
                rows={3}
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void save()} disabled={saving}>
              {editingId ? "Save changes" : "Create opening"}
            </Button>
            <Button variant="outline" onClick={cancelForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map((o) => (
          <div
            key={o.id}
            className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{o.name}</p>
                <Badge variant={o.status === "open" ? "default" : "secondary"}>
                  {STATUS_LABEL[o.status]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {o.seatsAvailable > 0
                  ? `${o.seatsAvailable} seats · ${o.academicYear}`
                  : `Seats Full · Waitlist Available · ${o.academicYear}`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Deadline {formatDeadline(o.applicationDeadline)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {o.status !== "open" && (
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    void changeStatus(o.id, "open");
                  }}
                >
                  Publish
                </Button>
              )}
              {o.status === "open" && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    void changeStatus(o.id, "closed");
                  }}
                >
                  Close
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit(o);
                }}
              >
                <Pencil className="size-3.5 mr-1" /> Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Delete ${o.name}`}
                onClick={(e) => askDelete(o, e)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {items.length === 0 && !showForm && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No openings yet. Add a class (e.g. Class 10), set seats and deadline, then publish
            so parents can apply from Browse institutes.
          </p>
        )}
      </div>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete opening?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.name}" will be removed permanently. Parents will no longer see this opening.`
                : "This opening will be removed permanently."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
