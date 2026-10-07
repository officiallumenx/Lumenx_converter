/**
 * Route Setup domain — driver configures stops with Admin approval workflow.
 */

export type SubmissionStatus = "draft" | "pending" | "approved" | "rejected";

export type RouteSetupStatus = "not_configured" | "configured";

/** Persisted stop — GPS + students + order + approval status. */
export type RouteSetupStop = {
  id: string;
  name: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  /** Authoritative geofence radius in meters (from stop.notification_radius_m). */
  notificationRadiusM: number;
  /** ISO timestamp when the stop was first captured */
  timestampCreated: string;
  updatedAt: string;
  /** Driver / attender id who captured the stop */
  createdBy: string;
  /** Students proposed for this stop (pending until assignment approved) */
  studentIds: string[];
  /** 1-based order along the route (pending + approved combined for display) */
  routeOrder: number;
  status: SubmissionStatus;
  submittedAt?: string;
  /** If this is a change request for an already-approved stop */
  replacesStopId?: string;
  /** Admin decline reason (when status is rejected) */
  rejectionReason?: string;
  /** API stop id after driver submission in API auth mode */
  apiStopId?: string;
  /** Endpoint role from API — school/parking are Admin/driver ends, not pickup waypoints. */
  kind?: "waypoint" | "school" | "parking";
};

/** Student ↔ stop link tracked separately for approval workflow. */
export type StudentStopAssignment = {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  /**
   * Live pickup stop id. Null when enrollment has no pickup, or pickup points
   * at a missing/soft-deleted stop (orphan) — student stays visible as unassigned.
   */
  stopId: string | null;
  /** Display label — "Stop not assigned" when unassigned/orphan. */
  stopName: string;
  /** Live drop stop id when known; null when unassigned/orphan. */
  dropStopId?: string | null;
  /** Display label — "Drop stop not assigned" when missing. */
  dropStopName?: string;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
  /** If this is a change request for an already-approved assignment */
  replacesAssignmentId?: string;
  /** Admin decline reason (when status is rejected) */
  rejectionReason?: string;
  /** API enrollment id after driver submission in API auth mode */
  apiEnrollmentId?: string;
};

export const STOP_NOT_ASSIGNED_LABEL = "Stop not assigned";
export const DROP_STOP_NOT_ASSIGNED_LABEL = "Drop stop not assigned";

/** True when the enrollment needs an explicit pickup stop choice (no inventing). */
export function needsPickupStopAssignment(
  assignment: Pick<StudentStopAssignment, "stopId">,
): boolean {
  return !assignment.stopId;
}

/** True when drop is missing (null/orphan). */
export function needsDropStopAssignment(
  assignment: Pick<StudentStopAssignment, "dropStopId">,
): boolean {
  return !assignment.dropStopId;
}

export type RouteSetupRecord = {
  routeId: string;
  routeCode: string;
  routeName: string;
  status: RouteSetupStatus;
  /** When true, driver/attender cannot edit approved data — Admin lock */
  lockedByAdmin: boolean;
  targetStopCount: number;
  stops: RouteSetupStop[];
  assignments: StudentStopAssignment[];
  setupStartedAt: string | null;
  setupFinishedAt: string | null;
  setupInProgress: boolean;
};

export type GpsFix = {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  capturedAt: string;
  source: "device" | "demo";
};

export type StudentDirectoryEntry = {
  id: string;
  name: string;
  className: string;
  section: string;
  rollNo: string;
};

export type UpsertStopInput = {
  id?: string;
  name: string;
  locationLabel?: string;
  latitude: number;
  longitude: number;
  /** Geofence radius in meters — required on create/update. */
  notificationRadiusM: number;
  studentIds: string[];
  /** When updating GPS on an existing stop */
  refreshGps?: boolean;
};

/** Driver-facing status labels (Declined = rejected in storage). */
export const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = {
  draft: "Draft",
  pending: "Waiting for Admin",
  approved: "Active",
  rejected: "Declined",
};

export const SUBMISSION_STATUS_HINT: Record<SubmissionStatus, string> = {
  draft: "Not submitted yet",
  pending: "Submitted — usable for trips. Admin can still review.",
  approved: "Ready for trips",
  rejected: "Fix and resubmit",
};

/** Pending and declined stops can be edited and (re)submitted. */
export function canEditStop(stop: RouteSetupStop): boolean {
  if (isRouteEndpointStop(stop)) return false;
  return stop.status === "draft" || stop.status === "pending" || stop.status === "rejected";
}

export function canEditAssignment(assignment: StudentStopAssignment): boolean {
  return (
    assignment.status === "draft" ||
    assignment.status === "pending" ||
    assignment.status === "rejected"
  );
}

export function canRequestChangeStop(stop: RouteSetupStop): boolean {
  if (isRouteEndpointStop(stop)) return false;
  return stop.status === "approved";
}

/** School (Admin) and bus park (driver) ends — not normal pickup stops. */
export function isRouteEndpointStop(stop: Pick<RouteSetupStop, "kind" | "name" | "routeOrder">): boolean {
  if (stop.kind === "school" || stop.kind === "parking") return true;
  const name = stop.name.trim().toLowerCase();
  if (name === "school" || name === "bus park") return true;
  // Legacy school stop before kind was returned by roster.
  if (stop.routeOrder >= 10_000) return true;
  return false;
}

export function isSchoolStop(stop: Pick<RouteSetupStop, "kind" | "name" | "routeOrder">): boolean {
  if (stop.kind === "school") return true;
  return stop.name.trim().toLowerCase() === "school" || stop.routeOrder >= 10_000;
}

export function isParkingStop(stop: Pick<RouteSetupStop, "kind" | "name">): boolean {
  if (stop.kind === "parking") return true;
  return stop.name.trim().toLowerCase() === "bus park";
}
