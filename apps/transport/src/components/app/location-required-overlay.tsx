import { useState } from "react";
import { Loader2, MapPinOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLocationTrack } from "@/hooks/use-trip-location-guard";
import { requestEnableLocation } from "@/lib/transport/location-tracking";

/**
 * Non-dismissable trip safety warning. It blocks app interaction until Android
 * reports that location services are enabled and a fresh GPS fix is available.
 */
export function LocationRequiredOverlay() {
  const track = useLocationTrack();
  const [requesting, setRequesting] = useState(false);

  if (track.status !== "off") return null;

  const turnOnLocation = async () => {
    if (requesting) return;
    setRequesting(true);
    await requestEnableLocation();
    setRequesting(false);
  };

  return (
    <div
      className="transport-location-block fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-5 pt-[var(--safe-area-top)] pb-[var(--safe-area-bottom)] backdrop-blur-[2px]"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="location-required-title"
      aria-describedby="location-required-description"
    >
      <div className="w-full max-w-[22rem] rounded-3xl border border-destructive/40 bg-card p-5 text-center shadow-elevated">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/12 text-destructive">
          <MapPinOff className="size-7" aria-hidden />
        </span>

        <h2
          id="location-required-title"
          className="mt-4 font-display text-xl font-semibold text-foreground"
        >
          Turn on location
        </h2>
        <p
          id="location-required-description"
          className="mt-2 text-sm leading-relaxed text-muted-foreground"
        >
          GPS must stay on during an active trip. Attendance is paused until location is restored.
        </p>

        <Button
          type="button"
          variant="transport"
          size="lg"
          expanded
          className="mt-5"
          disabled={requesting}
          onClick={() => void turnOnLocation()}
        >
          {requesting ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
          {requesting ? "Checking location…" : "Turn on location"}
        </Button>
      </div>
    </div>
  );
}
