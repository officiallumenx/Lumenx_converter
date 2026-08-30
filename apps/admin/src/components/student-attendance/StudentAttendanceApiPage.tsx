import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  PageStack,
  Pill,
  Select,
  Td,
  Th,
  Tr,
} from "@lumenx/ui-admin";
import { Check, ClipboardList, Plus, Save } from "lucide-react";
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
import { listClassesCatalog, type ClassDto, type SectionDto } from "@/lib/classes";
import {
  buildStudentAttendanceApiClassOptions,
  buildStudentAttendanceApiSectionOptions,
} from "@/lib/attendance/class-section-options";
import {
  createAttendanceRegister,
  loadAttendanceConfigList,
  loadAttendanceRegisterDetail,
  loadAttendanceRegistersList,
  pickAttendanceConfigForRegister,
  resolveAttendanceRegistersListView,
  shouldCommitAttendanceRegistersLoad,
  slotFieldsFromMethod,
  submitAttendanceRegister,
  updateAttendanceRegister,
  type AttendanceListStatus,
  type AttendanceMarkStatus,
  type AttendanceRegisterDetail,
  type AttendanceRegisterListItem,
} from "@/lib/attendance";
import {
  loadEnrollmentsList,
  resolveEnrollmentsListView,
  shouldCommitEnrollmentsLoad,
  type EnrollmentListItem,
  type EnrollmentListStatus,
} from "@/lib/enrollments";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";

