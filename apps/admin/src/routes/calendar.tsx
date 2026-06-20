import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Button, Pill, Kpi, Field, TextInput, Select, Modal } from "@lumenx/ui-admin";
import { ACADEMIC_YEAR, CALENDAR_HOLIDAYS, CALENDAR_EXAMS } from "@/lib/admin-module-data";
import { workingDaysInYear } from "@/lib/admin-analytics-data";
import { Plus, CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Academic Calendar — LumenX Admin" }] }),
  component: CalendarPage,
});

const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

type CalEntry = { date: string; title: string; type: "holiday" | "exam" | "event" };

function monthShort(iso: string) {
  return new Date(iso).toLocaleString("en", { month: "short" });
}

function CalendarPage() {
  const [view, setView] = useState<"month" | "year">("year");
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[2]!);
  const [open, setOpen] = useState(false);
  const [dates, setDates] = useState<CalEntry[]>([...CALENDAR_HOLIDAYS, ...CALENDAR_EXAMS]);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newType, setNewType] = useState<"holiday" | "exam" | "event">("holiday");

  const allDates = useMemo(() => [...dates].sort((a, b) => a.date.localeCompare(b.date)), [dates]);
  const monthDates = useMemo(() => allDates.filter((d) => monthShort(d.date) === selectedMonth), [allDates, selectedMonth]);

  const addDate = () => {
    if (!newTitle.trim() || !newDate) return;
    setDates((p) => [...p, { date: newDate, title: newTitle.trim(), type: newType }]);
    setNewTitle("");
    setNewDate("");
    setOpen(false);
  };

  return (
    <AppShell
      title="Academic Calendar"
      subtitle={`Session ${ACADEMIC_YEAR.label} · drives attendance holidays & exam windows`}
      actions={
        <Button variant="primary" onClick={() => setOpen(true)}>
          <Plus className="size-3.5" /> Add date
        </Button>
      }
    >
      <div className="lx-kpi-grid">
        <Kpi label="Academic year" value={ACADEMIC_YEAR.label} icon={<CalendarDays className="size-3.5" />} />
        <Kpi label="Holidays" value={String(dates.filter((d) => d.type === "holiday").length)} />
        <Kpi label="Exam windows" value={String(dates.filter((d) => d.type === "exam").length)} />
        <Kpi label="Working days" value={String(workingDaysInYear(dates.filter((d) => d.type === "holiday").length))} delta="Est. year" />
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-6 mb-4">
        <div className="flex gap-1 p-1 w-fit bg-background rounded-md border border-border">
          {(["year", "month"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 h-8 rounded text-[11px] font-medium capitalize transition-colors ${
                view === v ? "bg-surface text-foreground" : "text-muted-foreground"
              }`}
            >
              {v}ly view
            </button>
          ))}
        </div>
        {view === "month" && (
          <Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-28 h-9 text-xs">
            {MONTHS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
        )}
      </div>

      {view === "year" && (
        <Card>
          <CardHeader title="Year at a glance" hint={ACADEMIC_YEAR.start + " → " + ACADEMIC_YEAR.end} />
          <div className="px-5 pb-5 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
            {MONTHS.map((m) => {
              const cnt = allDates.filter((d) => monthShort(d.date) === m).length;
              return (
                <button key={m} onClick={() => { setSelectedMonth(m); setView("month"); }}
                  className="p-3 rounded-lg border border-border bg-background/40 text-center hover:bg-surface-hover transition-colors">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">{m}</div>
                  <div className="text-xs font-medium mt-1">{cnt || "—"}</div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {view === "month" && (
        <Card>
          <CardHeader title={`${selectedMonth} — Important dates`} hint={`${monthDates.length} entries`} />
          {monthDates.length === 0 ? (
            <div className="px-5 pb-5 text-xs text-muted-foreground">No dates in {selectedMonth}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Title</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {monthDates.map((d) => (
                    <tr key={d.date + d.title} className="hover:bg-surface-hover">
                      <td className="px-5 py-3 text-xs font-mono">{d.date}</td>
                      <td className="px-5 py-3 text-xs font-medium">{d.title}</td>
                      <td className="px-5 py-3">
                        <Pill tone={d.type === "holiday" ? "warning" : d.type === "exam" ? "info" : "success"}>{d.type}</Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {view === "year" && (
        <Card className="mt-6">
          <CardHeader title="All important dates" />
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Title</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allDates.map((d) => (
                  <tr key={d.date + d.title} className="hover:bg-surface-hover">
                    <td className="px-5 py-3 text-xs font-mono">{d.date}</td>
                    <td className="px-5 py-3 text-xs font-medium">{d.title}</td>
                    <td className="px-5 py-3">
                      <Pill tone={d.type === "holiday" ? "warning" : d.type === "exam" ? "info" : "success"}>{d.type}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add important date"
        footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={addDate}>Save</Button></>}
      >
        <div className="space-y-4">
          <Field label="Title" required><TextInput placeholder="Mid-term begins" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /></Field>
          <Field label="Date" required><TextInput type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} /></Field>
          <Field label="Type">
            <Select value={newType} onChange={(e) => setNewType(e.target.value as "holiday" | "exam" | "event")}>
              <option value="holiday">Holiday</option>
              <option value="exam">Exam</option>
              <option value="event">Event</option>
            </Select>
          </Field>
        </div>
      </Modal>
    </AppShell>
  );
}
