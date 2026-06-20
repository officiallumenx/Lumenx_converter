import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Button, Pill, Kpi } from "@lumenx/ui-admin";
import { LEAVE_STUDENT, LEAVE_TEACHER } from "@/lib/admin-module-data";
import { Check, X, History, Search } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/leave")({
  head: () => ({ meta: [{ title: "Leave — LumenX Admin" }] }),
  component: LeavePage,
});

type Kind = "student" | "teacher";

function LeavePage() {
  const [kind, setKind] = useState<Kind>("student");
  const [studentRows, setStudentRows] = useState(LEAVE_STUDENT);
  const [teacherRows, setTeacherRows] = useState(LEAVE_TEACHER);
  const [q, setQ] = useState("");

  const pendingStudent = studentRows.filter((r) => r.status === "pending").length;
  const pendingTeacher = teacherRows.filter((r) => r.status === "pending").length;
  const approvedToday = useMemo(() =>
    studentRows.filter((r) => r.status === "approved").length + teacherRows.filter((r) => r.status === "approved").length,
  [studentRows, teacherRows]);

  const approveStudent = (id: string) =>
    setStudentRows((p) => p.map((r) => (r.id === id ? { ...r, status: "approved" as const } : r)));
  const rejectStudent = (id: string) =>
    setStudentRows((p) => p.map((r) => (r.id === id ? { ...r, status: "rejected" as const } : r)));
  const approveTeacher = (id: string) =>
    setTeacherRows((p) => p.map((r) => (r.id === id ? { ...r, status: "approved" as const } : r)));
  const rejectTeacher = (id: string) =>
    setTeacherRows((p) => p.map((r) => (r.id === id ? { ...r, status: "rejected" as const } : r)));

  const filteredStudents = useMemo(() => {
    if (!q) return studentRows;
    return studentRows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));
  }, [studentRows, q]);

  const filteredTeachers = useMemo(() => {
    if (!q) return teacherRows;
    return teacherRows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));
  }, [teacherRows, q]);

  const activeList = kind === "student" ? filteredStudents : filteredTeachers;

  return (
    <AppShell
      title="Leave Center"
      subtitle="Final approval hub · student & teacher requests from Connect"
      actions={<Button><History className="size-3.5" /> Full history</Button>}
    >
      <div className="lx-kpi-grid">
        <Kpi label="Student pending" value={String(pendingStudent)} tone={pendingStudent ? "down" : "neutral"} />
        <Kpi label="Teacher pending" value={String(pendingTeacher)} tone={pendingTeacher ? "down" : "neutral"} />
        <Kpi label="Approved" value={String(approvedToday)} tone="up" />
        <Kpi label="Total requests" value={String(studentRows.length + teacherRows.length)} delta="All time" />
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-6 mb-4">
        <div className="flex gap-1 p-1 w-fit bg-background rounded-md border border-border">
          {(["student", "teacher"] as const).map((k) => (
            <button
              key={k}
              onClick={() => { setKind(k); setQ(""); }}
              className={`px-4 h-8 rounded text-[11px] font-medium capitalize transition-colors ${
                kind === k ? "bg-surface text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {k} leave
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${kind} name…`}
            className="w-full h-9 pl-9 pr-3 rounded-md bg-background border border-border text-xs focus:outline-none focus:border-primary/40" />
        </div>
        <div className="text-xs text-muted-foreground font-mono">{activeList.length} results</div>
      </div>

      {kind === "student" && (
        <Card>
          <CardHeader title="Student leave requests" hint="Class teacher may approve first · admin override here" />
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                  <th className="px-5 py-3 font-semibold">Student</th>
                  <th className="px-5 py-3 font-semibold">Class</th>
                  <th className="px-5 py-3 font-semibold">Dates</th>
                  <th className="px-5 py-3 font-semibold">Reason</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-hover">
                    <td className="px-5 py-3 text-xs font-medium">{r.name}</td>
                    <td className="px-5 py-3 text-xs">{r.class}</td>
                    <td className="px-5 py-3 text-xs font-mono">{r.from} → {r.to}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{r.reason}</td>
                    <td className="px-5 py-3">
                      {r.status === "pending" && <Pill tone="warning">Pending</Pill>}
                      {r.status === "approved" && <Pill tone="success">Approved</Pill>}
                      {r.status === "rejected" && <Pill tone="danger">Rejected</Pill>}
                    </td>
                    <td className="px-5 py-3">
                      {r.status === "pending" && (
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="primary" onClick={() => approveStudent(r.id)}><Check className="size-3" /></Button>
                          <Button size="sm" variant="danger" onClick={() => rejectStudent(r.id)}><X className="size-3" /></Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Showing 1–{filteredStudents.length} of {filteredStudents.length}</span>
            <div className="flex gap-1">
              <Button size="sm" disabled>Previous</Button>
              <Button size="sm" disabled>Next</Button>
            </div>
          </div>
        </Card>
      )}

      {kind === "teacher" && (
        <Card>
          <CardHeader title="Teacher leave requests" hint="Submitted via Connect · principal / admin approval" />
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                  <th className="px-5 py-3 font-semibold">Teacher</th>
                  <th className="px-5 py-3 font-semibold">Department</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Dates</th>
                  <th className="px-5 py-3 font-semibold">To</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTeachers.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-hover">
                    <td className="px-5 py-3 text-xs font-medium">{r.name}</td>
                    <td className="px-5 py-3 text-xs">{r.dept}</td>
                    <td className="px-5 py-3 text-xs">{r.type}</td>
                    <td className="px-5 py-3 text-xs font-mono">{r.from} → {r.to}</td>
                    <td className="px-5 py-3 text-xs">{r.toRole}</td>
                    <td className="px-5 py-3">
                      {r.status === "pending" && <Pill tone="warning">Pending</Pill>}
                      {r.status === "approved" && <Pill tone="success">Approved</Pill>}
                      {r.status === "rejected" && <Pill tone="danger">Rejected</Pill>}
                    </td>
                    <td className="px-5 py-3">
                      {r.status === "pending" && (
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="primary" onClick={() => approveTeacher(r.id)}><Check className="size-3" /></Button>
                          <Button size="sm" variant="danger" onClick={() => rejectTeacher(r.id)}><X className="size-3" /></Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Showing 1–{filteredTeachers.length} of {filteredTeachers.length}</span>
            <div className="flex gap-1">
              <Button size="sm" disabled>Previous</Button>
              <Button size="sm" disabled>Next</Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader title="Leave analytics" hint="Institute-wide · last 30 days" />
        <div className="px-5 pb-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {[
            { l: "Student requests", v: String(studentRows.length) },
            { l: "Teacher requests", v: String(teacherRows.length) },
            { l: "Approval rate", v: `${Math.round(((studentRows.filter((r) => r.status === "approved").length + teacherRows.filter((r) => r.status === "approved").length) / (studentRows.length + teacherRows.length)) * 100)}%` },
            { l: "Pending", v: String(pendingStudent + pendingTeacher) },
          ].map((s) => (
            <div key={s.l} className="p-4 rounded-lg border border-border bg-background/40">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
              <div className="text-xl font-semibold mt-1">{s.v}</div>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
