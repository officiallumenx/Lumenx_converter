import {
  enrollmentsForVehicle,
  loadTransportOps,
  notifyAdminStopRequest,
  recordLocalChangeForSync,
  syncDriverStopAssignment,
  TRANSPORT_OPS_CHANGED_EVENT,
} from "@lumenx/utils";
import type {
  RouteSetupRecord,
  RouteSetupStop,
  StudentStopAssignment,
  SubmissionStatus,
  UpsertStopInput,
} from "./types";
import { canEditAssignment, canEditStop } from "./types";
import { syncStopAndEnrollmentsToApi } from "./api-sync";

const STORAGE_KEY = "lumenx.transport.route-setup.v1";

/** Shared with Admin approval panel — same localStorage key. */
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

type RouteSetupStorageV2 = {
  version: 2;
  activeRouteId: string | null;
  byRoute: Record<string, RouteSetupRecord>;
};

const listeners = new Set<() => void>();

/** Active driver scope — set from session/ops (not seed). */
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

function hydrateApprovedFromOps(base: RouteSetupRecord, s: RouteSetupDriverScope): RouteSetupRecord {
  const ops = loadTransportOps();
  const sync = ops.driverStopsByRoute[s.routeId];
  if (!sync || sync.stops.length === 0) {
    return {
      ...base,
      lockedByAdmin: Boolean(ops.routeLocksByRoute[s.routeId]?.locked),
    };
  }

  const existingIds = new Set(base.stops.map((st) => st.id));
  const approvedStops: RouteSetupStop[] = sync.stops
    .filter((st) => !existingIds.has(st.id))
    .map((st, index) => ({
      id: st.id,
      name: st.name,
      locationLabel: defaultLocationLabel(st.latitude, st.longitude),
      latitude: st.latitude,
      longitude: st.longitude,
      timestampCreated: st.timestampCreated,
      updatedAt: sync.updatedAt,
      createdBy: st.createdBy,
      studentIds: [...st.studentIds],
      routeOrder: st.routeOrder || index + 1,
      status: "approved" as const,
      submittedAt: st.timestampCreated,
    }));

  const enrollments = enrollmentsForVehicle(s.vehicleId).filter((e) => e.stopId);
  const assignmentKeys = new Set(base.assignments.map((a) => `${a.studentId}:${a.stopId}`));
  const approvedAssignments: StudentStopAssignment[] = [];

  for (const stop of [...base.stops, ...approvedStops].filter((st) => st.status === "approved")) {
    for (const studentId of stop.studentIds) {
      const key = `${studentId}:${stop.id}`;
      if (assignmentKeys.has(key)) continue;
      const enrollment = enrollments.find((e) => e.studentId === studentId);
      approvedAssignments.push({
        id: uid("asn"),
        studentId,
        studentName: enrollment?.studentName ?? studentId,
        studentClass: enrollment?.studentClass ?? "—",
        stopId: stop.id,
        stopName: stop.name,
        status: "approved",
        createdAt: stop.timestampCreated,
        updatedAt: stop.updatedAt,
      });
      assignmentKeys.add(key);
    }
  }

  return {
    ...base,
    lockedByAdmin: Boolean(ops.routeLocksByRoute[s.routeId]?.locked),
    stops: renumber([...base.stops, ...approvedStops]),
    assignments: [...base.assignments, ...approvedAssignments],
  };
}

function normalizeStop(raw: Partial<RouteSetupStop> & Pick<RouteSetupStop, "id">): RouteSetupStop {
  const latitude = raw.latitude ?? 0;
  const longitude = raw.longitude ?? 0;
  const now = new Date().toISOString();
  return {
    id: raw.id,
    name: raw.name ?? "Stop",
    locationLabel: raw.locationLabel ?? defaultLocationLabel(latitude, longitude),
    latitude,
    longitude,
    timestampCreated: raw.timestampCreated ?? now,
    updatedAt: raw.updatedAt ?? now,
    createdBy: raw.createdBy ?? "driver",
    studentIds: Array.isArray(raw.studentIds) ? [...raw.studentIds] : [],
    routeOrder: raw.routeOrder ?? 1,
    status: raw.status ?? "pending",
    submittedAt: raw.submittedAt,
    replacesStopId: raw.replacesStopId,
    rejectionReason: raw.rejectionReason,
  };
}

