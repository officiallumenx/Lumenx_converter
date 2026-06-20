import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Kpi, Pill, Button, Modal, Field, TextInput, Select } from "@lumenx/ui-admin";
import { Plus } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/exams")({
  head: () => ({ meta: [{ title: "Exams — LumenX Admin" }] }),
  component: ExamsPage,
});

type ExamStatus = "scheduled" | "in-progress" | "grading" | "published";

type Exam = {
  id: string;
  name: string;
  grade: string;
  date: string;
  status: ExamStatus;
  progress: number;
  subjects: string[];
};

const INITIAL: Exam[] = [
  { id: "EX-1", name: "Mid-term Examination", grade: "All Grades", date: "Week 2 · 6 days", status: "scheduled", progress: 0, subjects: ["All"] },
  { id: "EX-2", name: "Unit Test 3", grade: "Grade 10–12", date: "This week", status: "in-progress", progress: 64, subjects: ["Mathematics", "Physics"] },
  { id: "EX-3", name: "Pre-board Mock", grade: "Grade 12", date: "Last week", status: "grading", progress: 82, subjects: ["All core"] },
  { id: "EX-4", name: "Term 1 Final", grade: "All Grades", date: "Completed", status: "published", progress: 100, subjects: ["All"] },
];

const EXAM_TIMETABLE = [
  { label: "Reporting time", time: "08:00", room: "Main hall" },
  { label: "Paper distribution", time: "08:30", room: "Exam halls" },
  { label: "Writing session", time: "09:00 – 12:00", room: "Assigned rooms" },
  { label: "Collection", time: "12:15", room: "Invigilator desk" },
];

function ExamsPage() {
  const [exams, setExams] = useState(INITIAL);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGrade, setNewGrade] = useState("Grade 10");
  const [newDate, setNewDate] = useState("");
  const [newSubjects, setNewSubjects] = useState("");

  const scheduleExam = () => {
    if (!newName.trim()) return;
    setExams((p) => [...p, {
      id: `EX-${Date.now()}`, name: newName.trim(), grade: newGrade, date: newDate || "TBD",
      status: "scheduled", progress: 0, subjects: newSubjects.split(",").map((s) => s.trim()).filter(Boolean),
    }]);
    setNewName(""); setNewDate(""); setOpen(false);
  };

  const upcoming = exams.filter((e) => e.status === "scheduled" || e.status === "in-progress").length;
  const grading = exams.filter((e) => e.status === "grading").length;
  const published = exams.filter((e) => e.status === "published").length;

  return (
    <AppShell title="Exams" subtitle="Schedule exams, timetables, and grading pipeline · marks in Marks module"
      actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus className="size-3.5" /> Schedule Exam</Button>}
    >
      <div className="lx-kpi-grid">
        <Kpi label="Upcoming" value={String(upcoming)} delta="Next 30 days" />
        <Kpi label="Pending grading" value={String(grading)} tone="down" />
        <Kpi label="Avg score" value="78.4%" delta="+3.2%" tone="up" />
        <Kpi label="Published" value={String(published)} delta="This term" />
      </div>

      <Card className="mt-6">
        <CardHeader title="Examination Pipeline" action={<Link to="/marks"><Button>Go to Marks</Button></Link>} />
        <div className="px-5 pb-5 divide-y divide-border">
          {exams.map((e) => (
            <div key={e.id} className="py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium">{e.name}</div>
                  {e.status === "scheduled" && <Pill tone="info">Scheduled</Pill>}
                  {e.status === "in-progress" && <Pill tone="warning">In progress</Pill>}
                  {e.status === "grading" && <Pill tone="warning">Grading</Pill>}
                  {e.status === "published" && <Pill tone="success">Published</Pill>}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">{e.grade} · {e.date}</div>
              </div>
              <div className="w-48 hidden md:block">
                <div className="h-1.5 rounded bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${e.progress}%` }} />
                </div>
                <div className="text-[10px] text-muted-foreground font-mono mt-1 text-right">{e.progress}%</div>
              </div>
              <Button size="sm">View</Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Exam timetable template" hint="Custom row labels · editable by admin" />
        <div className="px-5 pb-5 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-3 font-semibold">Stage</th>
                <th className="py-3 font-semibold">Time</th>
                <th className="py-3 font-semibold">Location</th>
                <th className="py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {EXAM_TIMETABLE.map((row) => (
                <tr key={row.label}>
                  <td className="py-3 font-medium">{row.label}</td>
                  <td className="py-3 font-mono">{row.time}</td>
                  <td className="py-3">{row.room}</td>
                  <td className="py-3"><Button size="sm">Edit</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Schedule exam" size="lg"
        footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={scheduleExam}>Schedule</Button></>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Exam name" required><TextInput value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Unit Test 4" /></Field>
          <Field label="Classes"><Select value={newGrade} onChange={(e) => setNewGrade(e.target.value)}><option>Grade 9</option><option>Grade 10</option><option>Grade 11</option><option>Grade 12</option><option>All Grades</option></Select></Field>
          <Field label="Start date"><TextInput type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} /></Field>
          <Field label="Subjects" hint="Comma separated"><TextInput value={newSubjects} onChange={(e) => setNewSubjects(e.target.value)} placeholder="Mathematics, Physics" /></Field>
        </div>
      </Modal>
    </AppShell>
  );
}
