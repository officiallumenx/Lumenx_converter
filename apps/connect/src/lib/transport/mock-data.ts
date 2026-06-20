import type {
  BusDetails,
  RouteStudentRow,
  StudentTransportAssignment,
  TransportAlert,
  TransportRouteOverview,
  TransportStop,
  TransportTracking,
} from "./types";

export const ROUTE_NCL_STOPS: TransportStop[] = [
  {
    id: "ST-01",
    name: "Green Park Gate",
    address: "12 Green Park Rd, Sector 4",
    scheduledTime: "07:05",
    order: 1,
  },
  {
    id: "ST-02",
    name: "Lakeview Apartments",
    address: "Block C, Lakeview Enclave",
    scheduledTime: "07:12",
    order: 2,
  },
  {
    id: "ST-03",
    name: "Sharma Residence Stop",
    address: "Near City Mall, Main Road",
    scheduledTime: "07:18",
    order: 3,
  },
  {
    id: "ST-04",
    name: "Central Library",
    address: "Civic Centre Junction",
    scheduledTime: "07:25",
    order: 4,
  },
  {
    id: "ST-05",
    name: "East Gate Circle",
    address: "Ring Road East",
    scheduledTime: "07:32",
    order: 5,
  },
  {
    id: "ST-06",
    name: "LumenX Academy",
    address: "School Main Gate",
    scheduledTime: "07:45",
    order: 6,
  },
];

export const BUS_NCL: BusDetails = {
  busNumber: "Bus 12",
  vehicleReg: "KA-01-LX-4521",
  capacity: 40,
  driverName: "Rajesh Kumar",
  driverPhone: "+91 98765 43210",
  conductorName: "Mohan Das",
  routeId: "RT-01",
  routeName: "North Campus Loop",
  routeCode: "NCL",
};

export const studentTransportAssignment: StudentTransportAssignment = {
  studentId: "S-2041",
  studentName: "Aarav Sharma",
  bus: BUS_NCL,
  pickupStop: ROUTE_NCL_STOPS[2]!,
  dropStop: ROUTE_NCL_STOPS[5]!,
  morningPickupTime: "07:18",
  afternoonDropTime: "15:40",
};

/** Parent child C1 ↔ student S-2041 (Aarav). */
export const transportAssignmentC2: StudentTransportAssignment = {
  studentId: "S-2099",
  studentName: "Anaya Sharma",
  bus: BUS_NCL,
  pickupStop: ROUTE_NCL_STOPS[1]!,
  dropStop: ROUTE_NCL_STOPS[5]!,
  morningPickupTime: "07:12",
  afternoonDropTime: "15:35",
};

export const transportAssignmentC3: StudentTransportAssignment = {
  studentId: "S-2105",
  studentName: "Vihaan Sharma",
  bus: {
    ...BUS_NCL,
    busNumber: "Bus 8",
    routeName: "East Gate Shuttle",
    routeCode: "EGS",
    vehicleReg: "KA-01-LX-1190",
    driverName: "Anil Verma",
    driverPhone: "+91 98765 43212",
  },
  pickupStop: ROUTE_NCL_STOPS[4]!,
  dropStop: ROUTE_NCL_STOPS[5]!,
  morningPickupTime: "07:32",
  afternoonDropTime: "15:45",
};

/** Lookup by parent child id (C1…) or student id (S-…). */
export const TRANSPORT_ASSIGNMENTS: Record<string, StudentTransportAssignment> = {
  C1: studentTransportAssignment,
  "S-2041": studentTransportAssignment,
  C2: transportAssignmentC2,
  "S-2099": transportAssignmentC2,
  C3: transportAssignmentC3,
  "S-2105": transportAssignmentC3,
};

export function transportAssignmentForLearner(learnerKey: string): StudentTransportAssignment {
  return TRANSPORT_ASSIGNMENTS[learnerKey] ?? studentTransportAssignment;
}

export const routeStudentsMorning: RouteStudentRow[] = [
  {
    studentId: "S-2041",
    studentName: "Aarav Sharma",
    className: "10-B",
    rollNo: "14",
    pickupStop: "Sharma Residence Stop",
    status: "waiting",
  },
  {
    studentId: "S-2088",
    studentName: "Priya Nair",
    className: "10-B",
    rollNo: "22",
    pickupStop: "Lakeview Apartments",
    status: "picked_up",
  },
  {
    studentId: "S-2110",
    studentName: "Rohan Mehta",
    className: "10-A",
    rollNo: "08",
    pickupStop: "Green Park Gate",
    status: "on_bus",
  },
  {
    studentId: "S-2156",
    studentName: "Sneha Reddy",
    className: "9-A",
    rollNo: "05",
    pickupStop: "Central Library",
    status: "waiting",
  },
  {
    studentId: "S-2201",
    studentName: "Arjun Patel",
    className: "8-C",
    rollNo: "11",
    pickupStop: "East Gate Circle",
    status: "absent",
  },
];

export const initialTracking: TransportTracking = {
  phase: "morning_pickup",
  runStatus: "en_route",
  currentStopIndex: 1,
  progressPercent: 38,
  etaMinutes: 12,
  nextStopName: "Sharma Residence Stop",
  lastUpdated: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  delayMinutes: 0,
  lat: 12.9718,
  lng: 77.5945,
};

export const seedTransportAlerts: TransportAlert[] = [
  {
    id: "tx-a1",
    type: "eta_10min",
    title: "Bus arriving in 10 minutes",
    message: "Bus 12 (NCL) is about 10 minutes from Sharma Residence Stop.",
    time: "07:08 AM",
    read: true,
    studentId: "S-2041",
    studentName: "Aarav Sharma",
  },
  {
    id: "tx-a2",
    type: "picked_up",
    title: "Priya picked up",
    message: "Priya Nair boarded Bus 12 at Lakeview Apartments.",
    time: "07:12 AM",
    read: true,
    studentId: "S-2088",
    studentName: "Priya Nair",
  },
  {
    id: "tx-a3",
    type: "eta_10min",
    title: "Bus approaching Anaya's stop",
    message: "Bus 12 is about 10 minutes from Lakeview Apartments.",
    time: "07:05 AM",
    read: false,
    studentId: "S-2099",
    studentName: "Anaya Sharma",
  },
  {
    id: "tx-a4",
    type: "eta_5min",
    title: "Bus arriving for Vihaan",
    message: "Bus 8 (EGS) reaches East Gate Circle in 5 minutes.",
    time: "07:27 AM",
    read: false,
    studentId: "S-2105",
    studentName: "Vihaan Sharma",
  },
];

export const teacherRouteOverview: TransportRouteOverview = {
  routeId: BUS_NCL.routeId,
  routeName: BUS_NCL.routeName,
  routeCode: BUS_NCL.routeCode,
  stops: ROUTE_NCL_STOPS,
  students: routeStudentsMorning,
  bus: BUS_NCL,
  tracking: { ...initialTracking },
};
