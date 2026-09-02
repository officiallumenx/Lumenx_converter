import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAdminToast } from "@/components/AdminActionToast";
import { TimetableApiReadView } from "@/components/timetable/TimetableApiReadView";
import {
  Button,
  Field,
  Modal,
  Select,
  TextInput,
} from "@lumenx/ui-admin";
import { Plus } from "lucide-react";
import { classLabelForSection } from "@/lib/classes/map";
import { listClassesCatalog } from "@/lib/classes/api";
import type { ClassDto, SectionDto } from "@/lib/classes/types";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import { listSubjects } from "@/lib/subjects/api";
import type { SubjectDto } from "@/lib/subjects/types";
import { listTeachers, teacherDtosToListItems } from "@/lib/teachers";
import {
  createTimetableSlot,
  deleteTimetableSlot,
  listTeacherAssignments,
  loadTimetableReadBundle,
  publishSectionTimetable,
  resolveTimetableLoadView,
  shouldCommitTimetableLoad,
  teacherAssignmentDtosToListItems,
  updateTimetableSlot,
  buildTimetableInstituteSummary,
  type TeacherAssignmentListItem,
  type TimetableLoadStatus,
  type TimetableReadBundle,
  type TimetableSlotListItem,
  type TimetableSlotStatus,
} from "@/lib/timetable";
import { notifyTimetablePublished } from "@lumenx/module-notifications";

const DAY_OPTIONS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
] as const;

function timetableLoadHint(
  status: TimetableLoadStatus,
  errorMessage: string | null,
): string | null {
  if (status === "loading") return "Loading timetable slots…";
  if (status === "needs_institute") return "Select an institute to load timetable.";
  if (status === "forbidden") {
    return errorMessage ?? "You do not have access to timetable for this institute.";
  }
  if (status === "error") return errorMessage ?? "Failed to load timetable.";
  if (status === "empty") return "No timetable slots found for this institute.";
  return null;
}

function normalizeTime(value: string): string {
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  return trimmed;
}

