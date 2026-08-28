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
