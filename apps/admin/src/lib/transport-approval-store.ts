/**
 * Admin-side accessor for the driver route-setup store (shared localStorage).
 * Supports Driver v2 `{ version: 2, byRoute }` and legacy flat records.
 */

import {
  enrollmentsForVehicle,
  listDriverAccounts,
  notifyConnectStopAssigned,
  notifyDriverStopApproved,
  notifyDriverStopDeclined,
  syncDriverStopAssignment,
} from "@lumenx/utils";

export type SubmissionStatus = "draft" | "pending" | "approved" | "rejected";

export type PendingRouteStop = {
  id: string;
  name: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  timestampCreated: string;
  updatedAt: string;
  createdBy: string;
  studentIds: string[];
  routeOrder: number;
  status: SubmissionStatus;
  submittedAt?: string;
  replacesStopId?: string;
  rejectionReason?: string;
};

/** Pending stop with Admin review context (driver / bus / route). */
export type PendingStopRequest = PendingRouteStop & {
  routeId: string;
  routeCode: string;
  routeName: string;
  driverName: string;
  busNumber: string;
  studentLabels: string[];
};

export type PendingStudentAssignment = {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  stopId: string;
  stopName: string;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
  replacesAssignmentId?: string;
  rejectionReason?: string;
};

export type PendingAssignmentRequest = PendingStudentAssignment & {
  routeId: string;
  routeCode: string;
  routeName: string;
  driverName: string;
  busNumber: string;
};

type RouteSetupRecord = {
  routeId: string;
  routeCode: string;
  routeName: string;
  status: string;
  lockedByAdmin: boolean;
  targetStopCount: number;
  stops: PendingRouteStop[];
  assignments: PendingStudentAssignment[];
  setupStartedAt: string | null;
  setupFinishedAt: string | null;
  setupInProgress: boolean;
};

type StorageV2 = {
  version: 2;
  activeRouteId: string | null;
  byRoute: Record<string, RouteSetupRecord>;
};

const STORAGE_KEY = "lumenx.transport.route-setup.v1";
export const TRANSPORT_APPROVAL_CHANGED_EVENT = "lumenx-transport-approval-changed";

function emitApprovalChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TRANSPORT_APPROVAL_CHANGED_EVENT));
  }
}

function isV2(parsed: unknown): parsed is StorageV2 {
  return Boolean(
    parsed &&
      typeof parsed === "object" &&
      "version" in parsed &&
      (parsed as StorageV2).version === 2,
  );
}

function loadRaw(): { format: "v1" | "v2"; v1?: RouteSetupRecord; v2?: StorageV2 } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StorageV2 | RouteSetupRecord;
    if (isV2(parsed)) return { format: "v2", v2: parsed };
    return { format: "v1", v1: parsed as RouteSetupRecord };
  } catch {
    return null;
  }
}

function listRecords(): Array<{ routeId: string; record: RouteSetupRecord }> {
  const loaded = loadRaw();
  if (!loaded) return [];
  if (loaded.format === "v2" && loaded.v2) {
    return Object.entries(loaded.v2.byRoute ?? {}).map(([routeId, record]) => ({
      routeId,
      record: { ...record, routeId: record.routeId || routeId },
    }));
  }
  if (loaded.v1) {
    return [{ routeId: loaded.v1.routeId, record: loaded.v1 }];
  }
  return [];
}

function saveMutated(
  routeId: string,
  nextRecord: RouteSetupRecord,
): void {
  const loaded = loadRaw();
  if (loaded?.format === "v2" && loaded.v2) {
    const v2: StorageV2 = {
      version: 2,
      activeRouteId: loaded.v2.activeRouteId ?? routeId,
      byRoute: {
        ...loaded.v2.byRoute,
        [routeId]: nextRecord,
      },
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(v2));
    } catch {
      // ignore
    }
  } else {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecord));
    } catch {
      // ignore
    }
  }
  emitApprovalChanged();
  pushApprovedToOps(nextRecord);
}

function vehicleForRoute(routeId: string): { vehicleId: string; vehicleNumber: string } {
  const account = listDriverAccounts().find((a) => a.adminRouteId === routeId);
  return {
    vehicleId: account?.vehicleId ?? "VH-01",
    vehicleNumber: account?.vehicleNumber ?? "BUS-01",
  };
}

