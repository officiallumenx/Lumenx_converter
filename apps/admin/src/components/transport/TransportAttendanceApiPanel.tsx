import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardHeader, EmptyState, PageToolbar, Pill } from "@lumenx/ui-admin";
import { ClipboardList } from "lucide-react";
import { subscribeTransportRealtime } from "@lumenx/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { listTransportBoardingMarks } from "@/lib/transport/ops-api";
import type { TransportBoardingEventDto } from "@/lib/transport/types";

type Props = {
  instituteId: string;
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function TransportAttendanceApiPanel({ instituteId }: Props) {
  const [marks, setMarks] = useState<TransportBoardingEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tripFilter, setTripFilter] = useState<string>("all");
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTransportBoardingMarks({ instituteId, tripDate: today });
      setMarks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [instituteId, today]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    try {
      const supabase = getSupabaseBrowserClient();
      return subscribeTransportRealtime(supabase, {
        instituteId,
        onChange: () => {
          void reload();
        },
      });
    } catch {
      return undefined;
    }
  }, [instituteId, reload]);

  const tripOptions = useMemo(
    () => [...new Set(marks.map((m) => m.tripId))],
    [marks],
  );

  const rows = useMemo(() => {
    const filtered =
      tripFilter === "all" ? marks : marks.filter((m) => m.tripId === tripFilter);
    return [...filtered].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [marks, tripFilter]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading attendance…</p>;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <PageToolbar>
        <p className="text-sm text-muted-foreground">
          Boarding and dropping marks synced from driver trips.
        </p>
        <Pill tone="neutral">{marks.length} marks</Pill>
      </PageToolbar>

      {tripOptions.length > 1 ? (
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={tripFilter}
          onChange={(e) => setTripFilter(e.target.value)}
        >
          <option value="all">All trips</option>
          {tripOptions.map((id) => (
            <option key={id} value={id}>
              Trip {id.slice(0, 8)}
            </option>
          ))}
        </select>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No attendance marks"
          description="Marks appear when drivers record boarding during active trips."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((mark) => (
            <Card key={mark.id}>
              <CardHeader
                title={mark.studentName ?? mark.studentId}
                subtitle={`${mark.stopName ?? "Stop"} · Trip ${mark.tripId.slice(0, 8)}`}
                action={
                  <div className="flex gap-2">
                    <Pill
                      tone={
                        mark.boardingStatus === "boarded"
                          ? "success"
                          : mark.boardingStatus === "not_boarded"
                            ? "danger"
                            : "neutral"
                      }
                    >
                      Board: {mark.boardingStatus}
                    </Pill>
                    <Pill
                      tone={
                        mark.droppingStatus === "dropped"
                          ? "success"
                          : mark.droppingStatus === "not_dropped"
                            ? "danger"
                            : "neutral"
                      }
                    >
                      Drop: {mark.droppingStatus}
                    </Pill>
                  </div>
                }
              />
              <p className="px-4 pb-4 text-xs text-muted-foreground">
                Boarded {formatWhen(mark.boardedAt)} · Dropped {formatWhen(mark.droppedAt)}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
