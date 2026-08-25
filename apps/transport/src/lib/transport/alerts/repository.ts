import { repositoryDelay } from "../utils";
import {
  getAlertsSnapshot,
  getUnreadAlertCount,
  markAlertReadInStore,
  markAllAlertsReadInStore,
  resetAlertsStore,
  subscribeAlertsStore,
} from "./store";

/** Driver alerts / notifications — internal name "alerts", route remains /notifications. */
export const alertsRepository = {
  subscribe: subscribeAlertsStore,
  getSnapshot: getAlertsSnapshot,
  getUnreadCount: getUnreadAlertCount,

  async list() {
    await repositoryDelay();
    return getAlertsSnapshot();
  },

  async markRead(id: string) {
    await repositoryDelay(40);
    markAlertReadInStore(id);
  },

  async markAllRead() {
    await repositoryDelay(40);
    markAllAlertsReadInStore();
  },

  reset() {
    resetAlertsStore();
  },
};
