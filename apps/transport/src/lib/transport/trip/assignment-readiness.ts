import { enrollmentsForVehicle } from "@lumenx/utils";

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
  approved_stops: "Approved Stops",
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

/** Sync assignment gates for Start Trip (bus, route, approved stops, students). */
export function getAssignmentReadiness(): AssignmentReadinessResult {
  const scope = getRouteSetupDriverScope();
  const setup = getRouteSetupSnapshot();
  const assignment = getTripAssignmentSnapshot();

  const hasBus = Boolean(scope?.vehicleId && assignment.bus.vehicleId);
  const hasRoute = Boolean(
    scope?.routeId && (assignment.route.adminRouteId || assignment.route.code !== "—"),
  );
  const approvedStops = setup.stops.filter((s) => s.status === "approved");
  const hasApprovedStops = approvedStops.length > 0;
  const studentCount = scope?.vehicleId
    ? enrollmentsForVehicle(scope.vehicleId).length
    : assignment.totalStudents;
  const hasStudents = studentCount > 0;

  const pendingStops = setup.stops.some((s) => s.status === "pending");
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
      hasApprovedStops,
      `${approvedStops.length} approved stop${approvedStops.length === 1 ? "" : "s"} ready.`,
      pendingStops
        ? "Stops are waiting for Admin approval. You cannot start yet."
        : declinedStops
          ? "Some stops were declined. Fix and resubmit, then wait for approval."
          : "No approved stops yet. Add stops in Route Setup and wait for Admin approval.",
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
