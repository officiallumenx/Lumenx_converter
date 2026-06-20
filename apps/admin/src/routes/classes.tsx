import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, Button, Pill, Modal, Field, TextInput, Select } from "@lumenx/ui-admin";
import { Plus } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/classes")({
  head: () => ({ meta: [{ title: "Classes — LumenX Admin" }] }),
  component: ClassesPage,
});

export type ClassSection = {
  id: string;
  name: string;
  teacher: string;
  students: number;
  capacity: number;
  room: string;
  hasTimetable: boolean;
};

export const ADMIN_CLASSES_LIST: ClassSection[] = [
  { id: "12-A", name: "Grade 12-A", teacher: "Sarah Jenkins", students: 38, capacity: 40, room: "201", hasTimetable: true },
  { id: "12-B", name: "Grade 12-B", teacher: "David Koal", students: 36, capacity: 40, room: "202", hasTimetable: true },
  { id: "11-A", name: "Grade 11-A", teacher: "Priya Iyer", students: 41, capacity: 42, room: "301", hasTimetable: true },
  { id: "11-C", name: "Grade 11-C", teacher: "Marcus Whitfield", students: 36, capacity: 42, room: "303", hasTimetable: false },
  { id: "10-A", name: "Grade 10-A", teacher: "Hana Suzuki", students: 44, capacity: 44, room: "401", hasTimetable: true },
  { id: "9-B", name: "Grade 9-B", teacher: "Omar Faris", students: 39, capacity: 42, room: "501", hasTimetable: false },
];

function ClassesPage() {
  const [classes, setClasses] = useState(ADMIN_CLASSES_LIST);
  const [open, setOpen] = useState(false);
  const [grade, setGrade] = useState("Grade 10");
  const [section, setSection] = useState("A");
  const [room, setRoom] = useState("");
  const [capacity, setCapacity] = useState("40");
  const [students, setStudents] = useState("0");
  const [teacher, setTeacher] = useState("Sarah Jenkins");

  const addClass = () => {
    const cap = Number(capacity) || 40;
    const stu = Number(students) || 0;
    const name = `${grade}-${section}`;
    setClasses((p) => [...p, {
      id: `${grade.replace("Grade ", "")}-${section}`,
      name, teacher, students: stu, capacity: cap, room: room || "TBD", hasTimetable: false,
    }]);
    setOpen(false);
    setRoom(""); setStudents("0");
  };

  return (
    <AppShell title="Classes & Sections" subtitle={`${classes.length} classes · 126 sections`}
      actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus className="size-3.5" /> New Class</Button>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((c) => {
          const fill = (c.students / c.capacity) * 100;
          return (
            <Card key={c.id} className="p-5 hover:bg-surface-hover transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-semibold">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Room {c.room}</div>
                </div>
                {fill >= 100 ? <Pill tone="warning">Full</Pill> : <Pill tone="success">Open</Pill>}
              </div>
              <div className="mt-4 text-[11px] text-muted-foreground">Class teacher</div>
              <div className="text-sm font-medium mt-0.5">{c.teacher}</div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-mono">{c.students} / {c.capacity}</span>
                </div>
                <div className="h-1.5 rounded bg-muted overflow-hidden">
                  <div className={`h-full ${fill >= 100 ? "bg-warning" : "bg-primary"}`} style={{ width: `${Math.min(fill, 100)}%` }} />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <Button className="flex-1 justify-center">Roster</Button>
                <Link
                  to="/timetable"
                  search={{
                    grade: c.name.replace(/-[A-C]$/, ""),
                    section: c.name.split("-").pop() ?? "A",
                  }}
                  className="flex-1"
                >
                  <Button className="w-full justify-center">Timetable</Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New class section" size="lg"
        footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={addClass}>Create</Button></>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Grade" required><Select value={grade} onChange={(e) => setGrade(e.target.value)}><option>Grade 9</option><option>Grade 10</option><option>Grade 11</option><option>Grade 12</option></Select></Field>
          <Field label="Section" required><Select value={section} onChange={(e) => setSection(e.target.value)}><option>A</option><option>B</option><option>C</option></Select></Field>
          <Field label="Room"><TextInput value={room} onChange={(e) => setRoom(e.target.value)} placeholder="401" /></Field>
          <Field label="Class teacher"><Select value={teacher} onChange={(e) => setTeacher(e.target.value)}><option>Sarah Jenkins</option><option>David Koal</option><option>Priya Iyer</option><option>Hana Suzuki</option></Select></Field>
          <Field label="Classroom capacity" required><TextInput type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} /></Field>
          <Field label="Current students"><TextInput type="number" value={students} onChange={(e) => setStudents(e.target.value)} /></Field>
        </div>
      </Modal>
    </AppShell>
  );
}
