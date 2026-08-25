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
};

/** Student ↔ stop link tracked separately for approval workflow. */
export type StudentStopAssignment = {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  stopId: string;
  stopName: string;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
  /** If this is a change request for an already-approved assignment */
  replacesAssignmentId?: string;
  /** Admin decline reason (when status is rejected) */
  rejectionReason?: string;
};

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
  pending: "Admin must approve before you can use this stop",
  approved: "Ready for trips",
  rejected: "Fix and resubmit",
};

/** Pending and declined stops can be edited and (re)submitted. */
export function canEditStop(stop: RouteSetupStop): boolean {
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
  return stop.status === "approved";
}
