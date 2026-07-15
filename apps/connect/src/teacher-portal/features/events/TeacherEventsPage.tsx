import { useEffect, useState } from "react";

import { PageHeader } from "@/components/app/PageHeader";

import { useTeacherPortal } from "@/context/TeacherPortalContext";

import { teacherRepository } from "@/lib/teacher/repositories";

import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";

import { EmptyState } from "@/teacher-portal/shared/ui/EmptyState";

import { Button, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, cn } from "@lumenx/ui";

import { CalendarDays, MapPin, Clock } from "lucide-react";

import type { TeacherEvent } from "@/lib/teacher/types";

const CAT_LABEL = {
  academic: "Academic",
  sports: "Sports",
  program: "Program",
  holiday: "Holiday",
};

export function TeacherEventsPage() {
  const portal = useTeacherPortal();

  const [events, setEvents] = useState<TeacherEvent[]>([]);

  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<TeacherEvent | null>(null);

  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!portal.isTeacher) return;

    setLoading(true);

    teacherRepository.getEvents().then((e) => {
      setEvents(e);
      setLoading(false);
    });
  }, [portal.isTeacher]);

  const filtered = filter === "all" ? events : events.filter((e) => e.category === filter);

  if (!portal.isTeacher) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Events"
        subtitle="View school programs, sports, and academic events — managed by administration"
      />

      <div className="flex flex-wrap gap-2">
        {["all", "academic", "sports", "program", "holiday"].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium capitalize",

              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {f === "all" ? "All" : CAT_LABEL[f as keyof typeof CAT_LABEL]}
          </button>
        ))}
      </div>

      {loading ? (
        <PageSkeleton rows={4} />
      ) : filtered.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((ev) => (
            <article
              key={ev.id}
              className="rounded-2xl border bg-card p-4 shadow-soft transition-shadow hover:shadow-elevated sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <CalendarDays className="size-5" />
                </div>

                <Badge variant="outline">{CAT_LABEL[ev.category]}</Badge>
              </div>

              <h3 className="mt-3 font-semibold">{ev.title}</h3>

              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" /> {ev.date} · {ev.time}
              </p>

              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground line-clamp-2">
                <MapPin className="size-3 shrink-0" /> {ev.location}
              </p>

              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{ev.description}</p>

              <div className="mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                  onClick={() => setSelected(ev)}
                >
                  View details
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="No events"
          description="Events are published by the administration."
        />
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 text-sm">
              <div className="rounded-xl border bg-muted/20 p-4">
                <h4 className="mb-2 font-semibold">Event details</h4>

                <p className="whitespace-pre-wrap">{selected.description}</p>

                <p className="mt-2 text-muted-foreground">
                  {CAT_LABEL[selected.category]} · Organized by {selected.createdBy}
                </p>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4">
                <h4 className="mb-2 font-semibold">Schedule & location</h4>

                <p className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-primary" /> {selected.date}
                </p>

                <p className="mt-1 flex items-center gap-2">
                  <Clock className="size-4 text-primary" /> {selected.time}
                </p>

                <p className="mt-1 flex items-center gap-2">
                  <MapPin className="size-4 text-primary" /> {selected.location}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
