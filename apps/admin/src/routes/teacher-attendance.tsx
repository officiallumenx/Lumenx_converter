import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { TeacherAttendanceApiPage } from "@/components/teacher-attendance/TeacherAttendanceApiPage";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  Button,
  Card,
  CardHeader,
  Kpi,
  Modal,
  Pill,
  SearchInput,
  SegmentedControl,
  PageStack,
  CascadingFiltersMenu,
  type CascadingFilterGroup,
} from "@lumenx/ui-admin";
import {
  DEPARTMENTS,
  defaultCheckIn,
  statusMeta,
  TEACHER_MARK_OPTIONS,
  type TeacherAttStatus,
  type TeacherAttendanceRecord,
} from "@/lib/teacher-attendance-data";
import {
  buildTeacherAttendanceOverview,
  canEditSubmittedRegister,
  editWindowRemainingMs,
  loadOrCreateRegister,
  listSubmittedTeacherRegisters,
  registerSummary,
  reopenTeacherRegisterAsDraft,
  saveTeacherRegisterDraft,
  submitTeacherRegister,
  TEACHER_ATTENDANCE_EDIT_WINDOW_HOURS,
  type RegisterStatus,
  type TeacherDayRegister,
  type TeacherExceptionDay,
  type TeacherOverviewRow,
} from "@/lib/teacher-attendance-store";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  ClipboardCheck,
  History,
  Lock,
  Pencil,
  Save,
  Send,
  UserCheck,
  UserX,
  X,
} from "lucide-react";

export const Route = createFileRoute("/teacher-attendance")({
  head: () => ({ meta: [{ title: "Teacher Attendance — LumenX Admin" }] }),
  component: TeacherAttendancePage,
});

type PageTab = "overview" | "mark" | "history";

function TeacherAttendancePage() {
  if (isApiAuthMode()) {
    return (
      <AppShell
        title="Teacher Attendance"
        subtitle="API mode · read-only · view staff attendance marks by date"
      >
        <TeacherAttendanceApiPage />
      </AppShell>
    );
  }

  return <TeacherAttendanceDemoPage />;
}

