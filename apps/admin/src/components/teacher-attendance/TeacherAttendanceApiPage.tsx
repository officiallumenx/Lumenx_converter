import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  CascadingFiltersMenu,
  DataTable,
  Kpi,
  PageStack,
  Pill,
  SearchInput,
  Select,
  Td,
  Th,
  Tr,
} from "@lumenx/ui-admin";
import { CheckCircle2, Clock, UserX } from "lucide-react";
import { useAdminToast } from "@/components/AdminActionToast";
import { statusMeta } from "@/lib/teacher-attendance-data";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import { listTeachers, teacherDtosToListItems, type TeacherListItem } from "@/lib/teachers";
import {
  loadStaffAttendanceDay,
  mergeTeachersIntoDaySummary,
  reopenStaffAttendanceDay,
  resolveStaffAttendanceDayView,
  shouldCommitStaffAttendanceLoad,
  submitStaffAttendanceDay,
  upsertStaffAttendanceDay,
  type StaffAttendanceDaySummary,
  type StaffAttendanceLoadStatus,
  type StaffAttendanceMarkItem,
  type StaffAttendanceStatus,
} from "@/lib/staff-attendance";

const STATUS_OPTIONS: StaffAttendanceStatus[] = [
  "present",
  "late",
  "absent",
  "leave",
  "half-day",
];

function loadHint(status: StaffAttendanceLoadStatus, errorMessage: string | null): string | null {
  if (status === "loading") return "Loading teacher attendance…";
  if (status === "needs_institute") return "Select an institute to load teacher attendance.";
  if (status === "forbidden") {
    return errorMessage ?? "You do not have access to teacher attendance for this institute.";
  }
  if (status === "error") return errorMessage ?? "Failed to load teacher attendance.";
  if (status === "empty") return "No teacher attendance marks for this date.";
  return null;
}

