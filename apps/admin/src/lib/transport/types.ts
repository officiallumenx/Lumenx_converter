/** Mirrors backend VehicleDto — keep in sync with domains/transport/types.ts. */

export type TransportAssetStatus = "active" | "inactive" | "maintenance";

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
  createdAt: string;
  updatedAt: string;
};

export type ListTransportRoutesParams = {
  instituteId: string;
};

export type ListTransportStopsParams = {
  routeId: string;
};
