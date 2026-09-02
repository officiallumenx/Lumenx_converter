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
  driverName: string | null;
  driverPhone: string | null;
  pickupStop: LearnerTransportStop | null;
  dropStop: LearnerTransportStop | null;
  stops: LearnerTransportStop[];
};

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
    routeName?: string | null;
    vehicleNumber?: string | null;
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
};

export type LearnerTransportLiveParams = {
  instituteId: string;
  studentId: string;
};
