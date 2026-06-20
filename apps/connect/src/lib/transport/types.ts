export type TransportTripPhase = "morning_pickup" | "at_school" | "afternoon_drop";

export type TransportRunStatus = "scheduled" | "en_route" | "at_stop" | "completed" | "delayed";

export type TransportEventType =
  | "eta_10min"
  | "eta_5min"
  | "arrived_stop"
  | "picked_up"
  | "dropped_school"
  | "reached_school"
  | "departed_school"
  | "dropped_stop"
  | "delay";

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
}

export interface StudentTransportAssignment {
  studentId: string;
  studentName: string;
  bus: BusDetails;
  pickupStop: TransportStop;
  dropStop: TransportStop;
  morningPickupTime: string;
  afternoonDropTime: string;
}

export interface RouteStudentRow {
  studentId: string;
  studentName: string;
  className: string;
  rollNo: string;
  pickupStop: string;
  status: RouteStudentStatus;
}

export interface TransportTracking {
  phase: TransportTripPhase;
  runStatus: TransportRunStatus;
  currentStopIndex: number;
  progressPercent: number;
  etaMinutes: number;
  nextStopName: string;
  lastUpdated: string;
  delayMinutes: number;
  lat: number;
  lng: number;
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
