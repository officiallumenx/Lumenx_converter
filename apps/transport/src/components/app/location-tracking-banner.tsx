import { useSyncExternalStore } from "react";
import { MapPin, MapPinOff, TriangleAlert, WifiOff } from "lucide-react";

import { useLocationTrack } from "@/hooks/use-trip-location-guard";
import {
  getGpsOutboxSnapshot,
  subscribeGpsOutbox,
} from "@/lib/transport/gps-outbox";
import { cn } from "@lumenx/ui";

/** Banner shown during an active trip for GPS + upload connection state. */
export function LocationTrackingBanner({ className }: { className?: string }) {
  const track = useLocationTrack();
  const outbox = useSyncExternalStore(
    subscribeGpsOutbox,
    getGpsOutboxSnapshot,
    getGpsOutboxSnapshot,
  );

  if (
    track.status === "unknown" &&
    outbox.pendingCount === 0 &&
    outbox.staleRejectedCount === 0
  ) {
    return null;
  }

  if (outbox.connection === "offline") {
    const pendingLabel =
      outbox.pendingCount > 0
        ? `${outbox.pendingCount} GPS point${outbox.pendingCount === 1 ? "" : "s"}`
        : null;
    return (
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-2xl border border-warning/40 bg-warning/10 px-3.5 py-3",
          className,
        )}
        role="status"
      >
        <WifiOff className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Connection lost</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {pendingLabel
              ? `${pendingLabel} queued — will retry when online.`
              : "Waiting for network to sync location."}
          </p>
        </div>
      </div>
    );
  }

  if (outbox.connection === "degraded" && outbox.pendingCount > 0) {
    const pendingLabel = `${outbox.pendingCount} GPS point${outbox.pendingCount === 1 ? "" : "s"}`;
    return (
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-2xl border border-warning/40 bg-warning/10 px-3.5 py-3",
          className,
        )}
        role="status"
      >
        <WifiOff className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Uploading GPS…</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {outbox.lastError
              ? `${pendingLabel} — ${outbox.lastError}`
              : `${pendingLabel} syncing to server…`}
          </p>
        </div>
      </div>
    );
  }

  if (
    outbox.connection === "stale_rejected" ||
    (outbox.staleRejectedCount > 0 &&
      outbox.pendingCount === 0 &&
      !outbox.lastSentAt)
  ) {
    const n = outbox.staleRejectedCount;
    return (
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-2xl border border-warning/40 bg-warning/10 px-3.5 py-3",
          className,
        )}
        role="status"
      >
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            GPS sync needs attention
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {n} older GPS point{n === 1 ? "" : "s"} could not be uploaded because{" "}
            {n === 1 ? "it was" : "they were"} too old. Fresh location will keep
            syncing.
          </p>
        </div>
      </div>
    );
  }

  if (outbox.connection === "gps_error" || track.status === "off") {
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
          <p className="text-sm font-semibold text-destructive">
            {track.status === "off" ? "Location is off" : "GPS problem"}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {outbox.lastGpsError ?? track.message}
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

  if (track.status === "on" || outbox.connection === "online") {
    const lastUpload =
      outbox.lastSentAt != null
        ? (() => {
            try {
              return new Date(outbox.lastSentAt).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
              });
            } catch {
              return null;
            }
          })()
        : null;
    const staleNote =
      outbox.staleRejectedCount > 0
        ? ` · ${outbox.staleRejectedCount} older point${outbox.staleRejectedCount === 1 ? "" : "s"} could not be synced`
        : "";
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
            Live location is sent about every 2–3 seconds
            {lastUpload ? ` · last uploaded ${lastUpload}` : ""}
            {staleNote}.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
