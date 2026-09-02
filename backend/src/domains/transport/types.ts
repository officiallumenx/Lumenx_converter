/** Transport foundation types aligned to vehicle/driver/route/stop/enrollment/settings. */

export type TransportAssetStatus = "active" | "inactive" | "maintenance";
export type RouteConfigStatus = "not_configured" | "configured" | "locked";
export type EnrollmentStatus = "active" | "inactive" | "ended";
export type TransportApprovalStatus = "pending" | "approved" | "rejected";

export type VehicleRow = {
  id: string;
  institute_id: string;
  vehicle_number: string;
  registration_number: string;
  capacity: number;
  status: TransportAssetStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type DriverRow = {
  id: string;
  institute_id: string;
  user_profile_id: string | null;
  display_name: string;
  phone: string;
  license_number: string;
  license_expiry: string | null;
  status: TransportAssetStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type RouteRow = {
  id: string;
  institute_id: string;
  name: string;
  vehicle_id: string | null;
  driver_id: string | null;
  status: TransportAssetStatus;
  config_status: RouteConfigStatus;
  locked_at: string | null;
  locked_by_user_id: string | null;
  setup_finished_at: string | null;
  approval_status: TransportApprovalStatus;
  submitted_by_user_id: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type StopRow = {
  id: string;
  institute_id: string;
  route_id: string;
  name: string;
  location_label: string;
  latitude: number;
  longitude: number;
  route_order: number;
  notification_radius_m: number;
  approval_status: TransportApprovalStatus;
  submitted_by_user_id: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type TransportEnrollmentRow = {
  id: string;
  institute_id: string;
  student_id: string;
  route_id: string;
  pickup_stop_id: string;
  drop_stop_id: string;
  status: EnrollmentStatus;
  approval_status: TransportApprovalStatus;
  submitted_by_user_id: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type TransportSettingsRow = {
  institute_id: string;
  default_notification_radius_m: number;
  default_pickup_buffer_mins: number;
  working_days: number[];
  created_at: string;
  updated_at: string;
};

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

export type TransportSettingsDto = {
  instituteId: string;
  defaultNotificationRadiusM: number;
  defaultPickupBufferMins: number;
  workingDays: number[];
  createdAt: string;
  updatedAt: string;
};

export type CreateVehicleInput = {
  instituteId: string;
  vehicleNumber: string;
  registrationNumber: string;
  capacity: number;
  status?: TransportAssetStatus;
  notes?: string | null;
};

export type UpdateVehicleInput = {
  vehicleNumber?: string;
  registrationNumber?: string;
  capacity?: number;
  status?: TransportAssetStatus;
  notes?: string | null;
};

export type CreateDriverInput = {
  instituteId: string;
  displayName: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry?: string | null;
  status?: TransportAssetStatus;
  notes?: string | null;
  /** Ignored — never trust client. */
  userProfileId?: string | null;
};

export type UpdateDriverInput = {
  displayName?: string;
  phone?: string;
  licenseNumber?: string;
  licenseExpiry?: string | null;
  status?: TransportAssetStatus;
  notes?: string | null;
};

export type CreateRouteInput = {
  instituteId: string;
  name: string;
  vehicleId?: string | null;
  driverId?: string | null;
  status?: TransportAssetStatus;
  configStatus?: RouteConfigStatus;
  approvalStatus?: TransportApprovalStatus;
  submittedByUserId?: string | null;
};

export type UpdateRouteInput = {
  name?: string;
  vehicleId?: string | null;
  driverId?: string | null;
  status?: TransportAssetStatus;
  configStatus?: RouteConfigStatus;
};

export type CreateStopInput = {
  instituteId: string;
  routeId: string;
  name: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  routeOrder: number;
  notificationRadiusM?: number;
  approvalStatus?: TransportApprovalStatus;
  submittedByUserId?: string | null;
};

export type UpdateStopInput = {
  name?: string;
  locationLabel?: string;
  latitude?: number;
  longitude?: number;
  routeOrder?: number;
  notificationRadiusM?: number;
};

export type CreateEnrollmentInput = {
  instituteId: string;
  studentId: string;
  routeId: string;
  pickupStopId: string;
  dropStopId: string;
  status?: EnrollmentStatus;
  approvalStatus?: TransportApprovalStatus;
  submittedByUserId?: string | null;
};

export type UpdateEnrollmentInput = {
  routeId?: string;
  pickupStopId?: string;
  dropStopId?: string;
  status?: EnrollmentStatus;
};

export type UpsertTransportSettingsInput = {
  instituteId: string;
  defaultNotificationRadiusM?: number;
  defaultPickupBufferMins?: number;
  workingDays?: number[];
};
