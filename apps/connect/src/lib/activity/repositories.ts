import { activityDashboardSnapshot } from "./mock-data";
import type { ActivityDashboardSnapshot } from "./types";
import { resetAchievementsStore } from "./achievements/store";
import { resetCertificatesStore } from "./certificates/store";

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));

let dashboardStore: ActivityDashboardSnapshot = { ...activityDashboardSnapshot };

/**
 * Satellite sports workspace modules are reset via dynamic import so they are
 * NOT evaluated on app bootstrap. ActivityPortalRegistry imports this file on
 * every page — eager imports previously pulled the full sports repository graph
 * (~600KB) before login, causing slow loads and intermittent startup crashes.
 */
function resetSportsWorkspaceModules() {
  void Promise.all([
    import("./sports-reports/repositories").then((m) => m.sportsReportsRepository.reset()),
    import("./sports-equipment/repositories").then((m) => m.sportsEquipmentRepository.reset()),
    import("./sports-venues/repositories").then((m) => m.sportsVenuesRepository.reset()),
    import("./sports-medical-fitness/repositories").then((m) =>
      m.sportsMedicalFitnessRepository.reset(),
    ),
    import("./sports-team-selection/repositories").then((m) =>
      m.sportsTeamSelectionRepository.reset(),
    ),
    import("./sports-communication/repositories").then((m) =>
      m.sportsCommunicationRepository.reset(),
    ),
    import("./sports-unified-calendar/repositories").then((m) =>
      m.sportsUnifiedCalendarRepository.reset(),
    ),
    import("./sports-archive/store").then((m) => m.resetSportsArchiveStore()),
  ]);
}

export const activityRepository = {
  async getDashboard(): Promise<ActivityDashboardSnapshot> {
    await delay();
    return dashboardStore;
  },
  getDashboardSnapshot(): ActivityDashboardSnapshot {
    return dashboardStore;
  },
  /** Demo hook for future mutations from other activity modules. */
  setDashboardSnapshot(next: ActivityDashboardSnapshot) {
    dashboardStore = next;
  },
  reset() {
    dashboardStore = { ...activityDashboardSnapshot };
    resetAchievementsStore();
    resetCertificatesStore();
    resetSportsWorkspaceModules();
  },
};