function normalizeAssignment(raw: Partial<StudentStopAssignment> & { id: string }): StudentStopAssignment {
  const now = new Date().toISOString();
  return {
    id: raw.id,
    studentId: raw.studentId ?? "",
    studentName: raw.studentName ?? raw.studentId ?? "Student",
    studentClass: raw.studentClass ?? "—",
    stopId: raw.stopId ?? "",
    stopName: raw.stopName ?? "—",
    status: raw.status ?? "pending",
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
    replacesAssignmentId: raw.replacesAssignmentId,
    rejectionReason: raw.rejectionReason,
  };
}

function normalizeRecord(parsed: Partial<RouteSetupRecord>, fallback: RouteSetupRecord): RouteSetupRecord {
  return {
    ...fallback,
    ...parsed,
    stops: Array.isArray(parsed.stops) ? renumber(parsed.stops.map((s) => normalizeStop(s))) : [],
    assignments: Array.isArray(parsed.assignments)
      ? parsed.assignments.map((a) => normalizeAssignment(a))
      : [],
  };
}

function loadStorage(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      byRoute = {};
      return;
    }
    const parsed = JSON.parse(raw) as RouteSetupStorageV2 | RouteSetupRecord;
    if (parsed && typeof parsed === "object" && "version" in parsed && parsed.version === 2) {
      const v2 = parsed as RouteSetupStorageV2;
      byRoute = {};
      for (const [routeId, rec] of Object.entries(v2.byRoute ?? {})) {
        byRoute[routeId] = normalizeRecord(rec, emptyRecord(routeId, rec.routeCode ?? routeId, rec.routeName ?? routeId));
      }
      return;
    }
    // Migrate legacy single-record format
    const legacy = parsed as RouteSetupRecord;
    const routeId = legacy.routeId || "legacy";
    byRoute = {
      [routeId]: normalizeRecord(legacy, emptyRecord(routeId, legacy.routeCode ?? routeId, legacy.routeName ?? routeId)),
    };
  } catch {
    byRoute = {};
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function persistLocalOnly() {
  if (scope) {
    byRoute[scope.routeId] = record;
  }
  try {
    const payload: RouteSetupStorageV2 = {
      version: 2,
      activeRouteId: scope?.routeId ?? null,
      byRoute,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
  emit();
}

function persist() {
  persistLocalOnly();
  recordLocalChangeForSync({
    app: "transport",
    module: "Route setup",
    label: "Save route stops",
    op: "update",
  });
  pushApprovedOpsBridge();
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
      persistLocalOnly();
      emit();
    })
    .catch(() => undefined);
}

function applyAdminLockFromBridge() {
  if (!scope) return;
  const lock = loadTransportOps().routeLocksByRoute[scope.routeId];
  if (!lock || record.lockedByAdmin === lock.locked) return;
  record = { ...record, lockedByAdmin: lock.locked };
  persistLocalOnly();
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
  record = hydrateApprovedFromOps(base, next);
  byRoute[next.routeId] = record;
  persistLocalOnly();
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

  const apiById = new Map(input.stops.map((s) => [s.id, s]));
  const nextStops = record.stops.map((local) => {
    const api =
      apiById.get(local.id) ??
      (local.apiStopId ? apiById.get(local.apiStopId) : undefined);
    if (!api) return local;
    const status: SubmissionStatus =
      api.approvalStatus === "approved"
        ? "approved"
        : api.approvalStatus === "rejected"
          ? "rejected"
          : local.status === "draft"
            ? "pending"
            : local.status;
    return {
      ...local,
      apiStopId: api.id,
      name: api.name,
      locationLabel: api.locationLabel || local.locationLabel,
      latitude: api.latitude,
      longitude: api.longitude,
      routeOrder: api.routeOrder + 1,
      status,
      updatedAt: new Date().toISOString(),
    };
  });

  const knownIds = new Set(
    nextStops.flatMap((s) => [s.id, s.apiStopId].filter(Boolean) as string[]),
  );
  const imported: RouteSetupStop[] = input.stops
    .filter((s) => s.approvalStatus === "approved" && !knownIds.has(s.id))
    .map((s) => ({
      id: s.id,
      name: s.name,
      locationLabel: s.locationLabel || defaultLocationLabel(s.latitude, s.longitude),
      latitude: s.latitude,
      longitude: s.longitude,
      timestampCreated: s.createdAt,
      updatedAt: s.createdAt,
      createdBy: "api",
      studentIds: input.students
        .filter((st) => st.pickupStopId === s.id && st.approvalStatus === "approved")
        .map((st) => st.studentId),
      routeOrder: s.routeOrder + 1,
      status: "approved" as const,
      submittedAt: s.createdAt,
      apiStopId: s.id,
    }));

  const mergedStops = renumber([...nextStops, ...imported]);
  const stopNameById = new Map(mergedStops.map((s) => [s.id, s.name]));
  const assignmentKeys = new Set(
    record.assignments.map((a) => `${a.studentId}:${a.stopId}`),
  );
  const importedAssignments: StudentStopAssignment[] = [];
  const now = new Date().toISOString();

  for (const student of input.students.filter((s) => s.approvalStatus === "approved")) {
    const stopId = student.pickupStopId;
    if (!mergedStops.some((s) => s.id === stopId || s.apiStopId === stopId)) continue;
    const key = `${student.studentId}:${stopId}`;
    if (assignmentKeys.has(key)) continue;
    importedAssignments.push({
      id: uid("asn"),
      studentId: student.studentId,
      studentName: student.studentName,
      studentClass: student.classLabel,
      stopId,
      stopName: stopNameById.get(stopId) ?? "Stop",
      status: "approved",
      createdAt: now,
      updatedAt: now,
      apiEnrollmentId: student.enrollmentId,
    });
    assignmentKeys.add(key);
  }

  const nextAssignments = record.assignments.map((a) => {
    const match = input.students.find(
      (s) =>
        s.studentId === a.studentId &&
        (s.pickupStopId === a.stopId || s.enrollmentId === a.apiEnrollmentId),
    );
    if (!match) return a;
    return {
      ...a,
      apiEnrollmentId: match.enrollmentId,
      studentName: match.studentName,
      studentClass: match.classLabel,
      status:
        match.approvalStatus === "approved"
          ? ("approved" as const)
          : a.status,
    };
  });

  record = {
    ...record,
    lockedByAdmin: input.lockedByAdmin,
    stops: mergedStops,
    assignments: [...nextAssignments, ...importedAssignments],
    status:
      mergedStops.some((s) => s.status === "approved") || record.status === "configured"
        ? "configured"
        : record.status,
  };
  byRoute[scope.routeId] = record;
  persistLocalOnly();
  emit();
}

export function getRouteSetupDriverScope(): RouteSetupDriverScope | null {
  return scope;
}

if (typeof window !== "undefined") {
  loadStorage();
  window.addEventListener(TRANSPORT_OPS_CHANGED_EVENT, applyAdminLockFromBridge);
  window.addEventListener(TRANSPORT_APPROVAL_CHANGED_EVENT, reloadActiveFromStorage);
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY || e.key === null) reloadActiveFromStorage();
  });
}

