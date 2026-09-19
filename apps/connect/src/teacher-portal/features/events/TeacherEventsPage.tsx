import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { PageHeader } from "@/components/app/PageHeader";
import {
  CountdownBanner,
  EventRow,
  eventKindMeta,
  KIND_META,
  startOfDay,
} from "@/components/app/events/events-shared";
import { useApp } from "@/lib/app-state";
import { isApiAuthMode } from "@/auth/auth-mode";
import type { ConnectEventItem } from "@/lib/events";
import { useConnectEventsQuery } from "@/lib/connect-queries/hooks";
import { connectQueryKeys } from "@/lib/connect-queries/keys";
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
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const eventsQuery = useConnectEventsQuery(activeInstituteId, Boolean(activeInstituteId));
  const items =
    eventsQuery.data &&
    (eventsQuery.data.status === "ready" || eventsQuery.data.status === "empty")
      ? eventsQuery.data.items
      : [];
  const status =
    eventsQuery.data?.status ??
    (eventsQuery.isLoading && !eventsQuery.data
      ? "loading"
      : eventsQuery.isError
        ? "error"
        : "loading");
  const error =
    eventsQuery.data &&
    (eventsQuery.data.status === "forbidden" || eventsQuery.data.status === "error")
      ? eventsQuery.data.message
      : eventsQuery.isError
        ? "Failed to load events."
        : null;

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

  const retry = () => {
    if (!activeInstituteId) return;
    void queryClient.invalidateQueries({
      queryKey: connectQueryKeys.events(activeInstituteId),
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Events"
        subtitle="Published institute calendar — managed by administration"
        action={
          status === "error" ? (
            <button type="button" className="text-sm text-primary underline" onClick={retry}>
              Retry
            </button>
          ) : undefined
        }
      />

      {status === "loading" || (eventsQuery.isLoading && !eventsQuery.data) ? (
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
                {f === "all" ? "All" : eventKindMeta(f).label}
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
