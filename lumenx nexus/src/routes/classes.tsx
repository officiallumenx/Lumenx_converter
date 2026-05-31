import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, Button, Pill } from "@/components/ui-kit";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/classes")({
  head: () => ({ meta: [{ title: "Classes — Luminexa Admin" }] }),
  component: ClassesPage,
});

const classes = [
  { name: "Grade 12-A", teacher: "Sarah Jenkins", students: 38, capacity: 40, room: "201" },
  { name: "Grade 12-B", teacher: "David Koal", students: 36, capacity: 40, room: "202" },
  { name: "Grade 11-A", teacher: "Priya Iyer", students: 41, capacity: 42, room: "301" },
  { name: "Grade 11-C", teacher: "Marcus Whitfield", students: 36, capacity: 42, room: "303" },
  { name: "Grade 10-A", teacher: "Hana Suzuki", students: 44, capacity: 44, room: "401" },
  { name: "Grade 9-B", teacher: "Omar Faris", students: 39, capacity: 42, room: "501" },
];

function ClassesPage() {
  return (
    <AppShell title="Classes & Sections" subtitle="42 classes · 126 sections"
      actions={<Button variant="primary"><Plus className="size-3.5" /> New Class</Button>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((c) => {
          const fill = (c.students / c.capacity) * 100;
          return (
            <Card key={c.name} className="p-5 hover:bg-surface-hover transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-semibold">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Room {c.room}</div>
                </div>
                {fill === 100 ? <Pill tone="warning">Full</Pill> : <Pill tone="success">Open</Pill>}
              </div>
              <div className="mt-4 text-[11px] text-muted-foreground">Class teacher</div>
              <div className="text-sm font-medium mt-0.5">{c.teacher}</div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-mono">{c.students} / {c.capacity}</span>
                </div>
                <div className="h-1.5 rounded bg-muted overflow-hidden">
                  <div className={`h-full ${fill === 100 ? "bg-warning" : "bg-primary"}`} style={{ width: `${fill}%` }} />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <Button className="flex-1 justify-center">Roster</Button>
                <Button className="flex-1 justify-center">Timetable</Button>
              </div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
