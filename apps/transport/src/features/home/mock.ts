import { tripRepository } from "@/lib/transport";

/** @deprecated Prefer `tripRepository.getSnapshot()` — kept for gradual migration. */
export const homeMock = (() => {
  const trip = tripRepository.getSnapshot();
  return {
    driver: {
      id: trip.driver.id,
      name: trip.driver.name,
      phone: trip.driver.phone,
      employeeId: trip.driver.employeeId,
      licenseNumber: trip.driver.licenseNumber,
    },
    bus: {
      number: trip.bus.busNumber,
      label: trip.bus.label,
    },
    route: {
      name: trip.route.name,
      code: trip.route.code,
      stopCount: trip.route.stops.length,
    },
    totalStudents: trip.totalStudents,
  };
})();

export type HomeDriver = (typeof homeMock)["driver"];
export type HomeBus = (typeof homeMock)["bus"];
export type HomeRoute = (typeof homeMock)["route"];
export type HomeMock = typeof homeMock;
