import { MapPin, MapPinOff } from "lucide-react";

import { useLocationTrack } from "@/hooks/use-trip-location-guard";
import { cn } from "@lumenx/ui";

/** Banner shown during an active trip when live GPS is lost. */
export function LocationTrackingBanner({ className }: { className?: string }) {
  const track = useLocationTrack();

  if (track.status === "unknown") return null;

  if (track.status === "on") {
    return (
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-2xl border border-success/30 bg-success/10 px-3.5 py-3",
          className,
        )}
      >
        <MapPin className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-success">GPS tracking on</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Live location is being monitored for this trip.
          </p>
        </div>
      </div>
    );
  }

  if (track.status === "checking") {
    return (
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-2xl border border-border bg-muted/40 px-3.5 py-3",
          className,
        )}
      >
        <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Checking GPS…</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Confirming live location for this trip.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/10 px-3.5 py-3",
        className,
      )}
      role="alert"
    >
      <MapPinOff className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-destructive">Location is off</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {track.message} Attendance marking is paused until GPS is back on.
        </p>
      </div>
    </div>
  );
}
