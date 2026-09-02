import type { ConnectEventItem } from "@/lib/events";
import { Badge, cn } from "@lumenx/ui";
import {
  Calendar,
  Clock,
  MapPin,
  PartyPopper,
  Trophy,
  GraduationCap,
  Megaphone,
  BookOpen,
  Sparkles,
} from "lucide-react";

export const KIND_META: Record<
  ConnectEventItem["kind"],
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

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function formatEventDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function CountdownBanner({ event }: { event: ConnectEventItem }) {
  const days = Math.max(
    0,
    Math.ceil((+new Date(event.date) - +startOfDay(new Date())) / 86400000),
  );
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
              <Calendar className="size-3.5 shrink-0" /> {formatEventDate(event.date)}
              {event.endDate && ` – ${formatEventDate(event.endDate)}`}
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

export function EventRow({ event }: { event: ConnectEventItem }) {
  const meta = KIND_META[event.kind];
  const Icon = meta.icon;
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border p-3 sm:gap-3">
      <div className={cn("size-10 shrink-0 rounded-xl grid place-items-center", meta.cls)}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{event.title}</div>
        <div className="truncate text-xs text-muted-foreground">
          {formatEventDate(event.date)}
          {event.endDate && ` – ${formatEventDate(event.endDate)}`}
          {event.time && ` • ${event.time}`}
          {event.venue && ` • ${event.venue}`}
        </div>
        {event.description ? (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{event.description}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge variant="outline" className="text-[10px] capitalize sm:text-xs">
          {meta.label}
        </Badge>
        {event.registrationRequired ? (
          <Badge variant="secondary" className="text-[10px]">
            Registration required
            {event.rsvpCount > 0 ? ` · ${event.rsvpCount}` : ""}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
