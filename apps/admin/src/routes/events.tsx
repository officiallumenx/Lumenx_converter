import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Button, Pill, Modal, Field, TextInput, TextArea, Select } from "@lumenx/ui-admin";
import { Plus, CalendarDays, Users, MapPin, Clock } from "lucide-react";
import { useState } from "react";
import { useAdminToast } from "@/components/AdminActionToast";

export const Route = createFileRoute("/events")({
  head: () => ({ meta: [{ title: "Events — LumenX Admin" }] }),
  component: EventsPage,
});

type EventItem = {
  id: string;
  title: string;
  date: string;
  type: "holiday" | "meeting" | "exam" | "function";
  audience: string;
  location: string;
  rsvp?: number;
  published: boolean;
};

const INITIAL: EventItem[] = [
  { id: "1", title: "Annual Science Symposium", date: "May 22 · 09:00", type: "function", audience: "All grades", location: "Main Auditorium", rsvp: 412, published: true },
  { id: "2", title: "Parent–Teacher Conference", date: "May 24 · 14:00", type: "meeting", audience: "Parents · Grade 10–12", location: "Block B Halls", rsvp: 198, published: true },
  { id: "3", title: "Mid-Term Exams Begin", date: "May 27 · 08:30", type: "exam", audience: "Grade 9–12", location: "Allocated halls", published: true },
  { id: "4", title: "Founders' Day Holiday", date: "Jun 02 · All day", type: "holiday", audience: "Institute-wide", location: "—", published: true },
  { id: "5", title: "Inter-house Sports Meet", date: "Jun 06 · 07:30", type: "function", audience: "All grades", location: "Athletics Field", rsvp: 1240, published: false },
  { id: "6", title: "Senior Leadership Sync", date: "Jun 10 · 16:00", type: "meeting", audience: "Heads of Department", location: "Boardroom A", published: true },
];

const toneOf = (t: EventItem["type"]) =>
  t === "exam" ? "warning" : t === "holiday" ? "info" : t === "meeting" ? "neutral" : "success";

function EventsPage() {
  const notify = useAdminToast();
  const [events, setEvents] = useState(INITIAL);
  const [open, setOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<EventItem["type"]>("function");
  const [newStart, setNewStart] = useState("");
  const [newAudience, setNewAudience] = useState("All students");
  const [newLocation, setNewLocation] = useState("");

  const schedule = () => {
    if (!newTitle.trim()) return;
    const dateStr = newStart
      ? new Date(newStart).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : "TBD";
    setEvents((prev) => [
      {
        id: String(Date.now()),
        title: newTitle.trim(),
        date: dateStr,
        type: newType,
        audience: newAudience,
        location: newLocation.trim() || "TBD",
        published: false,
      },
      ...prev,
    ]);
    setNewTitle("");
    setNewLocation("");
    setNewStart("");
    setOpen(false);
    notify(`Event "${newTitle.trim()}" scheduled`);
  };

  const publish = (id: string) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, published: true } : e)));
    notify("Event published to all portals");
  };

  return (
    <AppShell title="Institute Events" subtitle="Calendar, holidays & academic functions"
      actions={<><Button onClick={() => notify("Calendar view — full month grid")}>Calendar view</Button><Button variant="primary" onClick={() => setOpen(true)}><Plus className="size-3.5" /> New Event</Button></>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {events.map((e) => (
            <Card key={e.id} className="p-5 hover:bg-surface-hover transition-colors">
              <div className="flex flex-wrap items-start gap-4 justify-between">
                <div className="flex gap-4">
                  <div className="size-12 rounded-md bg-accent border border-border flex flex-col items-center justify-center text-center">
                    <CalendarDays className="size-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold tracking-tight">{e.title}</h3>
                      <Pill tone={toneOf(e.type)}>{e.type}</Pill>
                      {!e.published && <Pill tone="warning">Draft</Pill>}
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
                  <Button onClick={() => notify(`Editing ${e.title}`)}>Edit</Button>
                  <Button variant="primary" disabled={e.published} onClick={() => publish(e.id)}>Publish</Button>
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
                { l: "Holidays", n: events.filter((e) => e.type === "holiday").length, tone: "info" as const },
                { l: "Meetings", n: events.filter((e) => e.type === "meeting").length, tone: "neutral" as const },
                { l: "Exams", n: events.filter((e) => e.type === "exam").length, tone: "warning" as const },
                { l: "Functions", n: events.filter((e) => e.type === "function").length, tone: "success" as const },
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
        footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={schedule} disabled={!newTitle.trim()}>Schedule</Button></>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Title" required><TextInput value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Founders' Day" /></Field>
          <Field label="Event type" required>
            <Select value={newType} onChange={(e) => setNewType(e.target.value as EventItem["type"])}>
              <option value="function">Function</option>
              <option value="meeting">Meeting</option>
              <option value="exam">Exam</option>
              <option value="holiday">Holiday</option>
            </Select>
          </Field>
          <Field label="Starts" required><TextInput type="datetime-local" value={newStart} onChange={(e) => setNewStart(e.target.value)} /></Field>
          <Field label="Ends"><TextInput type="datetime-local" /></Field>
          <Field label="Audience" required><Select value={newAudience} onChange={(e) => setNewAudience(e.target.value)}><option>All students</option><option>Specific grades</option><option>Parents</option><option>Teachers</option><option>Institute-wide</option></Select></Field>
          <Field label="Location"><TextInput value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="Auditorium A" /></Field>
          <div className="sm:col-span-2"><Field label="Description"><TextArea placeholder="Details, agenda, attire…" /></Field></div>
          <Field label="Reminder"><Select defaultValue="1 day before"><option>1 day before</option><option>1 hour before</option><option>1 week + 1 day</option><option>No reminder</option></Select></Field>
          <Field label="Banner"><Select defaultValue="Auto-generate"><option>Auto-generate</option><option>Upload custom</option><option>No banner</option></Select></Field>
        </div>
      </Modal>
    </AppShell>
  );
}
