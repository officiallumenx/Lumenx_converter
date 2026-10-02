import {
  findOpenEmergencyForVehicle,
  findTripMetaForVehicle,
  isSharedTripActive,
  projectConnectAttendanceForStudent,
  transportEmergencyStatusLabel,
  type SharedTripAttendanceMeta,
} from "@lumenx/utils";
import type {
  StudentTransportAssignment,
  TransportStop,
  TransportTracking,
} from "@/lib/transport/types";
import type { LearnerTransportSummary, LearnerTransportLiveDto } from "./api-types";
import { isApiAuthMode } from "@/auth/auth-mode";
import { getLearnerTransportLive } from "./api";

const PENDING_SCHOOL_STOP: TransportStop = {
  id: "school-pending",
  name: "School",
  address: "Drop stop pending",
  scheduledTime: "—",
  order: 99,
};

const EMPTY_TRACKING: TransportTracking = {
  phase: "morning_pickup",
  runStatus: "scheduled",
  learnerStatus: "awaiting_pickup",
  currentStopIndex: 0,
  progressPercent: 0,
  etaMinutes: 0,
  nextStopName: "Pickup stop",
  lastUpdated: "Waiting for trip",
  delayMinutes: 0,
  lat: 0,
  lng: 0,
  distanceM: null,
  sharedTripActive: false,
  emergencyActive: false,
  emergencyLabel: null,
};

function formatDriverPhone(phone: string | null | undefined): string {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return phone?.trim() || "—";
}

