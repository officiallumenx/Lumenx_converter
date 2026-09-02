import { useEffect, useMemo, useState } from "react";

import { MoreBackButton } from "@/components/app/more-back-button";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { APP_NAME } from "@/constants";
import { useTransportAuth } from "@/lib/auth";
import { isApiAuthMode } from "@/lib/auth/auth-mode";
import { loadDriverExamSchedule, type DriverExamScheduleItem } from "@/lib/exams";
import { CalendarDays, Clock, MapPin } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ExamSchedulePage() {
  const { user } = useTransportAuth();
  const apiMode = isApiAuthMode();
  const [items, setItems] = useState<DriverExamScheduleItem[]>([]);
  const [status, setStatus] = useState<string>("loading");
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!apiMode) {
      setStatus("unavailable");
      setItems([]);
      return;
    }
    let cancelled = false;
    setStatus("loading");
    void loadDriverExamSchedule({ instituteId: user?.instituteId }).then((result) => {
      if (cancelled) return;
      setItems(result.items);
      setStatus(result.status);
      setError(result.message ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [apiMode, user?.instituteId, reloadKey]);

  const today = new Date().toISOString().slice(0, 10);
  const { upcoming, past } = useMemo(
    () => ({
      upcoming: items.filter((item) => item.paperDate >= today),
      past: items.filter((item) => item.paperDate < today),
    }),
    [items, today],
  );

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <MoreBackButton />
      <SectionHeader
        as="h1"
        size="page"
        title="Exam Schedule"
        subtitle="Published institute exam timetables"
      />

      {!apiMode ? (
        <p className="text-sm text-muted-foreground">
          Exam schedule is available when signed in with your institute account (API mode).
        </p>
      ) : status === "loading" ? (
        <p className="text-sm text-muted-foreground">Loading exam schedule…</p>
      ) : status === "error" ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{error ?? "Failed to load exam schedule."}</p>
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
          <ExamSection title={`Upcoming (${upcoming.length})`} items={upcoming} />
          <ExamSection title={`Past (${past.length})`} items={past} muted />
        </div>
      )}
    </div>
  );
}

function ExamSection({
  title,
  items,
  muted = false,
}: {
  title: string;
  items: DriverExamScheduleItem[];
  muted?: boolean;
}) {
  return (
    <section className={muted ? "opacity-80" : undefined}>
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
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
                  Exam
                </Badge>
              </div>
              <h3 className="mt-3 font-semibold leading-snug">{item.examName}</h3>
              <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                <p className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3" /> {formatDate(item.paperDate)}
                </p>
                {item.time ? (
                  <p className="inline-flex items-center gap-1">
                    <Clock className="size-3" /> {item.time}
                  </p>
                ) : null}
                {item.room ? (
                  <p className="inline-flex items-center gap-1">
                    <MapPin className="size-3 shrink-0" /> {item.room}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function examSchedulePageTitle() {
  return `Exam Schedule — ${APP_NAME}`;
}
