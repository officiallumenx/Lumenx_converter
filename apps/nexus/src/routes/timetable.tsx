import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Button } from "@/components/ui-kit";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/timetable")({
  head: () => ({ meta: [{ title: "Timetable — LumenX Nexus" }] }),
  component: TimetablePage,
});

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const periods = ["P1 · 08:00", "P2 · 09:00", "P3 · 10:00", "P4 · 11:00", "BREAK", "P5 · 12:30", "P6 · 13:30", "P7 · 14:30"];

type Slot = { subject: string; teacher: string; room: string; tone: "primary" | "success" | "warning" | "info" } | null;

const grid: Slot[][] = [
  // Mon
  [
    { subject: "MTH 101", teacher: "S. Jenkins", room: "204", tone: "primary" },
    { subject: "PHY 201", teacher: "D. Koal", room: "402", tone: "success" },
    { subject: "ENG 301", teacher: "M. Whitfield", room: "101", tone: "warning" },
    { subject: "BIO 110", teacher: "P. Iyer", room: "Lab 1", tone: "info" },
    null,
    { subject: "CHEM 220", teacher: "H. Suzuki", room: "Lab 2", tone: "info" },
    { subject: "HIST 150", teacher: "O. Faris", room: "303", tone: "warning" },
    null,
  ],
  // Tue
  [
    { subject: "PHY 201", teacher: "D. Koal", room: "402", tone: "success" },
    { subject: "MTH 101", teacher: "S. Jenkins", room: "204", tone: "primary" },
    null,
    { subject: "BIO 110", teacher: "P. Iyer", room: "Lab 1", tone: "info" },
    null,
    { subject: "ENG 301", teacher: "M. Whitfield", room: "101", tone: "warning" },
    { subject: "MTH 101", teacher: "S. Jenkins", room: "204", tone: "primary" },
    { subject: "PE", teacher: "Coach K.", room: "Field", tone: "success" },
  ],
  // Wed
  [
    { subject: "MTH 204", teacher: "S. Jenkins", room: "Aud.", tone: "primary" },
    { subject: "CHEM 220", teacher: "H. Suzuki", room: "Lab 2", tone: "info" },
    { subject: "PHY 201", teacher: "D. Koal", room: "402", tone: "success" },
    null,
    null,
    { subject: "BIO 110", teacher: "P. Iyer", room: "Lab 1", tone: "info" },
    { subject: "HIST 150", teacher: "O. Faris", room: "303", tone: "warning" },
    null,
  ],
  // Thu
  [
    { subject: "ENG 301", teacher: "M. Whitfield", room: "101", tone: "warning" },
    null,
    { subject: "MTH 101", teacher: "S. Jenkins", room: "204", tone: "primary" },
    { subject: "PHY 201", teacher: "D. Koal", room: "402", tone: "success" },
    null,
    { subject: "CHEM 220", teacher: "H. Suzuki", room: "Lab 2", tone: "info" },
    null,
    { subject: "BIO 110", teacher: "P. Iyer", room: "Lab 1", tone: "info" },
  ],
  // Fri
  [
    { subject: "BIO 110", teacher: "P. Iyer", room: "Lab 1", tone: "info" },
    { subject: "ENG 301", teacher: "M. Whitfield", room: "101", tone: "warning" },
    { subject: "MTH 101", teacher: "S. Jenkins", room: "204", tone: "primary" },
    null,
    null,
    { subject: "PHY 201", teacher: "D. Koal", room: "402", tone: "success" },
    { subject: "HIST 150", teacher: "O. Faris", room: "303", tone: "warning" },
    null,
  ],
  // Sat
  [
    { subject: "Lab Activity", teacher: "Mixed", room: "Lab 1–3", tone: "info" },
    { subject: "Lab Activity", teacher: "Mixed", room: "Lab 1–3", tone: "info" },
    null,
    { subject: "Club Hour", teacher: "Various", room: "Hall A", tone: "success" },
    null,
    null,
    null,
    null,
  ],
];

const toneMap = {
  primary: "bg-primary/10 border-primary/20 text-primary",
  success: "bg-success/10 border-success/20 text-success",
  warning: "bg-warning/10 border-warning/20 text-warning",
  info: "bg-chart-5/10 border-chart-5/20 text-chart-5",
} as const;

function TimetablePage() {
  return (
    <AppShell title="Timetable Matrix" subtitle="Grade 10 — Section A · Six-day cycle (Mon — Sat)"
      actions={<><Button>Switch Class</Button><Button variant="primary"><Plus className="size-3.5" /> New Slot</Button></>}
    >
      <Card>
        <CardHeader title="Weekly Schedule" hint="Tap any slot to reassign teacher, subject, or room" />
        <div className="overflow-x-auto px-5 pb-5">
          <div className="min-w-[900px] grid" style={{ gridTemplateColumns: `120px repeat(${days.length}, minmax(0, 1fr))` }}>
            <div />
            {days.map((d) => (
              <div key={d} className="px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em] text-center text-muted-foreground border-b border-border">
                {d}
              </div>
            ))}

            {periods.map((p, rowIdx) => (
              <div key={p} className="contents">
                <div className="px-3 py-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border flex items-center">
                  {p}
                </div>
                {days.map((d, colIdx) => {
                  if (p === "BREAK") {
                    return <div key={`${d}-${p}`} className="border-b border-border bg-background/30 text-[10px] text-center text-muted-foreground py-3 font-mono">— LUNCH —</div>;
                  }
                  const slot = grid[colIdx][rowIdx];
                  return (
                    <div key={`${d}-${p}`} className="border-b border-l border-border p-1.5 min-h-[64px]">
                      {slot && (
                        <button className={`w-full h-full text-left rounded-md border px-2.5 py-1.5 transition-all hover:scale-[1.02] ${toneMap[slot.tone]}`}>
                          <div className="text-[11px] font-semibold">{slot.subject}</div>
                          <div className="text-[10px] opacity-80 mt-0.5">{slot.teacher} · {slot.room}</div>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
