/**
 * Shared Transport workflow notifications (Admin ↔ Driver).
 * Frontend/localStorage mock only — no push, SMS, or backend.
 */

export const TRANSPORT_NOTIFICATION_STORAGE_KEY = "lumenx.transport.notifications.v1";
export const TRANSPORT_NOTIFICATION_CHANGED_EVENT = "lumenx-transport-notifications-updated";

export type TransportNotifAudience = "driver" | "admin" | "connect";

/** Workflow category (maps into each app’s existing inbox kinds). */
export type TransportNotifCategory =
  | "approval"
  | "route"
  | "trip"
  | "boarding"
  | "approach"
  | "sos"
  | "emergency"
  | "system";

/** Aligns with shared LumenX notification priority. */
export type TransportNotifPriority = "normal" | "important" | "critical" | "success";

export type TransportWorkflowNotification = {
  id: string;
  audience: TransportNotifAudience;
  category: TransportNotifCategory;
  title: string;
  message: string;
  /** Decline / context reason when relevant */
  reason: string | null;
  unread: boolean;
  createdAt: string;
  href?: string;
  meta?: Record<string, string>;
  priority?: TransportNotifPriority;
  /** Registry template id when rendered from the shared catalog. */
  templateId?: string;
};

export type TransportNotificationSnapshot = {
  version: 1;
  items: TransportWorkflowNotification[];
};

export type PushTransportNotificationInput = {
  audience: TransportNotifAudience;
  category: TransportNotifCategory;
  title: string;
  message: string;
  reason?: string | null;
  href?: string;
  meta?: Record<string, string>;
  priority?: TransportNotifPriority;
  templateId?: string;
  /** Optional stable id for dedupe (e.g. approve:stopId). */
  id?: string;
};

function emptySnapshot(): TransportNotificationSnapshot {
  return { version: 1, items: [] };
}

function canUseStorage(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage != null;
  } catch {
    return false;
  }
}

let cachedItems: TransportWorkflowNotification[] | null = null;

function invalidateCache() {
  cachedItems = null;
}

function emitChanged() {
  invalidateCache();
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TRANSPORT_NOTIFICATION_CHANGED_EVENT));
}

export function loadTransportNotifications(): TransportNotificationSnapshot {
  if (!canUseStorage()) return emptySnapshot();
  try {
    const raw = localStorage.getItem(TRANSPORT_NOTIFICATION_STORAGE_KEY);
    if (!raw) return emptySnapshot();
    const parsed = JSON.parse(raw) as Partial<TransportNotificationSnapshot>;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.items)) return emptySnapshot();
    return { version: 1, items: parsed.items };
  } catch {
    return emptySnapshot();
  }
}

function saveSnapshot(snapshot: TransportNotificationSnapshot): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(TRANSPORT_NOTIFICATION_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore quota
  }
  emitChanged();
}

