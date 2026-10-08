/** Transport operations — trips, boarding, emergencies, GPS. */

import type { GpsFreshness } from "./gps-freshness.js";

export type TripSlot = "morning" | "evening";
export type TripPhase =
  | "ready"
  | "starting"
  | "running"
  | "boarding"
  | "dropping"
  | "completed";

export type BoardingStatus = "pending" | "boarded" | "not_boarded";
export type DroppingStatus = "pending" | "dropped" | "not_dropped";

export type EmergencyType =
  | "general"
  | "breakdown"
  | "medical"
  | "accident"
  | "delay"
  | "route_issue"
  | "other";

export type EmergencyStatus = "active" | "acknowledged" | "resolved";

export type TransportTripTimelineEvent = {
  id: string;
  at: string;
  kind: string;
  label: string;
  note?: string;
  stopId?: string;
  studentId?: string;
};

export type TransportTripRow = {
  id: string;
  institute_id: string;
  route_id: string;
  vehicle_id: string;
  driver_id: string;
  slot: TripSlot;
  trip_date: string;
  phase: TripPhase;
  started_at: string | null;
  completed_at: string | null;
  current_stop_id: string | null;
  current_stop_index: number;
  finalized: boolean;
  timeline?: TransportTripTimelineEvent[] | null;
  school_arrived_at?: string | null;
  client_event_id?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type TransportBoardingEventRow = {
  id: string;
  institute_id: string;
  trip_id: string;
  student_id: string;
  stop_id: string;
  boarding_status: BoardingStatus;
  dropping_status: DroppingStatus;
  boarded_at: string | null;
  dropped_at: string | null;
  finalized: boolean;
  boarding_client_event_id?: string | null;
  dropping_client_event_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type TransportEmergencyRow = {
  id: string;
  institute_id: string;
  trip_id: string | null;
  driver_id: string;
  vehicle_id: string;
  emergency_type: EmergencyType;
  status: EmergencyStatus;
  latitude: number | null;
  longitude: number | null;
  note: string | null;
  acknowledged_at: string | null;
  acknowledged_by_user_id: string | null;
  resolved_at: string | null;
  resolved_by_user_id: string | null;
  resolve_note: string | null;
  timeline: Array<{ id: string; at: string; label: string; note?: string }>;
  client_event_id?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type VehicleLocationRow = {
  id: string;
  institute_id: string;
  trip_id: string;
  vehicle_id: string;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  captured_at: string;
  client_event_id?: string | null;
  driver_id?: string | null;
  sequence_number?: number | null;
};

export type TransportTripDto = {
  id: string;
  instituteId: string;
  routeId: string;
  vehicleId: string;
  driverId: string;
  slot: TripSlot;
  tripDate: string;
  phase: TripPhase;
  startedAt: string | null;
  completedAt: string | null;
  currentStopId: string | null;
  currentStopIndex: number;
  finalized: boolean;
  routeName?: string | null;
  vehicleNumber?: string | null;
  driverName?: string | null;
  /** Latest GPS for this trip (Admin live panel). */
  latestLocation?: VehicleLocationDto | null;
  /** LIVE | RECENT | STALE | OFFLINE */
  gpsFreshness?: "live" | "recent" | "stale" | "offline";
  currentStopName?: string | null;
  nextStopName?: string | null;
  distanceToNextStopM?: number | null;
  etaToNextStopMinutes?: number | null;
  timeline?: TransportTripTimelineEvent[];
  schoolArrivedAt?: string | null;
  /** True when timeline contains a real TRIP_DELAYED event (never invented). */
  isDelayed?: boolean;
  pickupStopPlan?: Array<{ id: string; name: string; routeOrder: number }>;
  dropStopPlan?: Array<{ id: string; name: string; routeOrder: number }>;
  createdAt: string;
  updatedAt: string;
};

export type VehicleLocationDto = {
  id: string;
  instituteId: string;
  tripId: string;
  vehicleId: string;
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  capturedAt: string;
  clientEventId?: string | null;
  sequenceNumber?: number | null;
};

export type TransportBoardingEventDto = {
  id: string;
  instituteId: string;
  tripId: string;
  studentId: string;
  stopId: string;
  boardingStatus: BoardingStatus;
  droppingStatus: DroppingStatus;
  boardedAt: string | null;
  droppedAt: string | null;
  finalized: boolean;
  studentName?: string | null;
  stopName?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TransportEmergencyDto = {
  id: string;
  instituteId: string;
  tripId: string | null;
  driverId: string;
  vehicleId: string;
  emergencyType: EmergencyType;
  status: EmergencyStatus;
  latitude: number | null;
  longitude: number | null;
  note: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  resolveNote: string | null;
  timeline: Array<{ id: string; at: string; label: string; note?: string }>;
  driverName?: string | null;
  vehicleNumber?: string | null;
  routeName?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VehicleLocationDto = {
  id: string;
  instituteId: string;
  tripId: string;
  vehicleId: string;
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  capturedAt: string;
  clientEventId?: string | null;
  sequenceNumber?: number | null;
};

export type LearnerTransportLiveDto = {
  activeTrip: TransportTripDto | null;
  boarding: TransportBoardingEventDto | null;
  openEmergency: TransportEmergencyDto | null;
  latestLocation: VehicleLocationDto | null;
  /** Distance / arrival minutes to the learner's assigned stop (pickup or drop by trip). */
  approach: {
    stopId: string;
    stopName: string;
    distanceM: number;
    withinRadius: boolean;
    /** Smoothed ETA; null when GPS stale / not publishable. */
    etaMinutes: number | null;
    /** Nearest product band (30 / 15 / 5), or null when farther than 30 min. */
    band: 30 | 15 | 5 | null;
    movementState?:
      | "moving"
      | "slow"
      | "stopped"
      | "gps_stale"
      | "gps_uncertain";
    confidence?: "high" | "medium" | "low";
    displayMode?: "eta" | "stopped" | "stale" | "uncertain";
    effectiveSpeedKmh?: number;
  } | null;
  /** LIVE | RECENT | STALE | OFFLINE from latest GPS. */
  gpsFreshness: GpsFreshness;
  /** Date-scoped NOT_RIDING for service date of active trip (or today). */
  notRidingToday: boolean;
  /** Institute default pickup clock HH:MM when configured. */
  expectedPickupTime: string | null;
};

export type LearnerTransportHistoryDayDto = {
  tripDate: string;
  tripId: string | null;
  routeName: string | null;
  phase: string | null;
  boardingStatus: BoardingStatus | null;
  droppingStatus: DroppingStatus | null;
  boardedAt: string | null;
  droppedAt: string | null;
  notRiding: boolean;
  pickupStopName: string | null;
  dropStopName: string | null;
};

export type StartTripInput = {
  instituteId: string;
  routeId: string;
  vehicleId: string;
  driverId: string;
  slot?: TripSlot;
  tripDate?: string;
  clientEventId?: string | null;
};

export type UpdateTripPhaseInput = {
  phase: TripPhase;
  currentStopId?: string | null;
  currentStopIndex?: number;
  clientEventId?: string | null;
};

export type UpsertBoardingInput = {
  studentId: string;
  stopId: string;
  boardingStatus: BoardingStatus;
  clientEventId?: string | null;
};

export type UpsertDroppingInput = {
  studentId: string;
  stopId: string;
  droppingStatus: DroppingStatus;
  clientEventId?: string | null;
};

export type TransportAnalyticsDto = {
  instituteId: string;
  tripDate: string;
  totalVehicles: number;
  totalDrivers: number;
  totalRoutes: number;
  configuredRoutes: number;
  lockedRoutes: number;
  pendingRouteSetup: number;
  totalStops: number;
  approvedStops: number;
  totalEnrollments: number;
  activeEnrollments: number;
  approvedEnrollments: number;
  tripsToday: number;
  activeTrips: number;
  completedTripsToday: number;
  boardingMarksToday: number;
  boardedToday: number;
  openEmergencies: number;
  /** Unique vehicles currently on an active trip. */
  activeBuses: number;
  /** Unique drivers currently on an active trip. */
  activeDrivers: number;
  /** Students with active transport enrollment (permanent assignment). */
  studentsUsingTransport: number;
  /** Active trips marked delayed in timeline. */
  delayedTrips: number;
  /** Active trips whose latest GPS is stale or offline. */
  busesWithStaleGps: number;
};

export type CreateEmergencyInput = {
  instituteId: string;
  tripId?: string | null;
  driverId: string;
  vehicleId: string;
  emergencyType?: EmergencyType;
  latitude?: number | null;
  longitude?: number | null;
  note?: string | null;
  clientEventId?: string | null;
};