function TeacherAttendanceDemoPage() {
  const notify = useAdminToast();
  const [tab, setTab] = useState<PageTab>("mark");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<TeacherAttendanceRecord[]>([]);
  const [registerStatus, setRegisterStatus] = useState<RegisterStatus>("draft");
  const [meta, setMeta] = useState<
    Pick<TeacherDayRegister, "updatedAt" | "submittedAt" | "submittedBy">
  >({
    updatedAt: new Date().toISOString(),
  });
  const [deptFilter, setDeptFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [overviewSearch, setOverviewSearch] = useState("");
  const [overviewDept, setOverviewDept] = useState("all");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [history, setHistory] = useState<TeacherDayRegister[]>([]);
  const [historyDay, setHistoryDay] = useState<TeacherDayRegister | null>(null);
  const [overview, setOverview] = useState<TeacherOverviewRow[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherOverviewRow | null>(null);

  const loadDay = useCallback((day: string) => {
    const reg = loadOrCreateRegister(day);
    setRows(reg.teachers);
    setRegisterStatus(reg.status);
    setMeta({
      updatedAt: reg.updatedAt,
      submittedAt: reg.submittedAt,
      submittedBy: reg.submittedBy,
    });
  }, []);

  const refreshLists = useCallback(() => {
    setHistory(listSubmittedTeacherRegisters());
    setOverview(buildTeacherAttendanceOverview());
  }, []);

  useEffect(() => {
    loadDay(date);
  }, [date, loadDay]);

  useEffect(() => {
    refreshLists();
  }, [registerStatus, date, tab, refreshLists]);

  const isSubmitted = registerStatus === "submitted";
  const isDraft = !isSubmitted;
  const stats = useMemo(() => registerSummary(rows), [rows]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (deptFilter !== "all" && r.dept !== deptFilter) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, deptFilter, search]);

  const overviewList = useMemo(() => {
    const q = overviewSearch.trim().toLowerCase();
    return overview.filter((r) => {
      if (overviewDept !== "all" && r.dept !== overviewDept) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [overview, overviewDept, overviewSearch]);

  const overviewKpis = useMemo(() => {
    if (!overview.length) return { avgPct: 0, leaves: 0, absents: 0, lates: 0 };
    const avgPct = Math.round(
      overview.reduce((sum, r) => sum + r.attendancePct, 0) / overview.length,
    );
    return {
      avgPct,
      leaves: overview.reduce((sum, r) => sum + r.leave, 0),
      absents: overview.reduce((sum, r) => sum + r.absent, 0),
      lates: overview.reduce((sum, r) => sum + r.late + r.half, 0),
    };
  }, [overview]);

  const setStatus = (id: string, status: TeacherAttStatus) => {
    if (isSubmitted) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              checkIn: defaultCheckIn(status),
              note:
                status === "leave"
                  ? (r.note ?? "Approved")
                  : status === "absent"
                    ? undefined
                    : r.note,
            }
          : r,
      ),
    );
  };

  const markAllPresent = () => {
    if (isSubmitted) return;
    setRows((prev) =>
      prev.map((r) =>
        r.status === "leave" ? r : { ...r, status: "present" as const, checkIn: "08:20" },
      ),
    );
    notify("Marked everyone present (leave unchanged)");
  };

  const saveDraft = () => {
    if (isSubmitted) return;
    const reg = saveTeacherRegisterDraft(date, rows);
    setMeta({ updatedAt: reg.updatedAt });
    notify("Draft saved");
  };

  const confirmSubmit = () => {
    const reg = submitTeacherRegister(date, rows);
    setRegisterStatus("submitted");
    setMeta({
      updatedAt: reg.updatedAt,
      submittedAt: reg.submittedAt,
      submittedBy: reg.submittedBy,
    });
    setSubmitOpen(false);
    refreshLists();
    notify("Attendance submitted for " + formatDisplayDate(date));
  };

  const reopenDraft = () => {
    if (!canEditSubmittedRegister(meta.submittedAt)) {
      notify(`Edit window closed — changes allowed only within ${TEACHER_ATTENDANCE_EDIT_WINDOW_HOURS} hours of submit`);
      return;
    }
    const reg = reopenTeacherRegisterAsDraft(date);
    if (!reg) return;
    setRegisterStatus("draft");
    setMeta({ updatedAt: reg.updatedAt });
    notify("Reopened as draft — you can edit and submit again");
  };

  const openHistoryDay = (day: string) => {
    const reg = history.find((h) => h.date === day) ?? listSubmittedTeacherRegisters().find((h) => h.date === day);
    if (reg) setHistoryDay(reg);
  };

  const editFromHistory = (day: string) => {
    const existing =
      history.find((h) => h.date === day) ??
      listSubmittedTeacherRegisters().find((h) => h.date === day);
    if (!canEditSubmittedRegister(existing?.submittedAt)) {
      notify(`Edit window closed — changes allowed only within ${TEACHER_ATTENDANCE_EDIT_WINDOW_HOURS} hours of submit`);
      return;
    }
    const reg = reopenTeacherRegisterAsDraft(day);
    if (!reg) {
      notify("Could not open this day for editing");
      return;
    }
    setDate(day);
    setRows(reg.teachers);
    setRegisterStatus("draft");
    setMeta({ updatedAt: reg.updatedAt });
    setHistoryDay(null);
    setTab("mark");
    refreshLists();
    notify("Opened " + formatDisplayDate(day) + " for editing");
  };

  const canEditCurrent =
    isSubmitted && canEditSubmittedRegister(meta.submittedAt);

  const subtitle =
    tab === "overview"
      ? "Attendance % and exception counts per teacher"
      : tab === "history"
        ? `Submitted days — edit within ${TEACHER_ATTENDANCE_EDIT_WINDOW_HOURS} hours of submit`
        : "Tap a status for each teacher — one tap to mark";

  return (
    <AppShell
      title="Teacher Attendance"
      subtitle={subtitle}
      actions={
        tab === "mark" && isDraft ? (
          <Button variant="outline" onClick={markAllPresent}>
            <UserCheck className="size-3.5" /> Mark all present
          </Button>
        ) : null
      }
    >
      <PageStack>
        {tab === "overview" ? (
          <div className="lx-kpi-grid">
            <Kpi
              label="Avg attendance"
              value={`${overviewKpis.avgPct}%`}
              delta="Submitted days"
              tone="up"
              icon={<CheckCircle2 className="size-3.5" />}
            />
            <Kpi
              label="Late / half"
              value={String(overviewKpis.lates)}
              delta="All teachers"
              icon={<Clock className="size-3.5" />}
            />
            <Kpi
              label="Absents"
              value={String(overviewKpis.absents)}
              tone="down"
              icon={<UserX className="size-3.5" />}
            />
            <Kpi label="Leaves" value={String(overviewKpis.leaves)} />
          </div>
        ) : tab === "mark" ? (
          <div className="lx-kpi-grid">
            <Kpi
              label="Present"
              value={String(stats.present)}
              delta={`of ${stats.total}`}
              tone="up"
              icon={<CheckCircle2 className="size-3.5" />}
            />
            <Kpi
              label="Late / half"
              value={String(stats.late + stats.half)}
              delta="Today"
              icon={<Clock className="size-3.5" />}
            />
            <Kpi
              label="Absent"
              value={String(stats.absent)}
              tone="down"
              icon={<UserX className="size-3.5" />}
            />
            <Kpi label="On leave" value={String(stats.onLeave)} />
          </div>
        ) : null}

        <SegmentedControl<PageTab>
          value={tab}
          onChange={(next) => {
            setTab(next);
            if (next !== "history") setHistoryDay(null);
          }}
          options={[
            { value: "mark", label: "Mark attendance" },
            { value: "history", label: "History" },
            { value: "overview", label: "Overview" },
          ]}
        />

        {tab === "overview" ? (
          <OverviewPanel
            list={overviewList}
            search={overviewSearch}
            onSearch={setOverviewSearch}
            dept={overviewDept}
            onDept={setOverviewDept}
            onSelectTeacher={setSelectedTeacher}
          />
        ) : tab === "history" ? (
          historyDay ? (
            <HistoryDayDetail
              register={historyDay}
              onBack={() => setHistoryDay(null)}
              onEdit={() => editFromHistory(historyDay.date)}
            />
          ) : (
            <HistoryPanel history={history} onOpen={openHistoryDay} />
          )
        ) : (
          <Card>
            <CardHeader
              title={formatDisplayDate(date)}
              hint={
                isSubmitted
                  ? `Submitted ${formatDateTime(meta.submittedAt)} · ${meta.submittedBy ?? "Admin"}`
                  : `Draft · last saved ${formatDateTime(meta.updatedAt)}`
              }
              action={
                <Pill tone={isSubmitted ? "success" : "warning"} pulse={isDraft}>
                  {isSubmitted ? "Submitted" : "Draft"}
                </Pill>
              }
            />

            <div className="flex flex-wrap items-end gap-2 border-b border-border px-4 pb-3 sm:px-5">
              <CascadingFiltersMenu
                groups={
                  [
                    {
                      id: "date",
                      label: "Date",
                      kind: "date",
                      value: date,
                      clearValues: [date],
                      onChange: setDate,
                    },
                    ...(!isSubmitted
                      ? [
                          {
                            id: "department",
                            label: "Department",
                            value: deptFilter,
                            onChange: setDeptFilter,
                            options: [
                              { value: "all", label: "All" },
                              ...DEPARTMENTS.map((d) => ({ value: d, label: d })),
                            ],
                          },
                        ]
                      : []),
                  ] as CascadingFilterGroup[]
                }
              />
              {!isSubmitted ? (
                <div className="min-w-[12rem] flex-1 sm:max-w-xs">
                  <SearchInput
                    placeholder="Search name or ID…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-full"
                    fieldSize="compact"
                  />
                </div>
              ) : null}
            </div>

            {isSubmitted ? (
              <SubmittedView
                rows={rows}
                submittedAt={meta.submittedAt}
                canEdit={canEditCurrent}
                onEdit={reopenDraft}
              />
            ) : (
              <>
                <div className="border-b border-border bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground sm:px-5">
                  Tap one status for each teacher · {list.length} shown
                </div>
                <TeacherMarkList list={list} onStatus={setStatus} />
                <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:px-5">
                  <Button variant="outline" className="sm:mr-auto" onClick={markAllPresent}>
                    <UserCheck className="size-3.5" /> All present
                  </Button>
                  <Button variant="outline" onClick={saveDraft}>
                    <Save className="size-3.5" /> Save draft
                  </Button>
                  <Button variant="primary" onClick={() => setSubmitOpen(true)}>
                    <ClipboardCheck className="size-3.5" /> Submit day
                  </Button>
                </div>
              </>
            )}
          </Card>
        )}
      </PageStack>

      <Modal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title="Submit this day’s attendance?"
        subtitle={`${formatDisplayDate(date)} · ${stats.present} present · ${stats.absent} absent · ${stats.onLeave} leave`}
        footer={
          <>
            <Button onClick={() => setSubmitOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={confirmSubmit}>
              <Send className="size-3.5" /> Submit
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          After submit you can edit for {TEACHER_ATTENDANCE_EDIT_WINDOW_HOURS} hours. After that the
          day is locked permanently.
        </p>
      </Modal>

      <Modal
        open={!!selectedTeacher}
        onClose={() => setSelectedTeacher(null)}
        title={selectedTeacher?.name ?? "Teacher"}
        subtitle={
          selectedTeacher
            ? `${selectedTeacher.dept} · ${selectedTeacher.attendancePct}% attendance · ${selectedTeacher.days} days`
            : undefined
        }
        footer={
          <Button onClick={() => setSelectedTeacher(null)}>
            <X className="size-3.5" /> Close
          </Button>
        }
      >
        {selectedTeacher ? <TeacherExceptionDetail teacher={selectedTeacher} /> : null}
      </Modal>
    </AppShell>
  );
}

function OverviewPanel({
  list,
  search,
  onSearch,
  dept,
  onDept,
  onSelectTeacher,
}: {
  list: TeacherOverviewRow[];
  search: string;
  onSearch: (v: string) => void;
  dept: string;
  onDept: (v: string) => void;
  onSelectTeacher: (row: TeacherOverviewRow) => void;
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
            onChange={(e) => onSearch(e.target.value)}
            className="max-w-full"
            fieldSize="compact"
          />
        </div>
      </div>

      {list.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-muted-foreground">
          No teachers match. Submit daily attendance to build the overview.
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
                    <button
                      type="button"
                      onClick={() => onSelectTeacher(row)}
                      className="block w-full min-w-0 text-left"
                    >
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

function TeacherExceptionDetail({ teacher }: { teacher: TeacherOverviewRow }) {
  const groups: { key: TeacherExceptionDay["status"]; label: string; items: TeacherExceptionDay[] }[] =
    [
      { key: "leave", label: "Leave", items: teacher.exceptions.filter((e) => e.status === "leave") },
      {
        key: "absent",
        label: "Absent",
        items: teacher.exceptions.filter((e) => e.status === "absent"),
      },
      { key: "late", label: "Late", items: teacher.exceptions.filter((e) => e.status === "late") },
      {
        key: "half-day",
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
      {groups.map((g) =>
        g.items.length === 0 ? null : (
          <div key={g.key}>
            <div className="mb-2 flex items-center gap-2">
              <Pill tone={statusMeta(g.key).tone}>
                {g.label} · {g.items.length}
              </Pill>
            </div>
            <ul className="space-y-1.5">
              {g.items.map((item) => (
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

function TeacherMarkList({
  list,
  onStatus,
}: {
  list: TeacherAttendanceRecord[];
  onStatus: (id: string, status: TeacherAttStatus) => void;
}) {
  if (list.length === 0) {
    return (
      <div className="px-5 py-12 text-center text-sm text-muted-foreground">
        No teachers match your filters.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {list.map((row) => (
        <li key={row.id} className="px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{row.name}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {row.dept}
                {row.checkIn ? ` · in ${row.checkIn}` : ""}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Mark ${row.name}`}>
              {TEACHER_MARK_OPTIONS.map((opt) => {
                const active = row.status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onStatus(row.id, opt.value)}
                    className={`min-w-[4.5rem] rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors ${
                      active
                        ? opt.activeClass
                        : "border-border bg-background text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function SubmittedView({
  rows,
  submittedAt,
  canEdit,
  onEdit,
}: {
  rows: TeacherAttendanceRecord[];
  submittedAt?: string;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const stats = registerSummary(rows);
  const remaining = formatEditRemaining(editWindowRemainingMs(submittedAt));

  return (
    <div>
      <div
        className={`mx-4 mt-4 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 sm:mx-5 ${
          canEdit
            ? "border-success/30 bg-success/5"
            : "border-border bg-muted/20"
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
            {stats.present} present · {stats.late} late · {stats.half} half day · {stats.onLeave}{" "}
            leave · {stats.absent} absent
            {canEdit
              ? ` · edit for ${remaining}`
              : ` · edit closed after ${TEACHER_ATTENDANCE_EDIT_WINDOW_HOURS} hours`}
          </p>
        </div>
        {canEdit ? (
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="size-3.5" /> Edit attendance
          </Button>
        ) : null}
      </div>
      <ul className="mt-2 divide-y divide-border">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{row.name}</div>
              <div className="text-[11px] text-muted-foreground">{row.dept}</div>
            </div>
            <Pill tone={statusMeta(row.status).tone}>{statusMeta(row.status).label}</Pill>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HistoryPanel({
  history,
  onOpen,
}: {
  history: TeacherDayRegister[];
  onOpen: (date: string) => void;
}) {
  if (!history.length) {
    return (
      <Card className="p-8 text-center">
        <History className="mx-auto size-8 text-muted-foreground opacity-50" />
        <p className="mt-3 text-sm font-medium">No submitted days yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Mark attendance and submit to see records here.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Submitted days"
        hint={`Edit available for ${TEACHER_ATTENDANCE_EDIT_WINDOW_HOURS} hours after submit`}
      />
      <ul className="divide-y divide-border">
        {history.map((reg) => {
          const s = registerSummary(reg.teachers);
          return (
            <li key={reg.date}>
              <button
                type="button"
                onClick={() => onOpen(reg.date)}
                className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-surface-hover"
              >
                <div>
                  <p className="text-sm font-medium">{formatDisplayDate(reg.date)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {s.present} present · {s.absent} absent · {s.onLeave} leave
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone="success">Submitted</Pill>
                  <Lock className="size-3.5 text-muted-foreground" />
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function HistoryDayDetail({
  register,
  onBack,
  onEdit,
}: {
  register: TeacherDayRegister;
  onBack: () => void;
  onEdit: () => void;
}) {
  const stats = registerSummary(register.teachers);
  const canEdit = canEditSubmittedRegister(register.submittedAt);
  const remaining = formatEditRemaining(editWindowRemainingMs(register.submittedAt));

  return (
    <Card>
      <CardHeader
        title={formatDisplayDate(register.date)}
        hint={
          register.submittedAt
            ? `Submitted ${formatDateTime(register.submittedAt)} · ${register.submittedBy ?? "Admin"}`
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
        {stats.present} present · {stats.late} late · {stats.half} half day · {stats.onLeave} leave ·{" "}
        {stats.absent} absent
        {canEdit
          ? ` · edit for ${remaining}`
          : ` · edit closed after ${TEACHER_ATTENDANCE_EDIT_WINDOW_HOURS} hours`}
      </div>
      <ul className="divide-y divide-border">
        {register.teachers.map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{row.name}</div>
              <div className="text-[11px] text-muted-foreground">{row.dept}</div>
            </div>
            <Pill tone={statusMeta(row.status).tone}>{statusMeta(row.status).label}</Pill>
          </li>
        ))}
      </ul>
    </Card>
  );
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

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatEditRemaining(ms: number) {
  if (ms <= 0) return "0h";
  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
