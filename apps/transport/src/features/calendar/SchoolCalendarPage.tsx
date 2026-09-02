import { useEffect, useMemo, useState } from "react";

import { MoreBackButton } from "@/components/app/more-back-button";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { APP_NAME } from "@/constants";
import { useTransportAuth } from "@/lib/auth";
import { isApiAuthMode } from "@/lib/auth/auth-mode";
import { loadDriverSchoolCalendar, type SchoolCalendarItem } from "@/lib/events";
import { CalendarDays, Clock, MapPin } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function SchoolCalendarPage() {
  const { user } = useTransportAuth();
  const apiMode = isApiAuthMode();
  const [items, setItems] = useState<SchoolCalendarItem[]>([]);
  const [status, setStatus] = useState<string>("loading");
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<"all" | "exam" | "other">("all");

  useEffect(() => {
    if (!apiMode) {
      setStatus("unavailable");
      setItems([]);
      return;
    }
    let cancelled = false;
    setStatus("loading");
    void loadDriverSchoolCalendar({ instituteId: user?.instituteId }).then((result) => {
      if (cancelled) return;
      setItems(result.items);
      setStatus(result.status);
      setError(result.message ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [apiMode, user?.instituteId, reloadKey]);

  const today = new Date();
  const filteredItems = useMemo(() => {
    if (filter === "exam") return items.filter((item) => item.kind === "exam");
    if (filter === "other") return items.filter((item) => item.kind !== "exam");
    return items;
  }, [items, filter]);

  const { upcoming, past } = useMemo(() => {
    const sorted = [...filteredItems].sort((a, b) => a.date.localeCompare(b.date));
    return {
      upcoming: sorted.filter((e) => new Date(e.date) >= startOfDay(today)),
      past: sorted.filter((e) => new Date(e.date) < startOfDay(today)),
    };
  }, [filteredItems, today]);

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <MoreBackButton />
      <SectionHeader
        as="h1"
        size="page"
        title="School Calendar"
        subtitle="Published institute events, holidays, and notices"
      />

      {!apiMode ? (
        <p className="text-sm text-muted-foreground">
          School calendar is available when signed in with your institute account (API mode).
        </p>
      ) : status === "loading" ? (
        <p className="text-sm text-muted-foreground">Loading calendar…</p>
      ) : status === "needs_institute" ? (
        <p className="text-sm text-muted-foreground">Institute context is required.</p>
      ) : status === "error" ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{error ?? "Failed to load calendar."}</p>
          <button
            type="button"
            className="text-sm text-primary underline"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "All"],
                ["exam", "Exams"],
                ["other", "Other"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  filter === key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <CalendarSection title={`Upcoming (${upcoming.length})`} items={upcoming} />
          <CalendarSection title={`Past (${past.length})`} items={past} muted />
        </div>
      )}
    </div>
  );
}

function CalendarSection({
  title,
  items,
  muted = false,
}: {
  title: string;
  items: SchoolCalendarItem[];
  muted?: boolean;
}) {
  return (
    <section className={muted ? "opacity-80" : undefined}>
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-soft"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <CalendarDays className="size-5" />
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {item.kindLabel}
                </Badge>
              </div>
              <h3 className="mt-3 font-semibold leading-snug">{item.title}</h3>
              <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                <p className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3" />
                  {formatDate(item.date)}
                  {item.endDate ? ` – ${formatDate(item.endDate)}` : ""}
                </p>
                {item.time ? (
                  <p className="inline-flex items-center gap-1">
                    <Clock className="size-3" /> {item.time}
                  </p>
                ) : null}
                {item.venue ? (
                  <p className="inline-flex items-center gap-1">
                    <MapPin className="size-3 shrink-0" /> {item.venue}
                  </p>
                ) : null}
              </div>
              {item.description ? (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{item.description}</p>
              ) : null}
              {item.registrationRequired ? (
                <Badge variant="secondary" className="mt-3 text-[10px]">
                  Registration required
                  {item.rsvpCount > 0 ? ` · ${item.rsvpCount}` : ""}
                </Badge>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function schoolCalendarPageTitle() {
  return `School Calendar — ${APP_NAME}`;
}
