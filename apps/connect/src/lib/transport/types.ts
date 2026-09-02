export type TransportTripPhase = "morning_pickup" | "at_school" | "afternoon_drop";

export type TransportRunStatus = "scheduled" | "en_route" | "at_stop" | "completed" | "delayed";

export type LearnerJourneyStatus = "awaiting_pickup" | "picked_up" | "reached_school";

export type TransportEventType =
  | "eta_10min"
  | "eta_5min"
  | "arrived_stop"
  | "picked_up"
  | "dropped_school"
  | "reached_school"
  | "departed_school"
  | "dropped_stop"
  | "delay"
  | "trip_started"
  | "trip_completed"
  | "sos"
  | "stop_pending"
  | "stop_approved";

export type RouteStudentStatus = "waiting" | "picked_up" | "on_bus" | "dropped_school" | "absent";

export interface TransportStop {
  id: string;
  name: string;
  address: string;
  scheduledTime: string;
  order: number;
}

export interface BusDetails {
  busNumber: string;
  vehicleReg: string;
  capacity: number;
  driverName: string;
  driverPhone: string;
  conductorName?: string;
  routeId: string;
  routeName: string;
  routeCode: string;
  /** Ops vehicle id for shared bridges */
  vehicleId?: string;
}

export interface StudentTransportAssignment {
  studentId: string;
  studentName: string;
  bus: BusDetails;
  pickupStop: TransportStop;
  dropStop: TransportStop;
  morningPickupTime: string;
  afternoonDropTime: string;
  /** Derived from ops + route-setup */
  stopApprovalStatus?: "none" | "pending" | "approved" | "declined";
}

export interface RouteStudentRow {
  studentId: string;
  studentName: string;
  className: string;
  rollNo: string;
  pickupStop: string;
  status: RouteStudentStatus;
  boarding?: "pending" | "boarded" | "not_boarded";
  dropping?: "pending" | "dropped" | "not_dropped";
}

export interface TransportTracking {
  phase: TransportTripPhase;
  runStatus: TransportRunStatus;
  learnerStatus: LearnerJourneyStatus;
  currentStopIndex: number;
  progressPercent: number;
  etaMinutes: number;
  nextStopName: string;
  lastUpdated: string;
  delayMinutes: number;
  lat: number;
  lng: number;
  /** True when progress comes from shared Driver trip meta */
  sharedTripActive?: boolean;
  /** Open SOS on this learner's bus */
  emergencyActive?: boolean;
  emergencyLabel?: string | null;
}

export interface TransportAlert {
  id: string;
  type: TransportEventType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  studentId?: string;
  studentName?: string;
}

export interface TransportRouteOverview {
  routeId: string;
  routeName: string;
  routeCode: string;
  stops: TransportStop[];
  students: RouteStudentRow[];
  bus: BusDetails;
  tracking: TransportTracking;
}
