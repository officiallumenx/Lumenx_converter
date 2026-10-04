import { useMemo, useState } from "react";
import { Card, CardHeader, EmptyState, PageToolbar, Pill, Select } from "@lumenx/ui-admin";
import { ClipboardList } from "lucide-react";
import { useTransportBoardingMarksQuery } from "@/lib/admin-queries";
import { useTransportRealtimeInvalidate } from "@/lib/transport/use-transport-realtime-invalidate";

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
  const [tripFilter, setTripFilter] = useState<string>("all");
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const marksQuery = useTransportBoardingMarksQuery(instituteId, today);
  useTransportRealtimeInvalidate(instituteId);

  const marks = marksQuery.data ?? [];

  const tripOptions = useMemo(
    () => [...new Set(marks.map((m) => m.tripId))],
    [marks],
  );

  const rows = useMemo(() => {
    const filtered =
      tripFilter === "all" ? marks : marks.filter((m) => m.tripId === tripFilter);
    return [...filtered].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [marks, tripFilter]);

  if (marksQuery.isLoading && marks.length === 0) {
    return <p className="text-sm text-muted-foreground">Loading attendance…</p>;
  }

  if (marksQuery.isError && marks.length === 0) {
    return (
      <p className="text-sm text-destructive">
        {marksQuery.error instanceof Error
          ? marksQuery.error.message
          : "Failed to load attendance"}
      </p>
    );
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
        <Select
          value={tripFilter}
          onChange={(e) => setTripFilter(e.target.value)}
        >
          <option value="all">All trips</option>
          {tripOptions.map((id) => (
            <option key={id} value={id}>
              Trip {id.slice(0, 8)}
            </option>
          ))}
        </Select>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-5" />}
          title="No attendance marks"
          hint="Marks appear when drivers record boarding during active trips."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((mark) => (
            <Card key={mark.id}>
              <CardHeader
                title={mark.studentName ?? mark.studentId}
                hint={`${mark.stopName ?? "Stop"} · Trip ${mark.tripId.slice(0, 8)}`}
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
