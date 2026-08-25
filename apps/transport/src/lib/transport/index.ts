/**
 * Driver Transport data layer.
 * Pages should depend on repositories/stores here — swap implementations for real APIs later.
 */

export type * from "./types";

export { transportSeed } from "./mock/seed";
export { DEMO_ROUTE_SETUP_ACCOUNT, getDemoRouteSetupAccount } from "./demo-route-setup-account";
export {
  listDemoDriverHints,
  resolveDriverAssignment,
  subscribeDriverAssignment,
} from "./driver-assignment";
export type { DriverAssignment, DriverAssignmentStatus } from "./driver-assignment";
export { tripRepository } from "./trip";
export type {
  TripPhase,
  TripSession,
  TripEndSummary,
  TripActionResult,
  AssignmentReadinessCheck,
} from "./trip";
export { isTripActive, tripPhaseLabel, buildTripEndSummary } from "./trip";
export { attendanceRepository } from "./attendance";
export { setAttendanceVehicleScope } from "./attendance/store";
export { alertsRepository } from "./alerts";
export { settingsRepository } from "./settings";
export { supportRepository } from "./support";
export { emergencyRepository } from "./emergency";
export { routeSetupRepository } from "./route-setup";
export { captureCurrentGps } from "./capture-gps";
export { resetTransportStores } from "./reset";
export { runTripReadinessChecks, createCheckingState } from "./trip-readiness";
export type { ReadinessCheck, ReadinessKey, ReadinessResult, ReadinessStatus } from "./trip-readiness";
export {
  startLocationTracking,
  stopLocationTracking,
  getLocationTrackSnapshot,
  subscribeLocationTrack,
} from "./location-tracking";
export type { LocationTrackState, LocationTrackStatus } from "./location-tracking";
export type {
  RouteSetupRecord,
  RouteSetupStatus,
  RouteSetupStop,
  GpsFix,
} from "./route-setup/types";
