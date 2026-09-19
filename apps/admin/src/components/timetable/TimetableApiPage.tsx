import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTimetableReadQuery, adminQueryRoots } from "@/lib/admin-queries";
import { invalidateAdminCache } from "@/lib/admin-resource-cache";
import { AppShell } from "@/components/AppShell";
import { useAdminToast } from "@/components/AdminActionToast";
import { TimetableApiReadView } from "@/components/timetable/TimetableApiReadView";
import { TimetableCreateWizard } from "@/components/timetable/TimetableCreateWizard";
import type { AssignCellTarget } from "@/components/timetable/TimetableAssignGrid";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
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
  listSectionIdsWithSchedule,
  loadSectionScheduleInput,
} from "@/lib/timetable-directory-store";
import type { ScheduleInput } from "@/lib/timetable-schedule";
import {
  createTeacherAssignment,
  createTimetableSlot,
  deleteTimetableSlot,
  listTeacherAssignments,
  publishSectionTimetable,
  resolveTimetableLoadView,
  teacherAssignmentDtosToListItems,
  updateTimetableSlot,
  buildTimetableInstituteSummary,
  type TeacherAssignmentListItem,
  type TimetableLoadStatus,
  type TimetableReadBundle,
  type TimetableSlotListItem,
} from "@/lib/timetable";
import { notifyTimetablePublished } from "@lumenx/module-notifications";
import type { TeacherListItem } from "@/lib/teachers/types";

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
  const queryClient = useQueryClient();
  const listEnabled =
    instituteCtx.status === "ready" &&
    Boolean(instituteCtx.activeInstituteId);
  const timetableQuery = useTimetableReadQuery(
    instituteCtx.activeInstituteId,
    listEnabled,
  );
  const bumpTimetableReload = () => {
    invalidateAdminCache("admin:timetable");
    if (instituteCtx.activeInstituteId) {
      void queryClient.invalidateQueries({
        queryKey: [adminQueryRoots.timetable, instituteCtx.activeInstituteId],
      });
    }
  };
  const [mutating, setMutating] = useState(false);

  const [sections, setSections] = useState<SectionDto[]>([]);
  const [classes, setClasses] = useState<ClassDto[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignmentListItem[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [draftedSectionIds, setDraftedSectionIds] = useState<string[]>([]);
  const [sectionSchedule, setSectionSchedule] = useState<ScheduleInput | null>(null);
  const [editingSlot, setEditingSlot] = useState<TimetableSlotListItem | null>(null);
  const [formSectionId, setFormSectionId] = useState("");
  const [formAssignmentId, setFormAssignmentId] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formSubjects, setFormSubjects] = useState<SubjectDto[]>([]);
  const [formTeachers, setFormTeachers] = useState<TeacherListItem[]>([]);
  const [formDayOfWeek, setFormDayOfWeek] = useState(1);
  const [formPeriodIndex, setFormPeriodIndex] = useState(1);
  const [formStartsAt, setFormStartsAt] = useState("09:00");
  const [formEndsAt, setFormEndsAt] = useState("09:45");
  const [formRoom, setFormRoom] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  /** subjectId → teacherId preferred pairing for easier period assign */
  const [staffingPairs, setStaffingPairs] = useState<Record<string, string>>({});
  const [staffingSubjects, setStaffingSubjects] = useState<SubjectDto[]>([]);
  const [staffingTeachers, setStaffingTeachers] = useState<TeacherListItem[]>([]);

  const loadView = resolveTimetableLoadView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedBundle: apiBundle,
    storedStatus:
      timetableQuery.isLoading && !timetableQuery.data ? "loading" : loadStatus,
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

    if (timetableQuery.isLoading && !timetableQuery.data) {
      setLoadStatus("loading");
      setLoadError(null);
      return;
    }
    if (!timetableQuery.data) return;

    const next = timetableQuery.data;
    setApiBundle(next.bundle);
    setLoadStatus(next.status);
    setLoadError(next.errorMessage);
    setResolvedForInstituteId(instituteCtx.activeInstituteId);
  }, [
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    timetableQuery.data,
    timetableQuery.isLoading,
  ]);

  useEffect(() => {
    if (!listEnabled || !instituteCtx.activeInstituteId) return;
    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    void listClassesCatalog({ instituteId: requestInstituteId }).then((catalog) => {
      if (cancelled || activeInstituteIdRef.current !== requestInstituteId) return;
      setSections(catalog.sections);
      setClasses(catalog.classes);
      setDraftedSectionIds(listSectionIdsWithSchedule(requestInstituteId));
    });
    return () => {
      cancelled = true;
    };
  }, [listEnabled, instituteCtx.activeInstituteId]);

  useEffect(() => {
    const instituteId = instituteCtx.activeInstituteId;
    if (!instituteId || instituteCtx.status !== "ready") {
      setStaffingSubjects([]);
      setStaffingTeachers([]);
      return;
    }
    let cancelled = false;
    void Promise.all([
      listSubjects({ instituteId }),
      listTeachers({ instituteId }),
    ]).then(([subjectRows, teacherRows]) => {
      if (cancelled) return;
      setStaffingSubjects(subjectRows.filter((s) => s.status === "active"));
      setStaffingTeachers(teacherDtosToListItems(teacherRows));
    }).catch(() => {
      if (!cancelled) {
        setStaffingSubjects([]);
        setStaffingTeachers([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [instituteCtx.activeInstituteId, instituteCtx.status]);

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
        setFormTeachers(teachers);
        setFormSubjects(subjects as SubjectDto[]);
        if (editingSlot) {
          const match = rows.find((r) => r.id === editingSlot.teacherAssignmentId);
          if (match) {
            setFormSubjectId(match.subjectId);
            setFormTeacherId(match.teacherId);
          }
        }
      })
      .catch((err) => {
        if (
          cancelled ||
          activeInstituteIdRef.current !== requestInstituteId
        ) {
          return;
        }
        setAssignments([]);
        setFormTeachers([]);
        setFormSubjects([]);
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

  useEffect(() => {
    if (!selectedSectionId) {
      setSectionSchedule(null);
      return;
    }
    setSectionSchedule(
      loadSectionScheduleInput(
        selectedSectionId,
        instituteCtx.activeInstituteId ?? undefined,
      ),
    );
  }, [selectedSectionId, instituteCtx.activeInstituteId]);

  // Deep-link from Classes: open wizard when openCreate=true and no section selected.
  useEffect(() => {
    if (!writesEnabled) return;
    if (search.openCreate && !selectedSectionId) {
      setWizardOpen(true);
    }
  }, [search.openCreate, selectedSectionId, writesEnabled]);

  const assignmentLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of assignments) map[row.id] = row.label;
    return map;
  }, [assignments]);

  // Prefetch assignments for the selected section so the assign grid can label cells.
  useEffect(() => {
    if (!selectedSectionId || !instituteCtx.activeInstituteId) {
      setStaffingPairs({});
      return;
    }
    const requestInstituteId = instituteCtx.activeInstituteId;
    const requestSectionId = selectedSectionId;
    let cancelled = false;
    void Promise.all([
      listTeacherAssignments({
        instituteId: requestInstituteId,
        sectionId: requestSectionId,
        status: "active",
      }),
      listTeachers({ instituteId: requestInstituteId }).then(teacherDtosToListItems),
      listSubjects({ instituteId: requestInstituteId }),
    ])
      .then(([rows, teachers, subjects]) => {
        if (
          cancelled ||
          activeInstituteIdRef.current !== requestInstituteId ||
          selectedSectionId !== requestSectionId
        ) {
          return;
        }
        const teachersById = new Map(teachers.map((t) => [t.id, t]));
        const subjectsById = new Map(
          (subjects as SubjectDto[]).map((s) => [s.id, s]),
        );
        const listItems = teacherAssignmentDtosToListItems(
          rows,
          teachersById,
          subjectsById,
        );
        setAssignments(listItems);
        setFormTeachers(teachers);
        setFormSubjects(subjects as SubjectDto[]);
        // Hydrate Subject ↔ teacher map from persisted assignments (last-wins).
        const pairs: Record<string, string> = {};
        for (const row of listItems) {
          if (row.subjectId && row.teacherId) {
            pairs[row.subjectId] = row.teacherId;
          }
        }
        setStaffingPairs(pairs);
      })
      .catch(() => {
        /* labels are best-effort */
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSectionId, instituteCtx.activeInstituteId]);

  const persistStaffingPair = (subjectId: string, teacherId: string) => {
    if (!writesEnabled || !selectedSectionId || !instituteCtx.activeInstituteId) {
      return;
    }
    const sectionMeta = sectionOptions.find((s) => s.id === selectedSectionId);
    if (!sectionMeta) {
      notify("Open a section before mapping teachers");
      return;
    }
    const instituteId = instituteCtx.activeInstituteId;
    setStaffingPairs((prev) => ({ ...prev, [subjectId]: teacherId }));
    void createTeacherAssignment({
      instituteId,
      academicYearId: sectionMeta.academicYearId,
      classId: sectionMeta.classId,
      sectionId: selectedSectionId,
      subjectId,
      teacherId,
      status: "active",
    })
      .then(() =>
        listTeacherAssignments({
          instituteId,
          sectionId: selectedSectionId,
          status: "active",
        }),
      )
      .then(async (rows) => {
        if (activeInstituteIdRef.current !== instituteId) return;
        const [teachers, subjects] = await Promise.all([
          listTeachers({ instituteId }).then(teacherDtosToListItems),
          listSubjects({ instituteId }),
        ]);
        const teachersById = new Map(teachers.map((t) => [t.id, t]));
        const subjectsById = new Map(subjects.map((s) => [s.id, s]));
        const listItems = teacherAssignmentDtosToListItems(
          rows,
          teachersById,
          subjectsById,
        );
        setAssignments(listItems);
        const pairs: Record<string, string> = {};
        for (const row of listItems) {
          if (row.subjectId && row.teacherId) {
            pairs[row.subjectId] = row.teacherId;
          }
        }
        setStaffingPairs(pairs);
      })
      .catch(async (err) => {
        // Unique conflict → assignment already exists; reload map from API.
        try {
          const rows = await listTeacherAssignments({
            instituteId,
            sectionId: selectedSectionId,
            status: "active",
          });
          const [teachers, subjects] = await Promise.all([
            listTeachers({ instituteId }).then(teacherDtosToListItems),
            listSubjects({ instituteId }),
          ]);
          const teachersById = new Map(teachers.map((t) => [t.id, t]));
          const subjectsById = new Map(subjects.map((s) => [s.id, s]));
          const listItems = teacherAssignmentDtosToListItems(
            rows,
            teachersById,
            subjectsById,
          );
          setAssignments(listItems);
          const pairs: Record<string, string> = {};
          for (const row of listItems) {
            if (row.subjectId && row.teacherId) {
              pairs[row.subjectId] = row.teacherId;
            }
          }
          setStaffingPairs(pairs);
        } catch {
          notify(
            err instanceof Error ? err.message : "Failed to save subject ↔ teacher",
          );
        }
      });
  };

  const instituteSummary = useMemo(
    () => (loadView.bundle ? buildTimetableInstituteSummary(loadView.bundle.sections) : null),
    [loadView.bundle],
  );

  const publishSection = (sectionId: string) => {
    if (!writesEnabled || mutating) return;
    const instituteId = instituteCtx.activeInstituteId;
    if (!instituteId) return;
    const summary = loadView.bundle?.sections.find((s) => s.sectionId === sectionId);
    if (!summary) {
      notify("Open a section with assigned periods before publishing");
      return;
    }
    if (!summary.inactiveCount) {
      if (summary.activeCount > 0) {
        notify("All periods are already published for this section");
      } else {
        notify("Assign at least one subject period before publishing");
      }
      return;
    }

    setMutating(true);
    void publishSectionTimetable({ instituteId, sectionId })
      .then((result) => {
        if (activeInstituteIdRef.current !== instituteId) return;
        notifyTimetablePublished({
          timetableId: sectionId,
          classLabel: `${summary.classLabel} · Sec ${summary.sectionLabel}`,
        });
        bumpTimetableReload();
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

  const sectionCatalog = useMemo(() => {
    const classesById = new Map(classes.map((cls) => [cls.id, cls]));
    return sections.map((section) => ({
      id: section.id,
      classLabel: classLabelForSection(section, classesById),
      sectionLabel: section.code?.trim() || section.name?.trim() || section.id.slice(0, 8),
    }));
  }, [sections, classes]);

  const subtitle = useMemo(() => {
    if (!loadView.rowsValid || !loadView.bundle) {
      return `${loadHint ?? "…"}`;
    }
    const mode = writesEnabled
      ? "Create / edit / delete slots"
      : "Read-only";
    return `${mode} · ${loadView.bundle.sections.length} sections · ${loadView.bundle.slots.length} slots · ${instituteSummary?.publishedCount ?? 0} published`;
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
    setFormSubjectId("");
    setFormTeacherId("");
    setFormDayOfWeek(1);
    setFormPeriodIndex(1);
    setFormStartsAt("09:00");
    setFormEndsAt("09:45");
    setFormRoom("");
    setFormError(null);
  };

  const openCreate = (sectionId?: string, cell?: AssignCellTarget) => {
    if (!writesEnabled) return;
    resetForm();
    setFormSectionId(sectionId ?? selectedSectionId ?? "");
    if (cell) {
      setFormDayOfWeek(cell.dayOfWeek);
      setFormPeriodIndex(cell.periodIndex);
      setFormStartsAt(cell.startsAt.slice(0, 5));
      setFormEndsAt(cell.endsAt.slice(0, 5));
      if (cell.slot) {
        setEditingSlot(cell.slot);
        setFormAssignmentId(cell.slot.teacherAssignmentId);
        setFormRoom(cell.slot.room ?? "");
      }
    }
    setFormOpen(true);
  };

  const openAssignCell = (target: AssignCellTarget) => {
    openCreate(selectedSectionId, target);
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

    const sectionMeta = sectionOptions.find((opt) => opt.id === formSectionId);
    if (!sectionMeta) {
      setFormError("Select a valid section");
      return;
    }

    setMutating(true);
    setFormError(null);

    const done = (message: string) => {
      if (activeInstituteIdRef.current !== instituteId) return;
      setFormOpen(false);
      resetForm();
      bumpTimetableReload();
      notify(message);
    };

    const resolveAssignmentId = async (): Promise<string> => {
      if (formAssignmentId) return formAssignmentId;

      if (!formSubjectId || !formTeacherId) {
        throw new Error("Select a subject and teacher");
      }

      const existing = sectionAssignments.find(
        (row) =>
          row.subjectId === formSubjectId && row.teacherId === formTeacherId,
      );
      if (existing) return existing.id;

      try {
        const created = await createTeacherAssignment({
          instituteId,
          academicYearId: sectionMeta.academicYearId,
          classId: sectionMeta.classId,
          sectionId: formSectionId,
          subjectId: formSubjectId,
          teacherId: formTeacherId,
          status: "active",
        });
        return created.id;
      } catch (err) {
        // Assignment may already exist (unique) — reuse it.
        const rows = await listTeacherAssignments({
          instituteId,
          sectionId: formSectionId,
          status: "active",
        });
        const match = rows.find(
          (row) =>
            row.subjectId === formSubjectId && row.teacherId === formTeacherId,
        );
        if (match) return match.id;
        throw err;
      }
    };

    if (editingSlot) {
      void resolveAssignmentId()
        .then((assignmentId) =>
          updateTimetableSlot(editingSlot.id, {
            teacherAssignmentId: assignmentId,
            dayOfWeek: formDayOfWeek,
            periodIndex: formPeriodIndex,
            startsAt,
            endsAt,
            room: formRoom.trim() || null,
            // Keep drafts until Publish — never flip live from the editor.
            status: editingSlot.status === "active" ? "active" : "inactive",
          }),
        )
        .then(() => done("Period assignment updated"))
        .catch((err) => {
          setFormError(err instanceof Error ? err.message : "Failed to update slot");
        })
        .finally(() => setMutating(false));
      return;
    }

    void resolveAssignmentId()
      .then((assignmentId) =>
        createTimetableSlot({
          instituteId,
          academicYearId: sectionMeta.academicYearId,
          classId: sectionMeta.classId,
          sectionId: formSectionId,
          teacherAssignmentId: assignmentId,
          dayOfWeek: formDayOfWeek,
          periodIndex: formPeriodIndex,
          startsAt,
          endsAt,
          room: formRoom.trim() || null,
          status: "inactive",
        }),
      )
      .then(() => {
        if (activeInstituteIdRef.current !== instituteId) return;
        done("Subject assigned — publish when ready");
        if (!selectedSectionId) {
          openSection(formSectionId);
        }
      })
      .catch((err) => {
        setFormError(err instanceof Error ? err.message : "Failed to assign subject");
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
        bumpTimetableReload();
        notify("Timetable slot deleted");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to delete slot");
      })
      .finally(() => setMutating(false));
  };

  return (
    <AppShell
      title={selectedSectionId ? "Timetable" : "Timetables"}
      subtitle={subtitle}
      actions={
        writesEnabled ? (
          selectedSectionId ? (
            <Button variant="primary" onClick={() => openCreate(selectedSectionId)}>
              <Plus className="size-3.5" /> Assign subject
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setWizardOpen(true)}>
              <Plus className="size-3.5" /> Create timetable
            </Button>
          )
        ) : null
      }
    >
      {!loadView.rowsValid || !loadView.bundle ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {loadHint ?? "Loading timetable…"}
        </div>
      ) : (
        <div className="space-y-4">
          {selectedSectionId && writesEnabled ? (
            <Card>
              <CardHeader
                title="Subject ↔ teacher map"
                hint="Set who teaches each subject first — period assign uses these pairs"
              />
              <CardBody>
                {staffingSubjects.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Create subjects first, then map teachers here.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {staffingSubjects.map((subject) => (
                      <div
                        key={subject.id}
                        className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
                      >
                        <span className="min-w-0 flex-1 text-xs font-medium truncate">
                          {subject.name.trim() || subject.code}
                        </span>
                        <Select
                          className="max-w-[12rem]"
                          value={staffingPairs[subject.id] ?? ""}
                          onChange={(e) => {
                            const teacherId = e.target.value;
                            if (!teacherId) {
                              setStaffingPairs((prev) => {
                                const next = { ...prev };
                                delete next[subject.id];
                                return next;
                              });
                              return;
                            }
                            persistStaffingPair(subject.id, teacherId);
                          }}
                        >
                          <option value="">Teacher…</option>
                          {staffingTeachers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          ) : null}
        <TimetableApiReadView
          bundle={loadView.bundle}
          instituteSummary={instituteSummary ?? undefined}
          selectedSectionId={selectedSectionId}
          listHint={loadHint}
          writesEnabled={writesEnabled}
          mutating={mutating}
          sectionSchedule={sectionSchedule}
          assignmentLabels={assignmentLabels}
          draftedSectionIds={draftedSectionIds}
          sectionCatalog={sectionCatalog}
          onCreateTimetable={() => setWizardOpen(true)}
          onCreateSlot={openCreate}
          onAssignCell={openAssignCell}
          onEditSlot={openEdit}
          onDeleteSlot={removeSlot}
          onPublishSection={publishSection}
          onOpenSection={openSection}
          onBack={backToList}
        />
        </div>
      )}

      <TimetableCreateWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        classes={classes}
        sections={sections}
        instituteId={instituteCtx.activeInstituteId}
        busy={mutating}
        onCreated={(sectionId) => {
          setWizardOpen(false);
          setDraftedSectionIds(
            listSectionIdsWithSchedule(instituteCtx.activeInstituteId ?? undefined),
          );
          notify("Table created — assign subjects for each period, then publish");
          openSection(sectionId);
        }}
      />

      <Modal
        open={formOpen}
        onClose={() => {
          if (mutating) return;
          setFormOpen(false);
          resetForm();
        }}
        title={editingSlot ? "Edit period assignment" : "Assign subject for period"}
        subtitle="Creates a draft period — Publish makes it live for students and teachers"
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
              {editingSlot ? "Save changes" : "Assign subject"}
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
                setFormSubjectId("");
                setFormTeacherId("");
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
          {sectionAssignments.length > 0 ? (
            <Field
              label="Existing assignment"
              hint="Optional — or pick subject + teacher below"
            >
              <Select
                value={formAssignmentId}
                disabled={mutating || !formSectionId || loadingAssignments}
                onChange={(e) => {
                  const id = e.target.value;
                  setFormAssignmentId(id);
                  const row = sectionAssignments.find((a) => a.id === id);
                  if (row) {
                    setFormSubjectId(row.subjectId);
                    setFormTeacherId(row.teacherId);
                  }
                  setFormError(null);
                }}
              >
                <option value="">Create from subject + teacher</option>
                {sectionAssignments.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Subject" required>
              <Select
                value={formSubjectId}
                disabled={mutating || !formSectionId || loadingAssignments}
                onChange={(e) => {
                  const subjectId = e.target.value;
                  setFormSubjectId(subjectId);
                  setFormAssignmentId("");
                  const pairedTeacher = staffingPairs[subjectId];
                  if (pairedTeacher) setFormTeacherId(pairedTeacher);
                  setFormError(null);
                }}
              >
                <option value="">Select subject</option>
                {formSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name.trim() || s.code}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Teacher" required>
              <Select
                value={formTeacherId}
                disabled={mutating || !formSectionId || loadingAssignments}
                onChange={(e) => {
                  setFormTeacherId(e.target.value);
                  setFormAssignmentId("");
                  setFormError(null);
                }}
              >
                <option value="">Select teacher</option>
                {formTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {formSectionId && !loadingAssignments && formSubjects.length === 0 ? (
            <p className="text-xs text-warning">
              No subjects found — create subjects first, then assign them here.
            </p>
          ) : null}
          {formSectionId && !loadingAssignments && formTeachers.length === 0 ? (
            <p className="text-xs text-warning">
              No teachers found — onboard teachers first.
            </p>
          ) : null}
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
          <Field label="Room">
            <TextInput
              value={formRoom}
              disabled={mutating}
              onChange={(e) => setFormRoom(e.target.value)}
              placeholder="Optional"
            />
          </Field>
          <p className="text-[11px] text-muted-foreground">
            New periods stay draft until you click Publish on this section.
          </p>
        </div>
      </Modal>
    </AppShell>
  );
}
