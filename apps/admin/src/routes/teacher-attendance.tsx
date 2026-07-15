import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
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
  Select,
  PageStack,
} from "@lumenx/ui-admin";
import {
  DEPARTMENTS,
  defaultCheckIn,
  statusMeta,
  type TeacherAttStatus,
  type TeacherAttendanceRecord,
} from "@/lib/teacher-attendance-data";
import {
  loadOrCreateRegister,
  listSubmittedTeacherRegisters,
  registerSummary,
  reopenTeacherRegisterAsDraft,
  saveTeacherRegisterDraft,
  submitTeacherRegister,
  type RegisterStatus,
  type TeacherDayRegister,
} from "@/lib/teacher-attendance-store";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  ClipboardCheck,
  History,
  Lock,
  RotateCcw,
  Save,
  Send,
  UserCheck,
  UserX,
} from "lucide-react";

export const Route = createFileRoute("/teacher-attendance")({
  head: () => ({ meta: [{ title: "Teacher Attendance — LumenX Admin" }] }),
  component: TeacherAttendancePage,
});

type PageTab = "mark" | "history";

const QUICK_STATUS: {
  value: TeacherAttStatus;
  abbr: string;
  label: string;
  active: string;
}[] = [
  { value: "present", abbr: "P", label: "Present", active: "bg-success/20 text-success" },
  { value: "late", abbr: "Lt", label: "Late", active: "bg-warning/20 text-warning" },
  { value: "half-day", abbr: "½", label: "Half day", active: "bg-warning/15 text-warning" },
  { value: "leave", abbr: "Lv", label: "On leave", active: "bg-primary/15 text-primary" },
  { value: "absent", abbr: "Ab", label: "Absent", active: "bg-destructive/20 text-destructive" },
];

function TeacherAttendancePage() {
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
  const [submitOpen, setSubmitOpen] = useState(false);
  const [history, setHistory] = useState<TeacherDayRegister[]>([]);

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

  useEffect(() => {
    loadDay(date);
  }, [date, loadDay]);

  useEffect(() => {
    setHistory(listSubmittedTeacherRegisters());
  }, [registerStatus, date, tab]);

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
  };

  const saveDraft = () => {
    if (isSubmitted) return;
    const reg = saveTeacherRegisterDraft(date, rows);
    setMeta({ updatedAt: reg.updatedAt });
    notify("Draft saved — you can submit when ready");
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
    setHistory(listSubmittedTeacherRegisters());
    notify("Attendance submitted for " + formatDisplayDate(date));
  };

  const reopenDraft = () => {
    const reg = reopenTeacherRegisterAsDraft(date);
    if (!reg) return;
    setRegisterStatus("draft");
    setMeta({ updatedAt: reg.updatedAt });
    notify("Reopened as draft — edit and submit again");
  };

  const openHistoryDay = (day: string) => {
    setDate(day);
    setTab("mark");
    loadDay(day);
  };

  return (
    <AppShell
      title="Teacher Attendance"
      subtitle="Mark the day, save draft, then submit — same flow as class attendance"
      actions={
        isDraft ? (
          <Button variant="outline" onClick={markAllPresent}>
            <UserCheck className="size-3.5" /> All present
          </Button>
        ) : null
      }
    >
      <PageStack>
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

        <SegmentedControl<PageTab>
          value={tab}
          onChange={setTab}
          options={[
            { value: "mark", label: "Take attendance" },
            { value: "history", label: "Submitted days" },
          ]}
        />

        {tab === "history" ? (
          <HistoryPanel history={history} onOpen={openHistoryDay} />
        ) : (
          <Card>
            <CardHeader
              title={formatDisplayDate(date)}
              hint={
                isSubmitted
                  ? `Submitted ${formatDateTime(meta.submittedAt)} · ${meta.submittedBy ?? "Admin"}`
                  : `Draft · last updated ${formatDateTime(meta.updatedAt)}`
              }
              action={
                <Pill tone={isSubmitted ? "success" : "warning"} pulse={isDraft}>
                  {isSubmitted ? "Submitted" : "Draft"}
                </Pill>
              }
            />

            <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end border-b border-border">
              <label className="block">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Date
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1.5 w-full h-9 px-3 rounded-md bg-background border border-border text-xs"
                />
              </label>
              {!isSubmitted && (
                <>
                  <label className="block">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      Department
                    </span>
                    <Select
                      value={deptFilter}
                      onChange={(e) => setDeptFilter(e.target.value)}
                      className="mt-1.5 w-full h-9 text-xs"
                    >
                      <option value="all">All</option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      Search
                    </span>
                    <SearchInput
                      className="mt-1.5"
                      placeholder="Name or ID"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                </>
              )}
            </div>

            {isSubmitted ? (
              <SubmittedView rows={rows} onReopen={reopenDraft} />
            ) : (
              <>
                <RegisterTable list={list} editable onStatus={setStatus} />
                <ActionBar onSaveDraft={saveDraft} onSubmit={() => setSubmitOpen(true)} />
              </>
            )}
          </Card>
        )}
      </PageStack>

      <Modal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title="Submit teacher attendance?"
        subtitle={`${formatDisplayDate(date)} · ${stats.present} present · ${stats.absent} absent · ${stats.onLeave} on leave`}
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
          After submit, this day is locked and shown as a read-only record. You can reopen it as a
          draft from the submitted view if you need to correct it.
        </p>
      </Modal>
    </AppShell>
  );
}

