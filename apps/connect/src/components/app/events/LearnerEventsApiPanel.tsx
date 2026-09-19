import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { useApp } from "@/lib/app-state";
import type { ConnectEventItem } from "@/lib/events";
import { useConnectEventsQuery } from "@/lib/connect-queries/hooks";
import { connectQueryKeys } from "@/lib/connect-queries/keys";
import { cn } from "@lumenx/ui";
import {
  CountdownBanner,
  EventRow,
  eventKindMeta,
  KIND_META,
  startOfDay,
} from "./events-shared";

const FILTERS = ["all", ...Object.keys(KIND_META)] as const;

export function LearnerEventsApiPanel() {
  const { activeInstituteId } = useApp();
  const queryClient = useQueryClient();
  const search = useSearch({ strict: false }) as { id?: string };
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
  const past = list.filter((e) => new Date(e.date) < startOfDay(today));
  const next = upcoming[0];
  const highlighted = search.id ? list.find((e) => e.id === search.id) : null;

  const retry = () => {
    if (!activeInstituteId) return;
    void queryClient.invalidateQueries({
      queryKey: connectQueryKeys.events(activeInstituteId),
    });
  };

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Events & Holidays"
        subtitle="Published institute calendar and events from your school"
        action={
          status === "error" ? (
            <button type="button" className="text-sm text-primary underline" onClick={retry}>
              Retry
            </button>
          ) : undefined
        }
      />

      {status === "loading" || (eventsQuery.isLoading && !eventsQuery.data) ? (
        <p className="text-sm text-muted-foreground px-1">Loading events…</p>
      ) : status === "needs_institute" ? (
        <p className="text-sm text-muted-foreground px-1">Select an institute to view events.</p>
      ) : error ? (
        <p className="text-sm text-destructive px-1">{error}</p>
      ) : (
        <>
          {highlighted ? (
            <div className="mb-4">
              <CountdownBanner event={highlighted} />
            </div>
          ) : next ? (
            <div className="mb-4">
              <CountdownBanner event={next} />
            </div>
          ) : null}

          <div className="my-4 flex min-w-0 flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 h-8 rounded-full text-xs font-medium border transition-colors capitalize",
                  filter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-muted/40",
                )}
              >
                {f === "all" ? "All" : eventKindMeta(f).label}
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
                  <EventRow key={e.id} event={e} />
                ))}
              </div>
            </SectionCard>
            <SectionCard title={`Past (${past.length})`}>
              <div className="space-y-2 opacity-80">
                {past.length === 0 && (
                  <p className="text-sm text-muted-foreground">No past items.</p>
                )}
                {past.map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