function formatLocationAge(iso: string | null | undefined): string {
  if (!iso) return "Waiting for GPS";
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return "Just now";
  const sec = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (sec < 45) return "Just now";
  if (sec < 105) return "1 min ago";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  return new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function hasValidCoords(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
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
        scheduledTime: "—",
        order: summary.dropStop.routeOrder + 1,
      }
    : { ...PENDING_SCHOOL_STOP };

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
    afternoonDropTime: "—",
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
  live?: LearnerTransportLiveDto | null,
): TransportTracking {
  if (isApiAuthMode()) {
    if (live) return buildLiveTrackingFromApi(summary, assignment, live);
    return {
      ...EMPTY_TRACKING,
      nextStopName: assignment.pickupStop.name,
    };
  }

  const vehicleId = summary.vehicleId;
  const trip: SharedTripAttendanceMeta | null = vehicleId
    ? findTripMetaForVehicle(vehicleId)
    : null;
  const attendance = projectConnectAttendanceForStudent(summary.studentId);
  const emergency = vehicleId ? findOpenEmergencyForVehicle(vehicleId) : null;

  let tracking: TransportTracking = {
    ...EMPTY_TRACKING,
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

  const nextStop =
    stops[Math.min(stopIndex + (trip.phase === "boarding" ? 0 : 0), stops.length - 1)] ??
    assignment.pickupStop;

  return {
    ...tracking,
    sharedTripActive: true,
    phase: trip.phase === "dropping" ? "at_school" : "morning_pickup",
    runStatus: trip.phase === "boarding" || trip.phase === "dropping" ? "at_stop" : "en_route",
    currentStopIndex: stopIndex,
    progressPercent: Math.max(10, Math.min(95, progressFromStops)),
    // Demo/local bridge has no GPS ETA — keep a soft stop-progress estimate.
    etaMinutes: Math.max(3, 32 - Math.round(progressFromStops / 3)),
    nextStopName: trip.currentStopName || nextStop.name || assignment.pickupStop.name,
    lastUpdated: "Just now",
  };
}

export function buildLiveTrackingFromApi(
  summary: LearnerTransportSummary,
  assignment: StudentTransportAssignment,
  live: LearnerTransportLiveDto,
): TransportTracking {
  const trip = live.activeTrip;
  const boarding = live.boarding;
  const emergency = live.openEmergency;
  const location = live.latestLocation;
  const approach = live.approach;

  const lat = location?.latitude ?? 0;
  const lng = location?.longitude ?? 0;
  const gpsLive = hasValidCoords(lat, lng);

  let tracking: TransportTracking = {
    ...EMPTY_TRACKING,
    nextStopName: assignment.pickupStop.name,
    learnerStatus:
      boarding?.boardingStatus === "boarded"
        ? "picked_up"
        : boarding?.droppingStatus === "dropped"
          ? "reached_school"
          : "awaiting_pickup",
    lat: gpsLive ? lat : 0,
    lng: gpsLive ? lng : 0,
    distanceM: approach?.distanceM ?? null,
    lastUpdated: formatLocationAge(location?.capturedAt),
  };

  if (emergency) {
    tracking = {
      ...tracking,
      emergencyActive: true,
      emergencyLabel: `SOS · ${emergency.status}`,
      runStatus: "delayed",
      delayMinutes: 1,
    };
  }

  if (!trip || trip.finalized || trip.phase === "completed") {
    return {
      ...tracking,
      sharedTripActive: false,
      runStatus: tracking.learnerStatus === "reached_school" ? "completed" : "scheduled",
      lastUpdated: location?.capturedAt
        ? formatLocationAge(location.capturedAt)
        : tracking.learnerStatus === "reached_school"
          ? "Trip completed"
          : "Trip not started",
    };
  }

  const stops = summary.stops;
  let stopIndex = trip.currentStopIndex ?? 0;
  if (trip.currentStopId) {
    const idx = stops.findIndex((s) => s.id === trip.currentStopId);
    if (idx >= 0) stopIndex = idx;
  }

  const progressFromStops =
    stops.length > 1 ? Math.round((stopIndex / (stops.length - 1)) * 100) : gpsLive ? 15 : 0;

  const currentStop = stops[stopIndex] ?? null;
  const followingStop = stops[stopIndex + 1] ?? null;

  let nextStopName = assignment.pickupStop.name;
  if (tracking.learnerStatus === "picked_up") {
    nextStopName = assignment.dropStop.name || followingStop?.name || "School";
  } else if (tracking.learnerStatus === "reached_school") {
    nextStopName = assignment.dropStop.name;
  } else if (approach?.stopName) {
    nextStopName = approach.stopName;
  } else if (trip.phase === "boarding" || trip.phase === "dropping") {
    nextStopName = currentStop?.name || assignment.pickupStop.name;
  } else {
    nextStopName = currentStop?.name || followingStop?.name || assignment.pickupStop.name;
  }

  // Prefer API approach ETA (haversine from live bus GPS → pickup stop).
  // Do not invent a 32-minute countdown when GPS/approach is missing.
  let etaMinutes = 0;
  if (tracking.learnerStatus === "awaiting_pickup" && approach) {
    etaMinutes = Math.max(0, Math.round(approach.etaMinutes));
  } else if (tracking.learnerStatus === "awaiting_pickup" && !gpsLive) {
    etaMinutes = 0;
  }

  const runStatus =
    approach?.withinRadius || trip.phase === "boarding" || trip.phase === "dropping"
      ? "at_stop"
      : trip.phase === "running"
        ? "en_route"
        : "en_route";

  return {
    ...tracking,
    sharedTripActive: true,
    phase: trip.phase === "dropping" ? "at_school" : "morning_pickup",
    runStatus: tracking.emergencyActive ? "delayed" : runStatus,
    currentStopIndex: stopIndex,
    progressPercent: Math.max(gpsLive || stopIndex > 0 ? 5 : 0, Math.min(95, progressFromStops)),
    etaMinutes,
    nextStopName,
    lastUpdated: formatLocationAge(location?.capturedAt),
    distanceM: approach?.distanceM ?? null,
  };
}

export async function loadLearnerTransportLive(input: {
  instituteId: string;
  studentId: string;
}): Promise<LearnerTransportLiveDto | null> {
  if (!isApiAuthMode()) return null;
  try {
    return await getLearnerTransportLive(input);
  } catch {
    return null;
  }
}

export function subscribeLearnerLiveTrip(_listener: () => void): () => void {
  // Live updates come from Supabase realtime + API poll in LearnerTransportApiView.
  // Do not listen to the deprecated localStorage attendance bridge.
  return () => undefined;
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
  return [...routeStops, { ...PENDING_SCHOOL_STOP }];
}
