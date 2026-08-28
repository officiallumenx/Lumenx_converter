import { Card, CardHeader, Button, Kpi, PageStack, Pill } from "@lumenx/ui-admin";
import { Bus, MapPin, Route, UserRound, Users } from "lucide-react";
import type { TransportHubView } from "@/routes/transport";
import type {
  TransportDriversListView,
  TransportEnrollmentsListView,
  TransportRoutesListView,
  TransportVehiclesListView,
} from "@/lib/transport";

type Props = {
  vehiclesView: TransportVehiclesListView;
  driversView: TransportDriversListView;
  routesView: TransportRoutesListView;
  enrollmentsView: TransportEnrollmentsListView;
  onNavigate: (view: TransportHubView) => void;
};

function countOrDash(valid: boolean, value: number): string {
  return valid ? String(value) : "…";
}

export function TransportDashboardApiView({
  vehiclesView,
  driversView,
  routesView,
  enrollmentsView,
  onNavigate,
}: Props) {
  const rowsValid =
    vehiclesView.rowsValid &&
    driversView.rowsValid &&
    routesView.rowsValid &&
    enrollmentsView.rowsValid;

  const configuredRoutes = routesView.items.filter(
    (route) => route.configStatus === "configured",
  ).length;
  const lockedRoutes = routesView.items.filter(
    (route) => route.configStatus === "locked",
  ).length;
  const totalStops = routesView.items.reduce(
    (count, route) => count + route.setupStops.length,
    0,
  );
  const activeEnrollments = enrollmentsView.items.filter(
    (item) => item.status === "active",
  ).length;

  return (
    <PageStack>
      <Pill tone="neutral">Read-only · API mode · fleet overview</Pill>
      <div className="lx-kpi-grid">
        <Kpi
          label="Drivers"
          value={countOrDash(driversView.rowsValid, driversView.items.length)}
          icon={<UserRound className="size-3.5" />}
        />
        <Kpi
          label="Buses"
          value={countOrDash(vehiclesView.rowsValid, vehiclesView.items.length)}
          icon={<Bus className="size-3.5" />}
        />
        <Kpi
          label="Routes"
          value={countOrDash(routesView.rowsValid, routesView.items.length)}
          icon={<Route className="size-3.5" />}
        />
        <Kpi label="Configured" value={countOrDash(routesView.rowsValid, configuredRoutes)} />
        <Kpi label="Locked routes" value={countOrDash(routesView.rowsValid, lockedRoutes)} />
        <Kpi
          label="Route stops"
          value={countOrDash(routesView.rowsValid, totalStops)}
          icon={<MapPin className="size-3.5" />}
        />
        <Kpi
          label="Enrollments"
          value={countOrDash(enrollmentsView.rowsValid, enrollmentsView.items.length)}
          icon={<Users className="size-3.5" />}
        />
        <Kpi label="Active riders" value={countOrDash(enrollmentsView.rowsValid, activeEnrollments)} />
      </div>

      <Card>
        <CardHeader
          title="Quick navigation"
          hint={
            rowsValid
              ? "Open a transport area to inspect API data"
              : "Loading transport summary…"
          }
        />
        <div className="flex flex-wrap gap-2 px-4 pb-5 sm:px-5">
          <Button size="sm" variant="outline" onClick={() => onNavigate("vehicles")}>
            Vehicles
          </Button>
          <Button size="sm" variant="outline" onClick={() => onNavigate("drivers")}>
            Drivers
          </Button>
          <Button size="sm" variant="outline" onClick={() => onNavigate("routes")}>
            Routes
          </Button>
          <Button size="sm" variant="outline" onClick={() => onNavigate("stops")}>
            Stops
          </Button>
          <Button size="sm" variant="outline" onClick={() => onNavigate("students")}>
            Students
          </Button>
          <Button size="sm" variant="outline" onClick={() => onNavigate("settings")}>
            Settings
          </Button>
        </div>
      </Card>
    </PageStack>
  );
}
