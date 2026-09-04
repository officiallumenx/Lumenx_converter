import type { AppNotification } from "@lumenx/types";
import {
  enrollmentsForRoute,
  findOpenEmergencyForVehicle,
  findTripMetaForVehicle,
  isSharedTripActive,
  listTransportNotifications,
  loadTransportOps,
  notifyConnectBusApproach,
  projectConnectAttendanceForStudent,
  projectConnectTransport,
  resolveCanonicalStudentId,
  subscribeTransportEmergencies,
  subscribeTransportNotifications,
  TRANSPORT_ATTENDANCE_CHANGED_EVENT,
  TRANSPORT_ATTENDANCE_STORAGE_KEY,
  TRANSPORT_OPS_CHANGED_EVENT,
  transportEmergencyStatusLabel,
  type SharedTripAttendanceMeta,
  type TransportEmergency,
  type TransportWorkflowNotification,
} from "@lumenx/utils";
import { studentNotificationStore } from "@/lib/student/notification-store";
import { initialTracking, SCHOOL_STOP, seedTransportAlerts } from "@/lib/transport/mock-data";
import {
  readConnectStopApprovalStatus,
  TRANSPORT_APPROVAL_CHANGED_EVENT,
} from "@/lib/transport/route-setup-status";
import type {
  BusDetails,
  RouteStudentRow,
  StudentTransportAssignment,
  TransportAlert,
  TransportEventType,
  TransportRouteOverview,
  TransportStop,
  TransportTracking,
} from "@/lib/transport/types";

type Listener = () => void;

let initialized = false;
let activeRole: "parent" | "student" | "teacher" | null = null;
let activeLearnerKey = "S-2041";
let assignment: StudentTransportAssignment = emptyAssignment();
let tracking: TransportTracking = { ...initialTracking };
let alerts: TransportAlert[] = seedTransportAlerts.map((a) => ({ ...a }));
let routeStudents: RouteStudentRow[] = [];
let routeOverview: TransportRouteOverview = emptyRouteOverview();
let tickTimer: ReturnType<typeof setInterval> | null = null;
let opsListening = false;
let attendanceListening = false;
let bridgeUnsubs: Array<() => void> = [];
/** When driver marks exist for this learner, skip simulated pickup/drop. */
let sharedAttendanceActive = false;
/** Shared Driver trip meta for this learner's bus. */
let sharedTrip: SharedTripAttendanceMeta | null = null;
let openEmergency: TransportEmergency | null = null;
let lastKnownStopId: string | null = null;
const listeners = new Set<Listener>();
const firedMilestones = new Set<string>();
const ingestedNotifIds = new Set<string>();

function emptyAssignment(): StudentTransportAssignment {
  return {
    studentId: "STU-1042",
    studentName: "—",
    bus: {
      busNumber: "—",
      vehicleReg: "—",
      capacity: 40,
      driverName: "—",
      driverPhone: "—",
      routeId: "RT-01",
      routeName: "—",
      routeCode: "—",
      vehicleId: undefined,
    },
    pickupStop: {
      id: "pending",
      name: "Stop assignment pending",
      address: "Awaiting driver stop assignment",
      scheduledTime: "—",
      order: 0,
    },
    dropStop: { ...SCHOOL_STOP },
    morningPickupTime: "—",
    afternoonDropTime: "—",
    stopApprovalStatus: "none",
  };
}

function emptyRouteOverview(): TransportRouteOverview {
  return {
    routeId: "RT-01",
    routeName: "—",
    routeCode: "—",
    stops: [],
    students: [],
    bus: emptyAssignment().bus,
    tracking: { ...initialTracking },
  };
}

