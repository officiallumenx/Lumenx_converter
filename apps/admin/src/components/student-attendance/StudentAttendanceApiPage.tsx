import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  PageStack,
  Pill,
  Td,
  Th,
  Tr,
} from "@lumenx/ui-admin";
import { ClipboardList } from "lucide-react";
import { StudentAttendanceFilters } from "./StudentAttendanceFilters";
import { StudentAttendanceSummary } from "./StudentAttendanceSummary";
import {
  defaultStudentAttendanceWorkspaceState,
  EMPTY_ATTENDANCE_SUMMARY,
  type StudentAttendanceSummaryModel,
} from "./types";
import { useInstituteContext } from "@/lib/institutes";
import { listClassesCatalog } from "@/lib/classes/api";
import {
  buildStudentAttendanceApiClassOptions,
  buildStudentAttendanceApiSectionOptions,
} from "@/lib/attendance/class-section-options";
import {
  loadAttendanceRegisterDetail,
  loadAttendanceRegistersList,
  resolveAttendanceRegistersListView,
  shouldCommitAttendanceRegistersLoad,
  type AttendanceListStatus,
  type AttendanceRegisterDetail,
  type AttendanceRegisterListItem,
} from "@/lib/attendance";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";

function attendanceHint(
  status: AttendanceListStatus,
  errorMessage: string | null,
  emptyLabel: string,
): string | null {
  if (status === "loading") return "Loading attendance registers…";
  if (status === "needs_institute") return "Select an institute to load attendance.";
  if (status === "forbidden") {
    return errorMessage ?? "You do not have access to attendance for this institute.";
  }
  if (status === "error") return errorMessage ?? "Failed to load attendance.";
  if (status === "empty") return emptyLabel;
  return null;
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
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const [state, setState] = useState(() => defaultStudentAttendanceWorkspaceState());
  const [classOptions, setClassOptions] = useState<{ id: string; label: string }[]>([]);
  const [sectionOptions, setSectionOptions] = useState<
    { id: string; label: string; classId: string }[]
  >([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [registers, setRegisters] = useState<AttendanceRegisterListItem[]>([]);
  const [registersStatus, setRegistersStatus] = useState<AttendanceListStatus>("loading");
  const [registersError, setRegistersError] = useState<string | null>(null);
  const [registersResolvedKey, setRegistersResolvedKey] = useState<string | null>(null);

  const [activeRegisterId, setActiveRegisterId] = useState("");
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

  const registersHint = attendanceHint(
    registersView.status,
    registersView.errorMessage,
    "No attendance registers for this class · section · date.",
  );

  useEffect(() => {
    if (instituteCtx.status !== "ready" || !instituteCtx.activeInstituteId) {
      setClassOptions([]);
      setSectionOptions([]);
      setCatalogReady(false);
      setCatalogError(null);
      return;
    }

    let cancelled = false;
    void listClassesCatalog({ instituteId: instituteCtx.activeInstituteId }).then(
      (catalog) => {
        if (cancelled) return;
        setClassOptions(buildStudentAttendanceApiClassOptions(catalog.classes));
        const classesById = new Map(catalog.classes.map((cls) => [cls.id, cls]));
        setSectionOptions(
          buildStudentAttendanceApiSectionOptions(state.classId, catalog.sections, classesById),
        );
        setCatalogReady(true);
        setCatalogError(null);
      },
      (err) => {
        if (cancelled) return;
        setCatalogReady(false);
        setCatalogError(err instanceof Error ? err.message : "Failed to load classes.");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [instituteCtx.status, instituteCtx.activeInstituteId, state.classId]);

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
  ]);

  useEffect(() => {
    if (!activeRegisterId || !instituteCtx.activeInstituteId) {
      setDetail(null);
      setDetailStatus("empty");
      setDetailError(null);
      return;
    }

    let cancelled = false;
    setDetailStatus("loading");
    setDetailError(null);
    void loadAttendanceRegisterDetail(
      instituteCtx.activeInstituteId,
      activeRegisterId,
    ).then((next) => {
      if (cancelled) return;
      setDetail(next.detail);
      setDetailStatus(next.status);
      setDetailError(next.errorMessage);
    });
    return () => {
      cancelled = true;
    };
  }, [activeRegisterId, instituteCtx.activeInstituteId]);

  const classLabel = classOptions.find((option) => option.id === state.classId)?.label;
  const sectionLabel = sectionOptions.find((option) => option.id === state.sectionId)?.label;
  const scopeLabel =
    classLabel && sectionLabel ? `${classLabel} · ${sectionLabel}` : classLabel;

  const summary = useMemo(() => summaryFromDetail(detail), [detail]);

  const filteredMarks = useMemo(() => {
    if (!detail) return [];
    let rows = detail.marks;
    if (state.status !== "all") {
      rows = rows.filter((mark) => mark.status === state.status);
    }
    const q = state.search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((mark) =>
        `${mark.studentName} ${mark.studentId}`.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [detail, state.search, state.status]);

  const blocked =
    !catalogReady ||
    instituteCtx.status === "loading" ||
    (Boolean(state.sectionId && state.date) && !registersView.rowsValid);

  const blockHint =
    catalogError ??
    registersHint ??
    (instituteCtx.status === "loading" ? "Loading institute…" : null) ??
    (!catalogReady ? "Loading classes…" : null);

  return (
    <PageStack>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Pill tone="neutral">{M.attendance}</Pill>
        <Pill tone="info">Read-only · API mode</Pill>
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
              Select a class and section to view attendance registers from the API.
            </p>
          </div>
        </Card>
      ) : registersView.items.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-5" />}
          title="No registers"
          hint={registersHint ?? "No attendance saved for this date."}
        />
      ) : (
        <Card>
          <CardHeader
            title="Attendance register"
            hint={`${registersView.items.length} slot${registersView.items.length === 1 ? "" : "s"} · read-only`}
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
                      <Pill
                        tone={
                          mark.status === "present"
                            ? "success"
                            : mark.status === "absent"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {mark.status}
                      </Pill>
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
