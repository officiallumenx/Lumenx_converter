import { listApiEnrollmentsForVehicle } from "../api-roster";
import type {
  RouteSetupRecord,
  RouteSetupStop,
  StudentStopAssignment,
  SubmissionStatus,
  UpsertStopInput,
} from "./types";
import { canEditAssignment, canEditStop } from "./types";
import { syncStopAndEnrollmentsToApi } from "./api-sync";

/** Fired after in-memory route-setup changes (legacy name kept for subscribers). */
export const TRANSPORT_APPROVAL_CHANGED_EVENT = "lumenx-transport-approval-changed";

export type RouteSetupDriverScope = {
  routeId: string;
  routeCode: string;
  routeName: string;
  vehicleId: string;
  vehicleNumber: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  employeeId: string;
  licenseNumber: string;
  instituteId?: string;
};

const listeners = new Set<() => void>();

/** Active driver scope — set from the signed-in driver assignment. */
let scope: RouteSetupDriverScope | null = null;
let byRoute: Record<string, RouteSetupRecord> = {};
let record: RouteSetupRecord = emptyRecord("unscoped", "—", "No route");

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

function defaultLocationLabel(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function emptyRecord(routeId: string, routeCode: string, routeName: string): RouteSetupRecord {
  return {
    routeId,
    routeCode,
    routeName,
    status: "not_configured",
    lockedByAdmin: false,
    targetStopCount: 8,
    stops: [],
    assignments: [],
    setupStartedAt: null,
    setupFinishedAt: null,
    setupInProgress: false,
  };
}

function seedRecordForScope(s: RouteSetupDriverScope): RouteSetupRecord {
  return emptyRecord(s.routeId, s.routeCode, s.routeName);
}

function emit() {
  listeners.forEach((l) => l());
}

function persistMemory() {
  if (scope) {
    byRoute[scope.routeId] = record;
  }
  emit();
}

function persist() {
  persistMemory();
}

function queueApiStopSync(stop: RouteSetupStop): void {
  if (!scope) return;
  const pendingAssignments = record.assignments.filter(
    (a) => a.stopId === stop.id && a.status === "pending",
  );
  void syncStopAndEnrollmentsToApi(scope, stop, pendingAssignments)
    .then(({ apiStopId, syncedEnrollmentIds }) => {
      if (!apiStopId && syncedEnrollmentIds.length === 0) return;
      record = {
        ...record,
        stops: record.stops.map((s) =>
          s.id === stop.id && apiStopId ? { ...s, apiStopId } : s,
        ),
        assignments: record.assignments.map((a) => {
          if (!syncedEnrollmentIds.includes(a.id)) return a;
          const source = pendingAssignments.find((p) => p.id === a.id);
          return source?.apiEnrollmentId
            ? { ...a, apiEnrollmentId: source.apiEnrollmentId }
            : a;
        }),
      };
      if (scope) byRoute[scope.routeId] = record;
      persistMemory();
      emit();
    })
    .catch(() => undefined);
}

/** Switch route-setup + sync context to the logged-in driver's bus/route. */
export function setRouteSetupDriverScope(next: RouteSetupDriverScope): void {
  const same =
    scope &&
    scope.routeId === next.routeId &&
    scope.vehicleId === next.vehicleId &&
    scope.driverId === next.driverId &&
    scope.routeCode === next.routeCode &&
    scope.routeName === next.routeName &&
    scope.vehicleNumber === next.vehicleNumber &&
    scope.driverName === next.driverName &&
    scope.driverPhone === next.driverPhone &&
    scope.employeeId === next.employeeId &&
    scope.licenseNumber === next.licenseNumber &&
    scope.instituteId === next.instituteId;
  if (same) return;

  scope = next;
  const existing = byRoute[next.routeId];
  const base = existing
    ? {
        ...existing,
        routeCode: next.routeCode,
        routeName: next.routeName,
      }
    : seedRecordForScope(next);
  record = base;
  byRoute[next.routeId] = record;
  persistMemory();
}

/** Merge API-approved stops + enrollments into the active route-setup record. */
export function applyApiApprovedHydration(input: {
  lockedByAdmin: boolean;
  stops: Array<{
    id: string;
    name: string;
    locationLabel: string;
    latitude: number;
    longitude: number;
    routeOrder: number;
    approvalStatus: string;
    createdAt: string;
  }>;
  students: Array<{
    enrollmentId: string;
    studentId: string;
    studentName: string;
    classLabel: string;
    pickupStopId: string;
    approvalStatus: string;
  }>;
}): void {
  if (!scope) return;

  const now = new Date().toISOString();
  const mapStatus = (approvalStatus: string): SubmissionStatus => {
    if (approvalStatus === "approved") return "approved";
    if (approvalStatus === "rejected") return "rejected";
    return "pending";
  };

  const apiStops: RouteSetupStop[] = input.stops
    .slice()
    .sort((a, b) => a.routeOrder - b.routeOrder)
    .map((s) => ({
      id: s.id,
      apiStopId: s.id,
      name: s.name,
      locationLabel: s.locationLabel || defaultLocationLabel(s.latitude, s.longitude),
      latitude: s.latitude,
      longitude: s.longitude,
      timestampCreated: s.createdAt,
      updatedAt: s.createdAt,
      createdBy: "api",
      studentIds: input.students
        .filter((st) => st.pickupStopId === s.id)
        .map((st) => st.studentId),
      routeOrder: s.routeOrder + 1,
      status: mapStatus(s.approvalStatus),
      submittedAt: s.createdAt,
    }));

  // Session-only: keep pending stops that have not been pushed to the API yet.
  const apiIds = new Set(input.stops.map((s) => s.id));
  const unsyncedLocal = record.stops.filter((s) => {
    if (s.apiStopId && apiIds.has(s.apiStopId)) return false;
    if (apiIds.has(s.id)) return false;
    return s.status === "pending" || s.status === "draft";
  });

  const mergedStops = renumber([...apiStops, ...unsyncedLocal]);
  const stopNameById = new Map(
    mergedStops.flatMap((s) => {
      const entries: Array<[string, string]> = [[s.id, s.name]];
      if (s.apiStopId) entries.push([s.apiStopId, s.name]);
      return entries;
    }),
  );

  const apiAssignments: StudentStopAssignment[] = input.students
    .filter((s) => Boolean(s.pickupStopId))
    .map((s) => ({
      id: s.enrollmentId,
      studentId: s.studentId,
      studentName: s.studentName,
      studentClass: s.classLabel,
      stopId: s.pickupStopId,
      stopName: stopNameById.get(s.pickupStopId) ?? "Stop",
      status: mapStatus(s.approvalStatus),
      createdAt: now,
      updatedAt: now,
      apiEnrollmentId: s.enrollmentId,
    }));

  const unsyncedAssignments = record.assignments.filter((a) => {
    if (a.apiEnrollmentId && input.students.some((s) => s.enrollmentId === a.apiEnrollmentId)) {
      return false;
    }
    return unsyncedLocal.some((s) => s.id === a.stopId);
  });

  record = {
    ...record,
    lockedByAdmin: input.lockedByAdmin,
    stops: mergedStops,
    assignments: [...apiAssignments, ...unsyncedAssignments],
    status:
      mergedStops.some((s) => s.status === "approved") || mergedStops.length > 0
        ? "configured"
        : record.setupInProgress
          ? record.status
          : "not_configured",
  };
  byRoute[scope.routeId] = record;
  persistMemory();
}

export function getRouteSetupDriverScope(): RouteSetupDriverScope | null {
  return scope;
}

// Clear legacy route-setup draft key once (migration off localStorage SoT).
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("lumenx.transport.route-setup.v1");
  } catch {
    /* ignore */
  }
}

function emitApprovalChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TRANSPORT_APPROVAL_CHANGED_EVENT));
  }
}

function renumber(stops: RouteSetupStop[]): RouteSetupStop[] {
  return stops.map((s, i) => ({ ...s, routeOrder: i + 1 }));
}

function enrollmentMeta(studentId: string) {
  const fromApi = listApiEnrollmentsForVehicle(scope?.vehicleId).find(
    (e) => e.studentId === studentId,
  );
  if (fromApi) {
    return {
      studentName: fromApi.studentName,
      studentClass: fromApi.studentClass,
    };
  }
  const existing = record.assignments.find((a) => a.studentId === studentId);
  if (existing) {
    return {
      studentName: existing.studentName,
      studentClass: existing.studentClass,
    };
  }
  return {
    studentName: studentId,
    studentClass: "—",
  };
}

function syncAssignmentsForStop(stop: RouteSetupStop): StudentStopAssignment[] {
  const now = new Date().toISOString();
  const next = record.assignments.filter(
    (a) => !(a.stopId === stop.id && canEditAssignment(a) && !stop.studentIds.includes(a.studentId)),
  );

  for (const studentId of stop.studentIds) {
    const existing = next.find((a) => a.studentId === studentId && a.stopId === stop.id);
    const meta = enrollmentMeta(studentId);
    if (existing) {
      if (canEditAssignment(existing)) {
        const index = next.indexOf(existing);
        next[index] = {
          ...existing,
          stopName: stop.name,
          studentName: meta.studentName,
          studentClass: meta.studentClass,
          status: "pending",
          updatedAt: now,
          rejectionReason: undefined,
        };
      }
      // If assignment is approved and stop info changed, create a change request
      if (existing.status === "approved" && existing.stopName !== stop.name) {
        next.push({
          id: uid("asn"),
          studentId,
          studentName: meta.studentName,
          studentClass: meta.studentClass,
          stopId: stop.id,
          stopName: stop.name,
          status: "pending",
          createdAt: now,
          updatedAt: now,
          replacesAssignmentId: existing.id,
        });
      }
      continue;
    }

    const movedFrom = next.find(
      (a) => a.studentId === studentId && canEditAssignment(a) && a.stopId !== stop.id,
    );
    if (movedFrom) {
      const index = next.indexOf(movedFrom);
      next[index] = {
        ...movedFrom,
        stopId: stop.id,
        stopName: stop.name,
        status: "pending",
        updatedAt: now,
      };
      continue;
    }

    // If there's an approved assignment to a different stop, create a change request
    const approvedElsewhere = next.find(
      (a) => a.studentId === studentId && a.status === "approved" && a.stopId !== stop.id,
    );
    if (approvedElsewhere) {
      next.push({
        id: uid("asn"),
        studentId,
        studentName: meta.studentName,
        studentClass: meta.studentClass,
        stopId: stop.id,
        stopName: stop.name,
        status: "pending",
        createdAt: now,
        updatedAt: now,
        replacesAssignmentId: approvedElsewhere.id,
      });
      continue;
    }

    next.push({
      id: uid("asn"),
      studentId,
      studentName: meta.studentName,
      studentClass: meta.studentClass,
      stopId: stop.id,
      stopName: stop.name,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  }

  return next;
}

export function subscribeRouteSetup(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRouteSetupSnapshot(): RouteSetupRecord {
  return record;
}

export function listStopsByStatus(status: SubmissionStatus): RouteSetupStop[] {
  return record.stops.filter((s) => s.status === status).sort((a, b) => a.routeOrder - b.routeOrder);
}

export function listAssignmentsByStatus(status: SubmissionStatus): StudentStopAssignment[] {
  return record.assignments
    .filter((a) => a.status === status)
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}

export function startRouteSetupSession(createdBy: string): RouteSetupRecord {
  void createdBy;
  if (record.lockedByAdmin) return record;
  record = {
    ...record,
    setupInProgress: true,
    setupStartedAt: record.setupStartedAt ?? new Date().toISOString(),
    status:
      record.stops.some((s) => s.status === "approved") || record.status === "configured"
        ? "configured"
        : "not_configured",
  };
  persistMemory();
  return record;
}

export function upsertRouteSetupStop(
  input: UpsertStopInput,
  createdBy: string,
): RouteSetupRecord {
  if (record.lockedByAdmin) return record;

  const dup = findDuplicateRouteStop({
    name: input.name,
    latitude: input.latitude,
    longitude: input.longitude,
    excludeStopId: input.id,
  });
  if (dup) {
    throw new Error(dup.reason);
  }

  const now = new Date().toISOString();
  const locationLabel =
    input.locationLabel?.trim() ||
    defaultLocationLabel(input.latitude, input.longitude);

  if (input.id) {
    const existing = record.stops.find((s) => s.id === input.id);
    if (!existing) return record;

    // If the stop is approved, create a change request instead of modifying it
    if (existing.status === "approved") {
      const changeRequest: RouteSetupStop = {
        id: uid("rst"),
        name: input.name.trim(),
        locationLabel,
        latitude: input.latitude,
        longitude: input.longitude,
        timestampCreated: now,
        updatedAt: now,
        submittedAt: now,
        createdBy,
        studentIds: [...input.studentIds],
        routeOrder: existing.routeOrder,
        status: "pending",
        replacesStopId: existing.id,
      };
      record = {
        ...record,
        setupInProgress: true,
        stops: renumber([...record.stops, changeRequest]),
      };
      record = { ...record, assignments: syncAssignmentsForStop(changeRequest) };
      persist();
      queueApiStopSync(changeRequest);
      return record;
    }

    if (!canEditStop(existing)) return record;

    const wasRejected = existing.status === "rejected";
    const move = new Set(input.studentIds);
    const updated: RouteSetupStop = {
      ...existing,
      name: input.name.trim(),
      locationLabel,
      latitude: input.latitude,
      longitude: input.longitude,
      studentIds: [...input.studentIds],
      updatedAt: now,
      status: "pending",
      submittedAt: now,
      rejectionReason: undefined,
    };

    record = {
      ...record,
      setupInProgress: true,
      stops: renumber(
        record.stops.map((s) => {
          if (s.id === input.id) return updated;
          if (move.size === 0 || s.status !== "pending") return s;
          return {
            ...s,
            studentIds: s.studentIds.filter((id) => !move.has(id)),
            updatedAt: now,
          };
        }),
      ),
    };
    record = { ...record, assignments: syncAssignmentsForStop(updated) };
    persist();
    queueApiStopSync(updated);
    return record;
  }

  const move = new Set(input.studentIds);
  const next: RouteSetupStop = {
    id: uid("rst"),
    name: input.name.trim(),
    locationLabel,
    latitude: input.latitude,
    longitude: input.longitude,
    timestampCreated: now,
    updatedAt: now,
    submittedAt: now,
    createdBy,
    studentIds: [...input.studentIds],
    routeOrder: record.stops.length + 1,
    status: "pending",
  };

  record = {
    ...record,
    setupInProgress: true,
    setupStartedAt: record.setupStartedAt ?? now,
    stops: renumber([
      ...record.stops.map((s) =>
        move.size === 0 || s.status !== "pending"
          ? s
          : {
              ...s,
              studentIds: s.studentIds.filter((id) => !move.has(id)),
              updatedAt: now,
            },
      ),
      next,
    ]),
  };
  record = { ...record, assignments: syncAssignmentsForStop(next) };
  persist();
  queueApiStopSync(next);
  return record;
}

export function deleteRouteSetupStop(stopId: string): RouteSetupRecord {
  if (record.lockedByAdmin) return record;
  const stop = record.stops.find((s) => s.id === stopId);
  if (!stop || !canEditStop(stop)) return record;

  record = {
    ...record,
    setupInProgress: true,
    status: record.stops.some((s) => s.status === "approved") ? "configured" : "not_configured",
    setupFinishedAt: null,
    stops: renumber(record.stops.filter((s) => s.id !== stopId)),
    assignments: record.assignments.filter(
      (a) => !(a.stopId === stopId && canEditAssignment(a)),
    ),
  };
  persist();
  return record;
}

export function reorderRouteSetupStop(stopId: string, direction: "up" | "down"): RouteSetupRecord {
  if (record.lockedByAdmin) return record;
  const stop = record.stops.find((s) => s.id === stopId);
  if (!stop || stop.status !== "approved") return record;

  const index = record.stops.findIndex((s) => s.id === stopId);
  if (index < 0) return record;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= record.stops.length) return record;
  const next = [...record.stops];
  const [moved] = next.splice(index, 1);
  if (!moved) return record;
  next.splice(target, 0, moved);
  record = { ...record, stops: renumber(next) };
  persist();
  return record;
}

export function removePendingAssignment(assignmentId: string): RouteSetupRecord {
  const assignment = record.assignments.find((a) => a.id === assignmentId);
  if (!assignment || !canEditAssignment(assignment)) return record;

  record = {
    ...record,
    assignments: record.assignments.filter((a) => a.id !== assignmentId),
    stops: record.stops.map((s) =>
      s.id === assignment.stopId && canEditStop(s)
        ? {
            ...s,
            studentIds: s.studentIds.filter((id) => id !== assignment.studentId),
            updatedAt: new Date().toISOString(),
          }
        : s,
    ),
  };
  persistMemory();
  return record;
}

export function movePendingAssignment(assignmentId: string, targetStopId: string): RouteSetupRecord {
  const assignment = record.assignments.find((a) => a.id === assignmentId);
  const targetStop = record.stops.find((s) => s.id === targetStopId);
  if (!assignment || !targetStop || !canEditAssignment(assignment) || !canEditStop(targetStop)) {
    return record;
  }

  const now = new Date().toISOString();
  record = {
    ...record,
    assignments: record.assignments.map((a) =>
      a.id === assignmentId
        ? {
            ...a,
            stopId: targetStop.id,
            stopName: targetStop.name,
            status: "pending" as const,
            updatedAt: now,
          }
        : a,
    ),
    stops: record.stops.map((s) => {
      if (s.id === assignment.stopId && canEditStop(s)) {
        return {
          ...s,
          studentIds: s.studentIds.filter((id) => id !== assignment.studentId),
          updatedAt: now,
        };
      }
      if (s.id === targetStop.id) {
        return {
          ...s,
          studentIds: s.studentIds.includes(assignment.studentId)
            ? s.studentIds
            : [...s.studentIds, assignment.studentId],
          updatedAt: now,
        };
      }
      return s;
    }),
  };
  persistMemory();
  return record;
}

export function finishRouteSetup(): RouteSetupRecord {
  if (record.lockedByAdmin) return record;
  if (record.stops.length === 0) return record;
  record = {
    ...record,
    status: "configured",
    setupInProgress: false,
    setupFinishedAt: new Date().toISOString(),
  };
  persistMemory();
  return record;
}

/** Student IDs already linked to another stop (pending or approved) on this route. */
export function studentIdsAssignedElsewhere(excludeStopId?: string): Set<string> {
  const ids = new Set<string>();
  for (const stop of record.stops) {
    if (excludeStopId && stop.id === excludeStopId) continue;
    if (stop.status === "rejected") continue;
    for (const studentId of stop.studentIds) ids.add(studentId);
  }
  for (const a of record.assignments) {
    if (excludeStopId && a.stopId === excludeStopId) continue;
    if (a.status === "rejected") continue;
    if (a.status === "pending" || a.status === "approved") ids.add(a.studentId);
  }
  return ids;
}

function normalizeStopName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Detect duplicate stop by same name or near-identical GPS (within ~25m).
 * Ignores rejected stops and the stop being edited.
 */
export function findDuplicateRouteStop(input: {
  name: string;
  latitude: number;
  longitude: number;
  excludeStopId?: string;
}): { stop: RouteSetupStop; reason: string } | null {
  const nameKey = normalizeStopName(input.name);
  if (!nameKey) return null;

  for (const stop of record.stops) {
    if (input.excludeStopId && stop.id === input.excludeStopId) continue;
    if (stop.status === "rejected") continue;
    // Change-request row may share the same order/name as the approved original — allow that.
    if (stop.replacesStopId && input.excludeStopId && stop.replacesStopId === input.excludeStopId) {
      continue;
    }
    if (normalizeStopName(stop.name) === nameKey) {
      return {
        stop,
        reason: `Stop "${stop.name}" already exists. Use a different name or edit that stop.`,
      };
    }
    const meters = haversineMeters(input.latitude, input.longitude, stop.latitude, stop.longitude);
    if (meters <= 25) {
      return {
        stop,
        reason: `This location is too close to "${stop.name}". Move farther or edit that stop.`,
      };
    }
  }
  return null;
}

export function resetRouteSetupStore(): void {
  if (scope) {
    record = seedRecordForScope(scope);
    byRoute[scope.routeId] = record;
  } else {
    record = emptyRecord("unscoped", "—", "No route");
    byRoute = {};
  }
  emit();
}

export function getRouteSetupForAdmin() {
  const r = record;
  return {
    routeId: r.routeId,
    routeCode: r.routeCode,
    routeName: r.routeName,
    status: r.status,
    lockedByAdmin: r.lockedByAdmin,
    setupFinishedAt: r.setupFinishedAt,
    stops: r.stops
      .filter((s) => s.status === "approved")
      .map((s) => ({
        id: s.id,
        name: s.name,
        locationLabel: s.locationLabel,
        latitude: s.latitude,
        longitude: s.longitude,
        timestampCreated: s.timestampCreated,
        createdBy: s.createdBy,
        studentIds: s.studentIds,
        routeOrder: s.routeOrder,
        status: s.status,
      })),
  };
}