function pushApprovedToOps(record: RouteSetupRecord): void {
  const approvedStops = record.stops.filter((s) => s.status === "approved");
  if (approvedStops.length === 0) return;
  const vehicle = vehicleForRoute(record.routeId);

  syncDriverStopAssignment({
    routeId: record.routeId,
    vehicleId: vehicle.vehicleId,
    vehicleNumber: vehicle.vehicleNumber,
    createdBy: "admin",
    createdByName: "Admin",
    stops: approvedStops.map((s) => {
      const studentIds = record.assignments
        .filter((a) => a.stopId === s.id && a.status === "approved")
        .map((a) => a.studentId);
      return {
        id: s.id,
        name: s.name,
        latitude: s.latitude,
        longitude: s.longitude,
        studentIds: studentIds.length > 0 ? studentIds : [...s.studentIds],
        routeOrder: s.routeOrder,
        timestampCreated: s.timestampCreated,
        createdBy: s.createdBy,
        createdByName: "Driver",
      };
    }),
  });
}

function findStop(
  stopId: string,
): { routeId: string; record: RouteSetupRecord; stop: PendingRouteStop } | null {
  for (const { routeId, record } of listRecords()) {
    const stop = record.stops.find((s) => s.id === stopId);
    if (stop) return { routeId, record, stop };
  }
  return null;
}

function findAssignment(
  assignmentId: string,
): { routeId: string; record: RouteSetupRecord; assignment: PendingStudentAssignment } | null {
  for (const { routeId, record } of listRecords()) {
    const assignment = record.assignments.find((a) => a.id === assignmentId);
    if (assignment) return { routeId, record, assignment };
  }
  return null;
}

function contextForRoute(routeId: string, record: RouteSetupRecord) {
  const account = listDriverAccounts().find((a) => a.adminRouteId === routeId);
  const vehicleId = account?.vehicleId ?? "";
  const enrollments = vehicleId ? enrollmentsForVehicle(vehicleId) : [];
  return {
    routeId,
    routeCode: record.routeCode || routeId,
    routeName: record.routeName || routeId,
    driverName: account?.name ?? "—",
    busNumber: account?.vehicleNumber ?? "—",
    enrollments,
  };
}

export function loadPendingStops(): PendingRouteStop[] {
  return loadPendingStopRequests();
}

export function loadPendingStopRequests(): PendingStopRequest[] {
  return listRecords().flatMap(({ routeId, record }) => {
    const ctx = contextForRoute(routeId, record);
    return record.stops
      .filter((s) => s.status === "pending")
      .map((s) => {
        const fromAssignments = record.assignments
          .filter((a) => a.stopId === s.id)
          .map((a) => a.studentName);
        const fromEnroll = s.studentIds
          .map((id) => ctx.enrollments.find((e) => e.studentId === id)?.studentName ?? id)
          .filter(Boolean);
        const labels = fromAssignments.length > 0 ? fromAssignments : fromEnroll;
        return {
          ...s,
          routeId: ctx.routeId,
          routeCode: ctx.routeCode,
          routeName: ctx.routeName,
          driverName: ctx.driverName,
          busNumber: ctx.busNumber,
          studentLabels: labels,
        };
      });
  });
}

export function loadPendingAssignments(): PendingStudentAssignment[] {
  return loadPendingAssignmentRequests();
}

export function loadPendingAssignmentRequests(): PendingAssignmentRequest[] {
  return listRecords().flatMap(({ routeId, record }) => {
    const ctx = contextForRoute(routeId, record);
    return record.assignments
      .filter((a) => a.status === "pending")
      .map((a) => ({
        ...a,
        routeId: ctx.routeId,
        routeCode: ctx.routeCode,
        routeName: ctx.routeName,
        driverName: ctx.driverName,
        busNumber: ctx.busNumber,
      }));
  });
}

export function countPendingTransportReviews(): number {
  return loadPendingStopRequests().length + loadPendingAssignmentRequests().length;
}

export function loadAllStops(): PendingRouteStop[] {
  return listRecords().flatMap(({ record }) => record.stops);
}

export function loadAllAssignments(): PendingStudentAssignment[] {
  return listRecords().flatMap(({ record }) => record.assignments);
}

