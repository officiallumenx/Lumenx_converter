import { useEffect, useMemo, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { useApp } from "@/lib/app-state";
import { loadConnectEvents, type ConnectEventItem } from "@/lib/events";
import { cn } from "@lumenx/ui";
import {
  CountdownBanner,
  EventRow,
  KIND_META,
  startOfDay,
} from "./events-shared";

const FILTERS = ["all", ...Object.keys(KIND_META)] as const;

export function LearnerEventsApiPanel() {
  const { activeInstituteId } = useApp();
  const search = useSearch({ strict: false }) as { id?: string };
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
      } else if (result.status === "forbidden" || result.status === "error") {
        setItems([]);
        setStatus(result.status);
        setError(result.message);
      } else {
        setItems([]);
        setStatus(result.status);
        setError(null);
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
  const past = list.filter((e) => new Date(e.date) < startOfDay(today));
  const next = upcoming[0];
  const highlighted = search.id ? list.find((e) => e.id === search.id) : null;

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Events & Holidays"
        subtitle="Published institute calendar and events from your school"
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
                {f === "all" ? "All" : KIND_META[f as ConnectEventItem["kind"]].label}
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
