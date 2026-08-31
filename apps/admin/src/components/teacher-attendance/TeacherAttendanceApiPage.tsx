import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  CascadingFiltersMenu,
  DataTable,
  Kpi,
  Modal,
  PageStack,
  Pill,
  SearchInput,
  SegmentedControl,
  Select,
  Td,
  Th,
  Tr,
} from "@lumenx/ui-admin";
import {
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  History,
  Lock,
  Pencil,
  Send,
  UserCheck,
  UserX,
} from "lucide-react";
import { useAdminToast } from "@/components/AdminActionToast";
import { DEPARTMENTS, statusMeta } from "@/lib/teacher-attendance-data";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import { listTeachers, teacherDtosToListItems, type TeacherListItem } from "@/lib/teachers";
import {
  canEditSubmittedStaffAttendanceDay,
  loadStaffAttendanceDay,
  loadStaffAttendanceSubmittedRange,
  mergeTeachersIntoDaySummary,
  reopenStaffAttendanceDay,
  resolveStaffAttendanceDayView,
  shouldCommitStaffAttendanceLoad,
  staffAttendanceEditWindowRemainingMs,
  STAFF_ATTENDANCE_REOPEN_WINDOW_HOURS,
  submitStaffAttendanceDay,
  upsertStaffAttendanceDay,
  type StaffAttendanceDaySummary,
  type StaffAttendanceHistoryDay,
  type StaffAttendanceLoadStatus,
  type StaffAttendanceMarkItem,
  type StaffAttendanceOverviewRow,
  type StaffAttendanceStatus,
} from "@/lib/staff-attendance";