export function approveStop(stopId: string): void {
  const found = findStop(stopId);
  if (!found) return;
  const { routeId, record, stop } = found;
  const now = new Date().toISOString();

  let next: RouteSetupRecord;
  if (stop.replacesStopId) {
    const originalId = stop.replacesStopId;
    next = {
      ...record,
      stops: record.stops
        .filter((s) => s.id !== originalId)
        .map((s) =>
          s.id === stopId
            ? {
                ...s,
                status: "approved" as const,
                updatedAt: now,
                replacesStopId: undefined,
                rejectionReason: undefined,
              }
            : s,
        ),
      assignments: record.assignments
        .filter((a) => !(a.stopId === originalId && a.status === "approved"))
        .map((a) => {
          if (a.stopId === originalId || a.stopId === stopId) {
            return {
              ...a,
              stopId,
              stopName: stop.name,
              status: "approved" as const,
              updatedAt: now,
              replacesAssignmentId: undefined,
              rejectionReason: undefined,
            };
          }
          return a;
        }),
    };
  } else {
    next = {
      ...record,
      stops: record.stops.map((s) =>
        s.id === stopId
          ? { ...s, status: "approved" as const, updatedAt: now, rejectionReason: undefined }
          : s,
      ),
      assignments: record.assignments.map((a) =>
        a.stopId === stopId
          ? { ...a, status: "approved" as const, updatedAt: now, rejectionReason: undefined }
          : a,
      ),
    };
  }
  saveMutated(routeId, next);
  notifyDriverStopApproved({
    stopId,
    stopName: stop.name,
    routeCode: record.routeCode,
  });
  const vehicleNumber =
    listDriverAccounts().find((d) => d.adminRouteId === routeId)?.vehicleNumber ?? "BUS";
  for (const a of next.assignments.filter(
    (row) => row.stopId === stopId && row.status === "approved",
  )) {
    notifyConnectStopAssigned({
      studentId: a.studentId,
      studentName: a.studentName,
      stopName: stop.name,
      vehicleNumber,
    });
  }
}

export function rejectStop(
  stopId: string,
  reason = "Location or student list needs correction.",
): void {
  const found = findStop(stopId);
  if (!found) return;
  const { routeId, record } = found;
  const stop = record.stops.find((s) => s.id === stopId);
  const now = new Date().toISOString();
  const trimmed = reason.trim() || "Location or student list needs correction.";
  const next: RouteSetupRecord = {
    ...record,
    stops: record.stops.map((s) =>
      s.id === stopId
        ? { ...s, status: "rejected" as const, updatedAt: now, rejectionReason: trimmed }
        : s,
    ),
    assignments: record.assignments.map((a) =>
      a.stopId === stopId && a.status === "pending"
        ? { ...a, status: "rejected" as const, updatedAt: now, rejectionReason: trimmed }
        : a,
    ),
  };
  saveMutated(routeId, next);
  notifyDriverStopDeclined({
    stopId,
    stopName: stop?.name ?? "Stop",
    reason: trimmed,
  });
}

export function approveAssignment(assignmentId: string): void {
  const found = findAssignment(assignmentId);
  if (!found) return;
  const { routeId, record, assignment } = found;
  const now = new Date().toISOString();

  let next: RouteSetupRecord;
  if (assignment.replacesAssignmentId) {
    const originalId = assignment.replacesAssignmentId;
    next = {
      ...record,
      assignments: record.assignments
        .filter((a) => a.id !== originalId)
        .map((a) =>
          a.id === assignmentId
            ? {
                ...a,
                status: "approved" as const,
                updatedAt: now,
                replacesAssignmentId: undefined,
                rejectionReason: undefined,
              }
            : a,
        ),
    };
  } else {
    next = {
      ...record,
      assignments: record.assignments.map((a) =>
        a.id === assignmentId
          ? { ...a, status: "approved" as const, updatedAt: now, rejectionReason: undefined }
          : a,
      ),
    };
  }
  saveMutated(routeId, next);
  const approved = next.assignments.find((a) => a.id === assignmentId);
  if (approved) {
    const vehicleNumber =
      listDriverAccounts().find((d) => d.adminRouteId === routeId)?.vehicleNumber ?? "BUS";
    notifyConnectStopAssigned({
      studentId: approved.studentId,
      studentName: approved.studentName,
      stopName: approved.stopName,
      vehicleNumber,
    });
  }
}

export function rejectAssignment(
  assignmentId: string,
  reason = "Student assignment needs correction.",
): void {
  const found = findAssignment(assignmentId);
  if (!found) return;
  const { routeId, record } = found;
  const now = new Date().toISOString();
  const trimmed = reason.trim() || "Student assignment needs correction.";
  const next: RouteSetupRecord = {
    ...record,
    assignments: record.assignments.map((a) =>
      a.id === assignmentId
        ? { ...a, status: "rejected" as const, updatedAt: now, rejectionReason: trimmed }
        : a,
    ),
  };
  saveMutated(routeId, next);
}

export function approveStops(stopIds: string[]): void {
  for (const id of stopIds) approveStop(id);
}

export function approveAssignments(assignmentIds: string[]): void {
  for (const id of assignmentIds) approveAssignment(id);
}
