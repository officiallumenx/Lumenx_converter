import { Bus, Hash, MapPinned, Route as RouteIcon, UserRound, Users } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

import { DriverAssignmentGate } from "@/components/app/driver-assignment-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureHero } from "@/components/ui/feature-hero";
import { InfoField } from "@/components/ui/info-field";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusChip } from "@/components/ui/status-chip";
import { ROUTES } from "@/constants";
import { useDriverAssignment } from "@/hooks/use-driver-assignment";
import { useRouteSetup } from "@/hooks/use-route-setup";
import { useTripSession } from "@/hooks/use-trip-session";
import { routeSetupRepository } from "@/lib/transport/route-setup";
import { MODULE_COLORS } from "@/theme/colors";

export function BusInformationPage() {
  const navigate = useNavigate();
  const assignment = useDriverAssignment();
  const session = useTripSession();
  const setup = useRouteSetup();
  const trip = session.assignment;
  const bus = {
    busNumber: trip.bus.busNumber,
    vehicleNumber: trip.bus.vehicleNumber,
    driverName: trip.driver.name,
    assignedRoute: trip.route,
    stops: trip.route.stops,
    capacity: trip.bus.capacity,
  };

  const notConfigured = setup.status === "not_configured";

  return (
    <DriverAssignmentGate assignment={assignment}>
      <div className="min-w-0 space-y-5 sm:space-y-6">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <StatusChip
            label={
              setup.lockedByAdmin
                ? "Locked — ask Admin"
                : setup.status === "configured"
                  ? "Route ready"
                  : "Needs route setup"
            }
            tone={
              setup.lockedByAdmin
                ? "warning"
                : setup.status === "configured"
                  ? "success"
                  : "neutral"
            }
          />
        </div>

        {notConfigured && !setup.lockedByAdmin ? (
          <Card className="border-transport/40 bg-transport/10">
            <CardContent className="space-y-3 p-4 sm:p-5">
              <p className="font-display text-base font-semibold text-foreground">Set up your route</p>
              <p className="text-sm text-muted-foreground">
                Drive to each stop, save GPS, and add students. Admin must approve before trips.
              </p>
              <Button
                type="button"
                variant="transport"
                expanded
                onClick={() => void navigate({ to: ROUTES.routeSetup })}
              >
                <MapPinned className="size-4" aria-hidden />
                Go to Route Setup
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <FeatureHero
          icon={Bus}
          moduleColor={MODULE_COLORS.transport}
          title={bus.busNumber}
          subtitle={`Driver · ${bus.driverName}`}
          action={
            <div className="shrink-0 rounded-xl bg-card/90 px-2.5 py-1.5 text-center shadow-soft">
              <p className="transport-stat-label">Capacity</p>
              <p className="font-display text-lg font-semibold tabular-nums text-foreground">
                {bus.capacity}
              </p>
            </div>
          }
        />

        <section className="grid gap-3 sm:grid-cols-2">
          <InfoField
            icon={Hash}
            label="Bus number"
            value={bus.busNumber}
            color={MODULE_COLORS.transport}
          />
          <InfoField
            icon={UserRound}
            label="Driver"
            value={bus.driverName}
            color={MODULE_COLORS.success}
          />
          <InfoField
            icon={RouteIcon}
            label="Assigned route"
            value={bus.assignedRoute.code}
            hint={bus.assignedRoute.name}
            color={MODULE_COLORS.primary}
          />
          <InfoField
            icon={Users}
            label="Capacity"
            value={`${bus.capacity} seats`}
            hint="Maximum passenger capacity"
            color={MODULE_COLORS.warning}
          />
          <InfoField
            icon={MapPinned}
            label="Stops"
            value={`${bus.stops.length} stops`}
            hint={bus.assignedRoute.name}
            color={MODULE_COLORS.transport}
          />
        </section>

        <section className="space-y-3">
          <SectionHeader
            title="Stops"
            subtitle={
              setup.stops.length > 0
                ? "Configured pickup sequence with GPS"
                : "Complete Route Setup to capture stops"
            }
          />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPinned
                  className="size-4"
                  style={{ color: MODULE_COLORS.transport.primary }}
                  aria-hidden
                />
                Route stop list
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pb-4 sm:pb-5">
              {setup.stops.length === 0 ? (
                <div className="space-y-3 px-1 py-4">
                  <p className="text-sm text-muted-foreground">No stops yet.</p>
                  {!setup.lockedByAdmin ? (
                    <Button
                      type="button"
                      variant="transport"
                      onClick={() => void navigate({ to: ROUTES.routeSetup })}
                    >
                      <MapPinned className="size-4" aria-hidden />
                      Go to Route Setup
                    </Button>
                  ) : null}
                </div>
              ) : (
                [...setup.stops]
                  .sort((a, b) => a.routeOrder - b.routeOrder)
                  .map((stop, index) => {
                    const students = routeSetupRepository.studentsByIds(stop.studentIds);
                    return (
                      <div
                        key={stop.id}
                        className="flex items-start gap-3 rounded-2xl border border-border/80 bg-muted/30 px-3 py-3"
                      >
                        <span
                          className="flex size-9 shrink-0 items-center justify-center rounded-xl font-display text-sm font-semibold"
                          style={{
                            color: MODULE_COLORS.primary.primary,
                            backgroundColor: MODULE_COLORS.primary.iconBackground,
                          }}
                        >
                          {stop.routeOrder}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">{stop.name}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {students.length > 0
                              ? students.map((s) => s.name).join(", ")
                              : "No students assigned"}
                          </p>
                          {index === 0 ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">First stop</p>
                          ) : index === setup.stops.length - 1 ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">Last stop</p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </DriverAssignmentGate>
  );
}
