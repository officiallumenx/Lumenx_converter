import { tripRepository } from "@/lib/transport";

/** @deprecated Prefer `tripRepository.getSnapshot().driver`. */
export const driverProfileMock = (() => {
  const driver = tripRepository.getSnapshot().driver;
  return {
    name: driver.name,
    phone: driver.phone,
    employeeId: driver.employeeId,
    busNumber: driver.busNumber,
    photoUrl: driver.photoUrl,
  };
})();

export type DriverProfileMock = typeof driverProfileMock;