const MARK_OPTIONS: AttendanceMarkStatus[] = ["present", "absent", "leave"];

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
  marks: { status: AttendanceMarkStatus }[],
): StudentAttendanceSummaryModel {
  if (marks.length === 0) return EMPTY_ATTENDANCE_SUMMARY;
  return {
    total: marks.length,
    present: marks.filter((m) => m.status === "present").length,
    absent: marks.filter((m) => m.status === "absent").length,
    leave: marks.filter((m) => m.status === "leave").length,
    unmarked: 0,
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
  const [registersReloadKey, setRegistersReloadKey] = useState(0);
  const [detailReloadKey, setDetailReloadKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [enrollments, setEnrollments] = useState<EnrollmentListItem[]>([]);
  const [enrollmentsStatus, setEnrollmentsStatus] = useState<EnrollmentListStatus>("loading");
  const [enrollmentsError, setEnrollmentsError] = useState<string | null>(null);
  const [enrollmentsResolvedKey, setEnrollmentsResolvedKey] = useState<string | null>(null);

  const [draftMarks, setDraftMarks] = useState<Record<string, AttendanceMarkStatus>>({});

  const [activeRegisterId, setActiveRegisterId] = useState("");
  const activeRegisterIdRef = useRef(activeRegisterId);
  activeRegisterIdRef.current = activeRegisterId;
  const [detail, setDetail] = useState<AttendanceRegisterDetail | null>(null);
  const [detailStatus, setDetailStatus] = useState<AttendanceListStatus>("loading");
  const [detailError, setDetailError] = useState<string | null>(null);

  const queryKey = `${state.sectionId}|${state.date}`;

  const registersView = resolveAttendanceRegistersListView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: registersResolvedKey?.split("|")[0] ?? null,
    storedItems: registers,
    storedStatus: registersStatus,
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

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
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
    void listClassesCatalog({ instituteId: requestInstituteId }).then(
      (catalog) => {
        if (cancelled) return;
        if (activeInstituteIdRef.current !== requestInstituteId) return;
        setClassOptions(buildStudentAttendanceApiClassOptions(catalog.classes));
        const byClass = new Map(catalog.classes.map((cls) => [cls.id, cls]));
        const bySection = new Map(catalog.sections.map((sec) => [sec.id, sec]));
        setClassesById(byClass);
        setSectionsById(bySection);
        setSectionOptions(
          buildStudentAttendanceApiSectionOptions(state.classId, catalog.sections, byClass),
        );
        setCatalogReady(true);
        setCatalogError(null);
      },
      (err) => {
        if (cancelled) return;
        if (activeInstituteIdRef.current !== requestInstituteId) return;
        setCatalogReady(false);
        setCatalogError(err instanceof Error ? err.message : "Failed to load classes.");
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuild sections when classId changes via separate effect below
  }, [instituteCtx.status, instituteCtx.activeInstituteId]);

  useEffect(() => {
    if (!catalogReady) return;
    const sections = [...sectionsById.values()];
    setSectionOptions(
      buildStudentAttendanceApiSectionOptions(state.classId, sections, classesById),
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

    const requestInstituteId = instituteCtx.activeInstituteId;
    const requestKey = `${requestInstituteId}|${queryKey}`;
    let cancelled = false;
    setRegistersStatus("loading");
    setRegistersError(null);
    void loadAttendanceRegistersList(requestInstituteId, {
      sectionId: state.sectionId,
      attendanceDate: state.date,
    }).then((next) => {
      if (
        !shouldCommitAttendanceRegistersLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
          requestKey,
          activeKey: activeInstituteIdRef.current
            ? `${activeInstituteIdRef.current}|${queryKey}`
            : null,
        })
      ) {
        return;
      }
      setRegisters(next.items);
      setRegistersStatus(next.status);
      setRegistersError(next.errorMessage);
      setRegistersResolvedKey(`${requestInstituteId}|${queryKey}`);
      setActiveRegisterId(next.items[0]?.id ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, [
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    state.sectionId,
    state.date,
    queryKey,
    registersReloadKey,
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

  const setEnrollmentMark = (enrollmentId: string, status: AttendanceMarkStatus) => {
    setDraftMarks((prev) => ({ ...prev, [enrollmentId]: status }));
  };

  const createRegister = () => {
    if (!writesEnabled || saving || !instituteCtx.activeInstituteId) return;
    if (!state.classId || !state.sectionId || !state.date) return;
    if (enrollmentsView.items.length === 0) {
      notify("No enrolled students to mark for this section");
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    const classRow = classesById.get(state.classId);
    const sectionRow = sectionsById.get(state.sectionId);
    if (!classRow || !sectionRow) {
      notify("Class or section catalog is incomplete");
      return;
    }

    setSaving(true);
    void loadAttendanceConfigList(requestInstituteId)
      .then((configState) => {
        if (activeInstituteIdRef.current !== requestInstituteId) return null;
        if (configState.status === "forbidden" || configState.status === "error") {
          throw new Error(configState.errorMessage ?? "Failed to load attendance config");
        }
        const config = pickAttendanceConfigForRegister({
          configs: configState.items,
          attendanceDate: state.date,
          classCode: classRow.code,
          sectionCode: sectionRow.code,
        });
        if (!config) {
          throw new Error("No attendance configuration covers this date for the section");
        }
        const slot = slotFieldsFromMethod(config.method);
        return createAttendanceRegister({
          instituteId: requestInstituteId,
          academicYearId: classRow.academicYearId,
          classId: state.classId,
          sectionId: state.sectionId,
          configVersionId: config.id,
          attendanceDate: state.date,
          slotKind: slot.slotKind,
          slotCode: slot.slotCode,
          slotLabel: slot.slotLabel,
          periodIndex: slot.periodIndex,
          marks: enrollmentsView.items.map((row) => ({
            enrollmentId: row.id,
            status: draftMarks[row.id] ?? "present",
          })),
        });
      })
      .then((created) => {
        if (!created) return;
        if (activeInstituteIdRef.current !== requestInstituteId) return;
        notify("Attendance register created");
        setRegistersReloadKey((k) => k + 1);
        setActiveRegisterId(created.id);
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to create attendance register");
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
        setRegistersReloadKey((k) => k + 1);
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
    const requestInstituteId = instituteCtx.activeInstituteId;
    const requestRegisterId = detail.id;
    if (!requestInstituteId) return;
    setSubmitting(true);
    void submitAttendanceRegister(requestRegisterId)
      .then(() => {
        if (activeInstituteIdRef.current !== requestInstituteId) return;
        notify("Attendance register submitted");
        setRegistersReloadKey((k) => k + 1);
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
    registersView.items.length === 0 &&
    Boolean(state.classId && state.sectionId && state.date);

  const summary = useMemo(() => {
    if (createMode) {
      return summaryFromMarks(
        enrollmentsView.items.map((row) => ({
          status: draftMarks[row.id] ?? "present",
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

  const filteredCreateRoster = useMemo(() => {
    let rows = enrollmentsView.items;
    if (state.status !== "all") {
      rows = rows.filter((row) => (draftMarks[row.id] ?? "present") === state.status);
    }
    const q = state.search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((row) =>
        `${row.studentName} ${row.studentId} ${row.rollNo}`.toLowerCase().includes(q),
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
    const q = state.search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((mark) =>
        `${mark.studentName} ${mark.studentId}`.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [detail, draftMarks, state.search, state.status]);

  const blocked =
    !catalogReady ||
    instituteCtx.status === "loading" ||
    (Boolean(state.sectionId && state.date) && !registersView.rowsValid);

  const blockHint =
    catalogError ??
    registersHint ??
    (instituteCtx.status === "loading" ? "Loading institute…" : null) ??
    (!catalogReady ? "Loading classes…" : null);

  const canWrite = writesEnabled && !saving && !submitting;

  return (
    <PageStack>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Pill tone="neutral">{M.attendance}</Pill>
        <Pill tone="info">
          {writesEnabled
            ? "API mode · create / mark / submit"
            : "API mode · select institute to write"}
        </Pill>
        <span className="text-border">·</span>
        <Link to="/attendance" className="font-medium text-primary hover:underline">
          Monitor & analytics
        </Link>
      </div>

      <StudentAttendanceFilters
        state={state}
        classOptions={classOptions}
        sectionOptions={sectionOptions}
        onChange={(patch) => setState((prev) => ({ ...prev, ...patch }))}
        disabled={!catalogReady}
      />

      <StudentAttendanceSummary
        summary={summary}
        dateLabel={state.date || undefined}
        scopeLabel={scopeLabel}
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
                : `${enrollmentsView.items.length} enrolled · mark then create`
            }
            action={
              canWrite && enrollmentsView.rowsValid && enrollmentsView.items.length > 0 ? (
                <Button variant="primary" disabled={saving} onClick={createRegister}>
                  <Plus className="size-3.5" /> Create register
                </Button>
              ) : null
            }
          />
          {!enrollmentsView.rowsValid ? (
            <div className="px-4 pb-8 text-center text-sm text-muted-foreground sm:px-5">
              {enrollmentsHint ?? "Loading enrollments…"}
            </div>
          ) : enrollmentsView.items.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="size-5" />}
              title="No enrollments"
              hint={enrollmentsHint ?? "Enroll students in this section before marking attendance."}
            />
          ) : filteredCreateRoster.length === 0 ? (
            <div className="px-4 pb-8 text-center text-sm text-muted-foreground sm:px-5">
              No students match your filters.
            </div>
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <Th>Student</Th>
                  <Th>Roll</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {filteredCreateRoster.map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <div className="font-medium">{row.studentName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {row.studentId.slice(0, 8)}…
                      </div>
                    </Td>
                    <Td>{row.rollNo}</Td>
                    <Td>
                      <Select
                        value={draftMarks[row.id] ?? "present"}
                        disabled={!canWrite}
                        onChange={(e) =>
                          setEnrollmentMark(row.id, e.target.value as AttendanceMarkStatus)
                        }
                      >
                        {MARK_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </Select>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="Attendance register"
            hint={`${registersView.items.length} slot${registersView.items.length === 1 ? "" : "s"}`}
            action={
              detail ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={detail.status === "submitted" ? "success" : "warning"}>
                    {detail.status}
                  </Pill>
                  {canWrite && detail.status === "draft" ? (
                    <>
                      <Button variant="outline" disabled={saving} onClick={saveDraftMarks}>
                        <Save className="size-3.5" /> Save marks
                      </Button>
                      <Button variant="primary" disabled={submitting} onClick={submitDraft}>
                        <Check className="size-3.5" /> Submit draft
                      </Button>
                    </>
                  ) : null}
                </div>
              ) : null
            }
          />

          {registersView.items.length > 1 ? (
            <div className="flex flex-wrap gap-2 px-4 pb-3 sm:px-5">
              {registersView.items.map((register) => (
                <button
                  key={register.id}
                  type="button"
                  onClick={() => setActiveRegisterId(register.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeRegisterId === register.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-surface-hover"
                  }`}
                >
                  {register.slotLabel}
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
          ) : filteredMarks.length === 0 ? (
            <div className="px-4 pb-8 text-center text-sm text-muted-foreground sm:px-5">
              No marks match your filters.
            </div>
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <Th>Student</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {filteredMarks.map((mark) => (
                  <Tr key={mark.id}>
                    <Td>
                      <div className="font-medium">{mark.studentName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {mark.studentId.slice(0, 8)}…
                      </div>
                    </Td>
                    <Td>
                      {detail?.status === "draft" && canWrite ? (
                        <Select
                          value={draftMarks[mark.enrollmentId] ?? mark.status}
                          onChange={(e) =>
                            setEnrollmentMark(
                              mark.enrollmentId,
                              e.target.value as AttendanceMarkStatus,
                            )
                          }
                        >
                          {MARK_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Pill
                          tone={
                            mark.status === "present"
                              ? "success"
                              : mark.status === "absent"
                                ? "danger"
                                : "warning"
                          }
                        >
                          {draftMarks[mark.enrollmentId] ?? mark.status}
                        </Pill>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </Card>
      )}
    </PageStack>
  );
}
