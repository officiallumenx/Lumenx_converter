import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { Badge, Button, cn, Input } from "@lumenx/ui";
import { ACTIVITY_WORKSPACE_BASE } from "@/activity-workspace/core/routes";
import {
  workspaceCalendarRepository,
  WORKSPACE_CALENDAR_CATEGORY_LABELS,
  type WorkspaceCalendarCategory,
  type WorkspaceCalendarViewMode,
} from "@/lib/activity/workspace-calendar";
import { PageSkeleton } from "../../shared/ui";
import { ActivityCalendarPreview } from "../dashboard/ActivityCalendarPreview";

export function ActivityCalendarPage() {
  const [entries, setEntries] = useState<
    Awaited<ReturnType<typeof workspaceCalendarRepository.listEntries>>
  >([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<WorkspaceCalendarViewMode>("month");
  const [category, setCategory] = useState<WorkspaceCalendarCategory | "all">("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    workspaceCalendarRepository
      .listEntries({ category, query })
      .then((list) => {
        setEntries(list);
        setLoading(false);
      });
  }, [category, query]);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const upcoming = useMemo(
    () => entries.filter((e) => e.date >= todayIso).slice(0, 8),
    [entries, todayIso],
  );
  const marks = useMemo(
    () =>
      entries.reduce<{ date: string; count: number; highlight?: boolean }[]>((acc, e) => {
        const existing = acc.find((m) => m.date === e.date);
        if (existing) {
          existing.count += 1;
          if (e.kind === "reminder") existing.highlight = true;
        } else {
          acc.push({ date: e.date, count: 1, highlight: e.kind === "reminder" });
        }
        return acc;
      }, []),
    [entries],
  );

  if (loading) return <PageSkeleton rows={6} />;

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Calendar"
        subtitle="Planner for sports, extra-curricular programmes, and coordinator reminders — not a separate activity manager."
      />

      <div className="flex flex-wrap gap-2">
        {(["month", "week", "agenda"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              "activity-filter-chip capitalize",
              view === v ? "is-active" : "",
            )}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <section className="activity-panel">
          <h2 className="mb-3 font-semibold">Today & upcoming</h2>
          <ul className="space-y-2">
            {upcoming.length ? (
              upcoming.map((e) => (
                <li
                  key={e.id}
                  className="activity-list-row rounded-xl border border-border p-3 text-sm"
                >
                  <div className="flex items-start gap-2">
                    <span className={cn("mt-1 size-2 shrink-0 rounded-full", e.colorClass)} />
                    <div className="min-w-0">
                      <div className="font-medium">{e.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.date}
                        {e.startTime ? ` · ${e.startTime}` : ""}
                        {e.venue ? ` · ${e.venue}` : ""}
                      </div>
                      <Badge variant="outline" className="mt-2 text-[10px]">
                        {WORKSPACE_CALENDAR_CATEGORY_LABELS[e.category]}
                        {e.kind === "reminder" ? " · Reminder" : " · Linked"}
                      </Badge>
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="activity-empty-state py-6">No upcoming entries.</li>
            )}
          </ul>
        </section>

        <section className="activity-panel">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search calendar…"
              className="max-w-xs rounded-xl"
            />
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as WorkspaceCalendarCategory | "all")
              }
              className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            >
              <option value="all">All categories</option>
              {Object.entries(WORKSPACE_CALENDAR_CATEGORY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {view === "month" ? (
            <ActivityCalendarPreview marks={marks} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {view === "week"
                ? "Week view lists the same entries grouped by day — use agenda for a chronological list."
                : "Agenda shows all filtered entries in date order below."}
            </p>
          )}
        </section>
      </div>

      {view !== "month" && (
        <section className="activity-panel">
          <h2 className="mb-3 font-semibold capitalize">{view} agenda</h2>
          <ul className="space-y-2">
            {entries.map((e) => (
              <li key={e.id} className="rounded-xl border border-border p-3 text-sm">
                <span className="font-medium">{e.title}</span>
                <span className="text-muted-foreground"> — {e.date}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="rounded-xl">
          <Link to={`${ACTIVITY_WORKSPACE_BASE}/sports`}>Open Sports calendar section</Link>
        </Button>
      </div>
    </div>
  );
}