function formatDriverPhone(digits: string | null | undefined): string {
  if (!digits || digits.length !== 10) return "—";
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/** Build Connect assignment solely from Admin → Driver ops bridge. */
function assignmentFromOps(learnerKey: string): StudentTransportAssignment {
  const projected = projectConnectTransport(learnerKey);
  if (!projected) return emptyAssignment();

  const approval = readConnectStopApprovalStatus(projected.studentId);
  const stopPending = projected.stopPending || approval.status === "pending";
  const pickupName = stopPending
    ? approval.stopName
      ? `${approval.stopName} (pending approval)`
      : "Stop assignment pending"
    : (projected.stopName ?? "Stop assignment pending");

  const pickup: TransportStop = {
    id: projected.stopId ?? "pending",
    name: pickupName,
    address: stopPending
      ? "Awaiting Admin approval"
      : (projected.stopName ?? "Awaiting driver stop assignment"),
    scheduledTime: stopPending ? "Pending" : "07:18",
    order: 1,
  };

  const trip = findTripMetaForVehicle(projected.vehicleId);
  const bus: BusDetails = {
    busNumber: projected.vehicleNumber,
    vehicleReg: projected.vehicleNumber,
    capacity: 40,
    driverName: trip?.driverName || projected.driverName || "—",
    driverPhone: formatDriverPhone(projected.driverPhoneDigits),
    routeId: projected.routeId ?? "RT-01",
    routeName: trip?.routeName || projected.routeName || "—",
    routeCode: trip?.routeCode || projected.routeCode || "—",
    vehicleId: projected.vehicleId,
  };

  return {
    studentId: projected.studentId,
    studentName: projected.studentName,
    bus,
    pickupStop: pickup,
    dropStop: { ...SCHOOL_STOP },
    morningPickupTime: stopPending ? "—" : "07:18",
    afternoonDropTime: "15:40",
    stopApprovalStatus: stopPending
      ? "pending"
      : projected.stopId
        ? "approved"
        : approval.status,
  };
}

function rosterFromOps(routeId: string | null): RouteStudentRow[] {
  if (!routeId) return [];
  return enrollmentsForRoute(routeId).map((e) => {
    const mark = projectConnectAttendanceForStudent(e.studentId);
    let status: RouteStudentRow["status"] = "waiting";
    if (mark?.dropping === "dropped") status = "dropped_school";
    else if (mark?.boarding === "boarded") status = "picked_up";
    else if (mark?.boarding === "not_boarded") status = "absent";
    return {
      studentId: e.studentId,
      studentName: e.studentName,
      className: e.studentClass,
      rollNo: e.studentId.replace("STU-", ""),
      pickupStop: e.stopName ?? "Pending",
      status,
      boarding: mark?.boarding,
      dropping: mark?.dropping,
    };
  });
}

function stopsFromOps(routeId: string | null): TransportStop[] {
  if (!routeId) return [{ ...SCHOOL_STOP }];
  const ops = loadTransportOps();
  const driver = ops.driverStopsByRoute[routeId];
  if (driver?.stops?.length) {
    return [
      ...driver.stops
        .slice()
        .sort((a, b) => a.routeOrder - b.routeOrder)
        .map((s) => ({
          id: s.id,
          name: s.name,
          address: s.name,
          scheduledTime: "—",
          order: s.routeOrder,
        })),
      { ...SCHOOL_STOP },
    ];
  }
  const byStop = new Map<string, TransportStop>();
  for (const e of enrollmentsForRoute(routeId)) {
    if (!e.stopId || !e.stopName) continue;
    if (!byStop.has(e.stopId)) {
      byStop.set(e.stopId, {
        id: e.stopId,
        name: e.stopName,
        address: e.stopName,
        scheduledTime: "—",
        order: byStop.size + 1,
      });
    }
  }
  return [...byStop.values(), { ...SCHOOL_STOP }];
}

function notify() {
  listeners.forEach((l) => l());
}

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function pushAlert(
  type: TransportEventType,
  title: string,
  message: string,
  studentId?: string,
  studentName?: string,
  id?: string,
  href = "/transport",
) {
  const alert: TransportAlert = {
    id: id ?? `tx-${Date.now()}-${type}`,
    type,
    title,
    message,
    time: nowLabel(),
    read: false,
    studentId,
    studentName,
  };
  if (alerts.some((a) => a.id === alert.id)) return;
  alerts = [alert, ...alerts].slice(0, 40);
  notify();

  if (activeRole === "student") {
    const notif: AppNotification = {
      id: alert.id,
      title: alert.title,
      desc: alert.message,
      time: alert.time,
      type:
        type === "delay" || type === "eta_5min" || type === "sos" || type === "stop_pending"
          ? "warning"
          : "positive",
      category: "circulars",
      unread: true,
      priority: type === "delay" || type === "sos" ? "high" : "normal",
      detail: message,
      href,
    };
    studentNotificationStore.add(notif);
  }
}

function syncRouteOverview() {
  routeOverview = {
    routeId: assignment.bus.routeId,
    routeName: assignment.bus.routeName,
    routeCode: assignment.bus.routeCode,
    stops: stopsFromOps(assignment.bus.routeId),
    students: routeStudents.map((s) => ({ ...s })),
    bus: { ...assignment.bus },
    tracking: { ...tracking },
  };
}

function fireOnce(key: string, fn: () => void) {
  if (firedMilestones.has(key)) return;
  firedMilestones.add(key);
  fn();
}

function fireBusApproachMilestones(prevEta: number, nextEta: number) {
  const tripId = sharedTrip?.tripId ?? `local-${assignment.studentId}`;
  const thresholds = [30, 15, 5] as const;
  for (const minutes of thresholds) {
    if (prevEta > minutes && nextEta <= minutes && nextEta >= 0) {
      fireOnce(`eta_${minutes}_${tripId}_${assignment.studentId}`, () => {
        notifyConnectBusApproach({
          tripId,
          studentId: assignment.studentId,
          studentName: assignment.studentName,
          stopName: assignment.pickupStop.name,
          vehicleNumber: assignment.bus.busNumber,
          routeCode: assignment.bus.routeCode || "—",
          minutes,
          etaLabel: `~${minutes} min`,
          busStatus: tracking.runStatus === "at_stop" ? "at stop" : "en route",
        });
        pushAlert(
          minutes === 5 ? "eta_5min" : "delay",
          `Bus approaching in ${minutes} minutes`,
          `${assignment.pickupStop.name} · ETA ~${minutes} min · ${assignment.bus.busNumber} (${
            tracking.runStatus === "at_stop" ? "at stop" : "en route"
          }).`,
          assignment.studentId,
          assignment.studentName,
        );
      });
    }
  }
}

function mapNotifToAlertType(n: TransportWorkflowNotification): TransportEventType {
  if (n.category === "sos" || n.category === "emergency") return "sos";
  if (n.category === "approach") return "eta_5min";
  if (n.category === "boarding") {
    if (n.title.toLowerCase().includes("not boarded")) return "delay";
    if (n.title.toLowerCase().includes("dropped")) return "dropped_stop";
    if (n.title.toLowerCase().includes("boarded")) return "picked_up";
  }
  if (n.title.toLowerCase().includes("reached school")) return "reached_school";
  if (n.title.toLowerCase().includes("trip started")) return "trip_started";
  if (n.title.toLowerCase().includes("trip completed")) return "trip_completed";
  if (n.title.toLowerCase().includes("stop")) return "stop_approved";
  return "delay";
}

function ingestConnectNotifications() {
  const vehicle = assignment.bus.busNumber;
  const studentId = assignment.studentId;
  const items = listTransportNotifications("connect").filter((n) => {
    const metaVehicle = n.meta?.vehicleNumber;
    const metaStudent = n.meta?.studentId;
    if (metaStudent && metaStudent !== studentId) return false;
    if (metaVehicle && vehicle && metaVehicle !== "—" && metaVehicle !== vehicle) return false;
    return true;
  });

  for (const n of items) {
    if (ingestedNotifIds.has(n.id)) continue;
    ingestedNotifIds.add(n.id);
    pushAlert(
      mapNotifToAlertType(n),
      n.title,
      n.reason ? `${n.message} · ${n.reason}` : n.message,
      studentId,
      assignment.studentName,
      n.id,
    );
  }
}

function applySharedTripToTracking() {
  const vehicleId = assignment.bus.vehicleId;
  sharedTrip = vehicleId ? findTripMetaForVehicle(vehicleId) : null;
  const active = isSharedTripActive(sharedTrip);

  if (!sharedTrip) {
    tracking = {
      ...tracking,
      sharedTripActive: false,
      runStatus:
        tracking.runStatus === "completed" || tracking.learnerStatus === "reached_school"
          ? tracking.runStatus
          : "scheduled",
    };
    return;
  }

  const stops = stopsFromOps(assignment.bus.routeId);
  let stopIndex = 0;
  if (sharedTrip.currentStopId) {
    const idx = stops.findIndex((s) => s.id === sharedTrip!.currentStopId);
    if (idx >= 0) stopIndex = idx;
  }

  const progressFromStops =
    stops.length > 1 ? Math.round((stopIndex / (stops.length - 1)) * 100) : tracking.progressPercent;

  if (sharedTrip.finalized || sharedTrip.phase === "completed") {
    tracking = {
      ...tracking,
      sharedTripActive: false,
      phase: "at_school",
      runStatus: "completed",
      progressPercent: 100,
      etaMinutes: 0,
      currentStopIndex: Math.max(0, stops.length - 1),
      nextStopName: assignment.dropStop.name,
      lastUpdated: nowLabel(),
    };
    fireOnce(`trip-completed-${sharedTrip.tripId}`, () => {
      pushAlert(
        "trip_completed",
        "Trip completed",
        `${assignment.bus.busNumber} finished ${sharedTrip!.routeCode}.`,
        assignment.studentId,
        assignment.studentName,
      );
    });
    return;
  }

  if (active) {
    const phase = sharedTrip.phase;
    tracking = {
      ...tracking,
      sharedTripActive: true,
      phase: phase === "dropping" ? "at_school" : "morning_pickup",
      runStatus: phase === "boarding" || phase === "dropping" ? "at_stop" : "en_route",
      currentStopIndex: stopIndex,
      progressPercent: Math.max(tracking.progressPercent, Math.min(95, progressFromStops || 20)),
      nextStopName: sharedTrip.currentStopName || assignment.pickupStop.name,
      lastUpdated: nowLabel(),
      lat: tracking.lat,
      lng: tracking.lng,
    };
    fireOnce(`trip-started-${sharedTrip.tripId}`, () => {
      pushAlert(
        "trip_started",
        "Trip started",
        `${assignment.bus.busNumber} is on ${sharedTrip!.routeCode} with ${sharedTrip!.driverName}.`,
        assignment.studentId,
        assignment.studentName,
      );
    });
  }
}

function applySharedEmergency() {
  const vehicleId = assignment.bus.vehicleId;
  openEmergency = vehicleId ? findOpenEmergencyForVehicle(vehicleId) : null;
  if (openEmergency) {
    tracking = {
      ...tracking,
      emergencyActive: true,
      emergencyLabel: `SOS · ${transportEmergencyStatusLabel(openEmergency.status)}`,
      runStatus: "delayed",
      delayMinutes: Math.max(tracking.delayMinutes, 1),
      lastUpdated: nowLabel(),
    };
    fireOnce(`sos-${openEmergency.id}`, () => {
      pushAlert(
        "sos",
        "Emergency on your bus",
        `${openEmergency!.vehicleNumber} · ${openEmergency!.routeCode} · ${transportEmergencyStatusLabel(openEmergency!.status)}`,
        assignment.studentId,
        assignment.studentName,
        `connect-sos-${openEmergency!.id}`,
      );
    });
  } else {
    const clearedDelayed =
      tracking.runStatus === "delayed"
        ? isSharedTripActive(sharedTrip)
          ? ("en_route" as const)
          : tracking.learnerStatus === "reached_school"
            ? ("completed" as const)
            : ("scheduled" as const)
        : tracking.runStatus;
    tracking = {
      ...tracking,
      emergencyActive: false,
      emergencyLabel: null,
      runStatus: clearedDelayed,
      delayMinutes: 0,
    };
  }
}

function applySharedAttendanceToTracking() {
  const studentId = resolveCanonicalStudentId(assignment.studentId || activeLearnerKey);
  const mark = projectConnectAttendanceForStudent(studentId);
  sharedAttendanceActive = Boolean(mark);

  if (!mark) return;

  if (mark.dropping === "dropped") {
    tracking = {
      ...tracking,
      learnerStatus: "reached_school",
      phase: "at_school",
      runStatus: tracking.emergencyActive ? "delayed" : "completed",
      progressPercent: 100,
      etaMinutes: 0,
      nextStopName: assignment.dropStop.name,
      lastUpdated: nowLabel(),
    };
    fireOnce(`shared-dropped-${mark.tripId}`, () => {
      pushAlert(
        "dropped_school",
        "Dropped at school",
        `${assignment.studentName} was dropped (driver mark).`,
        assignment.studentId,
        assignment.studentName,
      );
    });
  } else if (mark.boarding === "boarded") {
    tracking = {
      ...tracking,
      learnerStatus: "picked_up",
      runStatus: tracking.emergencyActive ? "delayed" : "en_route",
      progressPercent: Math.max(tracking.progressPercent, 75),
      etaMinutes: 0,
      nextStopName: assignment.dropStop.name,
      lastUpdated: nowLabel(),
    };
    fireOnce(`shared-boarded-${mark.tripId}`, () => {
      pushAlert(
        "picked_up",
        "Picked up",
        `${assignment.studentName} boarded ${assignment.bus.busNumber} (driver mark).`,
        assignment.studentId,
        assignment.studentName,
      );
    });
  } else if (mark.boarding === "not_boarded") {
    tracking = {
      ...tracking,
      learnerStatus: "awaiting_pickup",
      runStatus: tracking.emergencyActive ? "delayed" : "at_stop",
      lastUpdated: nowLabel(),
    };
  }

  routeStudents = rosterFromOps(assignment.bus.routeId);
  syncRouteOverview();
}

function maybeAlertStopAssignmentChange() {
  const nextStopId = assignment.pickupStop.id === "pending" ? null : assignment.pickupStop.id;
  if (lastKnownStopId === null && nextStopId) {
    fireOnce(`stop-approved-${assignment.studentId}-${nextStopId}`, () => {
      pushAlert(
        "stop_approved",
        "Stop approved",
        `${assignment.studentName} pickup is ${assignment.pickupStop.name}.`,
        assignment.studentId,
        assignment.studentName,
      );
    });
  } else if (assignment.stopApprovalStatus === "pending") {
    fireOnce(`stop-pending-${assignment.studentId}`, () => {
      pushAlert(
        "stop_pending",
        "Stop pending approval",
        `${assignment.studentName}'s stop is waiting for Admin approval.`,
        assignment.studentId,
        assignment.studentName,
      );
    });
  }
  lastKnownStopId = nextStopId;
}

function resetLearnerRuntime() {
  const next = assignmentFromOps(activeLearnerKey);
  assignment = { ...next, bus: { ...next.bus } };
  tracking = {
    ...initialTracking,
    nextStopName: next.pickupStop.name,
    runStatus: "scheduled",
    progressPercent: 0,
    etaMinutes: 32,
    sharedTripActive: false,
    emergencyActive: false,
    emergencyLabel: null,
  };
  firedMilestones.clear();
  ingestedNotifIds.clear();
  alerts = seedTransportAlerts.map((a) => ({ ...a }));
  routeStudents = rosterFromOps(next.bus.routeId);
  sharedAttendanceActive = false;
  sharedTrip = null;
  openEmergency = null;
  lastKnownStopId = next.pickupStop.id === "pending" ? null : next.pickupStop.id;
  applySharedTripToTracking();
  applySharedAttendanceToTracking();
  applySharedEmergency();
  ingestConnectNotifications();
  maybeAlertStopAssignmentChange();
  syncRouteOverview();
}

function refreshAssignmentFromAdmin() {
  const next = assignmentFromOps(activeLearnerKey);
  assignment = { ...next, bus: { ...next.bus } };
  tracking = { ...tracking, nextStopName: next.pickupStop.name };
  routeStudents = rosterFromOps(next.bus.routeId);
  applySharedTripToTracking();
  applySharedAttendanceToTracking();
  applySharedEmergency();
  ingestConnectNotifications();
  maybeAlertStopAssignmentChange();
  syncRouteOverview();
  notify();
}

function refreshFromAttendance() {
  applySharedTripToTracking();
  applySharedAttendanceToTracking();
  applySharedEmergency();
  ingestConnectNotifications();
  syncRouteOverview();
  notify();
}

function refreshFromEmergency() {
  applySharedEmergency();
  ingestConnectNotifications();
  syncRouteOverview();
  notify();
}

function refreshFromNotifications() {
  ingestConnectNotifications();
  notify();
}

function startOpsListener() {
  if (opsListening || typeof window === "undefined") return;
  window.addEventListener(TRANSPORT_OPS_CHANGED_EVENT, refreshAssignmentFromAdmin);
  window.addEventListener(TRANSPORT_APPROVAL_CHANGED_EVENT, refreshAssignmentFromAdmin);
  opsListening = true;
}

function stopOpsListener() {
  if (!opsListening || typeof window === "undefined") return;
  window.removeEventListener(TRANSPORT_OPS_CHANGED_EVENT, refreshAssignmentFromAdmin);
  window.removeEventListener(TRANSPORT_APPROVAL_CHANGED_EVENT, refreshAssignmentFromAdmin);
  opsListening = false;
}

function startAttendanceListener() {
  if (attendanceListening || typeof window === "undefined") return;
  window.addEventListener(TRANSPORT_ATTENDANCE_CHANGED_EVENT, refreshFromAttendance);
  window.addEventListener("storage", onAttendanceStorage);
  attendanceListening = true;
}

function onAttendanceStorage(e: StorageEvent) {
  if (e.key === TRANSPORT_ATTENDANCE_STORAGE_KEY || e.key === null) {
    refreshFromAttendance();
  }
}

function stopAttendanceListener() {
  if (!attendanceListening || typeof window === "undefined") return;
  window.removeEventListener(TRANSPORT_ATTENDANCE_CHANGED_EVENT, refreshFromAttendance);
  window.removeEventListener("storage", onAttendanceStorage);
  attendanceListening = false;
}

function startBridgeSubscriptions() {
  if (typeof window === "undefined" || bridgeUnsubs.length) return;
  bridgeUnsubs = [
    subscribeTransportEmergencies(refreshFromEmergency),
    subscribeTransportNotifications(refreshFromNotifications),
  ];
}

function stopBridgeSubscriptions() {
  bridgeUnsubs.forEach((u) => u());
  bridgeUnsubs = [];
}

function simulateTick() {
  // Prefer shared Driver trip + attendance — only soft-sim ETA when no shared trip.
  if (tracking.emergencyActive) return;
  if (tracking.phase !== "morning_pickup" || tracking.runStatus === "completed") return;

  if (sharedTrip && isSharedTripActive(sharedTrip)) {
    if (sharedAttendanceActive && tracking.learnerStatus === "picked_up") {
      const nextProgress = Math.min(99, tracking.progressPercent + 2);
      tracking = { ...tracking, progressPercent: nextProgress, lastUpdated: nowLabel() };
      syncRouteOverview();
      notify();
    }
    return;
  }

  if (sharedAttendanceActive && tracking.learnerStatus === "picked_up") {
    const nextProgress = Math.min(99, tracking.progressPercent + 3);
    tracking = {
      ...tracking,
      progressPercent: nextProgress,
      lastUpdated: nowLabel(),
    };
    syncRouteOverview();
    notify();
    return;
  }

  if (sharedAttendanceActive) {
    const prevEta = tracking.etaMinutes;
    const nextEta = Math.max(0, prevEta - 1);
    tracking = {
      ...tracking,
      etaMinutes: nextEta,
      progressPercent: Math.min(70, tracking.progressPercent + 2),
      lastUpdated: nowLabel(),
      runStatus: "en_route",
    };
    fireBusApproachMilestones(prevEta, nextEta);
    syncRouteOverview();
    notify();
    return;
  }

  // Fallback demo journey when Driver has not published trip/attendance yet.
  if (tracking.learnerStatus === "picked_up") {
    const nextProgress = Math.min(100, tracking.progressPercent + 5);
    tracking = {
      ...tracking,
      progressPercent: nextProgress,
      lastUpdated: nowLabel(),
      runStatus: "en_route",
    };

    if (nextProgress >= 100) {
      tracking = {
        ...tracking,
        learnerStatus: "reached_school",
        phase: "at_school",
        runStatus: "completed",
        progressPercent: 100,
        nextStopName: assignment.dropStop.name,
      };
      routeStudents = routeStudents.map((s) =>
        s.status === "picked_up" || s.status === "on_bus"
          ? { ...s, status: "dropped_school" as const }
          : s,
      );
      fireOnce("reached_school", () => {
        pushAlert(
          "reached_school",
          "Reached school",
          `${assignment.bus.busNumber} arrived at Test1School. ${assignment.studentName} has reached school safely.`,
          assignment.studentId,
          assignment.studentName,
        );
      });
      fireOnce("dropped_school", () => {
        pushAlert(
          "dropped_school",
          "Dropped at school",
          `${assignment.studentName} was dropped at the school main gate.`,
          assignment.studentId,
          assignment.studentName,
        );
      });
    }

    syncRouteOverview();
    notify();
    return;
  }

  const prevEta = tracking.etaMinutes;
  const nextEta = Math.max(0, prevEta - 1);
  const nextProgress = Math.min(75, tracking.progressPercent + 3);

  tracking = {
    ...tracking,
    etaMinutes: nextEta,
    progressPercent: nextProgress,
    lastUpdated: nowLabel(),
    runStatus: "en_route",
  };

  fireBusApproachMilestones(prevEta, nextEta);

  if (nextEta === 0) {
    tracking = {
      ...tracking,
      learnerStatus: "picked_up",
      runStatus: "en_route",
      progressPercent: Math.max(75, tracking.progressPercent),
      nextStopName: assignment.dropStop.name,
    };
    fireOnce("arrived", () => {
      pushAlert(
        "arrived_stop",
        "Bus arrived at your stop",
        `${assignment.bus.busNumber} has reached ${assignment.pickupStop.name}.`,
        assignment.studentId,
        assignment.studentName,
      );
    });
    fireOnce("picked_up", () => {
      routeStudents = routeStudents.map((s) =>
        s.studentId === assignment.studentId ? { ...s, status: "picked_up" as const } : s,
      );
      pushAlert(
        "picked_up",
        "Picked up",
        `${assignment.studentName} boarded ${assignment.bus.busNumber} at ${assignment.pickupStop.name}.`,
        assignment.studentId,
        assignment.studentName,
      );
    });
  }

  syncRouteOverview();
  notify();
}

function startSimulation() {
  if (tickTimer) return;
  tickTimer = setInterval(simulateTick, 6000);
}

function stopSimulation() {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

export const transportStore = {
  init(learnerKey?: string, role?: "parent" | "student" | "teacher") {
    startOpsListener();
    startAttendanceListener();
    startBridgeSubscriptions();
    if (role) activeRole = role;
    if (learnerKey && learnerKey !== activeLearnerKey) {
      activeLearnerKey = learnerKey;
      resetLearnerRuntime();
      notify();
    }
    if (initialized) {
      if (role === "teacher") {
        refreshAssignmentFromAdmin();
      }
      startSimulation();
      return;
    }
    initialized = true;
    if (learnerKey) activeLearnerKey = learnerKey;
    resetLearnerRuntime();
    startSimulation();
    notify();
  },

  selectLearner(learnerKey: string) {
    if (learnerKey === activeLearnerKey) return;
    activeLearnerKey = learnerKey;
    resetLearnerRuntime();
    notify();
  },

  destroy() {
    stopSimulation();
    stopOpsListener();
    stopAttendanceListener();
    stopBridgeSubscriptions();
  },

  reset() {
    stopSimulation();
    stopBridgeSubscriptions();
    initialized = false;
    activeRole = null;
    activeLearnerKey = "S-2041";
    resetLearnerRuntime();
    notify();
  },

  getAssignment: (): StudentTransportAssignment => assignment,
  getTracking: (): TransportTracking => tracking,
  getAlerts: (): TransportAlert[] => alerts,
  getAlertsForLearner: (): TransportAlert[] =>
    alerts.filter(
      (a) =>
        !a.studentId ||
        a.studentId === assignment.studentId ||
        a.studentName === assignment.studentName,
    ),
  getRouteOverview: (): TransportRouteOverview => routeOverview,
  getRouteStudents: (): RouteStudentRow[] => routeStudents,
  getOpenEmergency: (): TransportEmergency | null => openEmergency,

  markAlertRead(id: string) {
    alerts = alerts.map((a) => (a.id === id ? { ...a, read: true } : a));
    notify();
  },

  markAllAlertsRead() {
    alerts = alerts.map((a) => ({ ...a, read: true }));
    notify();
  },

  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
