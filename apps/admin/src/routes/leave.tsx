import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Pill,
  KpiGrid,
  Kpi,
  PageStack,
  SegmentedControl,
  SearchInput,
  DataTable,
  Th,
  Td,
  Tr,
  Modal,
  PageToolbar,
  ToolbarMeta,
  Field,
  TextArea,
} from "@lumenx/ui-admin";
import {
  getInitialStudentLeave,
  getInitialTeacherLeave,
  leaveMonthlyTrends,
  leaveSummary,
  type LeaveKind,
  type LeaveStatus,
  type StudentLeave,
  type TeacherLeave,
} from "@/lib/leave-data";
import { useAdminToast } from "@/components/AdminActionToast";
import { loadTeacherLeaveSnapshot, saveLeaveDecision, saveTeacherLeaveSnapshot } from "@lumenx/utils";
import { notifyTeacherLeaveDecision } from "@lumenx/notifications";
import { Ban, Check, FileDown, History, Info, X } from "lucide-react";
import { ADMIN_MODULE_LABELS as M, adminPageTitle } from "@/lib/admin-module-labels";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/leave")({
  head: () => ({ meta: [{ title: adminPageTitle("/leave") }] }),
  component: LeavePage,
});

type StatusFilter = LeaveStatus | "all";

function statusPill(status: LeaveStatus) {
  if (status === "pending") return <Pill tone="warning">Pending</Pill>;
  if (status === "approved") return <Pill tone="success">Accepted</Pill>;
  if (status === "rejected") return <Pill tone="danger">Rejected</Pill>;
  if (status === "ignored") return <Pill tone="neutral">Ignored</Pill>;
  return <Pill tone="neutral">Cancelled</Pill>;
}

type DecisionAction = "approved" | "ignored" | "rejected";

