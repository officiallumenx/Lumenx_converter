/** Mirrors backend VehicleDto — keep in sync with domains/transport/types.ts. */

export type TransportAssetStatus = "active" | "inactive" | "maintenance";

export type TransportApprovalStatus = "pending" | "approved" | "rejected";

export type VehicleDto = {
  id: string;
  instituteId: string;
  vehicleNumber: string;
  registrationNumber: string;
  capacity: number;
  status: TransportAssetStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListTransportVehiclesParams = {
  instituteId: string;
};

export type DriverDto = {
  id: string;
  instituteId: string;
  userProfileId: string | null;
  displayName: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string | null;
  status: TransportAssetStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListTransportDriversParams = {
  instituteId: string;
};

export type RouteConfigStatus = "not_configured" | "configured" | "locked";

export type RouteDto = {
  id: string;
  instituteId: string;
  name: string;
  vehicleId: string | null;
  driverId: string | null;
  status: TransportAssetStatus;
  configStatus: RouteConfigStatus;
  lockedAt: string | null;
  lockedByUserId: string | null;
  setupFinishedAt: string | null;
  approvalStatus: TransportApprovalStatus;
  submittedByUserId: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
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
  submittedByUserId: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListTransportRoutesParams = {
  instituteId: string;
};

export type ListTransportStopsParams = {
  routeId: string;
};

export type TransportSettingsDto = {
  instituteId: string;
  defaultNotificationRadiusM: number;
  defaultPickupBufferMins: number;
  workingDays: number[];
  createdAt: string;
  updatedAt: string;
};

export type GetTransportSettingsParams = {
  instituteId: string;
};

export type EnrollmentStatus = "active" | "inactive" | "ended";

export type TransportEnrollmentDto = {
  id: string;
  instituteId: string;
  studentId: string;
  routeId: string;
  pickupStopId: string;
  dropStopId: string;
  status: EnrollmentStatus;
  approvalStatus: TransportApprovalStatus;
  submittedByUserId: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListTransportEnrollmentsParams = {
  instituteId: string;
};

export type TransportEnrollmentListItem = {
  id: string;
  studentName: string;
  studentClass: string;
  routeName: string;
  pickupStopName: string;
  dropStopName: string;
  status: EnrollmentStatus;
};

export type TransportReviewQueueItem =
  | { kind: "route"; item: RouteDto }
  | { kind: "stop"; item: StopDto }
  | { kind: "enrollment"; item: TransportEnrollmentDto };

export type ListTransportReviewQueueParams = {
  instituteId: string;
};
