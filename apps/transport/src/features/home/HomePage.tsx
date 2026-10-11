import { useMemo, useState } from "react";
import { CheckCircle2, MapPinned, Play } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { DriverAssignmentGate } from "@/components/app/driver-assignment-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { LocationTrackingBanner } from "@/components/app/location-tracking-banner";
import { OfflineTripBanner } from "@/components/app/offline-trip-banner";
import { ROUTES } from "@/constants";
import { useAttendanceStudents } from "@/hooks/use-attendance-students";
import { useDriverAssignmentQuery } from "@/lib/transport-queries";
import { useTripSession } from "@/hooks/use-trip-session";
import {
  homeActionHeadline,
  homeActionPrimaryLabel,
  isTripActive,
  nextStartSlot,
  tripRepository,
  type TripSlot,
} from "@/lib/transport/trip";

import { ActiveTripPanel } from "./ActiveTripPanel";
import { StartTripReadinessDialog } from "./StartTripReadinessDialog";

function getGreeting(hour = new Date().getHours()): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function HomePage() {
  const navigate = useNavigate();
  const assignment = useDriverAssignmentQuery();
  const session = useTripSession();
  const students = useAttendanceStudents();
  const { bus, route, driver } = session.assignment;
  const greeting = getGreeting();
  const [readinessOpen, setReadinessOpen] = useState(false);
  /** Locked when the sheet opens so labels do not flip to Pickup after Drop starts. */
  const [readinessSlot, setReadinessSlot] = useState<TripSlot>("morning");
  const [dismissing, setDismissing] = useState(false);

  const action = session.homeAction;
  const headline = homeActionHeadline(action);
  const primaryLabel = homeActionPrimaryLabel(action);
  const tripActive = isTripActive(session.phase);
  const startSlot = nextStartSlot(action);

  const boarded = useMemo(
    () => students.filter((s) => s.boarding === "boarded").length,
    [students],
  );
  const dropped = useMemo(
    () => students.filter((s) => s.dropping === "dropped").length,
    [students],
  );

  const handlePrimaryAction = () => {
    if (action === "loading") return;
    if (action === "continue_pickup" || action === "continue_drop") {
      void navigate({ to: ROUTES.attendance });
      return;
    }
    if (action === "setup_route" || action === "add_stops") {
      void navigate({ to: ROUTES.routeSetup });
      return;
    }
    if (action === "day_complete") {
      toast.message("Trips complete for today", {
        description: "Pickup and Drop are both finished.",
      });
      return;
    }
    if (action === "start_pickup" || action === "start_drop") {
      setReadinessSlot(startSlot ?? (action === "start_drop" ? "evening" : "morning"));
      setReadinessOpen(true);
    }
  };

  const handleDismissCompleted = () => {
    setDismissing(true);
    void tripRepository.dismissCompleted().then((result) => {
      setDismissing(false);
      if (!result.ok) {
        toast.error("Couldn't reset trip", { description: result.reason });
        return;
      }
      toast.success(
        result.session.morningCompletedToday && !result.session.eveningCompletedToday
          ? "Ready for Drop trip"
          : "Ready for next trip",
      );
    });
  };

  const showPickupCompleteBanner =
    session.morningCompletedToday &&
    !session.eveningCompletedToday &&
    (action === "start_drop" ||
      (session.phase === "completed" && session.slot !== "evening"));

  return (
    <DriverAssignmentGate assignment={assignment}>
      <div className="min-w-0 w-full space-y-4 sm:space-y-5">
        {tripActive ? (
          <>
            <OfflineTripBanner />
            <LocationTrackingBanner />
          </>
        ) : null}

        {session.endSyncPending ? (
          <Card className="border-warning/40 bg-warning/5">
            <CardContent className="p-4 sm:p-5">
              <p className="font-display text-base font-semibold text-foreground">
                Ending trip — waiting for sync
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Trip end is queued. It is not confirmed complete until the server
                acknowledges. Stay on this trip until you reconnect.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {showPickupCompleteBanner ? (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="flex items-start gap-3 p-4 sm:p-5">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
              <div className="min-w-0">
                <p className="font-display text-base font-semibold text-foreground">
                  Pickup complete
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Next trip is Drop. Start when you are ready — no schedule window.
                </p>
                {session.phase === "completed" && session.lastSummary ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    loading={dismissing}
                    disabled={dismissing}
                    onClick={handleDismissCompleted}
                  >
                    Clear pickup summary
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {action === "day_complete" ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="space-y-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-display text-base font-semibold text-foreground">
                    Day complete
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Pickup and Drop finished for {bus.busNumber}
                  </p>
                </div>
                <StatusChip label="Completed" tone="success" />
              </div>
              {session.phase === "completed" ? (
                <Button
                  type="button"
                  variant="transport"
                  expanded
                  loading={dismissing}
                  disabled={dismissing}
                  onClick={handleDismissCompleted}
                >
                  Done
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {tripActive ? (
          <ActiveTripPanel
            session={session}
            boarded={boarded}
            dropped={dropped}
            totalStudents={students.length || session.assignment.totalStudents}
          />
        ) : null}

        <section className="transport-home-hero relative w-full min-w-0 overflow-hidden rounded-3xl border p-4 sm:p-5">
          <div className="transport-home-hero__accent absolute inset-x-0 top-0 h-1" aria-hidden />
          <div className="transport-home-hero__wash pointer-events-none absolute inset-0" aria-hidden />

          <div className="relative flex w-full min-w-0 flex-col gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                {greeting}
                {driver.name && driver.name !== "—" ? ` · ${driver.name}` : ""}
              </p>
              <h1 className="mt-1 font-display text-xl font-semibold leading-tight text-pretty text-foreground sm:text-2xl">
                Today&apos;s trip
              </h1>
              <p className="mt-3 font-display text-lg font-semibold tracking-wide text-transport">
                {headline.tripTitle}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{headline.status}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusChip
                  label={headline.status}
                  tone={
                    action === "setup_route" || action === "add_stops"
                      ? "warning"
                      : tripActive
                        ? "success"
                        : action === "day_complete"
                          ? "success"
                          : "transport"
                  }
                />
                {bus.busNumber !== "—" ? (
                  <StatusChip label={bus.busNumber} tone="neutral" />
                ) : null}
                {route.code !== "—" ? (
                  <StatusChip label={route.code} tone="neutral" />
                ) : null}
              </div>
            </div>

            {action === "setup_route" ? (
              <Card className="border-transport/40 bg-transport/10 shadow-none">
                <CardContent className="flex flex-col gap-2 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    No stops on this route yet. Add stops before starting a trip.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => void navigate({ to: ROUTES.routeSetup })}
                  >
                    <MapPinned className="size-4" aria-hidden />
                    Route setup
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            <Button
              type="button"
              variant="transport"
              size="lg"
              expanded
              className="transport-pressable min-h-12 text-base"
              onClick={handlePrimaryAction}
              disabled={action === "loading" || action === "day_complete"}
              loading={action === "loading"}
            >
              {action === "loading" ? null : <Play className="size-5" aria-hidden />}
              {primaryLabel}
            </Button>
          </div>
        </section>

        <StartTripReadinessDialog
          open={readinessOpen}
          onOpenChange={setReadinessOpen}
          tripSlot={readinessSlot}
        />
      </div>
    </DriverAssignmentGate>
  );
}
