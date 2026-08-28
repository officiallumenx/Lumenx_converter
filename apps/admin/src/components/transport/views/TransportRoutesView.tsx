import { useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  Button,
  Pill,
  Modal,
  EmptyState,
  SearchInput,
  PageToolbar,
  ToolbarSpacer,
  CascadingFiltersMenu,
} from "@lumenx/ui-admin";
import { ArrowLeft, Lock, LockOpen, Route as RouteIcon } from "lucide-react";
import { TransportApprovalPanel } from "@/components/transport/TransportApprovalPanel";
import { TransportRouteDetail } from "@/components/transport/TransportRouteDetail";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  lockRoute,
  unlockRoute,
  uniqueStudentsOnRoute,
  routeDriverLabel,
  routeVehicleLabel,
  studentsByIds,
  type RouteConfigStatus,
  type TransportRoute,
  type TransportSnapshot,
} from "@/lib/transport-store";

type Props = {
  snapshot: TransportSnapshot;
  onChange: (next: TransportSnapshot) => void;
  writesEnabled?: boolean;
  listBlocked?: boolean;
  listHint?: string | null;
};

type StatusFilter = "all" | RouteConfigStatus;

const ROUTE_STATUS_META: Record<
  RouteConfigStatus,
  { label: string; tone: "success" | "warning" | "neutral" }
> = {
  not_configured: { label: "Not Configured", tone: "neutral" },
  configured: { label: "Configured", tone: "success" },
  locked: { label: "Locked", tone: "warning" },
};

