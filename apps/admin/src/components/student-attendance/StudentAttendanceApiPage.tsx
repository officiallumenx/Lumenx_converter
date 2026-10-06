import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAttendanceRegistersQuery, useCatalogClassesQuery, adminModulePrefix, adminQueryRoots } from "@/lib/admin-queries";
import { invalidateAdminCache } from "@/lib/admin-resource-cache";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  Modal,
  PageStack,
  Pill,
} from "@lumenx/ui-admin";
import { cn } from "@lumenx/ui";
import { Check, ClipboardList, Save } from "lucide-react";
import { AttendanceMarkRoster } from "./AttendanceMarkRoster";
import { StudentAttendanceFilters } from "./StudentAttendanceFilters";
import { StudentAttendanceSummary } from "./StudentAttendanceSummary";
import {
  defaultStudentAttendanceWorkspaceState,
  EMPTY_ATTENDANCE_SUMMARY,
  type StudentAttendanceSummaryModel,
} from "./types";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import { useAdminToast } from "@/components/AdminActionToast";
import { type ClassDto, type SectionDto } from "@/lib/classes";
import {
  buildStudentAttendanceApiClassOptions,
  buildStudentAttendanceApiSectionOptions,
} from "@/lib/attendance/class-section-options";
import {
  createAttendanceRegister,
  loadAttendanceConfigList,
  loadAttendanceRegisterDetail,
  pickAttendanceConfigForRegister,
  resolveAttendanceRegistersListView,
  slotFieldsFromMethod,
  slotFieldsFromPeriod,
  afternoonSlotFields,
  emptyAttendanceSlotCreateMessage,
  submitAttendanceRegister,
  updateAttendanceRegister,
  type AttendanceListStatus,
  type AttendanceMarkStatus,
  type AttendanceRegisterDetail,
  type AttendanceRegisterListItem,
  type AttendanceRegisterSlotFields,
} from "@/lib/attendance";
import {
  loadEnrollmentsList,
  resolveEnrollmentsListView,
  shouldCommitEnrollmentsLoad,
  type EnrollmentListItem,
  type EnrollmentListStatus,
} from "@/lib/enrollments";
import { attendancePeriodsFromTimetableSlots } from "@/lib/attendance-timetable-periods";
import { listTeacherAssignments, listTimetableSlots } from "@/lib/timetable";

