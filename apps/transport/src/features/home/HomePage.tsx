import { useEffect, useMemo, useState } from "react";
import { Bus, MapPinned, Play, Route, Users } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  newEnrollmentsForVehicle,
  TRANSPORT_OPS_CHANGED_EVENT,
} from "@lumenx/utils";
import { toast } from "sonner";

import { DriverAssignmentGate } from "@/components/app/driver-assignment-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconWell } from "@/components/ui/icon-well";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusChip } from "@/components/ui/status-chip";
import { LocationTrackingBanner } from "@/components/app/location-tracking-banner";
import { OfflineTripBanner } from "@/components/app/offline-trip-banner";
import { ROUTES } from "@/constants";
import { useAttendanceStudents } from "@/hooks/use-attendance-students";
import { useDriverAssignment } from "@/hooks/use-driver-assignment";
import { useRouteSetup } from "@/hooks/use-route-setup";
import { useTripSession } from "@/hooks/use-trip-session";
import { isTripActive, tripPhaseLabel, tripRepository } from "@/lib/transport/trip";
import { MODULE_COLORS } from "@/theme/colors";

import { ActiveTripPanel, EndTripSummaryGrid } from "./ActiveTripPanel";
import { HomeClockCards } from "./HomeClockCards";
import { StartTripReadinessDialog } from "./StartTripReadinessDialog";

