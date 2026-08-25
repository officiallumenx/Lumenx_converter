import { tripRepository } from "@/lib/transport";

/** @deprecated Prefer `tripRepository.getSnapshot()`. */
export const busInformationMock = (() => {
  const trip = tripRepository.getSnapshot();
  return {
    busNumber: trip.bus.busNumber,
    vehicleNumber: trip.bus.vehicleNumber,
    driverName: trip.driver.name,
    assignedRoute: {
      code: trip.route.code,
      name: trip.route.name,
    },
    stops: trip.route.stops,
    capacity: trip.bus.capacity,
  };
})();

export type BusInformationMock = typeof busInformationMock;
export type BusStop = (typeof busInformationMock)["stops"][number];