export function TransportRoutesView({
  snapshot,
  onChange,
  writesEnabled = true,
  listBlocked = false,
  listHint = null,
}: Props) {
  const notify = useAdminToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [driverFilter, setDriverFilter] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [routeFilter, setRouteFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lockConfirm, setLockConfirm] = useState<TransportRoute | null>(null);
  const [unlockConfirm, setUnlockConfirm] = useState<TransportRoute | null>(null);

  const selected = snapshot.routes.find((r) => r.id === selectedId) ?? null;

  const rows = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return snapshot.routes.filter((r) => {
      if (statusFilter !== "all" && r.configStatus !== statusFilter) return false;
      if (driverFilter && r.driverId !== driverFilter) return false;
      if (vehicleFilter && r.vehicleId !== vehicleFilter) return false;
      if (routeFilter && r.id !== routeFilter) return false;

      if (!needle) return true;

      const driver = routeDriverLabel(snapshot, r).toLowerCase();
      const vehicle = routeVehicleLabel(snapshot, r).toLowerCase();
      const stopHit = r.setupStops.some(
        (s) =>
          s.name.toLowerCase().includes(needle) ||
          s.locationLabel.toLowerCase().includes(needle),
      );
      const studentHit = r.setupStops.some((s) =>
        studentsByIds(s.studentIds).some((st) => st.name.toLowerCase().includes(needle)),
      );

      return (
        r.name.toLowerCase().includes(needle) ||
        driver.includes(needle) ||
        vehicle.includes(needle) ||
        stopHit ||
        studentHit
      );
    });
  }, [snapshot, searchQuery, statusFilter, driverFilter, vehicleFilter, routeFilter]);

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setSelectedId(null)}>
            <ArrowLeft className="size-3.5" /> Back to routes
          </Button>
          <Pill tone={ROUTE_STATUS_META[selected.configStatus].tone}>
            {ROUTE_STATUS_META[selected.configStatus].label}
          </Pill>
          <div className="flex-1" />
          {writesEnabled ? (
          <>
          {selected.configStatus === "locked" ? (
            <Button size="sm" onClick={() => setUnlockConfirm(selected)}>
              <LockOpen className="size-3.5" /> Unlock Route
            </Button>
          ) : selected.setupStops.length > 0 ? (
            <Button size="sm" variant="primary" onClick={() => setLockConfirm(selected)}>
              <Lock className="size-3.5" /> Lock Route
            </Button>
          ) : null}
          </>
          ) : null}
        </div>

        {writesEnabled ? (
        <TransportApprovalPanel routeId={selected.id} />
        ) : null}

        <TransportRouteDetail
          snapshot={snapshot}
          route={selected}
          onChange={(next) => {
            onChange(next);
          }}
        />

        {writesEnabled ? (
        <>
        <Modal
          open={Boolean(lockConfirm)}
          onClose={() => setLockConfirm(null)}
          title="Lock route"
          size="sm"
          footer={
            <>
              <Button onClick={() => setLockConfirm(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (!lockConfirm) return;
                  onChange(lockRoute(snapshot, lockConfirm.id, "Admin"));
                  setLockConfirm(null);
                  notify("Route locked — driver edits disabled");
                }}
              >
                Lock Route
              </Button>
            </>
          }
        >
          <p className="text-xs text-muted-foreground">
            Drivers and attenders will not be able to edit stops, students, GPS, or order until
            unlocked.
          </p>
        </Modal>

        <Modal
          open={Boolean(unlockConfirm)}
          onClose={() => setUnlockConfirm(null)}
          title="Unlock route"
          size="sm"
          footer={
            <>
              <Button onClick={() => setUnlockConfirm(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (!unlockConfirm) return;
                  onChange(unlockRoute(snapshot, unlockConfirm.id));
                  setUnlockConfirm(null);
                  notify("Route unlocked");
                }}
              >
                Unlock Route
              </Button>
            </>
          }
        >
          <p className="text-xs text-muted-foreground">
            Drivers can edit stops again from the Transport App.
          </p>
        </Modal>
        </>
        ) : null}
      </div>
    );
  }

  if (listBlocked) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {listHint ?? "Loading routes…"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {writesEnabled ? (
      <TransportApprovalPanel
        title="Pending route setup requests"
        hint="All routes · open a route for lock/unlock and scoped review"
      />
      ) : null}

      <PageToolbar>
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search routes, stops, students…"
          className="w-full max-w-xs"
        />
        <ToolbarSpacer />
      </PageToolbar>

      <Card>
        <CardHeader title="Filters" hint="Route · driver · vehicle · status" />
        <div className="px-5 pb-5">
          <CascadingFiltersMenu
            groups={[
              {
                id: "route",
                label: "Route",
                value: routeFilter,
                clearValues: [""],
                onChange: setRouteFilter,
                options: [
                  { value: "", label: "All routes" },
                  ...snapshot.routes.map((r) => ({ value: r.id, label: r.name })),
                ],
              },
              {
                id: "driver",
                label: "Driver",
                value: driverFilter,
                clearValues: [""],
                onChange: setDriverFilter,
                options: [
                  { value: "", label: "All drivers" },
                  ...snapshot.drivers.map((d) => ({ value: d.id, label: d.name })),
                ],
              },
              {
                id: "vehicle",
                label: "Vehicle",
                value: vehicleFilter,
                clearValues: [""],
                onChange: setVehicleFilter,
                options: [
                  { value: "", label: "All vehicles" },
                  ...snapshot.vehicles.map((v) => ({
                    value: v.id,
                    label: v.vehicleNumber,
                  })),
                ],
              },
              {
                id: "status",
                label: "Status",
                value: statusFilter,
                onChange: (v) => setStatusFilter(v as StatusFilter),
                options: [
                  { value: "all", label: "All statuses" },
                  ...(Object.keys(ROUTE_STATUS_META) as RouteConfigStatus[]).map((status) => ({
                    value: status,
                    label: ROUTE_STATUS_META[status].label,
                  })),
                ],
              },
            ]}
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Routes"
          hint={
            writesEnabled
              ? `${rows.length} routes · review Transport App setup`
              : `${rows.length} routes · read-only`
          }
        />
        {rows.length === 0 ? (
          <div className="px-5 pb-8">
            <EmptyState
              icon={<RouteIcon className="size-5" />}
              title="No routes match"
              hint={
                writesEnabled
                  ? "Adjust search or filters to find a route."
                  : listHint ?? "No routes found for this institute."
              }
            />
          </div>
        ) : (
          <div className="px-5 pb-5 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3 font-medium">Route</th>
                  <th className="py-2 pr-3 font-medium">Vehicle</th>
                  <th className="py-2 pr-3 font-medium">Driver</th>
                  <th className="py-2 pr-3 font-medium">Stops</th>
                  <th className="py-2 pr-3 font-medium">Students</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{r.name}</td>
                    <td className="py-2.5 pr-3">{routeVehicleLabel(snapshot, r)}</td>
                    <td className="py-2.5 pr-3">{routeDriverLabel(snapshot, r)}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{r.setupStops.length}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{uniqueStudentsOnRoute(r)}</td>
                    <td className="py-2.5 pr-3">
                      <Pill tone={ROUTE_STATUS_META[r.configStatus].tone}>
                        {ROUTE_STATUS_META[r.configStatus].label}
                      </Pill>
                    </td>
                    <td className="py-2.5 text-right">
                      <Button size="sm" variant="primary" onClick={() => setSelectedId(r.id)}>
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