/** Reload active route record from localStorage (Admin approve/decline). */
function reloadActiveFromStorage() {
  const previousScope = scope;
  loadStorage();
  if (!previousScope) {
    emit();
    return;
  }
  scope = previousScope;
  const existing = byRoute[previousScope.routeId];
  const base = existing
    ? {
        ...existing,
        routeCode: previousScope.routeCode,
        routeName: previousScope.routeName,
      }
    : seedRecordForScope(previousScope);
  record = hydrateApprovedFromOps(base, previousScope);
  byRoute[previousScope.routeId] = record;
  emit();
}

function emitApprovalChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TRANSPORT_APPROVAL_CHANGED_EVENT));
  }
}

/** Sync only Admin-approved stops — pending changes stay local until approved. */
function pushApprovedOpsBridge() {
  if (!scope) return;
  const approvedStops = record.stops.filter((s) => s.status === "approved");
  if (approvedStops.length === 0) return;
  syncDriverStopAssignment({
    routeId: scope.routeId,
    vehicleId: scope.vehicleId,
    vehicleNumber: scope.vehicleNumber,
    createdBy: scope.driverId,
    createdByName: scope.driverName,
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
        createdByName: scope!.driverName,
      };
    }),
  });
}

function renumber(stops: RouteSetupStop[]): RouteSetupStop[] {
  return stops.map((s, i) => ({ ...s, routeOrder: i + 1 }));
}

