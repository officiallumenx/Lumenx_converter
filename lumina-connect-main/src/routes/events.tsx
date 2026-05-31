import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { schoolEvents } from "@/lib/mock-data";
import {
  Calendar,
  Plus,
  MapPin,
  Clock,
  PartyPopper,
  Trophy,
  GraduationCap,
  Megaphone,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useApp } from "@/lib/app-state";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { SchoolEvent } from "@/lib/types";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events & Holidays — Unify" },
      {
        name: "description",
        content: "Upcoming school events, holidays, workshops, seminars and announcements.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <EventsPage />
    </AppShell>
  ),
});

const KIND_META: Record<
  SchoolEvent["kind"],
  { label: string; icon: typeof Calendar; cls: string }
> = {
  event: { label: "Event", icon: Calendar, cls: "bg-primary/10 text-primary" },
  holiday: { label: "Holiday", icon: PartyPopper, cls: "bg-success/15 text-success" },
  workshop: { label: "Workshop", icon: BookOpen, cls: "bg-warning/20 text-warning-foreground" },
  seminar: { label: "Seminar", icon: GraduationCap, cls: "bg-primary/10 text-primary" },
  sports: { label: "Sports", icon: Trophy, cls: "bg-warning/20 text-warning-foreground" },
  celebration: { label: "Celebration", icon: Sparkles, cls: "bg-primary/10 text-primary" },
  "exam-holiday": { label: "Exam", icon: GraduationCap, cls: "bg-destructive/15 text-destructive" },
  announcement: { label: "Notice", icon: Megaphone, cls: "bg-muted text-foreground" },
};

const FILTERS: ("all" | SchoolEvent["kind"])[] = [
  "all",
  "event",
  "holiday",
  "workshop",
  "seminar",
  "sports",
  "celebration",
  "announcement",
];

const EVENT_KIND_VALUES = [
  "event",
  "holiday",
  "workshop",
  "seminar",
  "sports",
  "celebration",
  "exam-holiday",
  "announcement",
] as const;

const eventFormSchema = z.object({
  title: z.string().trim().min(3, "Enter a title.").max(200),
  kind: z.enum(EVENT_KIND_VALUES),
  date: z.string().min(1, "Pick a date."),
  time: z.string().optional(),
  venue: z.string().optional(),
  description: z.string().optional(),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

function NewEventDialog({ onCreated }: { onCreated: (e: SchoolEvent) => void }) {
  const [open, setOpen] = useState(false);
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      kind: "event",
      date: "",
      time: "",
      venue: "",
      description: "",
    },
  });

  const onSubmit = (v: EventFormValues) => {
    const ev: SchoolEvent = {
      id: `ev-local-${Date.now()}`,
      title: v.title,
      kind: v.kind,
      date: v.date,
      time: v.time || undefined,
      venue: v.venue || undefined,
      description: v.description || undefined,
    };
    onCreated(ev);
    setOpen(false);
    form.reset({ title: "", kind: "event", date: "", time: "", venue: "", description: "" });
    toast.success("Event added to the calendar.");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-xl shadow-glow">
          <Plus className="size-4" /> New event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create event</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Science fair" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EVENT_KIND_VALUES.map((k) => (
                        <SelectItem key={k} value={k}>
                          {KIND_META[k].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 9:00 AM" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="venue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Auditorium" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save event</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EventsPage() {
  const { role } = useApp();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [events, setEvents] = useState<SchoolEvent[]>(() => [...schoolEvents]);

  const today = new Date();
  const list = useMemo(
    () =>
      [...events]
        .filter((e) => (filter === "all" ? true : e.kind === filter))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [events, filter],
  );

  const upcoming = list.filter((e) => new Date(e.date) >= startOfDay(today));
  const past = list.filter((e) => new Date(e.date) < startOfDay(today));
  const next = upcoming[0];

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Events & Holidays"
        subtitle="Stay on top of celebrations, breaks, workshops and notices"
        action={
          role === "teacher" ? (
            <NewEventDialog onCreated={(e) => setEvents((x) => [...x, e])} />
          ) : undefined
        }
      />

      {next && <CountdownBanner event={next} />}

      <div className="my-4 flex min-w-0 flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 h-8 rounded-full text-xs font-medium border transition-colors capitalize",
              filter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-muted/40",
            )}
          >
            {f === "all" ? "All" : KIND_META[f as SchoolEvent["kind"]].label}
          </button>
        ))}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 items-stretch lg:grid-cols-2">
        <SectionCard title={`Upcoming (${upcoming.length})`}>
          <div className="space-y-2">
            {upcoming.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
            )}
            {upcoming.map((e) => (
              <EventRow key={e.id} e={e} />
            ))}
          </div>
        </SectionCard>
        <SectionCard title={`Past (${past.length})`}>
          <div className="space-y-2 opacity-80">
            {past.length === 0 && <p className="text-sm text-muted-foreground">No past items.</p>}
            {past.map((e) => (
              <EventRow key={e.id} e={e} />
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function CountdownBanner({ event }: { event: SchoolEvent }) {
  const days = Math.max(0, Math.ceil((+new Date(event.date) - +startOfDay(new Date())) / 86400000));
  const meta = KIND_META[event.kind];
  const Icon = meta.icon;
  return (
    <div className="max-w-full min-w-0 rounded-3xl bg-gradient-primary p-5 text-primary-foreground shadow-glow relative overflow-hidden md:p-7">
      <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
        <div className="size-14 shrink-0 rounded-2xl bg-white/15 grid place-items-center">
          <Icon className="size-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-widest opacity-80">
            {meta.label} • Coming up
          </div>
          <h2 className="mt-0.5 font-display text-xl font-semibold leading-snug break-words line-clamp-2 md:text-2xl">
            {event.title}
          </h2>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm opacity-85 break-words">
            <span className="inline-flex min-w-0 items-center gap-1 break-words">
              <Calendar className="size-3.5 shrink-0" /> {formatDate(event.date)}
              {event.endDate && ` – ${formatDate(event.endDate)}`}
            </span>
            {event.time && (
              <span className="inline-flex items-center gap-1 break-words">
                <Clock className="size-3.5 shrink-0" /> {event.time}
              </span>
            )}
            {event.venue && (
              <span className="inline-flex min-w-0 items-center gap-1 break-words">
                <MapPin className="size-3.5 shrink-0" /> {event.venue}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right sm:pl-2">
          <div className="font-display text-2xl font-bold leading-none tabular-nums sm:text-3xl md:text-4xl">
            {days}
          </div>
          <div className="text-[11px] opacity-80 uppercase tracking-widest">
            {days === 1 ? "day to go" : "days to go"}
          </div>
        </div>
      </div>
    </div>
  );
}

function EventRow({ e }: { e: SchoolEvent }) {
  const meta = KIND_META[e.kind];
  const Icon = meta.icon;
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border p-3 sm:gap-3">
      <div className={cn("size-10 shrink-0 rounded-xl grid place-items-center", meta.cls)}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{e.title}</div>
        <div className="truncate text-xs text-muted-foreground">
          {formatDate(e.date)}
          {e.endDate && ` – ${formatDate(e.endDate)}`}
          {e.time && ` • ${e.time}`}
          {e.venue && ` • ${e.venue}`}
        </div>
      </div>
      <Badge variant="outline" className="shrink-0 text-[10px] capitalize sm:text-xs">
        {meta.label}
      </Badge>
    </div>
  );
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
