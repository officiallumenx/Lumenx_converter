import { MapPin, Navigation } from "lucide-react";
import { SectionCard } from "@/components/app/SectionCard";
import type {
  StudentTransportAssignment,
  TransportStop,
  TransportTracking,
} from "@/lib/transport/types";
import { formatEtaMinutes, trackingStatusLabel } from "@/lib/transport-utils";
import { Badge, cn } from "@lumenx/ui";

export function TransportEtaBanner({
  tracking,
  assignment,
  viewer,
}: {
  tracking: TransportTracking;
  assignment?: StudentTransportAssignment;
  viewer?: "parent" | "student";
}) {
  const awaitingPickup = tracking.learnerStatus === "awaiting_pickup";
  const pickedUp = tracking.learnerStatus === "picked_up";
  const reachedSchool = tracking.learnerStatus === "reached_school";
  const emergency = Boolean(tracking.emergencyActive);
  const urgent = !emergency && awaitingPickup && tracking.etaMinutes <= 5;
  const stopOwner =
    viewer === "student"
      ? "your stop"
      : assignment
        ? `${assignment.studentName.split(" ")[0]}'s stop`
        : "the next stop";
  const headline = emergency
    ? tracking.emergencyLabel || "Emergency on bus"
    : reachedSchool
      ? "Reached school"
      : pickedUp
        ? "Picked up"
        : tracking.runStatus === "scheduled"
          ? "Trip not started"
          : formatEtaMinutes(tracking.etaMinutes);
  const detail = emergency
    ? assignment
      ? `${assignment.bus.busNumber} · ${assignment.bus.routeCode} · Admin is handling this SOS.`
      : "An emergency is active on this bus."
    : reachedSchool
      ? assignment
        ? `${assignment.studentName} reached school safely.`
        : "The bus reached school safely."
      : pickedUp
        ? assignment
          ? `${assignment.studentName} is on the bus and heading to school.`
          : "The student is on the bus and heading to school."
        : tracking.runStatus === "scheduled"
          ? assignment
            ? `Waiting for ${assignment.bus.busNumber} to start · ${assignment.pickupStop.name}`
            : "Waiting for the driver to start the trip."
          : assignment
            ? `${formatEtaMinutes(tracking.etaMinutes)} to ${stopOwner} · ${assignment.pickupStop.name} · scheduled ${assignment.pickupStop.scheduledTime}`
            : `Next: ${tracking.nextStopName}`;

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        emergency && "border-destructive/40 bg-destructive/10",
        urgent && "border-warning/40 bg-warning/10",
        !emergency && (pickedUp || reachedSchool) && "border-success/40 bg-success/10",
        !emergency && !urgent && !pickedUp && !reachedSchool && "border-primary/30 bg-primary/5",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {emergency
              ? "Emergency status"
              : reachedSchool
                ? "Journey complete"
                : pickedUp
                  ? "Current status"
                  : tracking.runStatus === "scheduled"
                    ? "Trip status"
                    : `Time to ${stopOwner}`}
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">{headline}</p>
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "rounded-lg",
            emergency && "border-destructive/50 text-destructive",
            urgent && "border-warning/50 text-warning-foreground",
            !emergency && (pickedUp || reachedSchool) && "border-success/50 text-success",
          )}
        >
          {trackingStatusLabel(tracking)}
        </Badge>
      </div>
    </div>
  );
}

export function TransportRouteTimeline({
  stops,
  tracking,
  highlightStopId,
}: {
  stops: TransportStop[];
  tracking: TransportTracking;
  highlightStopId?: string;
}) {
  return (
    <SectionCard title="Route & stops">
      <ol className="relative space-y-0">
        {stops.map((stop, index) => {
          const isCurrent = index === tracking.currentStopIndex;
          const isPast = index < tracking.currentStopIndex || tracking.progressPercent >= 95;
          const isHighlight = stop.id === highlightStopId;
          const isLast = index === stops.length - 1;

          return (
            <li key={stop.id} className="relative flex gap-3 pb-5 last:pb-0">
              {!isLast && (
                <span
                  className={cn(
                    "absolute left-[11px] top-6 h-[calc(100%-8px)] w-0.5",
                    isPast ? "bg-primary/50" : "bg-border",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 bg-card",
                  isCurrent && "border-primary bg-primary text-primary-foreground",
                  isPast && !isCurrent && "border-primary/40 bg-primary/10",
                  !isPast && !isCurrent && "border-border",
                )}
              >
                {isCurrent ? (
                  <Navigation className="size-3" />
                ) : (
                  <span className="text-[10px] font-semibold">{stop.order}</span>
                )}
              </span>
              <div
                className={cn(
                  "min-w-0 flex-1 rounded-xl border px-3 py-2.5",
                  isHighlight && "border-amber-500/40 bg-amber-500/5",
                  isCurrent && !isHighlight && "border-primary/30 bg-primary/5",
                  !isHighlight && !isCurrent && "border-border",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-sm">{stop.name}</p>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {stop.scheduledTime}
                  </span>
                </div>
                <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3 shrink-0 mt-0.5" />
                  {stop.address}
                </p>
                {isHighlight && (
                  <Badge className="mt-2 border-0 bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px]">
                    Your stop
                  </Badge>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
}

export function TransportTrackingPanel({ tracking }: { tracking: TransportTracking }) {
  const sourceLabel = tracking.emergencyActive
    ? "Emergency overlay"
    : tracking.sharedTripActive
      ? "Driver trip"
      : "Simulated GPS";

  return (
    <SectionCard title="Live tracking">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-white min-h-[180px]">
        <div className="absolute inset-0 opacity-30">
          <svg className="h-full w-full" viewBox="0 0 400 180" preserveAspectRatio="none">
            <path
              d="M20,140 Q120,40 200,90 T380,60"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray="8 6"
              className="text-white/40"
            />
          </svg>
        </div>
        <div className="relative z-10 flex h-full flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-white/60">{sourceLabel}</p>
              <p className="font-semibold">{tracking.nextStopName}</p>
            </div>
            <Badge className="border-0 bg-white/15 text-white">{tracking.lastUpdated}</Badge>
          </div>
          <div>
            <div className="mb-2 flex justify-between text-xs text-white/70">
              <span>Route progress</span>
              <span>{tracking.progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                style={{ width: `${tracking.progressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-white/60">
              Lat {tracking.lat.toFixed(4)}, Lng {tracking.lng.toFixed(4)}
              {tracking.sharedTripActive ? " · Shared trip" : " · Demo tracking"}
            </p>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
