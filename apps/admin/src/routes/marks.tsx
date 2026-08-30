import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  Button,
  Pill,
  SearchInput,
  DataTable,
  EmptyState,
  Th,
  Modal,
  CascadingFiltersMenu,
  Field,
  Select,
  TextInput,
} from "@lumenx/ui-admin";
import {
  ADMIN_CLASSES,
  ADMIN_EXAMS,
  ADMIN_SECTIONS,
  ADMIN_SUBJECTS,
  approveMarkEntry,
  filterMarkEntries,
  markEntryAvgPct,
  publishAllSubmitted,
  rejectMarkEntry,
  returnMarkEntry,
  summarizeMarks,
  teachersWithPendingMarks,
  type MarkEntry,
  type MarkEntryStatus,
} from "@/lib/marks-entry-store";
import { useAdminToast } from "@/components/AdminActionToast";
import { pushPrincipalMarkAlert } from "@lumenx/utils";
import {
  notifyTeacherMarksPending,
  notifyAdminMarksPending,
  notifyTeacherMarksDeadline,
} from "@lumenx/module-notifications";
import {
  BellRing,
  CheckCircle2,
  Clock,
  Eye,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Siren,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import { classLabelForSection } from "@/lib/classes/map";
import { listClassesCatalog } from "@/lib/classes/api";
import type { ClassDto, SectionDto } from "@/lib/classes/types";
import { listEnrollments } from "@/lib/enrollments/api";
import type { EnrollmentDto } from "@/lib/enrollments/types";
import { listExams } from "@/lib/exams/api";
import type { ExamDto } from "@/lib/exams/types";
import { listSubjects } from "@/lib/subjects/api";
import type { SubjectDto } from "@/lib/subjects/types";
import { listTeachers, teacherDtosToListItems, type TeacherListItem } from "@/lib/teachers";
import {
  createMarkEntry,
  getMarkEntry,
  isMarksEntryEditable,
  loadMarksList,
  markEntryDtoToListItem,
  publishMarkEntry as publishMarkEntryApi,
  rejectMarkEntry as rejectMarkEntryApi,
  resolveMarksListView,
  returnMarkEntry as returnMarkEntryApi,
  shouldCommitMarksLoad,
  submitMarkEntry,
  updateMarkEntry,
  type MarkEntryListItem,
  type MarkStudentScoreItem,
  type MarksListStatus,
} from "@/lib/marks";
import { adminDataFacade } from "@/lib/admin-data-facade";

export const Route = createFileRoute("/marks")({
  head: () => ({ meta: [{ title: "Marks — LumenX Admin" }] }),
  component: MarksPage,
});

type Stage = "waiting" | "ready" | "published";

function stageFromStatus(status: MarkEntryStatus): Stage {
  if (status === "pending" || status === "returned" || status === "rejected") return "waiting";
  if (status === "submitted") return "ready";
  return "published";
}

function isWaitingStatus(status: MarkEntryStatus): boolean {
  return status === "pending" || status === "returned" || status === "rejected";
}

type MarkRow = MarkEntry | MarkEntryListItem;

function MarksPage() {
  const notify = useAdminToast();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, { status: instituteCtx.status, activeInstituteId: instituteCtx.activeInstituteId });
  const demoEntries = useSyncExternalStore(
    adminDataFacade.marks.channel.subscribe,
    adminDataFacade.marks.channel.load,
    adminDataFacade.marks.channel.load,
  );
  const [apiItems, setApiItems] = useState<MarkEntryListItem[]>([]);
  const [listStatus, setListStatus] = useState<MarksListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<
    string | null
  >(null);
  const [reloadKey, setReloadKey] = useState(0);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const listView = resolveMarksListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: apiItems,
    storedStatus: listStatus,
    storedErrorMessage: listError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });
  const entries: MarkRow[] = apiMode ? listView.items : demoEntries;
  const [stage, setStage] = useState<Stage>("ready");
  const [teacherId, setTeacherId] = useState("all");
  const [subject, setSubject] = useState("all");
  const [classGrade, setClassGrade] = useState("all");
  const [section, setSection] = useState("all");
  const [examId, setExamId] = useState("all");
  const [q, setQ] = useState("");
  const [reviewEntry, setReviewEntry] = useState<MarkRow | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [catalogSections, setCatalogSections] = useState<SectionDto[]>([]);
  const [catalogClasses, setCatalogClasses] = useState<ClassDto[]>([]);
  const [exams, setExams] = useState<ExamDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [teachersCatalog, setTeachersCatalog] = useState<TeacherListItem[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [formExamId, setFormExamId] = useState("");
  const [formSectionId, setFormSectionId] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formMaxMarks, setFormMaxMarks] = useState(100);
  const [formScores, setFormScores] = useState<MarkStudentScoreItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoadingRoster, setFormLoadingRoster] = useState(false);

  useEffect(() => {
    if (!apiMode) return;

    if (instituteCtx.status === "loading") {
      setApiItems([]);
      setListStatus("loading");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiItems([]);
      setListStatus(
        instituteCtx.status === "forbidden" ? "forbidden" : "error",
      );
      setListError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiItems([]);
      setListStatus("needs_institute");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setListStatus("loading");
    setListError(null);
    setFormOpen(false);
    setReviewEntry(null);
    void Promise.all([
      loadMarksList(requestInstituteId),
      listClassesCatalog({ instituteId: requestInstituteId }),
      listExams({ instituteId: requestInstituteId }),
      listSubjects({ instituteId: requestInstituteId }),
      listTeachers({ instituteId: requestInstituteId }).then(teacherDtosToListItems),
    ]).then(
      ([next, catalog, examRows, subjectRows, teacherRows]) => {
        if (
          !shouldCommitMarksLoad({
            cancelled,
            requestInstituteId,
            activeInstituteId: activeInstituteIdRef.current,
          })
        ) {
          return;
        }
        setApiItems(next.items);
        setListStatus(next.status);
        setListError(next.errorMessage);
        setResolvedForInstituteId(requestInstituteId);
        setCatalogSections(catalog.sections);
        setCatalogClasses(catalog.classes);
        setExams(examRows);
        setSubjects(subjectRows);
        setTeachersCatalog(teacherRows);
      },
      (err) => {
        if (
          !shouldCommitMarksLoad({
            cancelled,
            requestInstituteId,
            activeInstituteId: activeInstituteIdRef.current,
          })
        ) {
          return;
        }
        setApiItems([]);
        setListStatus("error");
        setListError(err instanceof Error ? err.message : "Failed to load marks");
        setResolvedForInstituteId(requestInstituteId);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
  ]);

  useEffect(() => {
    setTeacherId("all");
    setSubject("all");
    setClassGrade("all");
    setSection("all");
    setExamId("all");
    setQ("");
    setReviewEntry(null);
    setAlertOpen(false);
    setFormOpen(false);
  }, [instituteCtx.activeInstituteId]);

  const sectionPickerOptions = useMemo(() => {
    const classesById = new Map(catalogClasses.map((cls) => [cls.id, cls]));
    return [...catalogSections]
      .map((sectionRow) => ({
        id: sectionRow.id,
        label: `${classLabelForSection(sectionRow, classesById)} · Sec ${
          sectionRow.code?.trim() || sectionRow.name?.trim() || sectionRow.id.slice(0, 8)
        }`,
        academicYearId: sectionRow.academicYearId,
        classId: sectionRow.classId,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [catalogSections, catalogClasses]);

  const examSubjectIds = useMemo(() => {
    const exam = exams.find((row) => row.id === formExamId);
    if (!exam) return null;
    const ids = exam.subjectSchedules.map((s) => s.subjectId);
    return ids.length > 0 ? new Set(ids) : null;
  }, [exams, formExamId]);

  const formSubjectOptions = useMemo(() => {
    if (!examSubjectIds) return subjects;
    return subjects.filter((s) => examSubjectIds.has(s.id));
  }, [subjects, examSubjectIds]);

  useEffect(() => {
    if (!apiMode || !formOpen || !formSectionId || !instituteCtx.activeInstituteId) {
      return;
    }
    if (editingEntryId) return;
    const requestInstituteId = instituteCtx.activeInstituteId;
    const requestSectionId = formSectionId;
    let cancelled = false;
    setFormLoadingRoster(true);
    void listEnrollments({
      instituteId: requestInstituteId,
      sectionId: requestSectionId,
      status: "active",
    })
      .then((rows: EnrollmentDto[]) => {
        if (
          cancelled ||
          activeInstituteIdRef.current !== requestInstituteId ||
          formSectionId !== requestSectionId
        ) {
          return;
        }
        setFormScores(
          rows
            .slice()
            .sort((a, b) => a.rollNo.localeCompare(b.rollNo) || a.studentName.localeCompare(b.studentName))
            .map((row) => ({
              studentId: row.studentId,
              enrollmentId: row.id,
              rollNo: row.rollNo || "—",
              name: row.studentName || "Student",
              marks: null,
            })),
        );
      })
      .catch((err) => {
        if (cancelled || activeInstituteIdRef.current !== requestInstituteId) return;
        setFormScores([]);
        setFormError(
          err instanceof Error ? err.message : "Failed to load section enrollments",
        );
      })
      .finally(() => {
        if (!cancelled) setFormLoadingRoster(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiMode, formOpen, formSectionId, instituteCtx.activeInstituteId, editingEntryId]);

  const listHint =
    listView.status === "loading"
      ? "Loading marks entries…"
      : listView.status === "needs_institute"
        ? "Select an institute to load marks."
        : listView.status === "forbidden"
          ? listView.errorMessage ??
            "You do not have access to marks for this institute."
          : listView.status === "error"
            ? listView.errorMessage ?? "Failed to load marks."
            : listView.status === "empty"
              ? "No mark entries found for this institute."
              : null;

  const countLabel = (count: number) =>
    apiMode && !listView.rowsValid ? "…" : String(count);

  const activeEntries = listView.rowsValid ? entries : [];

  const summary = useMemo(() => summarizeMarks(activeEntries), [activeEntries]);
  const pendingTeachers = useMemo(
    () => teachersWithPendingMarks(activeEntries),
    [activeEntries],
  );

  const teachers = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of activeEntries) map.set(e.teacherId, e.teacherName);
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeEntries]);

  const subjectOptions = useMemo(() => {
    if (!apiMode) return ADMIN_SUBJECTS;
    return [...new Set(activeEntries.map((e) => e.subject))].sort();
  }, [apiMode, activeEntries]);

  const classOptions = useMemo(() => {
    if (!apiMode) return ADMIN_CLASSES;
    return [...new Set(activeEntries.map((e) => e.classGrade))].sort();
  }, [apiMode, activeEntries]);

  const sectionOptions = useMemo(() => {
    if (!apiMode) return ADMIN_SECTIONS;
    return [...new Set(activeEntries.map((e) => e.section))].sort();
  }, [apiMode, activeEntries]);

  const examOptions = useMemo(() => {
    if (!apiMode) return ADMIN_EXAMS;
    const map = new Map<string, string>();
    for (const e of activeEntries) map.set(e.examId, e.examName);
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [apiMode, activeEntries]);

  const list = useMemo(() => {
    const filtered = filterMarkEntries(activeEntries, {
      teacherId,
      subject,
      classGrade,
      section,
      examId,
      status: "all",
      q,
    }).filter((e) => {
      if (stage === "waiting") return isWaitingStatus(e.status);
      if (stage === "ready") return e.status === "submitted";
      return e.status === "published";
    });
    return filtered.sort(
      (a, b) =>
        a.teacherName.localeCompare(b.teacherName) ||
        a.subject.localeCompare(b.subject) ||
        a.classGrade.localeCompare(b.classGrade),
    );
  }, [activeEntries, teacherId, subject, classGrade, section, examId, stage, q]);

  const persist = (next: MarkEntry[]) => {
    if (!writesEnabled) return;
    adminDataFacade.marks.channel.mutate(() => next);
  };

  const resetForm = () => {
    setEditingEntryId(null);
    setFormExamId("");
    setFormSectionId("");
    setFormSubjectId("");
    setFormTeacherId("");
    setFormMaxMarks(100);
    setFormScores([]);
    setFormError(null);
  };

  const openCreate = () => {
    if (!writesEnabled || !apiMode) return;
    resetForm();
    setFormOpen(true);
  };

  const openEntry = (entry: MarkRow) => {
    if (!apiMode) {
      setReviewEntry(entry);
      return;
    }
    const requestInstituteId = instituteCtx.activeInstituteId;
    if (!requestInstituteId) return;
    setDetailLoading(true);
    setReviewEntry(entry);
    void getMarkEntry(entry.id)
      .then(async (dto) => {
        if (activeInstituteIdRef.current !== requestInstituteId) return;
        const enrollments = await listEnrollments({
          instituteId: requestInstituteId,
          sectionId: dto.sectionId,
          status: "active",
        }).catch(() => [] as EnrollmentDto[]);
        if (activeInstituteIdRef.current !== requestInstituteId) return;
        const enrollmentsById = new Map(
          enrollments.map((row) => [row.id, row]),
        );
        const detailed = markEntryDtoToListItem(dto, {
          examsById: new Map(exams.map((exam) => [exam.id, exam])),
          subjectsById: new Map(subjects.map((subject) => [subject.id, subject])),
          teachersById: new Map(
            teachersCatalog.map((teacher) => [teacher.id, teacher]),
          ),
          classesById: new Map(catalogClasses.map((cls) => [cls.id, cls])),
          sectionsById: new Map(
            catalogSections.map((sectionRow) => [sectionRow.id, sectionRow]),
          ),
          enrollmentsById,
        });
        setReviewEntry(detailed);
        setApiItems((prev) =>
          prev.map((row) => (row.id === detailed.id ? { ...row, ...detailed } : row)),
        );
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to load mark entry detail");
      })
      .finally(() => setDetailLoading(false));
  };

  const openEditFromReview = () => {
    if (!writesEnabled || !apiMode || !reviewEntry) return;
    if (!isMarksEntryEditable(reviewEntry.status)) return;
    const apiEntry = reviewEntry as MarkEntryListItem;
    setEditingEntryId(apiEntry.id);
    setFormExamId(apiEntry.examId);
    setFormSectionId(apiEntry.sectionId ?? "");
    setFormSubjectId(apiEntry.subjectId ?? "");
    setFormTeacherId(apiEntry.teacherId);
    setFormMaxMarks(apiEntry.maxMarks);
    setFormScores(
      apiEntry.students.map((student) => ({
        ...student,
        enrollmentId: student.enrollmentId,
      })),
    );
    setFormError(null);
    setReviewEntry(null);
    setFormOpen(true);
  };

  const saveForm = (submitAfter: boolean) => {
    if (!writesEnabled || !apiMode || mutating) return;
    const instituteId = instituteCtx.activeInstituteId;
    if (!instituteId) {
      setFormError("Select an institute before saving");
      return;
    }

    const scoresPayload = formScores
      .filter((row) => row.enrollmentId)
      .map((row) => ({
        enrollmentId: row.enrollmentId!,
        marks: row.marks,
      }));

    if (editingEntryId) {
      if (scoresPayload.length === 0) {
        setFormError("Scores require enrollment ids from the mark entry");
        return;
      }
      if (formMaxMarks < 1) {
        setFormError("Max marks must be at least 1");
        return;
      }
      setMutating(true);
      setFormError(null);
      void updateMarkEntry(editingEntryId, {
        maxMarks: formMaxMarks,
        scores: scoresPayload,
      })
        .then(async () => {
          if (activeInstituteIdRef.current !== instituteId) return;
          if (submitAfter) {
            await submitMarkEntry(editingEntryId);
          }
          if (activeInstituteIdRef.current !== instituteId) return;
          setFormOpen(false);
          resetForm();
          setReloadKey((k) => k + 1);
          notify(submitAfter ? "Marks updated and submitted" : "Marks updated");
        })
        .catch((err) => {
          setFormError(err instanceof Error ? err.message : "Failed to update marks");
        })
        .finally(() => setMutating(false));
      return;
    }

    if (!formExamId || !formSectionId || !formSubjectId || !formTeacherId) {
      setFormError("Exam, section, subject, and teacher are required");
      return;
    }
    const sectionMeta = sectionPickerOptions.find((row) => row.id === formSectionId);
    if (!sectionMeta) {
      setFormError("Select a valid section");
      return;
    }
    if (formMaxMarks < 1) {
      setFormError("Max marks must be at least 1");
      return;
    }

    setMutating(true);
    setFormError(null);
    void createMarkEntry({
      instituteId,
      academicYearId: sectionMeta.academicYearId,
      classId: sectionMeta.classId,
      sectionId: sectionMeta.id,
      examId: formExamId,
      subjectId: formSubjectId,
      teacherId: formTeacherId,
      maxMarks: formMaxMarks,
      scores: scoresPayload,
    })
      .then(async (created) => {
        if (activeInstituteIdRef.current !== instituteId) return;
        if (submitAfter) {
          await submitMarkEntry(created.id);
        }
        if (activeInstituteIdRef.current !== instituteId) return;
        setFormOpen(false);
        resetForm();
        setReloadKey((k) => k + 1);
        setStage(submitAfter ? "ready" : "waiting");
        notify(submitAfter ? "Mark entry created and submitted" : "Mark entry created");
      })
      .catch((err) => {
        setFormError(err instanceof Error ? err.message : "Failed to create mark entry");
      })
      .finally(() => setMutating(false));
  };

  const submitFromReview = () => {
    if (!writesEnabled || !apiMode || !reviewEntry || mutating) return;
    if (!isMarksEntryEditable(reviewEntry.status)) return;
    const requestInstituteId = instituteCtx.activeInstituteId;
    if (!requestInstituteId) return;
    setMutating(true);
    void submitMarkEntry(reviewEntry.id)
      .then(() => {
        if (activeInstituteIdRef.current !== requestInstituteId) return;
        setReviewEntry(null);
        setReloadKey((k) => k + 1);
        setStage("ready");
        notify("Marks submitted for review");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to submit marks");
      })
      .finally(() => setMutating(false));
  };

  const approveOne = () => {
    if (!writesEnabled || !reviewEntry || reviewEntry.status !== "submitted") return;
    if (apiMode) {
      void publishMarkEntryApi(reviewEntry.id)
        .then(() => {
          setReviewEntry(null);
          setReloadKey((k) => k + 1);
          notify("Marks approved and published to students & parents");
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to publish marks");
        });
      return;
    }
    const next = approveMarkEntry(demoEntries, reviewEntry.id);
    persist(next);
    setReviewEntry(next.find((e) => e.id === reviewEntry.id) ?? null);
    notify("Marks approved and published to students & parents");
  };

  const returnOne = () => {
    if (!writesEnabled || !reviewEntry || reviewEntry.status !== "submitted") return;
    if (apiMode) {
      void returnMarkEntryApi(reviewEntry.id)
        .then(() => {
          setReviewEntry(null);
          setReloadKey((k) => k + 1);
          notify("Marks returned to teacher for correction");
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to return marks");
        });
      return;
    }
    const next = returnMarkEntry(demoEntries, reviewEntry.id);
    persist(next);
    setReviewEntry(null);
    notify("Marks returned to teacher for correction");
  };

  const rejectOne = () => {
    if (!writesEnabled || !reviewEntry || reviewEntry.status !== "submitted") return;
    if (apiMode) {
      void rejectMarkEntryApi(reviewEntry.id)
        .then(() => {
          setReviewEntry(null);
          setReloadKey((k) => k + 1);
          notify("Marks rejected — teacher must resubmit");
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to reject marks");
        });
      return;
    }
    const next = rejectMarkEntry(demoEntries, reviewEntry.id);
    persist(next);
    setReviewEntry(null);
    notify("Marks rejected — teacher must resubmit");
  };

  const approveAllReady = () => {
    if (!writesEnabled) return;
    const ids = list.filter((e) => e.status === "submitted").map((e) => e.id);
    if (ids.length === 0) return;
    if (apiMode) {
      void Promise.all(ids.map((id) => publishMarkEntryApi(id)))
        .then(() => {
          setReloadKey((k) => k + 1);
          notify(`Approved ${ids.length} mark sheet${ids.length === 1 ? "" : "s"}`);
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to approve mark sheets");
        });
      return;
    }
    persist(publishAllSubmitted(demoEntries, ids));
    notify(`Approved ${ids.length} mark sheet${ids.length === 1 ? "" : "s"}`);
  };

  const sendPendingAlerts = () => {
    if (!writesEnabled || pendingTeachers.length === 0) return;
    const alert = pushPrincipalMarkAlert({ recipients: pendingTeachers });
    for (const t of pendingTeachers) {
      const sample = activeEntries.find(
        (e) => e.teacherId === t.teacherId && e.status === "pending",
      );
      notifyTeacherMarksPending({
        examName: sample?.examName ?? "Exam",
        subject: sample?.subject ?? "subjects",
        classLabel: sample
          ? `${sample.classGrade}-${sample.section}`
          : `${t.pendingCount} pending`,
        teacherKey: t.teacherId,
      });
      notifyTeacherMarksDeadline({
        examName: sample?.examName ?? "Exam",
        deadline: "soon",
      });
    }
    notifyAdminMarksPending({
      examName: "Pending mark sheets",
      pendingCount: pendingTeachers.length,
    });
    setAlertOpen(false);
    if (!alert) return;
    notify(
      `Alert sent to ${pendingTeachers.length} teacher${pendingTeachers.length === 1 ? "" : "s"} with pending mark submissions`,
    );
  };

  const canReview = writesEnabled && reviewEntry?.status === "submitted";
  const canEditScores =
    apiMode &&
    writesEnabled &&
    reviewEntry &&
    isMarksEntryEditable(reviewEntry.status);
  const isLocked = reviewEntry?.status === "published";

  return (
    <AppShell
      title="Marks"
      subtitle={
        apiMode
          ? writesEnabled
            ? `API mode · create / edit / submit / approve · ${countLabel(activeEntries.length)} entries`
            : `API mode · read-only · ${countLabel(activeEntries.length)} entries`
          : "Teacher enter → edit → submit → Admin approve / reject / return → publish to students & parents (Admin cannot edit scores)"
      }
      actions={
        writesEnabled ? (
          <>
            {apiMode ? (
              <Button variant="primary" onClick={openCreate}>
                <Plus className="size-3.5" /> New mark entry
              </Button>
            ) : null}
            {summary.pending > 0 ? (
              <Button variant="outline" onClick={() => setAlertOpen(true)}>
                <Siren className="size-3.5" /> Alert pending teachers ({pendingTeachers.length})
              </Button>
            ) : null}
            {stage === "ready" ? (
              <Button variant="primary" onClick={approveAllReady} disabled={list.length === 0 || mutating}>
                <Send className="size-3.5" /> Approve all ready ({list.length})
              </Button>
            ) : null}
          </>
        ) : undefined
      }
    >
      {/* Institute snapshot */}
      <div className="mb-3 grid grid-cols-4 gap-1.5 sm:gap-2">
        <Snapshot label="Classes" value={countLabel(summary.classes)} />
        <Snapshot label="Sections" value={countLabel(summary.sections)} />
        <Snapshot label="Subjects" value={countLabel(summary.subjects)} />
        <Snapshot label="Teachers" value={countLabel(summary.teachers)} />
      </div>

      {/* Clear 3-step stages */}
      <div className="mb-3 grid grid-cols-3 gap-1.5 sm:gap-2">
        <StageCard
          active={stage === "waiting"}
          onClick={() => setStage("waiting")}
          icon={<Clock className="size-3.5" />}
          title="Waiting"
          count={countLabel(summary.pending)}
          hint="Not submitted yet"
          tone="waiting"
          action={
            writesEnabled && summary.pending > 0 ? (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setAlertOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    setAlertOpen(true);
                  }
                }}
                className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:text-amber-100 hover:bg-amber-500/25"
              >
                <BellRing className="size-3" /> Alert
              </span>
            ) : null
          }
        />
        <StageCard
          active={stage === "ready"}
          onClick={() => setStage("ready")}
          icon={<CheckCircle2 className="size-3.5" />}
          title="Ready"
          count={countLabel(summary.submitted)}
          hint="Approve · Reject · Return"
          tone="ready"
        />
        <StageCard
          active={stage === "published"}
          onClick={() => setStage("published")}
          icon={<Lock className="size-3.5" />}
          title="Published"
          count={countLabel(summary.published)}
          hint="Locked for students"
          tone="published"
        />
      </div>

      <Card>
        <div className="border-b border-border bg-background/30 px-3 py-2.5 sm:px-4">
          <div className="mb-1.5 text-xs font-semibold">
            {stage === "waiting" && "Waiting for teachers"}
            {stage === "ready" && (writesEnabled ? "Ready for review — Approve, Reject, or Return" : "Ready for review — read-only")}
            {stage === "published" && "Published marks (locked)"}
          </div>
          <div className="flex flex-wrap items-end gap-2 lx-filter-bar">
            <CascadingFiltersMenu
              groups={[
                {
                  id: "teacher",
                  label: "Teacher",
                  value: teacherId,
                  onChange: setTeacherId,
                  options: [
                    { value: "all", label: "All teachers" },
                    ...teachers.map((t) => ({ value: t.id, label: t.name })),
                  ],
                },
                {
                  id: "subject",
                  label: "Subject",
                  value: subject,
                  onChange: setSubject,
                  options: [
                    { value: "all", label: "All subjects" },
                    ...subjectOptions.map((s) => ({ value: s, label: s })),
                  ],
                },
                {
                  id: "class",
                  label: "Class",
                  value: classGrade,
                  onChange: setClassGrade,
                  options: [
                    { value: "all", label: "All classes" },
                    ...classOptions.map((c) => ({ value: c, label: c })),
                  ],
                },
                {
                  id: "section",
                  label: "Section",
                  value: section,
                  onChange: setSection,
                  options: [
                    { value: "all", label: "All sections" },
                    ...sectionOptions.map((s) => ({
                      value: s,
                      label: apiMode ? s : `Section ${s}`,
                    })),
                  ],
                },
                {
                  id: "exam",
                  label: "Exam",
                  value: examId,
                  onChange: setExamId,
                  options: [
                    { value: "all", label: "All exams" },
                    ...examOptions.map((e) => ({ value: e.id, label: e.name })),
                  ],
                },
              ]}
            />
            <div className="min-w-[12rem] flex-1">
              <SearchInput
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Teacher or subject…"
                className="w-full"
                fieldSize="compact"
              />
            </div>
          </div>
        </div>

        {!listView.rowsValid ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            {listHint ?? "Loading marks entries…"}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={
              stage === "waiting" ? (
                <Clock className="size-5" />
              ) : stage === "ready" ? (
                <CheckCircle2 className="size-5" />
              ) : (
                <Lock className="size-5" />
              )
            }
            title={
              stage === "waiting"
                ? "Nothing waiting"
                : stage === "ready"
                  ? "Nothing ready for review"
                  : "No published marks yet"
            }
            hint={
              listHint ??
              (stage === "waiting"
                ? "All teachers in this filter have submitted or been published."
                : stage === "ready"
                  ? writesEnabled
                    ? "When teachers submit marks, they appear here for you to Approve, Reject, or Return."
                    : "Submitted mark entries appear here in read-only mode."
                  : "Approve from “Ready for review” to share with students and parents.")
            }
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Teacher</Th>
                <Th>Subject</Th>
                <Th>Class</Th>
                <Th>Exam</Th>
                <Th>Students</Th>
                <Th>Avg</Th>
                <Th>{""}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((e) => {
                const avg = markEntryAvgPct(e);
                return (
                  <tr key={e.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-5 py-3 text-xs font-medium">{e.teacherName}</td>
                    <td className="px-5 py-3 text-xs">{e.subject}</td>
                    <td className="px-5 py-3 text-xs whitespace-nowrap">
                      {e.classGrade} · {e.section}
                    </td>
                    <td className="px-5 py-3 text-xs">{e.examName}</td>
                    <td className="px-5 py-3 text-xs font-mono">{e.students.length}</td>
                    <td className="px-5 py-3 text-xs font-mono">
                      {avg == null ? "—" : `${avg}%`}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => openEntry(e)}>
                        {stage === "ready" ? (
                          <>
                            <Eye className="size-3.5" /> Review
                          </>
                        ) : stage === "published" ? (
                          <>
                            <Eye className="size-3.5" /> View
                          </>
                        ) : (
                          <>
                            <Eye className="size-3.5" /> Details
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        )}
      </Card>

      <Modal
        open={Boolean(reviewEntry)}
        onClose={() => {
          setReviewEntry(null);
        }}
        title={reviewEntry ? `${reviewEntry.subject}` : "Marks"}
        subtitle={
          reviewEntry
            ? `${reviewEntry.examName} · ${reviewEntry.teacherName} · ${reviewEntry.classGrade} ${reviewEntry.section}`
            : undefined
        }
        size="lg"
        footer={
          reviewEntry ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => {
                  setReviewEntry(null);
                }}
              >
                Close
              </Button>
              <div className="ml-auto flex flex-wrap gap-2">
                {canEditScores ? (
                  <>
                    <Button
                      variant="outline"
                      disabled={mutating || detailLoading}
                      onClick={openEditFromReview}
                    >
                      <Pencil className="size-3.5" /> Edit scores
                    </Button>
                    <Button
                      variant="primary"
                      disabled={mutating || detailLoading}
                      onClick={submitFromReview}
                    >
                      <Send className="size-3.5" /> Submit
                    </Button>
                  </>
                ) : null}
                {canReview ? (
                  <>
                    <Button variant="outline" disabled={mutating} onClick={returnOne}>
                      <RotateCcw className="size-3.5" /> Return to Teacher
                    </Button>
                    <Button
                      variant="outline"
                      className="!border-destructive/40 !text-destructive hover:!bg-destructive/10"
                      disabled={mutating}
                      onClick={rejectOne}
                    >
                      <X className="size-3.5" /> Reject
                    </Button>
                    <Button variant="primary" disabled={mutating} onClick={approveOne}>
                      <Send className="size-3.5" /> Approve
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null
        }
      >
        {reviewEntry ? (
          <div className="space-y-3">
            {detailLoading ? (
              <p className="text-sm text-muted-foreground">Loading scores…</p>
            ) : null}
            {stageFromStatus(reviewEntry.status) === "waiting" && (
              <Banner tone="waiting">
                {reviewEntry.status === "returned"
                  ? "Returned for correction. Edit scores and submit again."
                  : reviewEntry.status === "rejected"
                    ? "Rejected. Edit scores and submit again."
                    : apiMode
                      ? "Draft / pending entry. Edit scores and submit for review."
                      : "Waiting for this teacher to enter and submit marks. You cannot approve yet."}
                {reviewEntry.adminNote ? (
                  <span className="mt-1 block text-[11px] opacity-90">Note: {reviewEntry.adminNote}</span>
                ) : null}
              </Banner>
            )}
            {stageFromStatus(reviewEntry.status) === "ready" && (
              <Banner tone="ready">
                Teacher submitted these marks. Approve to publish, Reject, or Return to Teacher.
              </Banner>
            )}
            {isLocked && (
              <Banner tone="published">
                <Lock className="size-3.5 shrink-0" />
                Approved and published. Students and parents can view these marks.
              </Banner>
            )}

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[360px] border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 text-left font-semibold">Roll</th>
                    <th className="px-3 py-2 text-left font-semibold">Student</th>
                    <th className="px-3 py-2 text-right font-semibold">
                      Marks / {reviewEntry.maxMarks}
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reviewEntry.students.map((s) => {
                    const num = s.marks;
                    const pct =
                      num != null && Number.isFinite(num) && reviewEntry.maxMarks
                        ? Math.round((num / reviewEntry.maxMarks) * 100)
                        : null;
                    return (
                      <tr key={"enrollmentId" in s && s.enrollmentId ? s.enrollmentId : s.studentId}>
                        <td className="px-3 py-2 font-mono text-xs">{s.rollNo}</td>
                        <td className="px-3 py-2 text-xs font-medium">{s.name}</td>
                        <td className="px-3 py-2 text-right">
                          <span className="font-mono text-xs">
                            {s.marks == null ? "—" : s.marks}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                          {pct == null ? "—" : `${pct}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={formOpen}
        onClose={() => {
          if (mutating) return;
          setFormOpen(false);
          resetForm();
        }}
        title={editingEntryId ? "Edit mark entry" : "New mark entry"}
        subtitle="Use real exams, sections, teachers, and enrollments"
        size="lg"
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
            <Button
              variant="outline"
              disabled={mutating || formLoadingRoster}
              onClick={() => saveForm(false)}
            >
              Save draft
            </Button>
            <Button
              variant="primary"
              disabled={mutating || formLoadingRoster}
              onClick={() => saveForm(true)}
            >
              Save & submit
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
          {!editingEntryId ? (
            <>
              <Field label="Exam">
                <Select
                  value={formExamId}
                  disabled={mutating}
                  onChange={(e) => {
                    const nextExamId = e.target.value;
                    setFormExamId(nextExamId);
                    const exam = exams.find((row) => row.id === nextExamId);
                    if (exam?.totalMarks) setFormMaxMarks(exam.totalMarks);
                    setFormSubjectId("");
                    setFormError(null);
                  }}
                >
                  <option value="">Select exam</option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Section">
                <Select
                  value={formSectionId}
                  disabled={mutating}
                  onChange={(e) => {
                    setFormSectionId(e.target.value);
                    setFormError(null);
                  }}
                >
                  <option value="">Select section</option>
                  {sectionPickerOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Subject">
                  <Select
                    value={formSubjectId}
                    disabled={mutating || !formExamId}
                    onChange={(e) => setFormSubjectId(e.target.value)}
                  >
                    <option value="">Select subject</option>
                    {formSubjectOptions.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Teacher">
                  <Select
                    value={formTeacherId}
                    disabled={mutating}
                    onChange={(e) => setFormTeacherId(e.target.value)}
                  >
                    <option value="">Select teacher</option>
                    {teachersCatalog.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </>
          ) : null}
          <Field label="Max marks">
            <TextInput
              type="number"
              min={1}
              value={String(formMaxMarks)}
              disabled={mutating}
              onChange={(e) => setFormMaxMarks(Math.max(1, Number(e.target.value) || 1))}
            />
          </Field>
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Scores
              {formLoadingRoster ? " · loading roster…" : ""}
            </div>
            {formScores.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {formSectionId
                  ? "No active enrollments for this section."
                  : "Select a section to load enrolled students."}
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2 text-left">Roll</th>
                      <th className="px-3 py-2 text-left">Student</th>
                      <th className="px-3 py-2 text-right">Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {formScores.map((row, index) => (
                      <tr key={row.enrollmentId ?? row.studentId}>
                        <td className="px-3 py-2 font-mono text-xs">{row.rollNo}</td>
                        <td className="px-3 py-2 text-xs font-medium">{row.name}</td>
                        <td className="px-3 py-2 text-right">
                          <TextInput
                            type="number"
                            min={0}
                            max={formMaxMarks}
                            className="ml-auto w-24 text-right"
                            value={row.marks == null ? "" : String(row.marks)}
                            disabled={mutating}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const nextMarks =
                                raw.trim() === ""
                                  ? null
                                  : Math.max(0, Math.min(formMaxMarks, Number(raw) || 0));
                              setFormScores((prev) =>
                                prev.map((score, i) =>
                                  i === index ? { ...score, marks: nextMarks } : score,
                                ),
                              );
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {writesEnabled ? (
      <Modal
        open={alertOpen}
        onClose={() => setAlertOpen(false)}
        title="Alert pending teachers"
        subtitle="Send a reminder from the principal to submit marks"
        footer={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setAlertOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={sendPendingAlerts}
              disabled={pendingTeachers.length === 0}
            >
              <Siren className="size-3.5" /> Send alert ({pendingTeachers.length})
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Banner tone="waiting">
            <BellRing className="size-3.5 shrink-0" />
            Each teacher below will get an urgent notification to update and submit their pending
            marks.
          </Banner>
          {pendingTeachers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teachers have pending mark submissions.</p>
          ) : (
            <ul className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {pendingTeachers.map((t) => (
                <li
                  key={t.teacherId}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{t.teacherName}</span>
                  <Pill tone="warning">
                    {t.pendingCount} pending
                  </Pill>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
      ) : null}
    </AppShell>
  );
}

function Snapshot({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="lx-kpi-card">
      <div className="lx-kpi-card__body">
        <p className="lx-kpi-card__label">{label}</p>
        <p className="lx-kpi-card__value">{value}</p>
      </div>
    </div>
  );
}

function StageCard({
  active,
  onClick,
  icon,
  title,
  count,
  hint,
  tone,
  action,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  count: number | string;
  hint: string;
  tone: Stage;
  action?: ReactNode;
}) {
  const tones = {
    waiting: active
      ? "border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/30"
      : "border-border bg-surface hover:bg-surface-hover",
    ready: active
      ? "border-sky-500/50 bg-sky-500/10 ring-1 ring-sky-500/30"
      : "border-border bg-surface hover:bg-surface-hover",
    published: active
      ? "border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/30"
      : "border-border bg-surface hover:bg-surface-hover",
  };
  const countTone = {
    waiting: "warning" as const,
    ready: "info" as const,
    published: "success" as const,
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`rounded-lg border p-2 sm:p-2.5 text-left transition-colors cursor-pointer ${tones[tone]}`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="text-muted-foreground">{icon}</div>
        <Pill tone={countTone[tone]}>{count}</Pill>
      </div>
      <div className="mt-1 text-[11px] sm:text-xs font-semibold leading-tight">{title}</div>
      <div className="mt-0.5 text-[10px] leading-snug text-muted-foreground line-clamp-2">{hint}</div>
      {action}
    </div>
  );
}

function Banner({
  children,
  tone,
}: {
  children: ReactNode;
  tone: Stage;
}) {
  const cls = {
    waiting: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100",
    ready: "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-100",
    published: "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
  }[tone];
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${cls}`}>
      {children}
    </div>
  );
}
