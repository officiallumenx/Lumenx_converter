export type TransportApprovalStatus = "pending" | "approved" | "rejected";

export type RouteDto = {
  id: string;
  instituteId: string;
  name: string;
  vehicleId: string | null;
  driverId: string | null;
  status: string;
  configStatus: string;
  approvalStatus: TransportApprovalStatus;
  createdAt: string;
  updatedAt: string;
};

export type StopDto = {
  id: string;
  instituteId: string;
  routeId: string;
  name: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  routeOrder: number;
  notificationRadiusM: number;
  approvalStatus: TransportApprovalStatus;
  createdAt: string;
  updatedAt: string;
};

export type TransportEnrollmentDto = {
  id: string;
  instituteId: string;
  studentId: string;
  routeId: string;
  pickupStopId: string;
  dropStopId: string;
  status: string;
  approvalStatus: TransportApprovalStatus;
  createdAt: string;
  updatedAt: string;
};

export type TeacherClassTransportRow = {
  studentId: string;
  studentName: string;
  rollNo: string;
  classLabel: string;
  sectionLabel: string;
  busNumber: string | null;
  routeName: string | null;
  routeId: string | null;
  enrollmentId: string | null;
  approvalStatus: TransportApprovalStatus | null;
  enrollmentStatus: string | null;
};

export type LearnerTransportStop = {
  id: string;
  name: string;
  locationLabel: string;
  routeOrder: number;
  kind?: "waypoint" | "school" | "parking";
};

export type LearnerTransportSummary = {
  studentId: string;
  studentName: string;
  enrollmentId: string | null;
  enrollmentStatus: string | null;
  approvalStatus: TransportApprovalStatus | null;
  routeId: string | null;
  routeName: string | null;
  busNumber: string | null;
  vehicleId: string | null;
  vehicleRegistration: string | null;
  /** Real vehicle capacity; null when not configured. */
  vehicleCapacity?: number | null;
  driverName: string | null;
  driverPhone: string | null;
  pickupStop: LearnerTransportStop | null;
  dropStop: LearnerTransportStop | null;
  stops: LearnerTransportStop[];
};

export type TransportDailyExceptionDto = {
  id: string;
  instituteId: string;
  studentId: string;
  serviceDate: string;
  exceptionType: "NOT_RIDING";
  reason: "parent" | "admin" | "driver" | "system";
  notes: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  undoCutoffAt: string | null;
  canUndo: boolean;
};

export type TransportParticipationDto = {
  studentId: string;
  serviceDate: string;
  ridingToday: boolean;
  exception: TransportDailyExceptionDto | null;
};

export type TransportRideExceptionDto = TransportDailyExceptionDto;

export type ListTransportEnrollmentsParams = {
  instituteId: string;
};

export type ListTransportRoutesParams = {
  instituteId: string;
};

export type ListTransportStopsParams = {
  routeId: string;
};

export type TeacherClassTransportParams = {
  instituteId: string;
  classLabel?: string;
  sectionLabel?: string;
};

export type LearnerTransportParams = {
  instituteId: string;
  studentId: string;
};

export type LearnerTransportLiveDto = {
  activeTrip: {
    id: string;
    phase: string;
    startedAt: string | null;
    completedAt: string | null;
    currentStopId: string | null;
    currentStopIndex: number;
    finalized: boolean;
    schoolArrivedAt?: string | null;
    routeName?: string | null;
    vehicleNumber?: string | null;
    currentStopName?: string | null;
    nextStopName?: string | null;
  } | null;
  boarding: {
    boardingStatus: "pending" | "boarded" | "not_boarded";
    droppingStatus: "pending" | "dropped" | "not_dropped";
    boardedAt: string | null;
    droppedAt: string | null;
  } | null;
  openEmergency: {
    id: string;
    status: "active" | "acknowledged" | "resolved";
    note: string | null;
  } | null;
  latestLocation: {
    latitude: number;
    longitude: number;
    capturedAt: string;
  } | null;
  /** Distance / ETA to the learner's pickup stop when live GPS exists. */
  approach: {
    stopId: string;
    stopName: string;
    distanceM: number;
    withinRadius: boolean;
    etaMinutes: number;
    band: 30 | 15 | 5 | null;
  } | null;
  gpsFreshness?: "live" | "recent" | "stale" | "offline";
  notRidingToday?: boolean;
  expectedPickupTime?: string | null;
};

export type LearnerTransportHistoryDayDto = {
  tripDate: string;
  tripId: string | null;
  routeName: string | null;
  phase: string | null;
  boardingStatus: "pending" | "boarded" | "not_boarded" | null;
  droppingStatus: "pending" | "dropped" | "not_dropped" | null;
  boardedAt: string | null;
  droppedAt: string | null;
  notRiding: boolean;
  pickupStopName: string | null;
  dropStopName: string | null;
};

export type LearnerTransportLiveParams = {
  instituteId: string;
  studentId: string;
};
