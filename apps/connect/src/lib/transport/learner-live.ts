import {
  findOpenEmergencyForVehicle,
  findTripMetaForVehicle,
  isSharedTripActive,
  projectConnectAttendanceForStudent,
  transportEmergencyStatusLabel,
  TRANSPORT_ATTENDANCE_CHANGED_EVENT,
  type SharedTripAttendanceMeta,
} from "@lumenx/utils";
import { SCHOOL_STOP, initialTracking } from "@/lib/transport/mock-data";
import type {
  StudentTransportAssignment,
  TransportStop,
  TransportTracking,
} from "@/lib/transport/types";
import type { LearnerTransportSummary } from "./api-types";

function formatDriverPhone(phone: string | null | undefined): string {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return phone?.trim() || "—";
}

export function mapLearnerSummaryToAssignment(
  summary: LearnerTransportSummary,
): StudentTransportAssignment {
  const routeCode = summary.routeName?.slice(0, 3).toUpperCase() || "—";
  const pickup: TransportStop = summary.pickupStop
    ? {
        id: summary.pickupStop.id,
        name: summary.pickupStop.name,
        address: summary.pickupStop.locationLabel,
        scheduledTime: "—",
        order: summary.pickupStop.routeOrder + 1,
      }
    : {
        id: "pending",
        name: "Pickup pending",
        address: "Awaiting route setup",
        scheduledTime: "—",
        order: 1,
      };

  const drop: TransportStop = summary.dropStop
    ? {
        id: summary.dropStop.id,
        name: summary.dropStop.name,
        address: summary.dropStop.locationLabel,
        scheduledTime: "15:40",
        order: summary.dropStop.routeOrder + 1,
      }
    : { ...SCHOOL_STOP };

  return {
    studentId: summary.studentId,
    studentName: summary.studentName,
    bus: {
      busNumber: summary.busNumber ?? "—",
      vehicleReg: summary.vehicleRegistration ?? summary.busNumber ?? "—",
      capacity: 40,
      driverName: summary.driverName ?? "—",
      driverPhone: formatDriverPhone(summary.driverPhone),
      routeId: summary.routeId ?? "—",
      routeName: summary.routeName ?? "—",
      routeCode,
      vehicleId: summary.vehicleId ?? undefined,
    },
    pickupStop: pickup,
    dropStop: drop,
    morningPickupTime: "—",
    afternoonDropTime: "15:40",
    stopApprovalStatus:
      summary.approvalStatus === "pending"
        ? "pending"
        : summary.approvalStatus === "approved"
          ? "approved"
          : "none",
  };
}

export function buildLiveTracking(
  summary: LearnerTransportSummary,
  assignment: StudentTransportAssignment,
): TransportTracking {
  const vehicleId = summary.vehicleId;
  const trip: SharedTripAttendanceMeta | null = vehicleId
    ? findTripMetaForVehicle(vehicleId)
    : null;
  const attendance = projectConnectAttendanceForStudent(summary.studentId);
  const emergency = vehicleId ? findOpenEmergencyForVehicle(vehicleId) : null;

  let tracking: TransportTracking = {
    ...initialTracking,
    nextStopName: assignment.pickupStop.name,
    learnerStatus:
      attendance?.boarding === "boarded"
        ? "picked_up"
        : attendance?.dropping === "dropped"
          ? "reached_school"
          : "awaiting_pickup",
  };

  if (emergency) {
    tracking = {
      ...tracking,
      emergencyActive: true,
      emergencyLabel: `SOS · ${transportEmergencyStatusLabel(emergency.status)}`,
      runStatus: "delayed",
      delayMinutes: 1,
      lastUpdated: "Just now",
    };
  }

  if (!trip || !isSharedTripActive(trip)) {
    return {
      ...tracking,
      sharedTripActive: false,
      runStatus: tracking.learnerStatus === "reached_school" ? "completed" : "scheduled",
    };
  }

  const stops = summary.stops;
  let stopIndex = 0;
  if (trip.currentStopId) {
    const idx = stops.findIndex((s) => s.id === trip.currentStopId);
    if (idx >= 0) stopIndex = idx;
  }

  const progressFromStops =
    stops.length > 1 ? Math.round((stopIndex / (stops.length - 1)) * 100) : 20;

  if (trip.finalized || trip.phase === "completed") {
    return {
      ...tracking,
      sharedTripActive: false,
      phase: "at_school",
      runStatus: "completed",
      progressPercent: 100,
      etaMinutes: 0,
      learnerStatus: "reached_school",
      currentStopIndex: Math.max(0, stops.length - 1),
      nextStopName: assignment.dropStop.name,
      lastUpdated: "Just now",
    };
  }

  return {
    ...tracking,
    sharedTripActive: true,
    phase: trip.phase === "dropping" ? "at_school" : "morning_pickup",
    runStatus: trip.phase === "boarding" || trip.phase === "dropping" ? "at_stop" : "en_route",
    currentStopIndex: stopIndex,
    progressPercent: Math.max(10, Math.min(95, progressFromStops)),
    etaMinutes: Math.max(3, 32 - Math.round(progressFromStops / 3)),
    nextStopName: trip.currentStopName || assignment.pickupStop.name,
    lastUpdated: "Just now",
  };
}

export function subscribeLearnerLiveTrip(listener: () => void): () => void {
  const onAttendance = () => listener();
  window.addEventListener(TRANSPORT_ATTENDANCE_CHANGED_EVENT, onAttendance);
  return () => window.removeEventListener(TRANSPORT_ATTENDANCE_CHANGED_EVENT, onAttendance);
}

export function summaryStopsToTimeline(
  summary: LearnerTransportSummary,
): TransportStop[] {
  const routeStops = summary.stops.map((stop) => ({
    id: stop.id,
    name: stop.name,
    address: stop.locationLabel,
    scheduledTime: "—",
    order: stop.routeOrder + 1,
  }));
  if (summary.dropStop) return routeStops;
  return [...routeStops, { ...SCHOOL_STOP }];
}
