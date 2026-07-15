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
import {
  Ban,
  Check,
  FileDown,
  History,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/leave")({
  head: () => ({ meta: [{ title: "Leave Center — LumenX Admin" }] }),
  component: LeavePage,
});

type StatusFilter = LeaveStatus | "all";

function statusPill(status: LeaveStatus) {
  if (status === "pending") return <Pill tone="warning">Pending</Pill>;
  if (status === "approved") return <Pill tone="success">Approved</Pill>;
  if (status === "rejected") return <Pill tone="danger">Rejected</Pill>;
  return <Pill tone="neutral">Cancelled</Pill>;
}

function LeavePage() {
  const [kind, setKind] = useState<LeaveKind>("student");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [studentRows, setStudentRows] = useState(getInitialStudentLeave);
  const [teacherRows, setTeacherRows] = useState(getInitialTeacherLeave);
  const [q, setQ] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const summary = useMemo(
    () => leaveSummary(studentRows, teacherRows),
    [studentRows, teacherRows],
  );
  const trends = useMemo(
    () => leaveMonthlyTrends(studentRows, teacherRows),
    [studentRows, teacherRows],
  );

  const patchStudent = (id: string, status: LeaveStatus) =>
    setStudentRows((p) => p.map((r) => (r.id === id ? { ...r, status } : r)));
  const patchTeacher = (id: string, status: LeaveStatus) =>
    setTeacherRows((p) => p.map((r) => (r.id === id ? { ...r, status } : r)));

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
      return `${r.name} ${r.dept} ${r.type}`.toLowerCase().includes(q.toLowerCase());
    });
  }, [teacherRows, q, statusFilter]);

  const activeList = kind === "student" ? filteredStudents : filteredTeachers;
  const historyRows = useMemo(
    () =>
      [...studentRows, ...teacherRows]
        .filter((r) => r.status !== "pending")
        .sort((a, b) => b.applied.localeCompare(a.applied)),
    [studentRows, teacherRows],
  );

  return (
    <AppShell
      title="Leave Center"
      subtitle="Student & teacher leave · approvals · history · institute analytics"
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
        <KpiGrid cols={5}>
          <Kpi
            label="Pending requests"
            value={String(summary.pending)}
            tone={summary.pending ? "down" : "neutral"}
          />
          <Kpi label="Approved" value={String(summary.approved)} tone="up" />
          <Kpi label="Rejected" value={String(summary.rejected)} tone="down" />
          <Kpi label="Cancelled" value={String(summary.cancelled)} />
          <Kpi label="Approval rate" value={`${summary.approvalRate}%`} delta="All time" />
        </KpiGrid>

        <Card>
          <PageToolbar>
            <SegmentedControl
              value={kind}
              onChange={setKind}
              options={[
                { value: "student", label: "Student leave" },
                { value: "teacher", label: "Teacher leave" },
              ]}
            />
            <SegmentedControl
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All statuses" },
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
                { value: "cancelled", label: "Cancelled" },
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
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((r) => (
                  <StudentRow key={r.id} row={r} onPatch={patchStudent} />
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
                  <Th>Approver</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((r) => (
                  <TeacherRow key={r.id} row={r} onPatch={patchTeacher} />
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
            <CardHeader title="Monthly trends" hint="Student vs teacher requests · last 6 months" />
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
                          style={{ height: `${(t.teacher / max) * 100}%`, minHeight: t.teacher ? 4 : 0 }}
                          title={`Teacher: ${t.teacher}`}
                        />
                        <div
                          className="w-full bg-chart-2/80 rounded-t-sm"
                          style={{ height: `${(t.student / max) * 100}%`, minHeight: t.student ? 4 : 0 }}
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
                  <span className="size-2 rounded-sm bg-chart-2/80" /> Student
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-sm bg-primary/70" /> Teacher
                </span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Leave analytics" hint="Institute-wide summary" />
            <CardBody>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { l: "Student requests", v: studentRows.length },
                  { l: "Teacher requests", v: teacherRows.length },
                  { l: "Pending now", v: summary.pending },
                  { l: "Avg days / request", v: "1.8" },
                ].map((s) => (
                  <div key={s.l} className="p-3 rounded-lg border border-border lx-inset-panel">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
                    <div className="text-xl font-semibold mt-1 font-mono">{s.v}</div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </PageStack>

      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Leave history"
        subtitle="Approved, rejected, and cancelled requests"
        size="lg"
        footer={<Button onClick={() => setHistoryOpen(false)}>Close</Button>}
      >
        <DataTable className="max-h-[min(420px,55vh)]">
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>Applicant</Th>
              <Th>Applied</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {historyRows.map((r) => (
              <Tr key={r.id}>
                <Td mono>{r.id}</Td>
                <Td>{"name" in r ? r.name : (r as TeacherLeave).name}</Td>
                <Td mono>{r.applied}</Td>
                <Td>{statusPill(r.status)}</Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
      </Modal>
    </AppShell>
  );
}

function StudentRow({
  row,
  onPatch,
}: {
  row: StudentLeave;
  onPatch: (id: string, s: LeaveStatus) => void;
}) {
  return (
    <Tr>
      <Td>{row.name}</Td>
      <Td>{row.class}</Td>
      <Td mono>
        {row.from} → {row.to}
      </Td>
      <Td mono>{row.days}</Td>
      <Td className="max-w-[200px] truncate text-muted-foreground">{row.reason}</Td>
      <Td>{statusPill(row.status)}</Td>
      <Td align="right">
        {row.status === "pending" ? (
          <div className="lx-table-actions">
            <Button size="sm" variant="primary" onClick={() => onPatch(row.id, "approved")} aria-label="Approve">
              <Check className="size-3.5" />
            </Button>
            <Button size="sm" variant="danger" onClick={() => onPatch(row.id, "rejected")} aria-label="Reject">
              <X className="size-3.5" />
            </Button>
            <Button size="sm" onClick={() => onPatch(row.id, "cancelled")} aria-label="Cancel">
              <Ban className="size-3.5" />
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground text-[10px]">—</span>
        )}
      </Td>
    </Tr>
  );
}

function TeacherRow({
  row,
  onPatch,
}: {
  row: TeacherLeave;
  onPatch: (id: string, s: LeaveStatus) => void;
}) {
  return (
    <Tr>
      <Td>{row.name}</Td>
      <Td>{row.dept}</Td>
      <Td>{row.type}</Td>
      <Td mono>
        {row.from} → {row.to}
      </Td>
      <Td mono>{row.days}</Td>
      <Td>{row.toRole}</Td>
      <Td>{statusPill(row.status)}</Td>
      <Td align="right">
        {row.status === "pending" ? (
          <div className="lx-table-actions">
            <Button size="sm" variant="primary" onClick={() => onPatch(row.id, "approved")} aria-label="Approve">
              <Check className="size-3.5" />
            </Button>
            <Button size="sm" variant="danger" onClick={() => onPatch(row.id, "rejected")} aria-label="Reject">
              <X className="size-3.5" />
            </Button>
            <Button size="sm" onClick={() => onPatch(row.id, "cancelled")} aria-label="Cancel">
              <Ban className="size-3.5" />
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground text-[10px]">—</span>
        )}
      </Td>
    </Tr>
  );
}
