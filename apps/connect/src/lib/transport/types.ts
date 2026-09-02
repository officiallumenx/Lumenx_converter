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