/** Match name / student id / roll (including leading-zero roll variants like 04 vs 4). */
function matchesAttendanceSearch(
  query: string,
  parts: Array<string | null | undefined>,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = parts
    .map((part) => (part ?? "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
  if (haystack.includes(q)) return true;

  const qDigits = q.replace(/\D/g, "").replace(/^0+/, "") || q.replace(/\D/g, "");
  if (!qDigits) return false;
  for (const part of parts) {
    const digits = (part ?? "").replace(/\D/g, "").replace(/^0+/, "") || (part ?? "").replace(/\D/g, "");
    if (digits && (digits === qDigits || digits.includes(qDigits))) return true;
  }
  return false;
}

function attendanceHint(
  status: AttendanceListStatus | EnrollmentListStatus,
  errorMessage: string | null,
  emptyLabel: string,
): string | null {
  if (status === "loading") return "Loading…";
  if (status === "needs_institute") return "Select an institute to load attendance.";
  if (status === "forbidden") {
    return errorMessage ?? "You do not have access to this institute.";
  }
  if (status === "error") return errorMessage ?? "Failed to load data.";
  if (status === "empty") return emptyLabel;
  return null;
}

function summaryFromMarks(
  marks: { status: AttendanceMarkStatus | undefined }[],
): StudentAttendanceSummaryModel {
  if (marks.length === 0) return EMPTY_ATTENDANCE_SUMMARY;
  return {
    total: marks.length,
    present: marks.filter((m) => m.status === "present").length,
    absent: marks.filter((m) => m.status === "absent").length,
    leave: marks.filter((m) => m.status === "leave").length,
    unmarked: marks.filter((m) => !m.status).length,
  };
}

function summaryFromDetail(detail: AttendanceRegisterDetail | null): StudentAttendanceSummaryModel {
  if (!detail) return EMPTY_ATTENDANCE_SUMMARY;
  return {
    total: detail.totalMarks,
    present: detail.presentCount,
    absent: detail.absentCount,
    leave: detail.leaveCount,
    unmarked: 0,
  };
}

export function StudentAttendanceApiPage() {
  const instituteCtx = useInstituteContext();
  const notify = useAdminToast();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const [state, setState] = useState(() => defaultStudentAttendanceWorkspaceState());
  const [classOptions, setClassOptions] = useState<{ id: string; label: string }[]>([]);
  const [sectionOptions, setSectionOptions] = useState<
    { id: string; label: string; classId: string }[]
  >([]);
  const [classesById, setClassesById] = useState<Map<string, ClassDto>>(new Map());
  const [sectionsById, setSectionsById] = useState<Map<string, SectionDto>>(new Map());
  const [catalogReady, setCatalogReady] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [registers, setRegisters] = useState<AttendanceRegisterListItem[]>([]);
  const [registersStatus, setRegistersStatus] = useState<AttendanceListStatus>("loading");
  const [registersError, setRegistersError] = useState<string | null>(null);
  const [registersResolvedKey, setRegistersResolvedKey] = useState<string | null>(null);
  const [detailReloadKey, setDetailReloadKey] = useState(0);
  const queryClient = useQueryClient();
  const registersEnabled =
    instituteCtx.status === "ready" &&
    Boolean(instituteCtx.activeInstituteId) &&
    Boolean(state.sectionId) &&
    Boolean(state.date);
  const registersQuery = useAttendanceRegistersQuery(
    instituteCtx.activeInstituteId,
    {
      sectionId: state.sectionId || undefined,
      attendanceDate: state.date || undefined,
    },
    registersEnabled,
  );
  const catalogQuery = useCatalogClassesQuery(
    instituteCtx.activeInstituteId,
    instituteCtx.status === "ready" && Boolean(instituteCtx.activeInstituteId),
  );
  const bumpRegistersReload = () => {
    invalidateAdminCache("admin:attendance");
    if (instituteCtx.activeInstituteId) {
      void queryClient.invalidateQueries({
        queryKey: adminModulePrefix(instituteCtx.activeInstituteId, adminQueryRoots.attendance),
      });
    }
  };
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [enrollments, setEnrollments] = useState<EnrollmentListItem[]>([]);
  const [enrollmentsStatus, setEnrollmentsStatus] = useState<EnrollmentListStatus>("loading");
  const [enrollmentsError, setEnrollmentsError] = useState<string | null>(null);
  const [enrollmentsResolvedKey, setEnrollmentsResolvedKey] = useState<string | null>(null);

  const [draftMarks, setDraftMarks] = useState<Record<string, AttendanceMarkStatus>>({});

  const [markConfig, setMarkConfig] = useState<ReturnType<typeof pickAttendanceConfigForRegister>>(null);
  const [markSlots, setMarkSlots] = useState<AttendanceRegisterSlotFields[]>([]);
  const [activeCreateSlotCode, setActiveCreateSlotCode] = useState("");
  const [creatingSlotCode, setCreatingSlotCode] = useState<string | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [activeRegisterId, setActiveRegisterId] = useState("");
  const activeRegisterIdRef = useRef(activeRegisterId);
  activeRegisterIdRef.current = activeRegisterId;
  const [detail, setDetail] = useState<AttendanceRegisterDetail | null>(null);
  const [detailStatus, setDetailStatus] = useState<AttendanceListStatus>("loading");
  const [detailError, setDetailError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"create" | "submit" | null>(null);

  const queryKey = `${state.sectionId}|${state.date}`;

  const registersView = resolveAttendanceRegistersListView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: registersResolvedKey?.split("|")[0] ?? null,
    storedItems: registers,
    storedStatus:
      registersQuery.isLoading && !registersQuery.data
        ? "loading"
        : registersStatus,
    storedErrorMessage: registersError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const enrollmentsView = resolveEnrollmentsListView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: enrollmentsResolvedKey?.split("|")[0] ?? null,
    storedItems: enrollments,
    storedStatus: enrollmentsStatus,
    storedErrorMessage: enrollmentsError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const registersHint = attendanceHint(
    registersView.status,
    registersView.errorMessage,
    "No attendance registers for this class · section · date.",
  );

  const enrollmentsHint = attendanceHint(
    enrollmentsView.status,
    enrollmentsView.errorMessage,
    "No enrolled students for this section.",
  );

  useEffect(() => {
    if (instituteCtx.status !== "ready" || !instituteCtx.activeInstituteId) {
      setClassOptions([]);
      setSectionOptions([]);
      setClassesById(new Map());
      setSectionsById(new Map());
      setCatalogReady(false);
      setCatalogError(null);
      setRegisters([]);
      setRegistersStatus("empty");
      setRegistersError(null);
      setRegistersResolvedKey(null);
      setEnrollments([]);
      setEnrollmentsStatus("empty");
      setEnrollmentsError(null);
      setEnrollmentsResolvedKey(null);
      setDraftMarks({});
      setActiveRegisterId("");
      setDetail(null);
      setDetailStatus("empty");
      setDetailError(null);
      setState(defaultStudentAttendanceWorkspaceState());
      return;
    }

    setState(defaultStudentAttendanceWorkspaceState());
    setActiveRegisterId("");
    setDetail(null);
    setDetailStatus("empty");
    setDetailError(null);
    setDraftMarks({});
    setEnrollments([]);
    setEnrollmentsStatus("loading");
    setEnrollmentsError(null);
    setEnrollmentsResolvedKey(null);
    setRegisters([]);
    setRegistersStatus("loading");
    setRegistersError(null);
    setRegistersResolvedKey(null);
    setCatalogReady(false);
    setCatalogError(null);
  }, [instituteCtx.status, instituteCtx.activeInstituteId]);

  useEffect(() => {
    if (instituteCtx.status !== "ready" || !instituteCtx.activeInstituteId) return;
    if (catalogQuery.isError) {
      setCatalogReady(false);
      setCatalogError(
        catalogQuery.error instanceof Error
          ? catalogQuery.error.message
          : "Failed to load classes.",
      );
      return;
    }
    const catalog = catalogQuery.data;
    if (!catalog) {
      // First load only — keep prior class/section options during soft refetch.
      if (catalogQuery.isLoading) setCatalogReady(false);
      return;
    }
    setClassOptions(buildStudentAttendanceApiClassOptions(catalog.classes));
    const byClass = new Map(catalog.classes.map((cls) => [cls.id, cls]));
    const bySection = new Map(catalog.sections.map((sec) => [sec.id, sec]));
    setClassesById(byClass);
    setSectionsById(bySection);
    setSectionOptions(
      buildStudentAttendanceApiSectionOptions(state.classId, catalog.sections, byClass, {
        includeClassInLabel: false,
      }),
    );
    setCatalogReady(true);
    setCatalogError(null);
  }, [
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    catalogQuery.data,
    catalogQuery.isError,
    catalogQuery.isLoading,
    catalogQuery.error,
    state.classId,
  ]);

  useEffect(() => {
    if (!catalogReady) return;
    const sections = [...sectionsById.values()];
    setSectionOptions(
      buildStudentAttendanceApiSectionOptions(state.classId, sections, classesById, {
        includeClassInLabel: false,
      }),
    );
  }, [state.classId, catalogReady, classesById, sectionsById]);

  useEffect(() => {
    if (!state.classId || !state.sectionId) {
      setEnrollments([]);
      setEnrollmentsStatus("empty");
      setEnrollmentsError(null);
      setEnrollmentsResolvedKey(null);
      setDraftMarks({});
      return;
    }

    if (instituteCtx.status !== "ready" || !instituteCtx.activeInstituteId) {
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    const requestKey = `${requestInstituteId}|${state.sectionId}`;
    let cancelled = false;
    setEnrollmentsStatus("loading");
    setEnrollmentsError(null);
    void loadEnrollmentsList(requestInstituteId, {
      sectionId: state.sectionId,
      status: "active",
    }).then((next) => {
      if (
        !shouldCommitEnrollmentsLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
          requestKey,
          activeKey: activeInstituteIdRef.current
            ? `${activeInstituteIdRef.current}|${state.sectionId}`
            : null,
        })
      ) {
        return;
      }
      setEnrollments(next.items);
      setEnrollmentsStatus(next.status);
      setEnrollmentsError(next.errorMessage);
      setEnrollmentsResolvedKey(`${requestInstituteId}|${state.sectionId}`);
      const initial: Record<string, AttendanceMarkStatus> = {};
      for (const row of next.items) {
        initial[row.id] = "present";
      }
      setDraftMarks(initial);
    });
    return () => {
      cancelled = true;
    };
  }, [instituteCtx.status, instituteCtx.activeInstituteId, state.sectionId, state.classId]);

  useEffect(() => {
    if (!state.classId || !state.sectionId || !state.date) {
      setRegisters([]);
      setRegistersStatus("empty");
      setRegistersError(null);
      setRegistersResolvedKey(null);
      setActiveRegisterId("");
      setDetail(null);
      return;
    }

    if (instituteCtx.status !== "ready" || !instituteCtx.activeInstituteId) {
      return;
    }

    if (registersQuery.isLoading && !registersQuery.data) {
      setRegistersStatus("loading");
      setRegistersError(null);
      return;
    }
    if (!registersQuery.data) return;

    const next = registersQuery.data;
    setRegisters(next.items);
    setRegistersStatus(next.status);
    setRegistersError(next.errorMessage);
    setRegistersResolvedKey(
      `${instituteCtx.activeInstituteId}|${queryKey}`,
    );
    setActiveRegisterId(next.items[0]?.id ?? "");
  }, [
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    state.sectionId,
    state.date,
    queryKey,
    registersQuery.data,
    registersQuery.isLoading,
  ]);

  useEffect(() => {
    if (!state.classId || !state.sectionId || !state.date || !instituteCtx.activeInstituteId) {
      setMarkConfig(null);
      setMarkSlots([]);
      setActiveCreateSlotCode("");
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    const classRow = classesById.get(state.classId);
    const sectionRow = sectionsById.get(state.sectionId);
    if (!classRow || !sectionRow) return;

    let cancelled = false;
    setSlotsLoading(true);
    void loadAttendanceConfigList(requestInstituteId)
      .then(async (configState) => {
        if (cancelled || activeInstituteIdRef.current !== requestInstituteId) return;
        const config = pickAttendanceConfigForRegister({
          configs: configState.items,
          attendanceDate: state.date,
          classCode: classRow.code,
          sectionCode: sectionRow.code,
        });
        setMarkConfig(config);
        if (!config) {
          setMarkSlots([]);
          setActiveCreateSlotCode("");
          return;
        }

        let slots: AttendanceRegisterSlotFields[] = [];
        if (config.method === "period_wise") {
          const [timetableSlots, assignments] = await Promise.all([
            listTimetableSlots({
              instituteId: requestInstituteId,
              academicYearId: classRow.academicYearId,
              sectionId: state.sectionId,
            }),
            listTeacherAssignments({
              instituteId: requestInstituteId,
              sectionId: state.sectionId,
            }),
          ]);
          const subjectByAssignment = new Map(
            assignments.map((row) => [row.id, row.subjectId]),
          );
          const subjectIds = [...new Set(assignments.map((a) => a.subjectId))];
          const subjectLabels = new Map<string, string>();
          for (const subjectId of subjectIds) {
            subjectLabels.set(subjectId, subjectId.slice(0, 8));
          }
          const enriched = timetableSlots.map((slot) => ({
            id: slot.id,
            dayOfWeek: slot.dayOfWeek,
            periodIndex: slot.periodIndex,
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            status: slot.status,
            subjectLabel:
              subjectLabels.get(
                subjectByAssignment.get(slot.teacherAssignmentId) ?? "",
              ) ?? "Subject",
          }));
          slots = attendancePeriodsFromTimetableSlots(enriched, state.date).map((period) =>
            slotFieldsFromPeriod({
              slotKind: "period",
              slotCode: period.slotCode,
              slotLabel: period.slotLabel,
              periodIndex: period.index,
              timetableSlotId: period.timetableSlotId,
              subjectLabel: period.subject,
              startsAt: period.startsAt,
              endsAt: period.endsAt,
            }),
          );
        } else if (config.method === "morning_afternoon") {
          slots = [
            slotFieldsFromMethod(config.method),
            afternoonSlotFields(),
          ];
        } else {
          slots = [slotFieldsFromMethod(config.method)];
        }
        setMarkSlots(slots);
        const markedCodes = new Set(registers.map((row) => row.slotCode));
        const firstUnmarked = slots.find((slot) => !markedCodes.has(slot.slotCode));
        setActiveCreateSlotCode(firstUnmarked?.slotCode ?? slots[0]?.slotCode ?? "");
      })
      .catch(() => {
        if (!cancelled) {
          setMarkConfig(null);
          setMarkSlots([]);
          setActiveCreateSlotCode("");
        }
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    instituteCtx.activeInstituteId,
    state.classId,
    state.sectionId,
    state.date,
    classesById,
    sectionsById,
    registers,
  ]);

  useEffect(() => {
    if (!activeRegisterId || !instituteCtx.activeInstituteId) {
      setDetail(null);
      setDetailStatus("empty");
      setDetailError(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    const requestRegisterId = activeRegisterId;
    let cancelled = false;
    setDetailStatus("loading");
    setDetailError(null);
    void loadAttendanceRegisterDetail(requestInstituteId, requestRegisterId).then(
      (next) => {
        if (cancelled) return;
        if (activeInstituteIdRef.current !== requestInstituteId) return;
        if (activeRegisterIdRef.current !== requestRegisterId) return;
        setDetail(next.detail);
        setDetailStatus(next.status);
        setDetailError(next.errorMessage);
        if (next.detail) {
          const nextDraft: Record<string, AttendanceMarkStatus> = {};
          for (const mark of next.detail.marks) {
            nextDraft[mark.enrollmentId] = mark.status;
          }
          setDraftMarks(nextDraft);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [activeRegisterId, instituteCtx.activeInstituteId, detailReloadKey]);

  const markedSlotCodes = useMemo(
    () => new Set(registersView.items.map((row) => row.slotCode)),
    [registersView.items],
  );

  const unmarkedSlots = useMemo(
    () => markSlots.filter((slot) => !markedSlotCodes.has(slot.slotCode)),
    [markSlots, markedSlotCodes],
  );

  const activeCreateSlot = useMemo(() => {
    const code = creatingSlotCode ?? activeCreateSlotCode;
    return (
      unmarkedSlots.find((slot) => slot.slotCode === code) ??
      unmarkedSlots[0] ??
      null
    );
  }, [unmarkedSlots, activeCreateSlotCode, creatingSlotCode]);

  const createRegister = (andSubmit = false) => {
    if (!writesEnabled || saving || !instituteCtx.activeInstituteId) return;
    if (!state.classId || !state.sectionId || !state.date) return;
    if (enrollmentsView.items.length === 0) {
      notify("No enrolled students to mark for this section");
      return;
    }
    if (!markConfig || !activeCreateSlot) {
      notify("Select an attendance slot to mark");
      return;
    }
    if (markConfig.owner !== "attendance_incharge") {
      notify("Attendance is taken in Connect for the current Taken By setting");
      return;
    }
    const unmarked = enrollmentsView.items.filter((row) => !draftMarks[row.id]);
    if (unmarked.length > 0) {
      notify(`Mark all students before submitting (${unmarked.length} unmarked)`);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    const classRow = classesById.get(state.classId);
    if (!classRow) {
      notify("Class catalog is incomplete");
      return;
    }

    setSaving(true);
    void createAttendanceRegister({
      instituteId: requestInstituteId,
      academicYearId: classRow.academicYearId,
      classId: state.classId,
      sectionId: state.sectionId,
      configVersionId: markConfig.id,
      attendanceDate: state.date,
      slotKind: activeCreateSlot.slotKind,
      slotCode: activeCreateSlot.slotCode,
      slotLabel: activeCreateSlot.slotLabel,
      periodIndex: activeCreateSlot.periodIndex,
      timetableSlotId: activeCreateSlot.timetableSlotId,
      subjectLabel: activeCreateSlot.subjectLabel,
      startsAt: activeCreateSlot.startsAt,
      endsAt: activeCreateSlot.endsAt,
      marks: enrollmentsView.items.map((row) => ({
        enrollmentId: row.id,
        status: draftMarks[row.id]!,
      })),
    })
      .then(async (created) => {
        if (activeInstituteIdRef.current !== requestInstituteId) return;
        if (andSubmit) {
          await submitAttendanceRegister(created.id);
          if (activeInstituteIdRef.current !== requestInstituteId) return;
          notify("Attendance submitted");
        } else {
          notify("Attendance draft saved");
        }
        bumpRegistersReload();
        setActiveRegisterId(created.id);
        setCreatingSlotCode(null);
      })
      .catch((err) => {
        notify(
          err instanceof Error
            ? err.message
            : andSubmit
              ? "Failed to submit attendance"
              : "Failed to create attendance register",
        );
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const saveDraftMarks = () => {
    if (!writesEnabled || !detail || detail.status !== "draft" || saving) return;
    const requestInstituteId = instituteCtx.activeInstituteId;
    const requestRegisterId = detail.id;
    if (!requestInstituteId) return;
    setSaving(true);
    void updateAttendanceRegister(requestRegisterId, {
      marks: detail.marks.map((mark) => ({
        enrollmentId: mark.enrollmentId,
        status: draftMarks[mark.enrollmentId] ?? mark.status,
      })),
    })
      .then(() => {
        if (activeInstituteIdRef.current !== requestInstituteId) return;
        notify("Attendance marks saved");
        bumpRegistersReload();
        setDetailReloadKey((k) => k + 1);
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to save attendance");
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const submitDraft = () => {
    if (!writesEnabled || !detail || detail.status !== "draft" || submitting) return;
    if (detail.owner !== "attendance_incharge") {
      notify("Attendance is taken in Connect for the current Taken By setting");
      return;
    }
    const rosterIds =
      enrollmentsView.items.length > 0
        ? enrollmentsView.items.map((row) => row.id)
        : detail.marks.map((mark) => mark.enrollmentId);
    const unmarked = rosterIds.filter((id) => {
      const fromDraft = draftMarks[id];
      if (fromDraft) return false;
      return !detail.marks.some((mark) => mark.enrollmentId === id);
    });
    if (unmarked.length > 0) {
      notify(`Mark all students before submitting (${unmarked.length} unmarked)`);
      return;
    }
    const requestInstituteId = instituteCtx.activeInstituteId;
    const requestRegisterId = detail.id;
    if (!requestInstituteId) return;
    setSubmitting(true);
    void submitAttendanceRegister(requestRegisterId)
      .then(() => {
        if (activeInstituteIdRef.current !== requestInstituteId) return;
        notify("Attendance register submitted");
        bumpRegistersReload();
        setDetailReloadKey((k) => k + 1);
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to submit attendance");
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  const classLabel = classOptions.find((option) => option.id === state.classId)?.label;
  const sectionLabel = sectionOptions.find((option) => option.id === state.sectionId)?.label;
  const scopeLabel =
    classLabel && sectionLabel ? `${classLabel} · ${sectionLabel}` : classLabel;

  const createMode =
    registersView.rowsValid &&
    unmarkedSlots.length > 0 &&
    Boolean(state.classId && state.sectionId && state.date) &&
    Boolean(markConfig) &&
    markConfig?.owner === "attendance_incharge" &&
    (registersView.items.length === 0 || creatingSlotCode !== null);

  const summary = useMemo(() => {
    if (createMode) {
      return summaryFromMarks(
        enrollmentsView.items.map((row) => ({
          status: draftMarks[row.id],
        })),
      );
    }
    if (detail?.status === "draft") {
      return summaryFromMarks(
        detail.marks.map((mark) => ({
          status: draftMarks[mark.enrollmentId] ?? mark.status,
        })),
      );
    }
    return summaryFromDetail(detail);
  }, [createMode, detail, draftMarks, enrollmentsView.items]);

  const adminMarkingAllowed = markConfig?.owner === "attendance_incharge";
  const takenByConnect =
    Boolean(markConfig) && markConfig?.owner !== "attendance_incharge";

  const rollByEnrollmentId = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of enrollmentsView.items) {
      map.set(row.id, row.rollNo ?? "");
    }
    return map;
  }, [enrollmentsView.items]);

  const filteredCreateRoster = useMemo(() => {
    let rows = enrollmentsView.items;
    if (state.status !== "all") {
      rows = rows.filter((row) => draftMarks[row.id] === state.status);
    }
    const q = state.search.trim();
    if (q) {
      rows = rows.filter((row) =>
        matchesAttendanceSearch(q, [row.studentName, row.studentId, row.rollNo]),
      );
    }
    return rows;
  }, [enrollmentsView.items, draftMarks, state.search, state.status]);

  const filteredMarks = useMemo(() => {
    if (!detail) return [];
    let rows = detail.marks;
    if (state.status !== "all") {
      rows = rows.filter(
        (mark) => (draftMarks[mark.enrollmentId] ?? mark.status) === state.status,
      );
    }
    const q = state.search.trim();
    if (q) {
      rows = rows.filter((mark) =>
        matchesAttendanceSearch(q, [
          mark.studentName,
          mark.studentId,
          rollByEnrollmentId.get(mark.enrollmentId),
        ]),
      );
    }
    return rows;
  }, [detail, draftMarks, state.search, state.status, rollByEnrollmentId]);

  const blocked =
    !catalogReady ||
    instituteCtx.status === "loading" ||
    (Boolean(state.sectionId && state.date) && !registersView.rowsValid);

  const blockHint =
    catalogError ??
    registersHint ??
    (instituteCtx.status === "loading" ? "Loading institute…" : null) ??
    (!catalogReady ? "Loading classes…" : null);

  const canWrite =
    writesEnabled && !saving && !submitting && (!markConfig || adminMarkingAllowed);

  const toggleEnrollmentMark = (enrollmentId: string) => {
    setDraftMarks((prev) => {
      const current =
        prev[enrollmentId] ??
        detail?.marks.find((mark) => mark.enrollmentId === enrollmentId)?.status ??
        "present";
      if (current === "leave") return prev;
      return { ...prev, [enrollmentId]: current === "absent" ? "present" : "absent" };
    });
  };

  const applyBulkMarks = (status: "present" | "absent") => {
    setDraftMarks((prev) => {
      const next = { ...prev };
      if (createMode) {
        for (const row of enrollmentsView.items) {
          if ((next[row.id] ?? "present") === "leave") continue;
          next[row.id] = status;
        }
        return next;
      }
      if (!detail) return prev;
      for (const mark of detail.marks) {
        const current = next[mark.enrollmentId] ?? mark.status;
        if (current === "leave") continue;
        next[mark.enrollmentId] = status;
      }
      return next;
    });
  };

  const clearEnrollmentMarks = () => {
    applyBulkMarks("present");
    notify("Cleared — all students marked present");
  };

  const createRosterItems = useMemo(
    () =>
      filteredCreateRoster.map((row) => ({
        id: row.id,
        name: row.studentName,
        roll: row.rollNo,
        status: (draftMarks[row.id] ?? "present") as "present" | "absent" | "leave",
      })),
    [filteredCreateRoster, draftMarks],
  );

  const editRosterItems = useMemo(
    () =>
      filteredMarks.map((mark) => ({
        id: mark.enrollmentId,
        name: mark.studentName,
        roll: rollByEnrollmentId.get(mark.enrollmentId) ?? "",
        status: (draftMarks[mark.enrollmentId] ?? mark.status) as
          | "present"
          | "absent"
          | "leave",
      })),
    [filteredMarks, draftMarks, rollByEnrollmentId],
  );

  return (
    <PageStack>
      {takenByConnect ? (
        <Card>
          <div className="px-4 py-3 text-sm text-muted-foreground sm:px-5">
            Taken By is{" "}
            <span className="font-medium text-foreground">
              {markConfig?.owner === "class_teacher"
                ? "Class Teacher"
                : "Current Period Teacher"}
            </span>
            . Mark attendance in the Connect app for this class · section.
          </div>
        </Card>
      ) : null}

      <StudentAttendanceSummary
        summary={summary}
        dateLabel={state.date || undefined}
        scopeLabel={scopeLabel}
      />

      <StudentAttendanceFilters
        state={state}
        classOptions={classOptions}
        sectionOptions={sectionOptions}
        onChange={(patch) => setState((prev) => ({ ...prev, ...patch }))}
        disabled={!catalogReady}
      />

      {blocked ? (
        <Card>
          <CardHeader title="Student roster" hint="Attendance registers" />
          <div className="px-4 pb-8 text-center text-sm text-muted-foreground sm:px-5">
            {blockHint ?? "Select class, section, and date."}
          </div>
        </Card>
      ) : !state.classId || !state.sectionId ? (
        <Card>
          <CardHeader title="Student roster" hint="Select class and section" />
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center sm:px-5">
            <ClipboardList className="size-5 text-muted-foreground" />
            <p className="max-w-md text-sm text-muted-foreground">
              Select a class and section to load enrolled students and attendance registers.
            </p>
          </div>
        </Card>
      ) : createMode ? (
        <Card>
          <CardHeader
            title="Create attendance register"
            hint={
              !enrollmentsView.rowsValid
                ? enrollmentsHint ?? "Loading enrollments…"
                : `${enrollmentsView.items.length} enrolled · ${activeCreateSlot?.slotLabel ?? "slot"}`
            }
          />
          {creatingSlotCode ? (
            <div className="px-4 pb-3 sm:px-5">
              <Button variant="outline" size="sm" onClick={() => setCreatingSlotCode(null)}>
                Back to registers
              </Button>
            </div>
          ) : null}
          {unmarkedSlots.length > 1 ? (
            <div className="flex flex-wrap gap-2 px-4 pb-3 sm:px-5">
              {unmarkedSlots.map((slot) => (
                <button
                  key={slot.slotCode}
                  type="button"
                  onClick={() => setActiveCreateSlotCode(slot.slotCode)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    activeCreateSlot?.slotCode === slot.slotCode
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {slot.slotLabel}
                </button>
              ))}
            </div>
          ) : null}
          {slotsLoading ? (
            <div className="px-4 pb-8 text-center text-sm text-muted-foreground sm:px-5">
              Loading attendance slots…
            </div>
          ) : !markConfig ? (
            <div className="px-4 pb-8 text-center text-sm text-muted-foreground sm:px-5">
              No attendance configuration covers this date for the section.
            </div>
          ) : !activeCreateSlot ? (
            <div className="px-4 pb-8 text-center text-sm text-muted-foreground sm:px-5">
              {emptyAttendanceSlotCreateMessage(markConfig?.method, markSlots.length)}
            </div>
          ) : !enrollmentsView.rowsValid ? (
            <div className="px-4 pb-8 text-center text-sm text-muted-foreground sm:px-5">
              {enrollmentsHint ?? "Loading enrollments…"}
            </div>
          ) : enrollmentsView.items.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="size-5" />}
              title="No enrollments"
              hint={enrollmentsHint ?? "Enroll students in this section before marking attendance."}
            />
          ) : (
            <AttendanceMarkRoster
              title={scopeLabel ?? "Roster"}
              items={createRosterItems}
              canMark={Boolean(canWrite)}
              onToggle={toggleEnrollmentMark}
              onAllPresent={() => applyBulkMarks("present")}
              onAllAbsent={() => applyBulkMarks("absent")}
              onClear={clearEnrollmentMarks}
              emptyHint="No students match your filters."
              footer={
                canWrite ? (
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="primary"
                      className="h-11 w-full rounded-xl"
                      disabled={saving || !activeCreateSlot || enrollmentsView.items.length === 0}
                      onClick={() => setConfirmAction("create")}
                    >
                      <Check className="mr-1.5 size-4" />
                      {saving ? "Submitting…" : "Submit attendance"}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 w-full rounded-xl"
                      disabled={saving || !activeCreateSlot || enrollmentsView.items.length === 0}
                      onClick={() => createRegister(false)}
                    >
                      <Save className="mr-1.5 size-3.5" />
                      {saving ? "Saving…" : "Save draft"}
                    </Button>
                  </div>
                ) : null
              }
            />
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="Attendance register"
            hint={`${registersView.items.length} slot${registersView.items.length === 1 ? "" : "s"}`}
            action={
              detail ? (
                <Pill tone={detail.status === "submitted" ? "success" : "warning"}>
                  {detail.status}
                </Pill>
              ) : null
            }
          />

          {registersView.items.length > 1 ? (
            <div className="flex flex-wrap gap-2 px-4 pb-3 sm:px-5">
              {registersView.items.map((register) => (
                <button
                  key={register.id}
                  type="button"
                  onClick={() => {
                    setCreatingSlotCode(null);
                    setActiveRegisterId(register.id);
                  }}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    activeRegisterId === register.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {register.slotLabel}
                </button>
              ))}
            </div>
          ) : null}

          {unmarkedSlots.length > 0 && canWrite ? (
            <div className="flex flex-wrap gap-2 px-4 pb-3 sm:px-5">
              {unmarkedSlots.map((slot) => (
                <button
                  key={slot.slotCode}
                  type="button"
                  onClick={() => {
                    setCreatingSlotCode(slot.slotCode);
                    setActiveCreateSlotCode(slot.slotCode);
                    const initial: Record<string, AttendanceMarkStatus> = {};
                    for (const row of enrollmentsView.items) {
                      initial[row.id] = "present";
                    }
                    setDraftMarks(initial);
                  }}
                  className="rounded-full border border-dashed border-primary/40 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
                >
                  + {slot.slotLabel}
                </button>
              ))}
            </div>
          ) : null}

          {detailStatus === "loading" ? (
            <div className="px-4 pb-8 text-center text-sm text-muted-foreground sm:px-5">
              Loading marks…
            </div>
          ) : detailError ? (
            <div className="px-4 pb-8 text-center text-sm text-destructive sm:px-5">
              {detailError}
            </div>
          ) : !detail ? (
            <div className="px-4 pb-8 text-center text-sm text-muted-foreground sm:px-5">
              Select a register to view marks.
            </div>
          ) : (
            <AttendanceMarkRoster
              title={detail.slotLabel || scopeLabel || "Roster"}
              items={editRosterItems}
              canMark={Boolean(canWrite && detail.status === "draft")}
              onToggle={toggleEnrollmentMark}
              onAllPresent={() => applyBulkMarks("present")}
              onAllAbsent={() => applyBulkMarks("absent")}
              onClear={clearEnrollmentMarks}
              emptyHint="No marks match your filters."
              footer={
                canWrite && detail.status === "draft" ? (
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="primary"
                      className="h-11 w-full rounded-xl"
                      disabled={submitting}
                      onClick={() => setConfirmAction("submit")}
                    >
                      <Check className="mr-1.5 size-4" />
                      {submitting ? "Submitting…" : "Submit attendance"}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 w-full rounded-xl"
                      disabled={saving}
                      onClick={saveDraftMarks}
                    >
                      <Save className="mr-1.5 size-3.5" />
                      {saving ? "Saving…" : "Save draft"}
                    </Button>
                  </div>
                ) : null
              }
            />
          )}
        </Card>
      )}

      <Modal
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        title={confirmAction === "create" ? "Submit attendance?" : "Submit draft?"}
        subtitle={
          confirmAction === "create"
            ? `Create and submit the register for ${activeCreateSlot?.slotLabel ?? "this slot"}.`
            : "Submit this draft register. Marks cannot be edited after submit."
        }
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={saving || submitting}
              onClick={() => {
                const action = confirmAction;
                setConfirmAction(null);
                if (action === "create") createRegister(true);
                else if (action === "submit") submitDraft();
              }}
            >
              Confirm
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          Tap Confirm to continue. Students marked absent will be recorded as absent.
        </p>
      </Modal>
    </PageStack>
  );
}
