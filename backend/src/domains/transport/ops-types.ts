/** Transport operations — trips, boarding, emergencies, GPS. */

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
  createdAt: string;
  updatedAt: string;
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
};

export type LearnerTransportLiveDto = {
  activeTrip: TransportTripDto | null;
  boarding: TransportBoardingEventDto | null;
  openEmergency: TransportEmergencyDto | null;
  latestLocation: VehicleLocationDto | null;
  /** Distance / ETA to the learner's pickup stop when live GPS exists. */
  approach: {
    stopId: string;
    stopName: string;
    distanceM: number;
    withinRadius: boolean;
    etaMinutes: number;
  } | null;
};

export type StartTripInput = {
  instituteId: string;
  routeId: string;
  vehicleId: string;
  driverId: string;
  slot?: TripSlot;
  tripDate?: string;
};

export type UpdateTripPhaseInput = {
  phase: TripPhase;
  currentStopId?: string | null;
  currentStopIndex?: number;
};

export type UpsertBoardingInput = {
  studentId: string;
  stopId: string;
  boardingStatus: BoardingStatus;
};

export type UpsertDroppingInput = {
  studentId: string;
  stopId: string;
  droppingStatus: DroppingStatus;
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
};