function formatDisplayDate(iso: string) {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function TeacherAttendanceApiPage() {
  const notify = useAdminToast();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState("");
  const [summary, setSummary] = useState<StaffAttendanceDaySummary | null>(null);
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [draftMarks, setDraftMarks] = useState<StaffAttendanceMarkItem[]>([]);
  const [loadStatus, setLoadStatus] = useState<StaffAttendanceLoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const [resolvedDate, setResolvedDate] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const dayView = resolveStaffAttendanceDayView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    requestDate: date,
    resolvedDate,
    storedSummary: summary,
    storedStatus: loadStatus,
    storedErrorMessage: loadError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const hint = loadHint(dayView.status, dayView.errorMessage);

  useEffect(() => {
    if (instituteCtx.status !== "ready" || !instituteCtx.activeInstituteId) {
      setSummary(null);
      setTeachers([]);
      setDraftMarks([]);
      setLoadStatus("needs_institute");
      setLoadError(null);
      setResolvedForInstituteId(null);
      setResolvedDate(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setLoadStatus("loading");
    setLoadError(null);
    void Promise.all([
      loadStaffAttendanceDay(requestInstituteId, date),
      listTeachers({ instituteId: requestInstituteId }).then(teacherDtosToListItems),
    ]).then(([next, teacherRows]) => {
      if (
        !shouldCommitStaffAttendanceLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
          requestDate: date,
          activeDate: date,
        })
      ) {
        return;
      }
      setTeachers(teacherRows);
      const base =
        next.summary ??
        ({
          date,
          dayStatus: "draft",
          total: 0,
          present: 0,
          late: 0,
          absent: 0,
          leave: 0,
          halfDay: 0,
          marks: [],
        } satisfies StaffAttendanceDaySummary);
      const merged = mergeTeachersIntoDaySummary(base, teacherRows);
      setSummary(merged);
      setDraftMarks(merged.marks);
      setLoadStatus(
        next.status === "error" || next.status === "forbidden"
          ? next.status
          : teacherRows.length === 0 && merged.marks.length === 0
            ? "empty"
            : "ready",
      );
      setLoadError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
      setResolvedDate(date);
    });
    return () => {
      cancelled = true;
    };
  }, [instituteCtx.status, instituteCtx.activeInstituteId, date, reloadKey]);

  const displaySummary = useMemo(() => {
    if (!dayView.rowsValid) return null;
    if (draftMarks.length === 0) return dayView.summary;
    return {
      ...(dayView.summary ?? {
        date,
        dayStatus: "draft" as const,
        total: 0,
        present: 0,
        late: 0,
        absent: 0,
        leave: 0,
        halfDay: 0,
        marks: [],
      }),
      total: draftMarks.length,
      present: draftMarks.filter((m) => m.status === "present").length,
      late: draftMarks.filter((m) => m.status === "late").length,
      absent: draftMarks.filter((m) => m.status === "absent").length,
      leave: draftMarks.filter((m) => m.status === "leave").length,
      halfDay: draftMarks.filter((m) => m.status === "half-day").length,
      marks: draftMarks,
    };
  }, [dayView.rowsValid, dayView.summary, draftMarks, date]);

  const filteredMarks = useMemo(() => {
    if (!displaySummary) return [];
    const q = search.trim().toLowerCase();
    if (!q) return displaySummary.marks;
    return displaySummary.marks.filter((mark) =>
      `${mark.teacherName} ${mark.teacherId}`.toLowerCase().includes(q),
    );
  }, [displaySummary, search]);

  const dayLocked = displaySummary?.dayStatus === "submitted";
  const canEdit = writesEnabled && !dayLocked && dayView.rowsValid;

  const setMarkStatus = (teacherId: string, status: StaffAttendanceStatus) => {
    if (!canEdit) return;
    setDraftMarks((prev) =>
      prev.map((mark) => (mark.teacherId === teacherId ? { ...mark, status } : mark)),
    );
  };

  const saveDay = () => {
    if (!canEdit || !instituteCtx.activeInstituteId || draftMarks.length === 0) return;
    setSaving(true);
    void upsertStaffAttendanceDay({
      instituteId: instituteCtx.activeInstituteId,
      date,
      marks: draftMarks.map((mark) => ({
        teacherId: mark.teacherId,
        status: mark.status,
        checkIn: mark.checkIn,
        checkOut: mark.checkOut,
        note: mark.note,
      })),
    })
      .then(() => {
        setReloadKey((k) => k + 1);
        notify("Teacher attendance saved");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to save attendance");
      })
      .finally(() => setSaving(false));
  };

  const submitDay = () => {
    if (!writesEnabled || !instituteCtx.activeInstituteId) return;
    setSaving(true);
    const instituteId = instituteCtx.activeInstituteId;
    const run = async () => {
      if (!dayLocked && draftMarks.length > 0) {
        await upsertStaffAttendanceDay({
          instituteId,
          date,
          marks: draftMarks.map((mark) => ({
            teacherId: mark.teacherId,
            status: mark.status,
            checkIn: mark.checkIn,
            checkOut: mark.checkOut,
            note: mark.note,
          })),
        });
      }
      await submitStaffAttendanceDay({ instituteId, date });
    };
    void run()
      .then(() => {
        setReloadKey((k) => k + 1);
        notify("Teacher attendance submitted");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to submit attendance");
      })
      .finally(() => setSaving(false));
  };

  const reopenDay = () => {
    if (!writesEnabled || !instituteCtx.activeInstituteId) return;
    setSaving(true);
    void reopenStaffAttendanceDay({
      instituteId: instituteCtx.activeInstituteId,
      date,
    })
      .then(() => {
        setReloadKey((k) => k + 1);
        notify("Teacher attendance reopened");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to reopen attendance");
      })
      .finally(() => setSaving(false));
  };

  return (
    <PageStack>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="neutral">
          {writesEnabled
            ? "API mode · mark / submit / reopen"
            : "Read-only · API mode"}
        </Pill>
        {teachers.length > 0 ? (
          <span className="text-xs text-muted-foreground">{teachers.length} teachers</span>
        ) : null}
      </div>

      {displaySummary ? (
        <div className="lx-kpi-grid">
          <Kpi label="Present" value={String(displaySummary.present)} tone="up" icon={<CheckCircle2 className="size-3.5" />} />
          <Kpi label="Late" value={String(displaySummary.late)} icon={<Clock className="size-3.5" />} />
          <Kpi label="Absent" value={String(displaySummary.absent)} tone="down" icon={<UserX className="size-3.5" />} />
          <Kpi label="Leave / half" value={String(displaySummary.leave + displaySummary.halfDay)} />
        </div>
      ) : null}

      <Card>
        <CardHeader
          title={formatDisplayDate(date)}
          hint={
            displaySummary
              ? `${displaySummary.total} teachers · ${displaySummary.dayStatus}`
              : hint ?? "Teacher attendance"
          }
          action={
            <div className="flex flex-wrap items-center gap-2">
              {displaySummary ? (
                <Pill tone={displaySummary.dayStatus === "submitted" ? "success" : "warning"}>
                  {displaySummary.dayStatus}
                </Pill>
              ) : null}
              {writesEnabled && dayView.rowsValid && !dayLocked ? (
                <>
                  <Button size="sm" variant="outline" onClick={saveDay} disabled={saving}>
                    {saving ? "Saving…" : "Save draft"}
                  </Button>
                  <Button size="sm" variant="primary" onClick={submitDay} disabled={saving}>
                    Submit day
                  </Button>
                </>
              ) : null}
              {writesEnabled && dayView.rowsValid && dayLocked ? (
                <Button size="sm" variant="outline" onClick={reopenDay} disabled={saving}>
                  Reopen
                </Button>
              ) : null}
            </div>
          }
        />

        <div className="flex flex-wrap items-end gap-2 border-b border-border px-4 pb-3 sm:px-5">
          <CascadingFiltersMenu
            groups={[
              {
                id: "date",
                label: "Date",
                kind: "date",
                value: date,
                clearValues: [date],
                onChange: setDate,
              },
            ]}
          />
          <div className="min-w-[12rem] flex-1 sm:max-w-xs">
            <SearchInput
              placeholder="Search teacher…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="max-w-full"
              fieldSize="compact"
            />
          </div>
        </div>

        {!dayView.rowsValid ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground sm:px-5">
            {hint ?? "Loading…"}
          </div>
        ) : filteredMarks.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground sm:px-5">
            {hint ?? "No teachers found for this institute."}
          </div>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Teacher</Th>
                <Th>Status</Th>
                <Th>Check in</Th>
                <Th>Note</Th>
              </tr>
            </thead>
            <tbody>
              {filteredMarks.map((mark) => (
                <Tr key={mark.teacherId}>
                  <Td>
                    <div className="font-medium">{mark.teacherName}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {mark.teacherId.slice(0, 8)}…
                    </div>
                  </Td>
                  <Td>
                    {canEdit ? (
                      <Select
                        value={mark.status}
                        onChange={(e) =>
                          setMarkStatus(
                            mark.teacherId,
                            e.target.value as StaffAttendanceStatus,
                          )
                        }
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {statusMeta(status).label}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Pill tone={statusMeta(mark.status).tone}>
                        {statusMeta(mark.status).label}
                      </Pill>
                    )}
                  </Td>
                  <Td className="font-mono text-xs">{mark.checkIn ?? "—"}</Td>
                  <Td className="text-xs text-muted-foreground">{mark.note?.trim() || "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>
    </PageStack>
  );
}
