import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/app/PageHeader";
import {
  CountdownBanner,
  EventRow,
  KIND_META,
  startOfDay,
} from "@/components/app/events/events-shared";
import { useApp } from "@/lib/app-state";
import { isApiAuthMode } from "@/auth/auth-mode";
import { loadConnectEvents, type ConnectEventItem } from "@/lib/events";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { teacherRepository } from "@/lib/teacher/repositories";
import { useAsyncLoad } from "@/lib/hooks/useAsyncLoad";
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

const FILTERS = ["all", ...Object.keys(KIND_META)] as const;

export function TeacherEventsPage() {
  const portal = useTeacherPortal();
  const apiMode = isApiAuthMode();

  if (!portal.isTeacher) return null;
  if (apiMode) return <TeacherEventsApiPanel />;

  return <TeacherEventsDemoPanel portalEnabled={portal.isTeacher} />;
}

function TeacherEventsApiPanel() {
  const { activeInstituteId } = useApp();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [items, setItems] = useState<ConnectEventItem[]>([]);
  const [status, setStatus] = useState<string>("loading");
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    void loadConnectEvents({ instituteId: activeInstituteId }).then((result) => {
      if (cancelled) return;
      if (result.status === "ready" || result.status === "empty") {
        setItems(result.items);
        setStatus(result.status);
        setError(null);
      } else {
        setItems([]);
        setStatus(result.status);
        setError("message" in result ? result.message : null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId, reloadKey]);

  const list = useMemo(
    () =>
      [...items]
        .filter((e) =>
          filter === "all" ? true : e.kind === (filter as ConnectEventItem["kind"]),
        )
        .sort((a, b) => a.date.localeCompare(b.date)),
    [items, filter],
  );

  const today = new Date();
  const upcoming = list.filter((e) => new Date(e.date) >= startOfDay(today));
  const next = upcoming[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Events"
        subtitle="Published institute calendar — managed by administration"
        action={
          status === "error" ? (
            <button
              type="button"
              className="text-sm text-primary underline"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              Retry
            </button>
          ) : undefined
        }
      />

      {status === "loading" ? (
        <PageSkeleton rows={4} />
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <>
          {next ? (
            <div className="mb-2">
              <CountdownBanner event={next} />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
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
                {f === "all" ? "All" : KIND_META[f as ConnectEventItem["kind"]].label}
              </button>
            ))}
          </div>

          {list.length ? (
            <div className="space-y-2">
              {list.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="No events"
              description="Events are published by the administration."
            />
          )}
        </>
      )}
    </div>
  );
}

function TeacherEventsDemoPanel({ portalEnabled }: { portalEnabled: boolean }) {
  const { data: events, loading } = useAsyncLoad(
    () => teacherRepository.getEvents(),
    [portalEnabled],
    { initial: [] as TeacherEvent[], enabled: portalEnabled },
  );

  const [selected, setSelected] = useState<TeacherEvent | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const filtered = filter === "all" ? events : events.filter((e) => e.category === filter);

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
