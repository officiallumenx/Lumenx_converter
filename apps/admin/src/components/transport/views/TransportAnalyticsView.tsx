import { Card, CardHeader, Kpi, PageStack } from "@lumenx/ui-admin";
import { Link } from "@tanstack/react-router";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";
import { getTransportDashboard, type TransportSnapshot } from "@/lib/transport-store";

type Props = {
  snapshot: TransportSnapshot;
};

/** Transport module analytics — visualize only. Exports live in Reporting Center. */
export function TransportAnalyticsView({ snapshot }: Props) {
  const d = getTransportDashboard(snapshot);

  return (
    <PageStack>
      <div className="lx-kpi-grid">
        <Kpi label="Configured routes" value={String(d.configuredRoutes)} />
        <Kpi label="Locked routes" value={String(d.lockedRoutes)} />
        <Kpi label="Pending setup" value={String(d.pendingRouteSetup)} />
        <Kpi label="Transport students" value={String(d.totalTransportStudents)} />
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Transport insights"
          hint="Live dashboard · charts & insights only · no exports here"
        />
        <div className="px-5 pb-5 space-y-3 text-xs text-muted-foreground">
          <p>
            Counts reflect routes configured in the Transport App and reviewed here. This view is
            analytics only — download Excel, PDF, or CSV from the Reporting Center.
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Configured / locked / pending route setup</li>
            <li>Total GPS stops captured by drivers</li>
            <li>Unique students on transport (from ops enrollments)</li>
          </ul>
          <p>
            <Link to="/reports" className="font-medium text-primary hover:underline">
              Open {M.reports}
            </Link>{" "}
            for transport exports.
          </p>
        </div>
      </Card>
    </PageStack>
  );
}
