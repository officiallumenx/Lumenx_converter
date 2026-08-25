import { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  Pill,
} from "@lumenx/ui-admin";
import { Pencil } from "lucide-react";
import {
  ENTITY_STATUS_PILL_TONE,
  getVehicleDetail,
  type EntityStatus,
  type TransportSnapshot,
  type TransportVehicle,
} from "@/lib/transport-store";
import {
  loadAllStops,
  loadAllAssignments,
  TRANSPORT_APPROVAL_CHANGED_EVENT,
  type PendingRouteStop,
  type PendingStudentAssignment,
} from "@/lib/transport-approval-store";

type Props = {
  snapshot: TransportSnapshot;
  vehicleId: string;
  onEdit: (vehicle: TransportVehicle) => void;
};

const ROUTE_STATUS: Record<
  string,
  { label: string; tone: "success" | "warning" | "neutral" }
> = {
  not_configured: { label: "Not configured", tone: "neutral" },
  configured: { label: "Configured", tone: "success" },
  locked: { label: "Locked", tone: "warning" },
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value || "—"}</div>
    </div>
  );
}

export function TransportVehicleDetail({ snapshot, vehicleId, onEdit }: Props) {
  const detail = getVehicleDetail(snapshot, vehicleId);
  if (!detail) return null;

  const { vehicle, driver, route, driverAccount, totalStudents, configuredStops } = detail;
  const routeStatus = route ? ROUTE_STATUS[route.configStatus] : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={vehicle.vehicleNumber}
          hint={`${vehicle.registrationNumber} · capacity ${vehicle.capacity}`}
          action={
            <Button size="sm" onClick={() => onEdit(vehicle)}>
              <Pencil className="size-3.5" /> Edit bus
            </Button>
          }
        />
        <div className="grid grid-cols-2 gap-3 px-5 pb-5 sm:grid-cols-3 lg:grid-cols-4">
          <DetailRow label="Bus number" value={vehicle.vehicleNumber} />
          <DetailRow label="Registration" value={vehicle.registrationNumber} />
          <DetailRow label="Capacity" value={String(vehicle.capacity)} />
          <div className="rounded-lg border border-border p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</div>
            <div className="mt-1">
              <Pill tone={ENTITY_STATUS_PILL_TONE[vehicle.status]}>{vehicle.status}</Pill>
            </div>
          </div>
          {vehicle.notes ? (
            <div className="rounded-lg border border-border p-3 sm:col-span-2 lg:col-span-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Notes</div>
              <div className="mt-1 text-sm text-foreground">{vehicle.notes}</div>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Assigned driver" hint="Reassign from Edit bus or Drivers view" />
          <div className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-2">
            <DetailRow label="Name" value={driver?.name ?? "Unassigned"} />
            <DetailRow label="Mobile" value={driver?.phone ?? "—"} />
            <DetailRow label="License" value={driver?.licenseNumber ?? "—"} />
            <DetailRow label="License expiry" value={driver?.licenseExpiry ?? "—"} />
            {driver ? (
              <div className="rounded-lg border border-border p-3 sm:col-span-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Driver status
                </div>
                <div className="mt-1">
                  <Pill tone={ENTITY_STATUS_PILL_TONE[driver.status as EntityStatus]}>
                    {driver.status}
                  </Pill>
                </div>
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader title="Transport app account" hint="Driver login · demo OTP" />
          <div className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-2">
            {driverAccount ? (
              <>
                <DetailRow label="Employee ID" value={driverAccount.employeeId} />
                <DetailRow label="Login mobile" value={driverAccount.phoneDigits} />
                <div className="rounded-lg border border-border p-3 sm:col-span-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Account status
                  </div>
                  <div className="mt-1">
                    <Pill tone={driverAccount.status === "active" ? "success" : "neutral"}>
                      {driverAccount.status}
                    </Pill>
                  </div>
                </div>
              </>
            ) : (
              <p className="px-5 pb-5 text-sm text-muted-foreground sm:col-span-2">
                No Transport app account yet. Create one from the Drivers view when adding or editing
                this driver.
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Route & students" hint="From driver setup and student enrollments" />
        <div className="grid grid-cols-2 gap-3 px-5 pb-5 sm:grid-cols-4">
          <DetailRow label="Route" value={route?.name ?? "—"} />
          <div className="rounded-lg border border-border p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Route status
            </div>
            <div className="mt-1">
              {routeStatus ? (
                <Pill tone={routeStatus.tone}>{routeStatus.label}</Pill>
              ) : (
                <span className="text-sm font-medium">—</span>
              )}
            </div>
          </div>
          <DetailRow label="Configured stops" value={String(configuredStops)} />
          <DetailRow label="Total students" value={String(totalStudents)} />
        </div>
      </Card>

      <DriverSubmissionsSummary />
    </div>
  );
}

function DriverSubmissionsSummary() {
  const [stops, setStops] = useState<PendingRouteStop[]>([]);
  const [assignments, setAssignments] = useState<PendingStudentAssignment[]>([]);

  const refresh = () => {
    setStops(loadAllStops());
    setAssignments(loadAllAssignments());
  };

  useEffect(() => {
    refresh();
    window.addEventListener(TRANSPORT_APPROVAL_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(TRANSPORT_APPROVAL_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const approvedStops = stops.filter((s) => s.status === "approved");
  const pendingStops = stops.filter((s) => s.status === "pending");
  const approvedAssignments = assignments.filter((a) => a.status === "approved");
  const pendingAssignments = assignments.filter((a) => a.status === "pending");

  return (
    <Card>
      <CardHeader title="Driver submissions" hint="Approved = active · Pending = awaiting review" />
      <div className="space-y-4 px-5 pb-5">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Approved Stops ({approvedStops.length})
          </p>
          {approvedStops.length > 0 ? (
            <ol className="list-decimal space-y-1 pl-5">
              {approvedStops.map((s) => (
                <li key={s.id} className="text-sm text-foreground">{s.name}</li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">No approved stops yet.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <DetailRow label="Approved students" value={String(approvedAssignments.length)} />
          <DetailRow label="Pending stops" value={String(pendingStops.length)} />
          <DetailRow label="Pending assignments" value={String(pendingAssignments.length)} />
        </div>

        {pendingStops.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Stops
            </p>
            <ul className="space-y-1">
              {pendingStops.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-sm text-foreground">
                  <Pill tone="warning">Pending</Pill>
                  {s.name}
                  {s.replacesStopId ? (
                    <span className="text-xs text-muted-foreground">(change request)</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {pendingAssignments.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Student Assignments
            </p>
            <ul className="space-y-1">
              {pendingAssignments.map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-sm text-foreground">
                  <Pill tone="warning">Pending</Pill>
                  {a.studentName} ({a.studentClass}) → {a.stopName}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
