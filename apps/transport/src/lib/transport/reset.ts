import { resetAlertsStore } from "./alerts";
import { resetAttendanceStore, setAttendanceVehicleScope } from "./attendance/store";
import { clearApiDriverRoster } from "./api-roster";
import { stopLocationTracking } from "./location-tracking";
import { resetRouteSetupStore } from "./route-setup/store";
import { resetSettingsStore } from "./settings";
import { resetTripSession } from "./trip";

export function resetTransportStores() {
  setAttendanceVehicleScope(null);
  clearApiDriverRoster();
  resetAttendanceStore();
  resetAlertsStore();
  resetSettingsStore();
  resetTripSession();
  resetRouteSetupStore();
  void stopLocationTracking();
}