function enrollmentMeta(studentId: string) {
  const vehicleId = scope?.vehicleId;
  const enrollment = vehicleId
    ? enrollmentsForVehicle(vehicleId).find((e) => e.studentId === studentId)
    : undefined;
  return {
    studentName: enrollment?.studentName ?? studentId,
    studentClass: enrollment?.studentClass ?? "—",
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
  persistLocalOnly();
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
      notifyAdminStopRequest({
        stopId: changeRequest.id,
        stopName: changeRequest.name,
        routeCode: record.routeCode,
        driverName: getRouteSetupDriverScope()?.driverName,
        resubmit: true,
      });
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
    notifyAdminStopRequest({
      stopId: updated.id,
      stopName: updated.name,
      routeCode: record.routeCode,
      driverName: getRouteSetupDriverScope()?.driverName,
      resubmit: wasRejected || existing.status === "pending",
    });
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
  notifyAdminStopRequest({
    stopId: next.id,
    stopName: next.name,
    routeCode: record.routeCode,
    driverName: getRouteSetupDriverScope()?.driverName,
    resubmit: false,
  });
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
  persistLocalOnly();
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
  persistLocalOnly();
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
  persistLocalOnly();
  return record;
}

export function setRouteSetupAdminLock(locked: boolean): RouteSetupRecord {
  record = { ...record, lockedByAdmin: locked };
  persistLocalOnly();
  return record;
}

/**
 * Frontend mock Admin approve — same localStorage as Admin panel.
 * Approves the stop and its student assignments; activates change requests.
 */
export function applyAdminApproveStop(stopId: string): RouteSetupRecord {
  if (record.lockedByAdmin) return record;
  const stop = record.stops.find((s) => s.id === stopId);
  if (!stop || stop.status !== "pending") return record;
  const now = new Date().toISOString();

  if (stop.replacesStopId) {
    const originalId = stop.replacesStopId;
    record = {
      ...record,
      stops: renumber(
        record.stops
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
      ),
      assignments: record.assignments
        .filter((a) => !(a.stopId === originalId && a.status === "approved"))
        .map((a) => {
          if (a.stopId === originalId) {
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
          if (a.stopId === stopId) {
            return {
              ...a,
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
    record = {
      ...record,
      stops: record.stops.map((s) =>
        s.id === stopId
          ? {
              ...s,
              status: "approved" as const,
              updatedAt: now,
              rejectionReason: undefined,
            }
          : s,
      ),
      assignments: record.assignments.map((a) =>
        a.stopId === stopId
          ? {
              ...a,
              status: "approved" as const,
              updatedAt: now,
              rejectionReason: undefined,
            }
          : a,
      ),
    };
  }

  persist();
  emitApprovalChanged();
  return record;
}

/**
 * Frontend mock Admin decline with reason — stop stays visible for edit/resubmit.
 */
export function applyAdminDeclineStop(
  stopId: string,
  reason = "Location or student list needs correction.",
): RouteSetupRecord {
  if (record.lockedByAdmin) return record;
  const stop = record.stops.find((s) => s.id === stopId);
  if (!stop || stop.status !== "pending") return record;
  const now = new Date().toISOString();
  const trimmed = reason.trim() || "Location or student list needs correction.";

  record = {
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
  persistLocalOnly();
  emitApprovalChanged();
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
    record = hydrateApprovedFromOps(seedRecordForScope(scope), scope);
    byRoute[scope.routeId] = record;
  } else {
    record = emptyRecord("unscoped", "—", "No route");
    byRoute = {};
  }
  try {
    if (!scope) localStorage.removeItem(STORAGE_KEY);
    else persistLocalOnly();
  } catch {
    // ignore
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
