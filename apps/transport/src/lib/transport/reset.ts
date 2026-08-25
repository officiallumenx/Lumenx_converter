import { resetAlertsStore } from "./alerts";
import { resetAttendanceStore, setAttendanceVehicleScope } from "./attendance/store";
import { stopLocationTracking } from "./location-tracking";
import { resetRouteSetupStore } from "./route-setup/store";
import { resetSettingsStore } from "./settings";
import { resetTripSession } from "./trip";
import {
  resetTransportAttendance,
  resetTransportEmergencies,
  resetTransportNotifications,
} from "@lumenx/utils";

export function resetTransportStores() {
  setAttendanceVehicleScope(null);
  resetAttendanceStore();
  resetAlertsStore();
  resetSettingsStore();
  resetTripSession();
  resetRouteSetupStore();
  resetTransportEmergencies();
  resetTransportAttendance();
  resetTransportNotifications();
  void stopLocationTracking();
}