function getGreeting(hour = new Date().getHours()): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function HomePage() {
  const navigate = useNavigate();
  const assignment = useDriverAssignment();
  const session = useTripSession();
  const routeSetup = useRouteSetup();
  const students = useAttendanceStudents();
  const { bus, route, totalStudents, driver } = session.assignment;
  const greeting = getGreeting();
  const [readinessOpen, setReadinessOpen] = useState(false);
  const [pendingStops, setPendingStops] = useState(0);
  const [dismissing, setDismissing] = useState(false);
  const tripActive = isTripActive(session.phase);
  const tripCompleted = session.phase === "completed";
  const needsRouteSetup =
    routeSetup.status === "not_configured" && !routeSetup.lockedByAdmin;
  const waitingAdminStops = useMemo(
    () => routeSetup.stops.filter((s) => s.status === "pending").length,
    [routeSetup.stops],
  );
  const hasApprovedStops = useMemo(
    () => routeSetup.stops.some((s) => s.status === "approved"),
    [routeSetup.stops],
  );
  const homeStatus = tripActive
    ? { label: tripPhaseLabel(session.phase), tone: "success" as const }
    : tripCompleted
      ? { label: "Completed", tone: "success" as const }
      : needsRouteSetup
        ? { label: "Set up route", tone: "warning" as const }
        : waitingAdminStops > 0 && !hasApprovedStops
          ? { label: "Waiting for Admin", tone: "warning" as const }
          : { label: "Ready to start", tone: "transport" as const };

  const primaryLabel = tripActive
    ? "Continue trip"
    : tripCompleted
      ? "Trip completed"
      : needsRouteSetup
        ? "Set up route"
        : waitingAdminStops > 0 && !hasApprovedStops
          ? "View stops"
          : "Start trip";

  const boarded = useMemo(
    () => students.filter((s) => s.boarding === "boarded").length,
    [students],
  );
  const dropped = useMemo(
    () => students.filter((s) => s.dropping === "dropped").length,
    [students],
  );

  useEffect(() => {
    if (!bus.vehicleId) {
      setPendingStops(0);
      return;
    }
    const refresh = () =>
      setPendingStops(newEnrollmentsForVehicle(bus.vehicleId).length);
    refresh();
    window.addEventListener(TRANSPORT_OPS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(TRANSPORT_OPS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [bus.vehicleId]);

  const handlePrimaryAction = () => {
    if (tripActive) {
      void navigate({ to: ROUTES.attendance });
      return;
    }
    if (tripCompleted) {
      toast.message("Trip already completed", {
        description: "Review the summary, then tap Done for the next trip.",
      });
      return;
    }
    if (needsRouteSetup || (waitingAdminStops > 0 && !hasApprovedStops)) {
      void navigate({ to: ROUTES.routeSetup });
      return;
    }
    setReadinessOpen(true);
  };

  const handleDismissCompleted = () => {
    setDismissing(true);
    void tripRepository.dismissCompleted().then((result) => {
      setDismissing(false);
      if (!result.ok) {
        toast.error("Cannot reset trip", { description: result.reason });
        return;
      }
      toast.success("Ready for next trip");
    });
  };

  return (
    <DriverAssignmentGate assignment={assignment}>
      <div className="min-w-0 w-full space-y-4 sm:space-y-5">
        {tripActive ? (
          <>
            <OfflineTripBanner />
            <LocationTrackingBanner />
          </>
        ) : null}

        {assignment.lockedByAdmin ? (
          <Card className="border-warning/40 bg-warning/10">
            <CardContent className="p-4 sm:p-5">
              <p className="font-display text-base font-semibold text-foreground">Route locked</p>
              <p className="mt-1 text-sm text-muted-foreground">
                An administrator locked this route. You can review the trip but cannot edit stops.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {needsRouteSetup ? (
          <Card className="border-transport/40 bg-transport/10">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="min-w-0">
                <p className="font-display text-base font-semibold text-foreground">Set up your route</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Drive to each stop, save GPS, and add students. Admin must approve before trips.
                </p>
              </div>
              <Button
                type="button"
                variant="transport"
                className="shrink-0"
                onClick={() => void navigate({ to: ROUTES.routeSetup })}
              >
                <MapPinned className="size-4" aria-hidden />
                Set up route
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {pendingStops > 0 ? (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="min-w-0">
                <p className="font-display text-base font-semibold text-foreground">
                  {pendingStops} student{pendingStops === 1 ? "" : "s"} need a stop
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Assigned to {bus.busNumber} by Admin · use Route Setup → Students → New
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => void navigate({ to: ROUTES.routeSetup })}
              >
                <MapPinned className="size-4" aria-hidden />
                Assign stops
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {waitingAdminStops > 0 && !needsRouteSetup && !tripActive && !tripCompleted ? (
          <Card className="border-warning/40 bg-warning/10">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="min-w-0">
                <p className="font-display text-base font-semibold text-foreground">
                  {waitingAdminStops} stop{waitingAdminStops === 1 ? "" : "s"} waiting for Admin
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {hasApprovedStops
                    ? "You can start with approved stops. New ones go live after Admin approves."
                    : "Admin must approve your stops before you can start a trip."}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => void navigate({ to: ROUTES.routeSetup })}
              >
                <MapPinned className="size-4" aria-hidden />
                View stops
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {tripCompleted && session.lastSummary ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="space-y-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-display text-base font-semibold text-foreground">
                    Trip completed
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Summary for {bus.busNumber} · {route.code}
                  </p>
                </div>
                <StatusChip label="Completed" tone="success" />
              </div>
              <EndTripSummaryGrid summary={session.lastSummary} />
              <Button
                type="button"
                variant="transport"
                expanded
                loading={dismissing}
                disabled={dismissing}
                onClick={handleDismissCompleted}
              >
                Done — ready for next trip
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {tripActive ? (
          <ActiveTripPanel
            session={session}
            boarded={boarded}
            dropped={dropped}
            totalStudents={students.length || totalStudents}
          />
        ) : null}

        <section className="transport-home-hero relative w-full min-w-0 overflow-hidden rounded-3xl border p-4 sm:p-5">
          <div className="transport-home-hero__accent absolute inset-x-0 top-0 h-1" aria-hidden />
          <div className="transport-home-hero__wash pointer-events-none absolute inset-0" aria-hidden />

          <div className="relative flex w-full min-w-0 flex-col gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{greeting}</p>
              <h1 className="mt-1 font-display text-xl font-semibold leading-tight text-pretty text-foreground sm:text-2xl">
                Today&apos;s shift
              </h1>
              <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-pretty text-muted-foreground">
                {tripActive
                  ? "Trip is running. Mark boarding and dropping as students get on and off."
                  : tripCompleted
                    ? "Last trip finished. Tap Done when you are ready for the next one."
                    : needsRouteSetup
                      ? "Add your stops first, then wait for Admin approval."
                      : waitingAdminStops > 0 && !hasApprovedStops
                        ? "Stops sent. Waiting for Admin before you can start."
                        : "When you are at the first stop, start the trip."}
              </p>
              <div className="mt-3">
                <StatusChip label={homeStatus.label} tone={homeStatus.tone} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              <div className="transport-home-hero__stat min-w-0 rounded-2xl border p-2.5 sm:p-3">
                <Bus className="size-4 text-transport" aria-hidden />
                <p className="mt-1.5 truncate font-display text-sm font-semibold text-foreground sm:text-base">
                  {bus.busNumber}
                </p>
                <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                  Bus
                </p>
              </div>
              <div className="transport-home-hero__stat min-w-0 rounded-2xl border p-2.5 sm:p-3">
                <Route className="size-4 text-transport" aria-hidden />
                <p className="mt-1.5 truncate font-display text-sm font-semibold text-foreground sm:text-base">
                  {route.code}
                </p>
                <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                  Route
                </p>
              </div>
              <div className="transport-home-hero__stat min-w-0 rounded-2xl border p-2.5 sm:p-3">
                <Users className="size-4 text-transport" aria-hidden />
                <p className="mt-1.5 font-display text-sm font-semibold tabular-nums text-foreground sm:text-base">
                  {totalStudents}
                </p>
                <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                  Students
                </p>
              </div>
            </div>

            <HomeClockCards variant="inline" />

            <Button
              type="button"
              variant="transport"
              size="lg"
              expanded
              className="transport-pressable"
              onClick={handlePrimaryAction}
              disabled={tripCompleted}
            >
              <Play className="size-5" aria-hidden />
              {primaryLabel}
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader title="Your bus today" subtitle="Bus, route, and approved stops" />
          <Card className="transport-home-detail-card overflow-hidden">
            <CardContent className="space-y-0 p-0">
              <div className="flex items-start gap-3 border-b border-border p-4 sm:p-5">
                <IconWell icon={Bus} size="lg" color={MODULE_COLORS.transport} />
                <div className="min-w-0 flex-1">
                  <p className="transport-stat-label">Bus number</p>
                  <p className="mt-0.5 font-display text-lg font-semibold tracking-tight break-words text-foreground">
                    {bus.busNumber}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Driver · {driver.name}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 sm:p-5">
                <IconWell icon={MapPinned} size="lg" color={MODULE_COLORS.transport} />
                <div className="min-w-0 flex-1">
                  <p className="transport-stat-label">Assigned route</p>
                  <p className="mt-0.5 font-display text-lg font-semibold tracking-tight text-foreground">
                    {route.code}
                  </p>
                  <p className="mt-0.5 text-sm break-words text-muted-foreground">{route.name}</p>
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    <Route className="size-3.5 shrink-0 text-transport" aria-hidden />
                    {route.stops.length > 0
                      ? `${route.stops.length} approved stops on this route`
                      : "No approved stops yet"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <StartTripReadinessDialog open={readinessOpen} onOpenChange={setReadinessOpen} />
      </div>
    </DriverAssignmentGate>
  );
}
