import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Button, Pill, Modal, Field, TextInput, TextArea, Select } from "@/components/ui-kit";
import { Plus, CalendarDays, Users, MapPin, Clock } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/events")({
  head: () => ({ meta: [{ title: "Events — LumenX Nexus" }] }),
  component: EventsPage,
});

type EventItem = { title: string; date: string; type: "holiday" | "meeting" | "exam" | "function"; audience: string; location: string; rsvp?: number };

const events: EventItem[] = [
  { title: "Annual Science Symposium", date: "May 22 · 09:00", type: "function", audience: "All grades", location: "Main Auditorium", rsvp: 412 },
  { title: "Parent–Teacher Conference", date: "May 24 · 14:00", type: "meeting", audience: "Parents · Grade 10–12", location: "Block B Halls", rsvp: 198 },
  { title: "Mid-Term Exams Begin", date: "May 27 · 08:30", type: "exam", audience: "Grade 9–12", location: "Allocated halls" },
  { title: "Founders' Day Holiday", date: "Jun 02 · All day", type: "holiday", audience: "Institute-wide", location: "—" },
  { title: "Inter-house Sports Meet", date: "Jun 06 · 07:30", type: "function", audience: "All grades", location: "Athletics Field", rsvp: 1240 },
  { title: "Senior Leadership Sync", date: "Jun 10 · 16:00", type: "meeting", audience: "Heads of Department", location: "Boardroom A" },
];

const toneOf = (t: EventItem["type"]) =>
  t === "exam" ? "warning" : t === "holiday" ? "info" : t === "meeting" ? "neutral" : "success";

function EventsPage() {
  const [open, setOpen] = useState(false);
  return (
    <AppShell title="Institute Events" subtitle="Calendar, holidays & academic functions"
      actions={<><Button>Calendar view</Button><Button variant="primary" onClick={() => setOpen(true)}><Plus className="size-3.5" /> New Event</Button></>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {events.map((e) => (
            <Card key={e.title} className="p-5 hover:bg-surface-hover transition-colors">
              <div className="flex flex-wrap items-start gap-4 justify-between">
                <div className="flex gap-4">
                  <div className="size-12 rounded-md bg-accent border border-border flex flex-col items-center justify-center text-center">
                    <CalendarDays className="size-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold tracking-tight">{e.title}</h3>
                      <Pill tone={toneOf(e.type)}>{e.type}</Pill>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Clock className="size-3" />{e.date}</span>
                      <span className="inline-flex items-center gap-1"><Users className="size-3" />{e.audience}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{e.location}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {typeof e.rsvp === "number" && (
                    <div className="px-3 h-9 rounded-md bg-background border border-border text-[11px] font-mono flex items-center">
                      {e.rsvp.toLocaleString()} RSVPs
                    </div>
                  )}
                  <Button>Edit</Button>
                  <Button variant="primary">Publish</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Upcoming this month" hint="Auto-rolling 30-day window" />
            <div className="px-5 pb-5 space-y-3">
              {[
                { l: "Holidays", n: 2, tone: "info" as const },
                { l: "Meetings", n: 5, tone: "neutral" as const },
                { l: "Exams", n: 3, tone: "warning" as const },
                { l: "Functions", n: 4, tone: "success" as const },
              ].map((r) => (
                <div key={r.l} className="flex items-center justify-between text-xs">
                  <Pill tone={r.tone}>{r.l}</Pill>
                  <span className="font-mono">{r.n}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Audience reach" hint="Last broadcast cycle" />
            <div className="px-5 pb-5 space-y-3 text-xs">
              {[
                { l: "Students notified", v: "2,842" },
                { l: "Parents notified", v: "2,104" },
                { l: "Teachers notified", v: "186" },
              ].map((r) => (
                <div key={r.l} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{r.l}</span>
                  <span className="font-mono font-medium">{r.v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create event" subtitle="Configure schedule, audience and reminders" size="lg"
        footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => setOpen(false)}>Schedule</Button></>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Title" required><TextInput placeholder="e.g. Founders' Day" /></Field>
          <Field label="Event type" required><Select><option>Function</option><option>Meeting</option><option>Exam</option><option>Holiday</option><option>Celebration</option></Select></Field>
          <Field label="Starts" required><TextInput type="datetime-local" /></Field>
          <Field label="Ends" required><TextInput type="datetime-local" /></Field>
          <Field label="Audience" required><Select><option>All students</option><option>Specific grades</option><option>Parents</option><option>Teachers</option><option>Institute-wide</option></Select></Field>
          <Field label="Location"><TextInput placeholder="Auditorium A" /></Field>
          <div className="sm:col-span-2"><Field label="Description"><TextArea placeholder="Details, agenda, attire…" /></Field></div>
          <Field label="Reminder"><Select><option>1 day before</option><option>1 hour before</option><option>1 week + 1 day</option><option>No reminder</option></Select></Field>
          <Field label="Banner"><Select><option>Auto-generate</option><option>Upload custom</option><option>No banner</option></Select></Field>
        </div>
      </Modal>
    </AppShell>
  );
}
