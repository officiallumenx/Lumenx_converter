import { Flag, MapPinned, Siren, Users } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { ROUTES } from "@/constants";
import {
  isTripActive,
  tripPhaseLabel,
  type TripEndSummary,
  type TripSession,
} from "@/lib/transport/trip";

function formatStartTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "—";
  }
}

export function ActiveTripPanel({
  session,
  boarded,
  dropped,
  totalStudents,
  onEndTrip,
  endingTrip,
}: {
  session: TripSession;
  boarded: number;
  dropped: number;
  totalStudents: number;
  onEndTrip?: () => void;
  endingTrip?: boolean;
}) {
  const navigate = useNavigate();
  const stops = session.assignment.route.stops;
  const current = stops[session.currentStopIndex] ?? null;
  const next = stops[session.currentStopIndex + 1] ?? null;
  const progress =
    stops.length === 0
      ? 0
      : Math.round(((session.currentStopIndex + (current ? 0.35 : 0)) / stops.length) * 100);
  const active = isTripActive(session.phase);

  if (session.phase === "completed" && session.lastSummary) {
    return <CompletedTripSummary summary={session.lastSummary} />;
  }

  if (!active) return null;

  return (
    <Card className="border-success/30 bg-success/5">
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-display text-base font-semibold text-foreground">Active trip</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Started {formatStartTime(session.startedAt)} · {session.assignment.bus.busNumber} ·{" "}
              {session.assignment.route.code}
            </p>
          </div>
          <StatusChip label={tripPhaseLabel(session.phase)} tone="success" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-border/80 bg-card px-3 py-2.5">
            <p className="transport-stat-label">Current stop</p>
            <p className="mt-0.5 truncate font-display text-sm font-semibold text-foreground">
              {current?.name ?? "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card px-3 py-2.5">
            <p className="transport-stat-label">Next stop</p>
            <p className="mt-0.5 truncate font-display text-sm font-semibold text-foreground">
              {next?.name ?? "Last stop"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="transport-stat-label">Trip progress</p>
            <p className="text-xs font-semibold tabular-nums text-muted-foreground">{progress}%</p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-transport transition-[width] duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Stop {Math.min(session.currentStopIndex + 1, stops.length || 1)} of {stops.length || 0}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-border/80 bg-card px-3 py-2.5">
            <Users className="size-3.5 text-muted-foreground" aria-hidden />
            <p className="mt-1 font-display text-lg font-semibold tabular-nums">{totalStudents}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Students</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card px-3 py-2.5">
            <p className="mt-1 font-display text-lg font-semibold tabular-nums text-success">
              {boarded}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Boarded</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card px-3 py-2.5">
            <p className="mt-1 font-display text-lg font-semibold tabular-nums">{dropped}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Dropped</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            onClick={() =>
              void navigate({ to: ROUTES.emergency, search: { confirm: true } })
            }
          >
            <Siren className="size-4" aria-hidden />
            SOS
          </Button>
          {onEndTrip ? (
            <Button
              type="button"
              variant="transport"
              className="flex-1"
              disabled={endingTrip}
              onClick={onEndTrip}
            >
              <Flag className="size-4" aria-hidden />
              End Trip
            </Button>
          ) : (
            <Button
              type="button"
              variant="transport"
              className="flex-1"
              onClick={() => void navigate({ to: ROUTES.attendance })}
            >
              <MapPinned className="size-4" aria-hidden />
              Continue trip
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CompletedTripSummary({ summary }: { summary: TripEndSummary }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <SummaryPill label="Students boarded" value={summary.studentsBoarded} />
      <SummaryPill label="Students dropped" value={summary.studentsDropped} />
      <SummaryPill label="Students remaining" value={summary.studentsRemaining} />
      <SummaryPill
        label="Stops completed"
        value={`${summary.stopsCompleted}/${summary.stopsTotal}`}
      />
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 px-3 py-2.5">
      <p className="transport-stat-label">{label}</p>
      <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

export function EndTripSummaryGrid({ summary }: { summary: TripEndSummary }) {
  return <CompletedTripSummary summary={summary} />;
}
