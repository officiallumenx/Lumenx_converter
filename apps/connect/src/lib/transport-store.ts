import type { AppNotification } from "@lumenx/types";
import { studentNotificationStore } from "@/lib/student/notification-store";
import {
  initialTracking,
  routeStudentsMorning,
  seedTransportAlerts,
  studentTransportAssignment,
  teacherRouteOverview,
  transportAssignmentForLearner,
} from "@/lib/transport/mock-data";
import type {
  RouteStudentRow,
  StudentTransportAssignment,
  TransportAlert,
  TransportEventType,
  TransportRouteOverview,
  TransportTracking,
} from "@/lib/transport/types";

type Listener = () => void;

let initialized = false;
let activeRole: "parent" | "student" | "teacher" | null = null;
let activeLearnerKey = "S-2041";
let assignment: StudentTransportAssignment = { ...studentTransportAssignment };
let tracking: TransportTracking = { ...initialTracking };
let alerts: TransportAlert[] = seedTransportAlerts.map((a) => ({ ...a }));
let routeStudents: RouteStudentRow[] = routeStudentsMorning.map((s) => ({ ...s }));
let routeOverview: TransportRouteOverview = {
  ...teacherRouteOverview,
  students: routeStudents,
  tracking,
};
let tickTimer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<Listener>();
const firedMilestones = new Set<string>();

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
) {
  const alert: TransportAlert = {
    id: `tx-${Date.now()}-${type}`,
    type,
    title,
    message,
    time: nowLabel(),
    read: false,
    studentId,
    studentName,
  };
  alerts = [alert, ...alerts].slice(0, 30);
  notify();

  // Only mirror into the student notification bell when a student is the active viewer —
  // a parent/teacher watching transport must not inflate the student's unread badge.
  if (activeRole === "student") {
    studentNotificationStore.add({
      id: alert.id,
      title: alert.title,
      desc: alert.message,
      time: alert.time,
      type: type === "delay" || type === "eta_5min" ? "warning" : "positive",
      category: "circulars",
      unread: true,
      priority: type === "delay" ? "high" : "normal",
      detail: message,
    });
  }
}

/** Reset all per-learner runtime (tracking, milestones, alerts, roster) for the active learner. */
function resetLearnerRuntime() {
  const next = transportAssignmentForLearner(activeLearnerKey);
  assignment = { ...next, bus: { ...next.bus } };
  tracking = { ...initialTracking, nextStopName: next.pickupStop.name };
  firedMilestones.clear();
  alerts = seedTransportAlerts.map((a) => ({ ...a }));
  routeStudents = routeStudentsMorning.map((s) => ({ ...s }));
  syncRouteOverview();
}

function syncRouteOverview() {
  routeOverview = {
    ...routeOverview,
    tracking: { ...tracking },
    students: routeStudents.map((s) => ({ ...s })),
  };
}

function fireOnce(key: string, fn: () => void) {
  if (firedMilestones.has(key)) return;
  firedMilestones.add(key);
  fn();
}

function simulateTick() {
  if (tracking.phase !== "morning_pickup" || tracking.runStatus === "completed") return;

  const prevEta = tracking.etaMinutes;
  const nextEta = Math.max(0, prevEta - 1);
  const nextProgress = Math.min(100, tracking.progressPercent + 5);

  tracking = {
    ...tracking,
    etaMinutes: nextEta,
    progressPercent: nextProgress,
    lastUpdated: nowLabel(),
  };

  if (prevEta > 10 && nextEta <= 10) {
    fireOnce("eta_10", () => {
      pushAlert(
        "eta_10min",
        "Bus arriving in 10 minutes",
        `${assignment.bus.busNumber} is about 10 minutes from ${assignment.pickupStop.name}.`,
        assignment.studentId,
        assignment.studentName,
      );
    });
  }

  if (prevEta > 5 && nextEta <= 5 && nextEta > 0) {
    fireOnce("eta_5", () => {
      pushAlert(
        "eta_5min",
        "Bus arriving in 5 minutes",
        `Get ready — ${assignment.bus.busNumber} reaches ${assignment.pickupStop.name} in 5 minutes.`,
        assignment.studentId,
        assignment.studentName,
      );
    });
  }

  if (nextEta === 0) {
    tracking = { ...tracking, runStatus: "at_stop" };
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

  if (nextProgress >= 95) {
    tracking = {
      ...tracking,
      phase: "at_school",
      runStatus: "completed",
      progressPercent: 100,
      etaMinutes: 0,
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
        `${assignment.bus.busNumber} arrived at LumenX Academy. ${assignment.studentName} has reached school safely.`,
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
    if (role) activeRole = role;
    if (learnerKey && learnerKey !== activeLearnerKey) {
      activeLearnerKey = learnerKey;
      resetLearnerRuntime();
      notify();
    }
    if (initialized) {
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
    // Full runtime reset so the new learner never shows the previous learner's ETA,
    // progress, fired milestones, route statuses, or alerts.
    resetLearnerRuntime();
    notify();
  },

  destroy() {
    stopSimulation();
  },

  reset() {
    stopSimulation();
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