export function listTransportNotifications(
  audience?: TransportNotifAudience,
): TransportWorkflowNotification[] {
  if (!cachedItems) {
    cachedItems = loadTransportNotifications().items;
  }
  const items = cachedItems;
  const filtered = audience ? items.filter((n) => n.audience === audience) : items;
  return [...filtered].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function pushTransportNotification(
  input: PushTransportNotificationInput,
): TransportWorkflowNotification {
  const now = new Date().toISOString();
  const id = input.id ?? `tn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const row: TransportWorkflowNotification = {
    id,
    audience: input.audience,
    category: input.category,
    title: input.title,
    message: input.message,
    reason: input.reason?.trim() ? input.reason.trim() : null,
    unread: true,
    createdAt: now,
    href: input.href,
    meta: input.meta,
    priority: input.priority,
    templateId: input.templateId,
  };

  const snap = loadTransportNotifications();
  const without = snap.items.filter((n) => n.id !== id);
  saveSnapshot({ version: 1, items: [row, ...without].slice(0, 200) });
  return row;
}

export function markTransportNotificationRead(id: string): void {
  const snap = loadTransportNotifications();
  let changed = false;
  const items = snap.items.map((n) => {
    if (n.id !== id || !n.unread) return n;
    changed = true;
    return { ...n, unread: false };
  });
  if (changed) saveSnapshot({ version: 1, items });
}

export function markAllTransportNotificationsRead(audience: TransportNotifAudience): void {
  const snap = loadTransportNotifications();
  let changed = false;
  const items = snap.items.map((n) => {
    if (n.audience !== audience || !n.unread) return n;
    changed = true;
    return { ...n, unread: false };
  });
  if (changed) saveSnapshot({ version: 1, items });
}

export function resetTransportNotifications(): void {
  saveSnapshot(emptySnapshot());
}

export function subscribeTransportNotifications(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onCustom = () => listener();
  const onStorage = (e: StorageEvent) => {
    if (e.key === TRANSPORT_NOTIFICATION_STORAGE_KEY || e.key === null) listener();
  };
  window.addEventListener(TRANSPORT_NOTIFICATION_CHANGED_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(TRANSPORT_NOTIFICATION_CHANGED_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}

/** Convenience: Admin → Driver stop approved */
export function notifyDriverStopApproved(input: {
  stopId: string;
  stopName: string;
  routeCode?: string;
}): TransportWorkflowNotification {
  return pushTransportNotification({
    id: `driver-stop-approved-${input.stopId}-${Date.now()}`,
    audience: "driver",
    category: "approval",
    title: "Stop approved",
    message: `${input.stopName} is now active${input.routeCode ? ` on ${input.routeCode}` : ""}.`,
    href: "/more/route-setup",
    meta: { stopId: input.stopId, stopName: input.stopName },
  });
}

/** Convenience: Admin → Driver stop declined */
export function notifyDriverStopDeclined(input: {
  stopId: string;
  stopName: string;
  reason: string;
}): TransportWorkflowNotification {
  return pushTransportNotification({
    id: `driver-stop-declined-${input.stopId}-${Date.now()}`,
    audience: "driver",
    category: "approval",
    title: "Stop request declined",
    message: `${input.stopName} needs correction.`,
    reason: input.reason,
    href: "/more/route-setup",
    meta: { stopId: input.stopId, stopName: input.stopName },
  });
}

export function notifyDriverRouteLocked(input: {
  routeId: string;
  routeName?: string;
}): TransportWorkflowNotification {
  const label = input.routeName || input.routeId;
  return pushTransportNotification({
    id: `driver-route-locked-${input.routeId}-${Date.now()}`,
    audience: "driver",
    category: "route",
    title: "Route setup locked",
    message: `${label} is locked by Admin. Stop edits are paused.`,
    href: "/more/route-setup",
    meta: { routeId: input.routeId },
  });
}

export function notifyDriverRouteUnlocked(input: {
  routeId: string;
  routeName?: string;
}): TransportWorkflowNotification {
  const label = input.routeName || input.routeId;
  return pushTransportNotification({
    id: `driver-route-unlocked-${input.routeId}-${Date.now()}`,
    audience: "driver",
    category: "route",
    title: "Route setup unlocked",
    message: `${label} is unlocked. You can edit stops again.`,
    href: "/more/route-setup",
    meta: { routeId: input.routeId },
  });
}

export function notifyAdminStopRequest(input: {
  stopId: string;
  stopName: string;
  routeCode?: string;
  driverName?: string;
  resubmit?: boolean;
}): TransportWorkflowNotification {
  return pushTransportNotification({
    id: `admin-stop-${input.resubmit ? "resubmit" : "create"}-${input.stopId}-${Date.now()}`,
    audience: "admin",
    category: "approval",
    title: input.resubmit ? "Stop request resubmitted" : "Stop request created",
    message: `${input.stopName}${input.routeCode ? ` · ${input.routeCode}` : ""}${
      input.driverName ? ` · ${input.driverName}` : ""
    }`,
    href: "/transport?view=reviews",
    meta: { stopId: input.stopId, stopName: input.stopName },
  });
}

export function notifyAdminTripStarted(input: {
  tripId: string;
  busNumber: string;
  routeCode: string;
  driverName: string;
}): TransportWorkflowNotification {
  const row = pushTransportNotification({
    id: `admin-trip-start-${input.tripId}`,
    audience: "admin",
    category: "trip",
    title: "Trip started",
    message: `${input.driverName} started ${input.busNumber} on ${input.routeCode}.`,
    href: "/transport?view=attendance",
    priority: "important",
    templateId: "transport.admin.trip_started",
    meta: { tripId: input.tripId, vehicleNumber: input.busNumber, routeCode: input.routeCode },
  });
  notifyConnectTripStarted(input);
  return row;
}

export function notifyAdminTripEnded(input: {
  tripId: string;
  busNumber: string;
  routeCode: string;
  driverName: string;
}): TransportWorkflowNotification {
  const row = pushTransportNotification({
    id: `admin-trip-end-${input.tripId}`,
    audience: "admin",
    category: "trip",
    title: "Trip completed",
    message: `${input.driverName} ended ${input.busNumber} on ${input.routeCode}.`,
    href: "/transport?view=attendance",
    meta: { tripId: input.tripId, vehicleNumber: input.busNumber, routeCode: input.routeCode },
  });
  notifyConnectTripEnded(input);
  return row;
}

export function notifyAdminSos(input: {
  emergencyId: string;
  driverName: string;
  vehicleNumber: string;
  routeCode: string;
}): TransportWorkflowNotification {
  return notifyAdminEmergency({
    ...input,
    kind: "sos",
  });
}

export function notifyAdminEmergency(input: {
  emergencyId: string;
  driverName: string;
  vehicleNumber: string;
  routeCode: string;
  kind: "sos" | "breakdown" | "delay" | "route_issue";
  note?: string | null;
}): TransportWorkflowNotification {
  const labels: Record<typeof input.kind, { title: string; priority: TransportNotifPriority }> = {
    sos: { title: "SOS raised", priority: "critical" },
    breakdown: { title: "Bus breakdown", priority: "critical" },
    delay: { title: "Major delay", priority: "important" },
    route_issue: { title: "Route issue", priority: "important" },
  };
  const meta = labels[input.kind];
  const row = pushTransportNotification({
    id: `admin-emergency-${input.kind}-${input.emergencyId}`,
    audience: "admin",
    category: input.kind === "sos" ? "sos" : "emergency",
    title: meta.title,
    message: `${input.driverName} · ${input.vehicleNumber} · ${input.routeCode}${
      input.note ? ` — ${input.note}` : ""
    }`,
    reason: input.note ?? null,
    href: "/transport?view=emergencies",
    priority: meta.priority,
    templateId: `transport.admin.emergency_${input.kind}`,
    meta: {
      emergencyId: input.emergencyId,
      vehicleNumber: input.vehicleNumber,
      routeCode: input.routeCode,
      kind: input.kind,
    },
  });
  notifyConnectEmergency(input);
  return row;
}

export function notifyConnectEmergency(input: {
  emergencyId: string;
  driverName: string;
  vehicleNumber: string;
  routeCode: string;
  kind: "sos" | "breakdown" | "delay" | "route_issue";
  note?: string | null;
}): TransportWorkflowNotification {
  const titles: Record<typeof input.kind, string> = {
    sos: "Emergency on your bus",
    breakdown: "Bus breakdown",
    delay: "Major bus delay",
    route_issue: "Route issue on your bus",
  };
  const priority: TransportNotifPriority =
    input.kind === "sos" || input.kind === "breakdown" ? "critical" : "important";
  return pushTransportNotification({
    id: `connect-emergency-${input.kind}-${input.emergencyId}`,
    audience: "connect",
    category: input.kind === "sos" ? "sos" : "emergency",
    title: titles[input.kind],
    message: `${input.vehicleNumber} · ${input.routeCode} · ${input.driverName}${
      input.note ? ` — ${input.note}` : ""
    }.`,
    reason: input.note ?? null,
    href: "/transport",
    priority,
    templateId: `transport.parent.emergency_${input.kind}`,
    meta: {
      emergencyId: input.emergencyId,
      vehicleNumber: input.vehicleNumber,
      routeCode: input.routeCode,
      kind: input.kind,
    },
  });
}

/** Connect parent/student transport alerts (same UI list — shared store). */
export function notifyConnectTripStarted(input: {
  tripId: string;
  busNumber: string;
  routeCode: string;
  driverName: string;
}): TransportWorkflowNotification {
  return pushTransportNotification({
    id: `connect-trip-start-${input.tripId}`,
    audience: "connect",
    category: "trip",
    title: "Trip started",
    message: `${input.busNumber} is on route ${input.routeCode} with ${input.driverName}.`,
    href: "/transport",
    priority: "important",
    templateId: "transport.parent.trip_started",
    meta: { tripId: input.tripId, vehicleNumber: input.busNumber, routeCode: input.routeCode },
  });
}

export function notifyConnectTripEnded(input: {
  tripId: string;
  busNumber: string;
  routeCode: string;
  driverName: string;
}): TransportWorkflowNotification {
  return pushTransportNotification({
    id: `connect-trip-end-${input.tripId}`,
    audience: "connect",
    category: "trip",
    title: "Trip completed",
    message: `${input.busNumber} finished route ${input.routeCode}.`,
    href: "/transport",
    meta: { tripId: input.tripId, vehicleNumber: input.busNumber, routeCode: input.routeCode },
  });
}

export function notifyConnectSos(input: {
  emergencyId: string;
  driverName: string;
  vehicleNumber: string;
  routeCode: string;
}): TransportWorkflowNotification {
  return notifyConnectEmergency({ ...input, kind: "sos" });
}

export function notifyConnectStopAssigned(input: {
  studentId: string;
  studentName: string;
  stopName: string;
  vehicleNumber: string;
}): TransportWorkflowNotification {
  return pushTransportNotification({
    id: `connect-stop-${input.studentId}-${input.stopName}`,
    audience: "connect",
    category: "route",
    title: "Stop assigned",
    message: `${input.studentName} pickup is ${input.stopName} on ${input.vehicleNumber}.`,
    href: "/transport",
    meta: {
      studentId: input.studentId,
      stopName: input.stopName,
      vehicleNumber: input.vehicleNumber,
    },
  });
}

export function notifyDriverSosAcknowledged(input: {
  emergencyId: string;
  note?: string | null;
}): TransportWorkflowNotification {
  return pushTransportNotification({
    id: `driver-sos-ack-${input.emergencyId}-${Date.now()}`,
    audience: "driver",
    category: "sos",
    title: "SOS acknowledged",
    message: `Admin is handling ${input.emergencyId}.`,
    reason: input.note ?? null,
    href: "/emergency",
    priority: "important",
    meta: { emergencyId: input.emergencyId },
  });
}

export function notifyDriverSosResolved(input: {
  emergencyId: string;
  note?: string | null;
  resolvedBy?: string;
}): TransportWorkflowNotification {
  return pushTransportNotification({
    id: `driver-sos-resolved-${input.emergencyId}`,
    audience: "driver",
    category: "sos",
    title: "Emergency Resolved",
    message: `${input.emergencyId} was resolved${input.resolvedBy ? ` by ${input.resolvedBy}` : ""}.`,
    reason: input.note ?? null,
    href: "/emergency",
    priority: "success",
    meta: { emergencyId: input.emergencyId },
  });
}

/** Bus approach milestones (30 / 15 / 5 min) for Connect parents. */
export function notifyConnectBusApproach(input: {
  tripId: string;
  studentId: string;
  studentName: string;
  stopName: string;
  vehicleNumber: string;
  routeCode: string;
  minutes: 30 | 15 | 5;
  etaLabel?: string;
  busStatus?: string;
}): TransportWorkflowNotification {
  const status = input.busStatus ?? "en route";
  const eta = input.etaLabel ?? `~${input.minutes} min`;
  return pushTransportNotification({
    id: `connect-approach-${input.minutes}-${input.tripId}-${input.studentId}`,
    audience: "connect",
    category: "approach",
    title: `Bus approaching in ${input.minutes} minutes`,
    message: `${input.studentName}: stop ${input.stopName} · ETA ${eta} · ${input.vehicleNumber} (${status}) · ${input.routeCode}.`,
    href: "/transport",
    priority: input.minutes <= 5 ? "important" : "normal",
    templateId: `transport.parent.approach_${input.minutes}`,
    meta: {
      tripId: input.tripId,
      studentId: input.studentId,
      stopName: input.stopName,
      vehicleNumber: input.vehicleNumber,
      routeCode: input.routeCode,
      minutes: String(input.minutes),
      eta,
      busStatus: status,
    },
  });
}

export function notifyConnectStudentBoarded(input: {
  tripId: string;
  studentId: string;
  studentName: string;
  stopName: string;
  vehicleNumber: string;
}): TransportWorkflowNotification {
  return pushTransportNotification({
    id: `connect-boarded-${input.tripId}-${input.studentId}`,
    audience: "connect",
    category: "boarding",
    title: "Student boarded",
    message: `${input.studentName} boarded at ${input.stopName} on ${input.vehicleNumber}.`,
    href: "/transport",
    priority: "important",
    templateId: "transport.parent.student_boarded",
    meta: {
      tripId: input.tripId,
      studentId: input.studentId,
      stopName: input.stopName,
      vehicleNumber: input.vehicleNumber,
    },
  });
}

export function notifyConnectStudentNotBoarded(input: {
  tripId: string;
  studentId: string;
  studentName: string;
  stopName: string;
  vehicleNumber: string;
}): TransportWorkflowNotification {
  return pushTransportNotification({
    id: `connect-not-boarded-${input.tripId}-${input.studentId}`,
    audience: "connect",
    category: "boarding",
    title: "Student not boarded",
    message: `${input.studentName} was marked not boarded at ${input.stopName} (${input.vehicleNumber}).`,
    href: "/transport",
    priority: "important",
    templateId: "transport.parent.student_not_boarded",
    meta: {
      tripId: input.tripId,
      studentId: input.studentId,
      stopName: input.stopName,
      vehicleNumber: input.vehicleNumber,
    },
  });
}

export function notifyConnectReachedSchool(input: {
  tripId: string;
  busNumber: string;
  routeCode: string;
  studentId?: string;
}): TransportWorkflowNotification {
  return pushTransportNotification({
    id: `connect-school-${input.tripId}${input.studentId ? `-${input.studentId}` : ""}`,
    audience: "connect",
    category: "trip",
    title: "Reached school",
    message: `${input.busNumber} reached school on ${input.routeCode}.`,
    href: "/transport",
    priority: "important",
    templateId: "transport.parent.reached_school",
    meta: {
      tripId: input.tripId,
      vehicleNumber: input.busNumber,
      routeCode: input.routeCode,
      ...(input.studentId ? { studentId: input.studentId } : {}),
    },
  });
}

export function notifyConnectBoardingStarted(input: {
  tripId: string;
  busNumber: string;
  routeCode: string;
}): TransportWorkflowNotification {
  return pushTransportNotification({
    id: `connect-boarding-start-${input.tripId}`,
    audience: "connect",
    category: "boarding",
    title: "Boarding started",
    message: `${input.busNumber} started boarding attendance on ${input.routeCode}.`,
    href: "/transport",
    priority: "normal",
    templateId: "transport.parent.boarding_started",
    meta: {
      tripId: input.tripId,
      vehicleNumber: input.busNumber,
      routeCode: input.routeCode,
    },
  });
}

export function notifyConnectStudentDropped(input: {
  tripId: string;
  studentId: string;
  studentName: string;
  stopName: string;
  vehicleNumber: string;
}): TransportWorkflowNotification {
  return pushTransportNotification({
    id: `connect-dropped-${input.tripId}-${input.studentId}`,
    audience: "connect",
    category: "boarding",
    title: "Child dropped successfully",
    message: `${input.studentName} was dropped at ${input.stopName} (${input.vehicleNumber}).`,
    href: "/transport",
    priority: "important",
    templateId: "transport.parent.student_dropped",
    meta: {
      tripId: input.tripId,
      studentId: input.studentId,
      stopName: input.stopName,
      vehicleNumber: input.vehicleNumber,
    },
  });
}

/** Admin: driver ended trip without completing boarding marks. */
export function notifyAdminTransportAttendancePending(input: {
  tripId: string;
  busNumber: string;
  routeCode: string;
  driverName: string;
  pendingCount: number;
}): TransportWorkflowNotification {
  return pushTransportNotification({
    id: `admin-att-pending-${input.tripId}`,
    audience: "admin",
    category: "system",
    title: "Transport attendance not submitted",
    message: `${input.driverName} · ${input.busNumber} · ${input.routeCode}: ${input.pendingCount} student mark${
      input.pendingCount === 1 ? "" : "s"
    } still pending.`,
    href: "/transport?view=attendance",
    priority: "important",
    templateId: "transport.admin.attendance_pending",
    meta: {
      tripId: input.tripId,
      vehicleNumber: input.busNumber,
      routeCode: input.routeCode,
      pendingCount: String(input.pendingCount),
    },
  });
}