export function TimetableApiPage() {
  const notify = useAdminToast();
  const search = useSearch({ from: "/timetable" });
  const navigate = useNavigate();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const [apiBundle, setApiBundle] = useState<TimetableReadBundle | null>(null);
  const [loadStatus, setLoadStatus] = useState<TimetableLoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [mutating, setMutating] = useState(false);

  const [sections, setSections] = useState<SectionDto[]>([]);
  const [classes, setClasses] = useState<ClassDto[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignmentListItem[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlotListItem | null>(null);
  const [formSectionId, setFormSectionId] = useState("");
  const [formAssignmentId, setFormAssignmentId] = useState("");
  const [formDayOfWeek, setFormDayOfWeek] = useState(1);
  const [formPeriodIndex, setFormPeriodIndex] = useState(1);
  const [formStartsAt, setFormStartsAt] = useState("09:00");
  const [formEndsAt, setFormEndsAt] = useState("09:45");
  const [formRoom, setFormRoom] = useState("");
  const [formStatus, setFormStatus] = useState<TimetableSlotStatus>("inactive");
  const [formError, setFormError] = useState<string | null>(null);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  const loadView = resolveTimetableLoadView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedBundle: apiBundle,
    storedStatus: loadStatus,
    storedErrorMessage: loadError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const loadHint = timetableLoadHint(loadView.status, loadView.errorMessage);

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setApiBundle(null);
      setLoadStatus("loading");
      setLoadError(null);
      setResolvedForInstituteId(null);
      setFormOpen(false);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiBundle(null);
      setLoadStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setLoadError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      setFormOpen(false);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiBundle(null);
      setLoadStatus("needs_institute");
      setLoadError(null);
      setResolvedForInstituteId(null);
      setSections([]);
      setClasses([]);
      setAssignments([]);
      setFormOpen(false);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setLoadStatus("loading");
    setLoadError(null);
    setFormOpen(false);

    void Promise.all([
      loadTimetableReadBundle(requestInstituteId),
      listClassesCatalog({ instituteId: requestInstituteId }),
    ]).then(
      ([next, catalog]) => {
        if (
          !shouldCommitTimetableLoad({
            cancelled,
            requestInstituteId,
            activeInstituteId: activeInstituteIdRef.current,
          })
        ) {
          return;
        }
        setApiBundle(next.bundle);
        setLoadStatus(next.status);
        setLoadError(next.errorMessage);
        setResolvedForInstituteId(requestInstituteId);
        setSections(catalog.sections);
        setClasses(catalog.classes);
      },
      (err) => {
        if (
          !shouldCommitTimetableLoad({
            cancelled,
            requestInstituteId,
            activeInstituteId: activeInstituteIdRef.current,
          })
        ) {
          return;
        }
        setApiBundle(null);
        setLoadStatus("error");
        setLoadError(err instanceof Error ? err.message : "Failed to load timetable");
        setResolvedForInstituteId(requestInstituteId);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
  ]);

  const sectionOptions = useMemo(() => {
    const classesById = new Map(classes.map((cls) => [cls.id, cls]));
    return [...sections]
      .map((section) => ({
        id: section.id,
        label: `${classLabelForSection(section, classesById)} · Sec ${
          section.code?.trim() || section.name?.trim() || section.id.slice(0, 8)
        }`,
        academicYearId: section.academicYearId,
        classId: section.classId,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [sections, classes]);

  const sectionAssignments = useMemo(
    () =>
      formSectionId
        ? assignments.filter((row) => row.sectionId === formSectionId)
        : assignments,
    [assignments, formSectionId],
  );

  useEffect(() => {
    if (!formOpen || !formSectionId || !instituteCtx.activeInstituteId) {
      return;
    }
    const requestInstituteId = instituteCtx.activeInstituteId;
    const requestSectionId = formSectionId;
    let cancelled = false;
    setLoadingAssignments(true);
    void Promise.all([
      listTeacherAssignments({
        instituteId: requestInstituteId,
        sectionId: requestSectionId,
        status: editingSlot ? undefined : "active",
      }),
      listTeachers({ instituteId: requestInstituteId }).then(teacherDtosToListItems),
      listSubjects({ instituteId: requestInstituteId }),
    ])
      .then(([rows, teachers, subjects]) => {
        if (
          cancelled ||
          activeInstituteIdRef.current !== requestInstituteId ||
          formSectionId !== requestSectionId
        ) {
          return;
        }
        const teachersById = new Map(teachers.map((t) => [t.id, t]));
        const subjectsById = new Map(
          (subjects as SubjectDto[]).map((s) => [s.id, s]),
        );
        setAssignments(
          teacherAssignmentDtosToListItems(rows, teachersById, subjectsById),
        );
      })
      .catch((err) => {
        if (
          cancelled ||
          activeInstituteIdRef.current !== requestInstituteId
        ) {
          return;
        }
        setAssignments([]);
        setFormError(
          err instanceof Error ? err.message : "Failed to load teacher assignments",
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingAssignments(false);
      });

    return () => {
      cancelled = true;
    };
  }, [formOpen, formSectionId, instituteCtx.activeInstituteId, editingSlot]);

  const selectedSectionId = search.id;

  const instituteSummary = useMemo(
    () => (loadView.bundle ? buildTimetableInstituteSummary(loadView.bundle.sections) : null),
    [loadView.bundle],
  );

  const publishSection = (sectionId: string) => {
    if (!writesEnabled || mutating) return;
    const instituteId = instituteCtx.activeInstituteId;
    if (!instituteId) return;
    const summary = loadView.bundle?.sections.find((s) => s.sectionId === sectionId);
    if (!summary?.inactiveCount) return;

    setMutating(true);
    void publishSectionTimetable({ instituteId, sectionId })
      .then((result) => {
        if (activeInstituteIdRef.current !== instituteId) return;
        notifyTimetablePublished({
          timetableId: sectionId,
          classLabel: `${summary.classLabel} · Sec ${summary.sectionLabel}`,
        });
        setReloadKey((k) => k + 1);
        notify(
          result.activatedCount > 0
            ? `Published ${result.activatedCount} period${result.activatedCount === 1 ? "" : "s"} for ${summary.classLabel} · Sec ${summary.sectionLabel}`
            : "Section timetable is already published",
        );
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to publish timetable");
      })
      .finally(() => setMutating(false));
  };

  const subtitle = useMemo(() => {
    if (!loadView.rowsValid || !loadView.bundle) {
      return `API mode · ${loadHint ?? "…"}`;
    }
    const mode = writesEnabled
      ? "create / edit / delete slots"
      : "read-only";
    return `API mode · ${mode} · ${loadView.bundle.sections.length} sections · ${loadView.bundle.slots.length} slots · ${instituteSummary?.publishedCount ?? 0} published`;
  }, [loadView.bundle, loadView.rowsValid, loadHint, writesEnabled, instituteSummary?.publishedCount]);

  const openSection = (sectionId: string) => {
    void navigate({
      to: "/timetable",
      search: {
        id: sectionId,
        createGrade: undefined,
        createSection: undefined,
        openCreate: undefined,
      },
    });
  };

  const backToList = () => {
    void navigate({
      to: "/timetable",
      search: {
        id: undefined,
        createGrade: undefined,
        createSection: undefined,
        openCreate: undefined,
      },
    });
  };

  const resetForm = () => {
    setEditingSlot(null);
    setFormSectionId(selectedSectionId ?? "");
    setFormAssignmentId("");
    setFormDayOfWeek(1);
    setFormPeriodIndex(1);
    setFormStartsAt("09:00");
    setFormEndsAt("09:45");
    setFormRoom("");
    setFormStatus("inactive");
    setFormError(null);
    setAssignments([]);
  };

  const openCreate = (sectionId?: string) => {
    if (!writesEnabled) return;
    resetForm();
    setFormSectionId(sectionId ?? selectedSectionId ?? "");
    setFormOpen(true);
  };

  const openEdit = (slot: TimetableSlotListItem) => {
    if (!writesEnabled) return;
    setEditingSlot(slot);
    setFormSectionId(slot.sectionId);
    setFormAssignmentId(slot.teacherAssignmentId);
    setFormDayOfWeek(slot.dayOfWeek);
    setFormPeriodIndex(slot.periodIndex);
    setFormStartsAt(slot.startsAt.slice(0, 5));
    setFormEndsAt(slot.endsAt.slice(0, 5));
    setFormRoom(slot.room ?? "");
    setFormStatus(slot.status);
    setFormError(null);
    setFormOpen(true);
  };

  const saveForm = () => {
    if (!writesEnabled || mutating) return;
    const instituteId = instituteCtx.activeInstituteId;
    if (!instituteId) {
      setFormError("Select an institute before saving");
      return;
    }
    if (!formSectionId) {
      setFormError("Select a section");
      return;
    }
    if (!formAssignmentId) {
      setFormError("Select a teacher assignment");
      return;
    }
    if (formPeriodIndex < 1) {
      setFormError("Period index must be at least 1");
      return;
    }
    const startsAt = normalizeTime(formStartsAt);
    const endsAt = normalizeTime(formEndsAt);
    if (endsAt <= startsAt) {
      setFormError("End time must be after start time");
      return;
    }

    const assignment =
      sectionAssignments.find((row) => row.id === formAssignmentId) ??
      assignments.find((row) => row.id === formAssignmentId);
    if (!assignment) {
      setFormError("Select a valid teacher assignment for this section");
      return;
    }

    setMutating(true);
    setFormError(null);

    const done = (message: string) => {
      if (activeInstituteIdRef.current !== instituteId) return;
      setFormOpen(false);
      resetForm();
      setReloadKey((k) => k + 1);
      notify(message);
    };

    if (editingSlot) {
      void updateTimetableSlot(editingSlot.id, {
        teacherAssignmentId: formAssignmentId,
        dayOfWeek: formDayOfWeek,
        periodIndex: formPeriodIndex,
        startsAt,
        endsAt,
        room: formRoom.trim() || null,
        status: formStatus,
      })
        .then(() => done("Timetable slot updated"))
        .catch((err) => {
          setFormError(err instanceof Error ? err.message : "Failed to update slot");
        })
        .finally(() => setMutating(false));
      return;
    }

    void createTimetableSlot({
      instituteId,
      academicYearId: assignment.academicYearId,
      classId: assignment.classId,
      sectionId: assignment.sectionId,
      teacherAssignmentId: assignment.id,
      dayOfWeek: formDayOfWeek,
      periodIndex: formPeriodIndex,
      startsAt,
      endsAt,
      room: formRoom.trim() || null,
      status: formStatus,
    })
      .then(() => {
        if (activeInstituteIdRef.current !== instituteId) return;
        done("Timetable slot created");
        if (!selectedSectionId) {
          openSection(assignment.sectionId);
        }
      })
      .catch((err) => {
        setFormError(err instanceof Error ? err.message : "Failed to create slot");
      })
      .finally(() => setMutating(false));
  };

  const removeSlot = (slotId: string) => {
    if (!writesEnabled || mutating) return;
    const requestInstituteId = instituteCtx.activeInstituteId;
    if (!requestInstituteId) return;
    setMutating(true);
    void deleteTimetableSlot(slotId)
      .then(() => {
        if (activeInstituteIdRef.current !== requestInstituteId) return;
        setReloadKey((k) => k + 1);
        notify("Timetable slot deleted");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to delete slot");
      })
      .finally(() => setMutating(false));
  };

  return (
    <AppShell
      title={selectedSectionId ? "Timetable slots" : "Timetables"}
      subtitle={subtitle}
      actions={
        writesEnabled ? (
          <Button variant="primary" onClick={() => openCreate()}>
            <Plus className="size-3.5" /> New slot
          </Button>
        ) : null
      }
    >
      {!loadView.rowsValid || !loadView.bundle ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {loadHint ?? "Loading timetable…"}
        </div>
      ) : (
        <TimetableApiReadView
          bundle={loadView.bundle}
          instituteSummary={instituteSummary ?? undefined}
          selectedSectionId={selectedSectionId}
          listHint={loadHint}
          writesEnabled={writesEnabled}
          mutating={mutating}
          onCreateSlot={openCreate}
          onEditSlot={openEdit}
          onDeleteSlot={removeSlot}
          onPublishSection={publishSection}
          onOpenSection={openSection}
          onBack={backToList}
        />
      )}

      <Modal
        open={formOpen}
        onClose={() => {
          if (mutating) return;
          setFormOpen(false);
          resetForm();
        }}
        title={editingSlot ? "Edit timetable slot" : "New timetable slot"}
        subtitle="Slots bind to an active teacher assignment for the section"
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              disabled={mutating}
              onClick={() => {
                setFormOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" disabled={mutating} onClick={saveForm}>
              {editingSlot ? "Save changes" : "Create slot"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
          <Field label="Section">
            <Select
              value={formSectionId}
              disabled={mutating || Boolean(editingSlot)}
              onChange={(e) => {
                setFormSectionId(e.target.value);
                setFormAssignmentId("");
                setFormError(null);
              }}
            >
              <option value="">Select section</option>
              {sectionOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Teacher assignment"
            hint={
              loadingAssignments
                ? "Loading assignments…"
                : formSectionId && sectionAssignments.length === 0
                  ? "No active assignments for this section"
                  : undefined
            }
          >
            <Select
              value={formAssignmentId}
              disabled={mutating || !formSectionId || loadingAssignments}
              onChange={(e) => {
                setFormAssignmentId(e.target.value);
                setFormError(null);
              }}
            >
              <option value="">Select assignment</option>
              {sectionAssignments.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Day">
              <Select
                value={String(formDayOfWeek)}
                disabled={mutating}
                onChange={(e) => setFormDayOfWeek(Number(e.target.value))}
              >
                {DAY_OPTIONS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Period index">
              <TextInput
                type="number"
                min={1}
                value={String(formPeriodIndex)}
                disabled={mutating}
                onChange={(e) =>
                  setFormPeriodIndex(Math.max(1, Number(e.target.value) || 1))
                }
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Starts at">
              <TextInput
                type="time"
                value={formStartsAt.slice(0, 5)}
                disabled={mutating}
                onChange={(e) => setFormStartsAt(e.target.value)}
              />
            </Field>
            <Field label="Ends at">
              <TextInput
                type="time"
                value={formEndsAt.slice(0, 5)}
                disabled={mutating}
                onChange={(e) => setFormEndsAt(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Room">
              <TextInput
                value={formRoom}
                disabled={mutating}
                onChange={(e) => setFormRoom(e.target.value)}
                placeholder="Optional"
              />
            </Field>
            <Field label="Status">
              <Select
                value={formStatus}
                disabled={mutating}
                onChange={(e) =>
                  setFormStatus(e.target.value as TimetableSlotStatus)
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