function SubmittedView({
  rows,
  onReopen,
}: {
  rows: TeacherAttendanceRecord[];
  onReopen: () => void;
}) {
  const stats = registerSummary(rows);

  return (
    <div>
      <div className="mx-5 mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-success/30 bg-success/5 px-4 py-3">
        <CheckCircle2 className="size-5 text-success shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Attendance submitted for this day</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {stats.present} present · {stats.late} late · {stats.half} half day · {stats.onLeave}{" "}
            leave · {stats.absent} absent
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onReopen}>
          <RotateCcw className="size-3.5" /> Reopen draft
        </Button>
      </div>
      <RegisterTable list={rows} editable={false} />
    </div>
  );
}

function RegisterTable({
  list,
  editable,
  onStatus,
}: {
  list: TeacherAttendanceRecord[];
  editable: boolean;
  onStatus?: (id: string, status: TeacherAttStatus) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed text-left">
        <colgroup>
          <col className="w-[34%]" />
          <col className="w-[20%]" />
          <col className={editable ? "w-[36%]" : "w-[28%]"} />
          <col className="w-[10%]" />
        </colgroup>
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border bg-background/50">
            <th className="px-5 py-3 font-semibold">Teacher</th>
            <th className="px-5 py-3 font-semibold">Department</th>
            <th className="px-5 py-3 font-semibold">{editable ? "Mark" : "Status"}</th>
            <th className="px-5 py-3 font-semibold text-right">In</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {list.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">
                No teachers match.
              </td>
            </tr>
          ) : (
            list.map((row) => (
              <tr key={row.id} className="hover:bg-surface-hover/60">
                <td className="px-5 py-2.5">
                  <div className="text-sm font-medium truncate">{row.name}</div>
                  <div className="text-[11px] font-mono text-muted-foreground">{row.id}</div>
                </td>
                <td className="px-5 py-2.5 text-sm text-muted-foreground truncate">{row.dept}</td>
                <td className="px-5 py-2.5">
                  {editable && onStatus ? (
                    <QuickStatusButtons
                      value={row.status}
                      name={row.name}
                      onChange={(s) => onStatus(row.id, s)}
                    />
                  ) : (
                    <Pill tone={statusMeta(row.status).tone}>{statusMeta(row.status).label}</Pill>
                  )}
                </td>
                <td className="px-5 py-2.5 text-right text-xs font-mono text-muted-foreground tabular-nums">
                  {row.checkIn ?? "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function QuickStatusButtons({
  value,
  name,
  onChange,
}: {
  value: TeacherAttStatus;
  name: string;
  onChange: (s: TeacherAttStatus) => void;
}) {
  return (
    <div
      className="inline-flex rounded-md border border-border overflow-hidden bg-background"
      role="group"
      aria-label={`Mark ${name}`}
    >
      {QUICK_STATUS.map((opt, i) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            title={opt.label}
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`w-9 h-8 text-[10px] font-semibold transition-colors ${i > 0 ? "border-l border-border" : ""} ${
              active
                ? opt.active
                : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            {opt.abbr}
          </button>
        );
      })}
    </div>
  );
}

function ActionBar({ onSaveDraft, onSubmit }: { onSaveDraft: () => void; onSubmit: () => void }) {
  return (
    <div className="sticky bottom-0 border-t border-border bg-surface px-5 py-3 flex flex-col sm:flex-row gap-2">
      <Button variant="outline" className="sm:flex-1 justify-center" onClick={onSaveDraft}>
        <Save className="size-3.5" /> Save draft
      </Button>
      <Button variant="primary" className="sm:flex-1 justify-center" onClick={onSubmit}>
        <ClipboardCheck className="size-3.5" /> Submit attendance
      </Button>
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
        <History className="size-8 mx-auto text-muted-foreground opacity-50" />
        <p className="mt-3 text-sm font-medium">No submitted days yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Mark attendance and submit to see records here.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Submitted registers" hint="Tap a day to view the locked record" />
      <ul className="divide-y divide-border">
        {history.map((reg) => {
          const s = registerSummary(reg.teachers);
          return (
            <li key={reg.date}>
              <button
                type="button"
                onClick={() => onOpen(reg.date)}
                className="w-full px-5 py-4 flex flex-wrap items-center justify-between gap-3 text-left hover:bg-surface-hover transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{formatDisplayDate(reg.date)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.present} present · {s.absent} absent · {s.onLeave} leave
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone="success">Submitted</Pill>
                  <Lock className="size-3.5 text-muted-foreground" />
                </div>
              </button>
            </li>
          );
        })}
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