type PageTab = "mark" | "overview" | "history";

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
  if (status === "empty") return "No submitted attendance in this range yet.";
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

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatEditRemaining(ms: number) {
  if (ms <= 0) return "0m";
  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
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

  const [tab, setTab] = useState<PageTab>("mark");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState("");
  const [overviewSearch, setOverviewSearch] = useState("");
  const [overviewDept, setOverviewDept] = useState("all");
  const [summary, setSummary] = useState<StaffAttendanceDaySummary | null>(null);
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [draftMarks, setDraftMarks] = useState<StaffAttendanceMarkItem[]>([]);
  const [loadStatus, setLoadStatus] = useState<StaffAttendanceLoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const [resolvedDate, setResolvedDate] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [rangeReloadKey, setRangeReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [overview, setOverview] = useState<StaffAttendanceOverviewRow[]>([]);
  const [history, setHistory] = useState<StaffAttendanceHistoryDay[]>([]);
  const [rangeStatus, setRangeStatus] = useState<StaffAttendanceLoadStatus>("loading");
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [selectedOverview, setSelectedOverview] = useState<StaffAttendanceOverviewRow | null>(null);
  const [historyDay, setHistoryDay] = useState<StaffAttendanceHistoryDay | null>(null);

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
  const rangeHint = loadHint(rangeStatus, rangeError);

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
          submittedAt: null,
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

  useEffect(() => {
    if (tab === "mark") return;
    if (instituteCtx.status !== "ready" || !instituteCtx.activeInstituteId) {
      setOverview([]);
      setHistory([]);
      setRangeStatus("needs_institute");
      setRangeError(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setRangeStatus("loading");
    setRangeError(null);
    void loadStaffAttendanceSubmittedRange(requestInstituteId).then((next) => {
      if (cancelled || activeInstituteIdRef.current !== requestInstituteId) return;
      setOverview(next.overview);
      setHistory(next.history);
      setRangeStatus(next.status);
      setRangeError(next.errorMessage);
    });
    return () => {
      cancelled = true;
    };
  }, [instituteCtx.status, instituteCtx.activeInstituteId, tab, rangeReloadKey, reloadKey]);

  const displaySummary = useMemo(() => {
    if (!dayView.rowsValid) return null;
    if (draftMarks.length === 0) return dayView.summary;
    return {
      ...(dayView.summary ?? {
        date,
        dayStatus: "draft" as const,
        submittedAt: null,
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

  const overviewList = useMemo(() => {
    const q = overviewSearch.trim().toLowerCase();
    return overview.filter((row) => {
      if (overviewDept !== "all" && row.dept !== overviewDept) return false;
      if (q && !row.name.toLowerCase().includes(q) && !row.id.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [overview, overviewDept, overviewSearch]);

  const overviewKpis = useMemo(() => {
    if (!overview.length) return { avgPct: 0, leaves: 0, absents: 0, lates: 0 };
    const avgPct = Math.round(
      overview.reduce((sum, row) => sum + row.attendancePct, 0) / overview.length,
    );
    return {
      avgPct,
      leaves: overview.reduce((sum, row) => sum + row.leave, 0),
      absents: overview.reduce((sum, row) => sum + row.absent, 0),
      lates: overview.reduce((sum, row) => sum + row.late + row.half, 0),
    };
  }, [overview]);

  const dayLocked = displaySummary?.dayStatus === "submitted";
  const submittedAt = displaySummary?.submittedAt ?? null;
  const canEditSubmitted =
    dayLocked && canEditSubmittedStaffAttendanceDay(submittedAt);
  const canEdit = writesEnabled && !dayLocked && dayView.rowsValid;

  const setMarkStatus = (teacherId: string, status: StaffAttendanceStatus) => {
    if (!canEdit) return;
    setDraftMarks((prev) =>
      prev.map((mark) => (mark.teacherId === teacherId ? { ...mark, status } : mark)),
    );
  };

  const markAllPresent = () => {
    if (!canEdit) return;
    setDraftMarks((prev) =>
      prev.map((mark) =>
        mark.status === "leave" ? mark : { ...mark, status: "present" as const },
      ),
    );
    notify("Marked everyone present (leave unchanged)");
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
        setRangeReloadKey((k) => k + 1);
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
        setSubmitOpen(false);
        setReloadKey((k) => k + 1);
        setRangeReloadKey((k) => k + 1);
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
        setRangeReloadKey((k) => k + 1);
        notify("Teacher attendance reopened");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to reopen attendance");
      })
      .finally(() => setSaving(false));
  };

  const openHistoryDay = (day: StaffAttendanceHistoryDay) => {
    setHistoryDay(day);
  };

  const editFromHistory = (dayDate: string) => {
    const day = history.find((entry) => entry.date === dayDate);
    if (!canEditSubmittedStaffAttendanceDay(day?.submittedAt)) {
      notify(
        `Edit window closed — changes allowed only within ${STAFF_ATTENDANCE_REOPEN_WINDOW_HOURS} hours of submit`,
      );
      return;
    }
    void reopenStaffAttendanceDay({
      instituteId: instituteCtx.activeInstituteId!,
      date: dayDate,
    })
      .then(() => {
        setDate(dayDate);
        setHistoryDay(null);
        setTab("mark");
        setReloadKey((k) => k + 1);
        setRangeReloadKey((k) => k + 1);
        notify(`Opened ${formatDisplayDate(dayDate)} for editing`);
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to reopen attendance");
      });
  };

  return (
    <PageStack>
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          value={tab}
          onChange={(value) => {
            setTab(value as PageTab);
            setHistoryDay(null);
            setSelectedOverview(null);
          }}
          options={[
            { value: "mark", label: "Mark day" },
            { value: "overview", label: "Overview" },
            { value: "history", label: "History" },
          ]}
        />
        <Pill tone="neutral">
          {writesEnabled ? "API mode · mark / submit / reopen" : "Read-only · API mode"}
        </Pill>
        {teachers.length > 0 ? (
          <span className="text-xs text-muted-foreground">{teachers.length} teachers</span>
        ) : null}
      </div>

      {tab === "overview" ? (
        <>
          <div className="lx-kpi-grid">
            <Kpi label="Avg attendance" value={`${overviewKpis.avgPct}%`} />
            <Kpi label="Late / half" value={String(overviewKpis.lates)} icon={<Clock className="size-3.5" />} />
            <Kpi label="Leave" value={String(overviewKpis.leaves)} />
            <Kpi label="Absent" value={String(overviewKpis.absent)} tone="down" icon={<UserX className="size-3.5" />} />
          </div>
          <OverviewPanel
            list={overviewList}
            search={overviewSearch}
            onSearch={setOverviewSearch}
            dept={overviewDept}
            onDept={setOverviewDept}
            onSelectTeacher={setSelectedOverview}
            hint={rangeHint}
            loading={rangeStatus === "loading"}
          />
        </>
      ) : null}

      {tab === "history" ? (
        historyDay ? (
          <HistoryDayDetail
            day={historyDay}
            onBack={() => setHistoryDay(null)}
            onEdit={() => editFromHistory(historyDay.date)}
          />
        ) : (
          <HistoryPanel
            history={history}
            hint={rangeHint}
            loading={rangeStatus === "loading"}
            onOpen={(dayDate) => {
              const day = history.find((entry) => entry.date === dayDate);
              if (day) openHistoryDay(day);
            }}
          />
        )
      ) : null}

      {tab === "mark" ? (
        <>
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
                      <Button size="sm" variant="outline" onClick={markAllPresent} disabled={saving}>
                        <UserCheck className="size-3.5" /> All present
                      </Button>
                      <Button size="sm" variant="outline" onClick={saveDay} disabled={saving}>
                        {saving ? "Saving…" : "Save draft"}
                      </Button>
                      <Button size="sm" variant="primary" onClick={() => setSubmitOpen(true)} disabled={saving}>
                        <ClipboardCheck className="size-3.5" /> Submit day
                      </Button>
                    </>
                  ) : null}
                  {writesEnabled && dayView.rowsValid && dayLocked && canEditSubmitted ? (
                    <Button size="sm" variant="outline" onClick={reopenDay} disabled={saving}>
                      <Pencil className="size-3.5" /> Reopen
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
            ) : dayLocked ? (
              <SubmittedDayView
                marks={filteredMarks}
                submittedAt={submittedAt}
                canEdit={canEditSubmitted}
                onEdit={reopenDay}
              />
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
        </>
      ) : null}

      <Modal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title="Submit this day’s attendance?"
        subtitle={
          displaySummary
            ? `${formatDisplayDate(date)} · ${displaySummary.present} present · ${displaySummary.absent} absent · ${displaySummary.leave} leave`
            : undefined
        }
        footer={
          <>
            <Button onClick={() => setSubmitOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={submitDay} disabled={saving}>
              <Send className="size-3.5" /> Submit
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          After submit you can edit for {STAFF_ATTENDANCE_REOPEN_WINDOW_HOURS} hours. After that the
          day is locked permanently.
        </p>
      </Modal>

      <Modal
        open={!!selectedOverview}
        onClose={() => setSelectedOverview(null)}
        title={selectedOverview?.name ?? "Teacher"}
        subtitle={
          selectedOverview
            ? `${selectedOverview.dept} · ${selectedOverview.attendancePct}% attendance · ${selectedOverview.days} days`
            : undefined
        }
        footer={<Button onClick={() => setSelectedOverview(null)}>Close</Button>}
      >
        {selectedOverview ? <OverviewExceptionDetail teacher={selectedOverview} /> : null}
      </Modal>
    </PageStack>
  );
}

function OverviewPanel({
  list,
  search,
  onSearch,
  dept,
  onDept,
  onSelectTeacher,
  hint,
  loading,
}: {
  list: StaffAttendanceOverviewRow[];
  search: string;
  onSearch: (value: string) => void;
  dept: string;
  onDept: (value: string) => void;
  onSelectTeacher: (row: StaffAttendanceOverviewRow) => void;
  hint: string | null;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader
        title="Teacher overview"
        hint="One row per teacher — tap a row for leave, absent, late & half-day dates"
      />
      <div className="flex flex-wrap items-end gap-2 border-b border-border px-4 pb-3 sm:px-5">
        <CascadingFiltersMenu
          groups={[
            {
              id: "department",
              label: "Department",
              value: dept,
              onChange: onDept,
              options: [
                { value: "all", label: "All" },
                ...DEPARTMENTS.map((d) => ({ value: d, label: d })),
              ],
            },
          ]}
        />
        <div className="min-w-[12rem] flex-1 sm:max-w-xs">
          <SearchInput
            placeholder="Search name or ID…"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            className="max-w-full"
            fieldSize="compact"
          />
        </div>
      </div>

      {loading ? (
        <div className="px-5 py-12 text-center text-sm text-muted-foreground">Loading overview…</div>
      ) : list.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-muted-foreground">
          {hint ?? "No teachers match. Submit daily attendance to build the overview."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left">
            <thead>
              <tr className="border-b border-border bg-background/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold sm:px-5">Teacher</th>
                <th className="px-3 py-3 text-right font-semibold">%</th>
                <th className="px-3 py-3 text-right font-semibold">Late</th>
                <th className="px-3 py-3 text-right font-semibold">Half</th>
                <th className="px-3 py-3 text-right font-semibold">Leave</th>
                <th className="px-3 py-3 text-right font-semibold">Absent</th>
                <th className="w-8 px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((row) => (
                <tr key={row.id} className="hover:bg-surface-hover/60">
                  <td className="px-4 py-2.5 sm:px-5">
                    <button type="button" onClick={() => onSelectTeacher(row)} className="block w-full min-w-0 text-left">
                      <div className="truncate text-sm font-medium text-foreground">{row.name}</div>
                      <div className="text-[11px] text-muted-foreground">{row.dept}</div>
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectTeacher(row)}
                      className={`font-mono text-sm font-semibold tabular-nums ${
                        row.attendancePct >= 90
                          ? "text-success"
                          : row.attendancePct >= 80
                            ? "text-warning"
                            : "text-destructive"
                      }`}
                    >
                      {row.attendancePct}%
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-sm tabular-nums text-muted-foreground">
                    {row.late}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-sm tabular-nums text-muted-foreground">
                    {row.half}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-sm tabular-nums text-muted-foreground">
                    {row.leave}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-sm tabular-nums text-muted-foreground">
                    {row.absent}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => onSelectTeacher(row)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                      aria-label={`Open ${row.name} exceptions`}
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function OverviewExceptionDetail({ teacher }: { teacher: StaffAttendanceOverviewRow }) {
  const groups = [
    { key: "leave" as const, label: "Leave", items: teacher.exceptions.filter((e) => e.status === "leave") },
    { key: "absent" as const, label: "Absent", items: teacher.exceptions.filter((e) => e.status === "absent") },
    { key: "late" as const, label: "Late", items: teacher.exceptions.filter((e) => e.status === "late") },
    {
      key: "half-day" as const,
      label: "Half day",
      items: teacher.exceptions.filter((e) => e.status === "half-day"),
    },
  ];

  if (teacher.exceptions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No leaves, absents, lates, or half days on submitted days.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Showing exception dates only (presents are hidden) · {teacher.exceptions.length} days
      </p>
      {groups.map((group) =>
        group.items.length === 0 ? null : (
          <div key={group.key}>
            <div className="mb-2 flex items-center gap-2">
              <Pill tone={statusMeta(group.key).tone}>
                {group.label} · {group.items.length}
              </Pill>
            </div>
            <ul className="space-y-1.5">
              {group.items.map((item) => (
                <li
                  key={`${item.date}-${item.status}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2"
                >
                  <span className="text-sm font-medium">{formatDisplayDate(item.date)}</span>
                  {item.note ? (
                    <span className="truncate text-[11px] text-muted-foreground">{item.note}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ),
      )}
    </div>
  );
}

function HistoryPanel({
  history,
  onOpen,
  hint,
  loading,
}: {
  history: StaffAttendanceHistoryDay[];
  onOpen: (date: string) => void;
  hint: string | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Loading submitted days…
      </Card>
    );
  }

  if (!history.length) {
    return (
      <Card className="p-8 text-center">
        <History className="mx-auto size-8 text-muted-foreground opacity-50" />
        <p className="mt-3 text-sm font-medium">No submitted days yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {hint ?? "Mark attendance and submit to see records here."}
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Submitted days"
        hint={`Edit available for ${STAFF_ATTENDANCE_REOPEN_WINDOW_HOURS} hours after submit`}
      />
      <ul className="divide-y divide-border">
        {history.map((day) => (
          <li key={day.date}>
            <button
              type="button"
              onClick={() => onOpen(day.date)}
              className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-surface-hover"
            >
              <div>
                <p className="text-sm font-medium">{formatDisplayDate(day.date)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {day.present} present · {day.absent} absent · {day.leave} leave
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone="success">Submitted</Pill>
                <Lock className="size-3.5 text-muted-foreground" />
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function HistoryDayDetail({
  day,
  onBack,
  onEdit,
}: {
  day: StaffAttendanceHistoryDay;
  onBack: () => void;
  onEdit: () => void;
}) {
  const canEdit = canEditSubmittedStaffAttendanceDay(day.submittedAt);
  const remaining = formatEditRemaining(staffAttendanceEditWindowRemainingMs(day.submittedAt));

  return (
    <Card>
      <CardHeader
        title={formatDisplayDate(day.date)}
        hint={
          day.submittedAt
            ? `Submitted ${formatDateTime(day.submittedAt)}`
            : "Submitted register"
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={canEdit ? "success" : "neutral"}>
              {canEdit ? "Editable" : "Locked"}
            </Pill>
            <Button size="sm" variant="outline" onClick={onBack}>
              Back
            </Button>
            {canEdit ? (
              <Button size="sm" variant="primary" onClick={onEdit}>
                <Pencil className="size-3.5" /> Edit attendance
              </Button>
            ) : null}
          </div>
        }
      />
      <div className="border-b border-border bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground sm:px-5">
        {day.present} present · {day.late} late · {day.halfDay} half day · {day.leave} leave ·{" "}
        {day.absent} absent
        {canEdit
          ? ` · edit for ${remaining}`
          : ` · edit closed after ${STAFF_ATTENDANCE_REOPEN_WINDOW_HOURS} hours`}
      </div>
      <ul className="divide-y divide-border">
        {day.marks.map((mark) => (
          <li
            key={mark.teacherId}
            className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{mark.teacherName}</div>
            </div>
            <Pill tone={statusMeta(mark.status).tone}>{statusMeta(mark.status).label}</Pill>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function SubmittedDayView({
  marks,
  submittedAt,
  canEdit,
  onEdit,
}: {
  marks: StaffAttendanceMarkItem[];
  submittedAt: string | null;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const present = marks.filter((mark) => mark.status === "present").length;
  const late = marks.filter((mark) => mark.status === "late").length;
  const half = marks.filter((mark) => mark.status === "half-day").length;
  const leave = marks.filter((mark) => mark.status === "leave").length;
  const absent = marks.filter((mark) => mark.status === "absent").length;
  const remaining = formatEditRemaining(staffAttendanceEditWindowRemainingMs(submittedAt));

  return (
    <div>
      <div
        className={`mx-4 mt-4 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 sm:mx-5 ${
          canEdit ? "border-success/30 bg-success/5" : "border-border bg-muted/20"
        }`}
      >
        {canEdit ? (
          <CheckCircle2 className="size-5 shrink-0 text-success" />
        ) : (
          <Lock className="size-5 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {canEdit ? "Attendance submitted" : "Attendance locked"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {present} present · {late} late · {half} half day · {leave} leave · {absent} absent
            {canEdit
              ? ` · edit for ${remaining}`
              : ` · edit closed after ${STAFF_ATTENDANCE_REOPEN_WINDOW_HOURS} hours`}
          </p>
        </div>
        {canEdit ? (
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="size-3.5" /> Edit attendance
          </Button>
        ) : null}
      </div>
      <ul className="mt-2 divide-y divide-border">
        {marks.map((mark) => (
          <li
            key={mark.teacherId}
            className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{mark.teacherName}</div>
            </div>
            <Pill tone={statusMeta(mark.status).tone}>{statusMeta(mark.status).label}</Pill>
          </li>
        ))}
      </ul>
    </div>
  );
}