function LeavePage() {
  const notify = useAdminToast();
  const [kind, setKind] = useState<LeaveKind>("teacher");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [studentRows] = useState(getInitialStudentLeave);
  const [teacherRows, setTeacherRows] = useState(() =>
    loadTeacherLeaveSnapshot(getInitialTeacherLeave()),
  );
  const [q, setQ] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [decision, setDecision] = useState<{
    row: TeacherLeave;
    action: DecisionAction;
  } | null>(null);
  const [note, setNote] = useState("");

  const summary = useMemo(
    () => leaveSummary(studentRows, teacherRows),
    [studentRows, teacherRows],
  );
  const trends = useMemo(
    () => leaveMonthlyTrends(studentRows, teacherRows),
    [studentRows, teacherRows],
  );

  const filteredStudents = useMemo(() => {
    return studentRows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return `${r.name} ${r.class} ${r.reason}`.toLowerCase().includes(q.toLowerCase());
    });
  }, [studentRows, q, statusFilter]);

  const filteredTeachers = useMemo(() => {
    return teacherRows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return `${r.name} ${r.dept} ${r.type} ${r.reason ?? ""} ${r.adminNote ?? ""}`
        .toLowerCase()
        .includes(q.toLowerCase());
    });
  }, [teacherRows, q, statusFilter]);

  const activeList = kind === "student" ? filteredStudents : filteredTeachers;
  const historyRows = useMemo(
    () =>
      teacherRows
        .filter((r) => r.status !== "pending")
        .sort((a, b) => b.applied.localeCompare(a.applied)),
    [teacherRows],
  );

  const openDecision = (row: TeacherLeave, action: DecisionAction) => {
    if (action === "approved") {
      // Accept immediately — no note required
      const decidedAt = new Date().toISOString().slice(0, 10);
      setTeacherRows((prev) => {
        const next = prev.map((r) =>
          r.id === row.id
            ? { ...r, status: "approved" as const, adminNote: "Accepted.", decidedAt }
            : r,
        );
        saveTeacherLeaveSnapshot(next);
        return next;
      });
      saveLeaveDecision(row.id, { status: "approved", note: "Accepted.", decidedAt });
      try {
        notifyTeacherLeaveDecision({
          leaveId: row.id,
          dateRange: row.from !== row.to ? `${row.from} – ${row.to}` : row.from,
          decision: "approved",
          reason: "Accepted.",
        });
      } catch {
        /* best-effort */
      }
      notify("Leave accepted");
      return;
    }
    setDecision({ row, action });
    setNote("");
  };

  const confirmDecision = () => {
    if (!decision || decision.action === "approved") return;
    const decidedAt = new Date().toISOString().slice(0, 10);
    const trimmed = note.trim();
    const status = decision.action === "rejected" ? "rejected" : "ignored";
    setTeacherRows((prev) => {
      const next = prev.map((r) =>
        r.id === decision.row.id
          ? {
              ...r,
              status,
              adminNote: trimmed || undefined,
              decidedAt,
            }
          : r,
      );
      saveTeacherLeaveSnapshot(next);
      return next;
    });
    saveLeaveDecision(decision.row.id, {
      status,
      note: trimmed || undefined,
      decidedAt,
    });
    try {
      notifyTeacherLeaveDecision({
        leaveId: decision.row.id,
        dateRange:
          decision.row.from !== decision.row.to
            ? `${decision.row.from} – ${decision.row.to}`
            : decision.row.from,
        decision: status,
        reason: trimmed,
      });
    } catch {
      /* best-effort */
    }
    if (status === "rejected") {
      notify(trimmed ? "Leave rejected with note" : "Leave rejected");
    } else {
      notify(trimmed ? "Leave ignored with note" : "Leave ignored");
    }
    setDecision(null);
    setNote("");
  };

  return (
    <AppShell
      title={M.leave}
      subtitle="Student leave: Parent apply → Class Teacher approve · Teacher leave: Teacher apply → Admin Approve / Reject / Ignore"
      actions={
        <>
          <Button size="sm" onClick={() => setHistoryOpen(true)}>
            <History className="size-3.5" /> Leave history
          </Button>
          <Link to="/reports">
            <Button variant="primary" size="sm">
              <FileDown className="size-3.5" /> Leave reports
            </Button>
          </Link>
        </>
      }
    >
      <PageStack>
        <KpiGrid cols={4}>
          <Kpi
            label="Teacher pending"
            value={String(summary.pending)}
            tone={summary.pending ? "down" : "neutral"}
          />
          <Kpi label="Accepted" value={String(summary.approved)} tone="up" />
          <Kpi label="Ignored" value={String(summary.ignored)} />
          <Kpi label="Accept rate" value={`${summary.approvalRate}%`} delta="Teacher leave" />
        </KpiGrid>

        <Card>
          <div className="mx-5 mt-4 mb-1 flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
            <Info className="size-3.5 mt-0.5 shrink-0 text-primary" />
            <p>
              <span className="font-medium text-foreground">Student leave</span> is accepted or
              ignored by class teachers in <span className="font-medium text-foreground">Connect</span>
              . Admin only manages <span className="font-medium text-foreground">teacher leave</span>{" "}
              here — Accept or Ignore.
            </p>
          </div>

          <PageToolbar>
            <SegmentedControl
              value={kind}
              onChange={setKind}
              options={[
                { value: "teacher", label: "Teacher leave" },
                { value: "student", label: "Student leave (view)" },
              ]}
            />
            <SegmentedControl
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All" },
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Accepted" },
                { value: "rejected", label: "Rejected" },
                { value: "ignored", label: "Ignored" },
              ]}
            />
            <SearchInput
              placeholder={`Search ${kind}…`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="flex-1 min-w-[180px] max-w-sm"
            />
            <ToolbarMeta>{activeList.length} results</ToolbarMeta>
          </PageToolbar>

          {kind === "student" ? (
            <DataTable>
              <thead>
                <tr>
                  <Th>Student</Th>
                  <Th>Class</Th>
                  <Th>Dates</Th>
                  <Th>Days</Th>
                  <Th>Reason</Th>
                  <Th>Status</Th>
                  <Th>Teacher note</Th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((r) => (
                  <StudentRow key={r.id} row={r} />
                ))}
              </tbody>
            </DataTable>
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <Th>Teacher</Th>
                  <Th>Department</Th>
                  <Th>Type</Th>
                  <Th>Dates</Th>
                  <Th>Days</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((r) => (
                  <TeacherRow key={r.id} row={r} onDecide={openDecision} />
                ))}
              </tbody>
            </DataTable>
          )}

          {activeList.length === 0 && (
            <CardBody>
              <p className="text-sm text-muted-foreground text-center py-8">
                No leave requests match your filters.
              </p>
            </CardBody>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Monthly trends" hint="Student (Connect) vs teacher (Admin)" />
            <CardBody>
              <div className="h-36 flex items-end gap-2">
                {trends.map((t) => {
                  const max = Math.max(...trends.map((x) => x.student + x.teacher), 1);
                  const total = t.student + t.teacher;
                  return (
                    <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex flex-col justify-end h-28 gap-0.5">
                        <div
                          className="w-full bg-primary/70 rounded-t-sm"
                          style={{
                            height: `${(t.teacher / max) * 100}%`,
                            minHeight: t.teacher ? 4 : 0,
                          }}
                          title={`Teacher: ${t.teacher}`}
                        />
                        <div
                          className="w-full bg-chart-2/80 rounded-t-sm"
                          style={{
                            height: `${(t.student / max) * 100}%`,
                            minHeight: t.student ? 4 : 0,
                          }}
                          title={`Student: ${t.student}`}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground">{t.month}</span>
                      <span className="text-[9px] text-muted-foreground">{total}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-4 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-sm bg-chart-2/80" /> Student (Connect)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-sm bg-primary/70" /> Teacher (Admin)
                </span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Leave analytics" hint="Teacher leave queue" />
            <CardBody>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { l: "Teacher requests", v: teacherRows.length },
                  { l: "Pending now", v: summary.pending },
                  {
                    l: "Student pending (Connect)",
                    v: summary.studentPendingInConnect,
                  },
                  { l: "Ignored", v: summary.ignored },
                ].map((s) => (
                  <div key={s.l} className="p-3 rounded-lg border border-border lx-inset-panel">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {s.l}
                    </div>
                    <div className="text-xl font-semibold mt-1 font-mono">{s.v}</div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </PageStack>

      <Modal
        open={Boolean(decision)}
        onClose={() => {
          setDecision(null);
          setNote("");
        }}
        title={decision?.action === "rejected" ? "Reject leave" : "Ignore leave"}
        subtitle={
          decision
            ? `${decision.row.name} · ${decision.row.from} → ${decision.row.to}`
            : undefined
        }
        size="md"
        footer={
          <>
            <Button
              onClick={() => {
                setDecision(null);
                setNote("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant={decision?.action === "rejected" ? "primary" : undefined}
              className={
                decision?.action === "rejected"
                  ? "!bg-destructive !text-destructive-foreground !border-destructive/40"
                  : undefined
              }
              onClick={confirmDecision}
            >
              {decision?.action === "rejected"
                ? `Reject${note.trim() ? " with note" : ""}`
                : `Ignore${note.trim() ? " with note" : ""}`}
            </Button>
          </>
        }
      >
        {decision ? (
          <div className="space-y-3">
            {decision.row.reason ? (
              <p className="text-xs text-muted-foreground rounded-lg bg-muted/40 px-3 py-2">
                Reason: {decision.row.reason}
              </p>
            ) : null}
            <Field
              label="Description"
              hint="Optional — you can decide without a message, or type one if you want"
            >
              <TextArea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note for the teacher, or leave blank…"
                autoFocus
              />
            </Field>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Teacher leave history"
        subtitle="Accepted, rejected, and ignored requests"
        size="lg"
        footer={<Button onClick={() => setHistoryOpen(false)}>Close</Button>}
      >
        <DataTable className="max-h-[min(420px,55vh)]">
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>Teacher</Th>
              <Th>Applied</Th>
              <Th>Status</Th>
              <Th>Admin note</Th>
            </tr>
          </thead>
          <tbody>
            {historyRows.map((r) => (
              <Tr key={r.id}>
                <Td mono>{r.id}</Td>
                <Td>{r.name}</Td>
                <Td mono>{r.applied}</Td>
                <Td>{statusPill(r.status)}</Td>
                <Td className="max-w-[220px] text-muted-foreground text-[11px]">
                  {r.adminNote ?? "—"}
                </Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
      </Modal>
    </AppShell>
  );
}

function StudentRow({ row }: { row: StudentLeave }) {
  return (
    <Tr>
      <Td>
        <div className="font-medium">{row.name}</div>
        {(row.status === "rejected" || row.status === "ignored") && row.teacherNote ? (
          <p className="mt-1 text-[11px] text-muted-foreground rounded-md bg-muted/40 px-2 py-1 max-w-xs">
            {row.teacherNote}
          </p>
        ) : null}
      </Td>
      <Td>{row.class}</Td>
      <Td mono>
        {row.from} → {row.to}
      </Td>
      <Td mono>{row.days}</Td>
      <Td className="max-w-[160px] truncate text-muted-foreground">{row.reason}</Td>
      <Td>{statusPill(row.status)}</Td>
      <Td className="text-[11px] text-muted-foreground max-w-[180px]">
        {row.teacherNote && row.status !== "rejected" && row.status !== "ignored"
          ? row.teacherNote
          : row.status === "pending"
            ? "Awaiting teacher in Connect"
            : "—"}
      </Td>
    </Tr>
  );
}

function TeacherRow({
  row,
  onDecide,
}: {
  row: TeacherLeave;
  onDecide: (row: TeacherLeave, action: DecisionAction) => void;
}) {
  return (
    <Tr>
      <Td>
        <div className="font-medium">{row.name}</div>
        {row.reason ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">{row.reason}</p>
        ) : null}
        {row.status === "ignored" && row.adminNote ? (
          <p className="mt-1.5 text-[11px] text-foreground/90 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 max-w-sm">
            <span className="font-medium text-muted-foreground">Ignored · </span>
            {row.adminNote}
          </p>
        ) : null}
        {row.status === "rejected" && row.adminNote ? (
          <p className="mt-1.5 text-[11px] text-foreground/90 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 max-w-sm">
            <span className="font-medium text-muted-foreground">Rejected · </span>
            {row.adminNote}
          </p>
        ) : null}
        {row.status === "approved" && row.adminNote ? (
          <p className="mt-1 text-[11px] text-muted-foreground max-w-sm">{row.adminNote}</p>
        ) : null}
      </Td>
      <Td>{row.dept}</Td>
      <Td>{row.type}</Td>
      <Td mono>
        {row.from} → {row.to}
      </Td>
      <Td mono>{row.days}</Td>
      <Td>{statusPill(row.status)}</Td>
      <Td align="right">
        {row.status === "pending" ? (
          <div className="inline-flex flex-nowrap items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant="primary"
              className="!h-8 !w-8 !min-h-8 !px-0"
              onClick={() => onDecide(row, "approved")}
              aria-label="Accept"
              title="Accept"
            >
              <Check className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="!h-8 !w-8 !min-h-8 !px-0"
              onClick={() => onDecide(row, "rejected")}
              aria-label="Reject"
              title="Reject"
            >
              <Ban className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="primary"
              className="!h-8 !w-8 !min-h-8 !px-0 !bg-destructive !text-destructive-foreground !border-destructive/40 hover:!brightness-110"
              onClick={() => onDecide(row, "ignored")}
              aria-label="Ignore"
              title="Ignore"
            >
              <X className="size-4" strokeWidth={2.5} />
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground text-[10px]">—</span>
        )}
      </Td>
    </Tr>
  );
}
