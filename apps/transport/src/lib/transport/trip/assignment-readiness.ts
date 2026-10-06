import { getApiApprovedStudentCount } from "../api-roster";
import { getRouteSetupDriverScope, getRouteSetupSnapshot } from "../route-setup/store";
import { getTripAssignmentSnapshot } from "./store";

export type AssignmentReadinessKey = "bus" | "route" | "approved_stops" | "students";

export type AssignmentReadinessStatus = "on" | "off";

export type AssignmentReadinessCheck = {
  key: AssignmentReadinessKey;
  label: string;
  status: AssignmentReadinessStatus;
  message: string;
  readyLabel: "Ready" | "Not Ready";
  reason: string | null;
};

export type AssignmentReadinessResult = {
  checks: AssignmentReadinessCheck[];
  allOn: boolean;
};

const LABELS: Record<AssignmentReadinessKey, string> = {
  bus: "Assigned Bus",
  route: "Assigned Route",
  approved_stops: "Stops ready",
  students: "Students on Bus",
};

function check(
  key: AssignmentReadinessKey,
  ok: boolean,
  onMessage: string,
  offReason: string,
): AssignmentReadinessCheck {
  return {
    key,
    label: LABELS[key],
    status: ok ? "on" : "off",
    message: ok ? onMessage : offReason,
    readyLabel: ok ? "Ready" : "Not Ready",
    reason: ok ? null : offReason,
  };
}

function isUsableStopStatus(status: string): boolean {
  return status === "approved" || status === "pending";
}

/** Sync assignment gates for Start Trip (bus, route, usable stops, students). */
export function getAssignmentReadiness(): AssignmentReadinessResult {
  const scope = getRouteSetupDriverScope();
  const setup = getRouteSetupSnapshot();
  const assignment = getTripAssignmentSnapshot();

  const hasBus = Boolean(scope?.vehicleId && assignment.bus.vehicleId);
  const hasRoute = Boolean(
    scope?.routeId && (assignment.route.adminRouteId || assignment.route.code !== "—"),
  );
  const usableStops = setup.stops.filter((s) => isUsableStopStatus(s.status));
  const hasUsableStops = usableStops.length > 0;
  const studentCount = getApiApprovedStudentCount(scope?.vehicleId);
  const hasStudents = studentCount > 0;

  const declinedStops = setup.stops.some((s) => s.status === "rejected");

  const checks: AssignmentReadinessCheck[] = [
    check(
      "bus",
      hasBus,
      `Bus ${assignment.bus.busNumber} is assigned.`,
      "No bus assigned. Ask Admin to assign a bus.",
    ),
    check(
      "route",
      hasRoute,
      `Route ${assignment.route.code} is assigned.`,
      "No route assigned. Ask Admin to assign a route.",
    ),
    check(
      "approved_stops",
      hasUsableStops,
      `${usableStops.length} stop${usableStops.length === 1 ? "" : "s"} ready.`,
      declinedStops && !hasUsableStops
        ? "Stops were declined. Fix and resubmit in Route Setup."
        : "No stops yet. Add stops in Route Setup.",
    ),
    check(
      "students",
      hasStudents,
      `${studentCount} student${studentCount === 1 ? "" : "s"} on this bus.`,
      "No students on this bus. Ask Admin to enroll students before starting.",
    ),
  ];

  return {
    checks,
    allOn: checks.every((c) => c.status === "on"),
  };
}
