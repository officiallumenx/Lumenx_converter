import { isApiAuthMode } from "@/lib/auth/auth-mode";
import {
  getAlertsSnapshot,
  getUnreadAlertCount,
  markAlertReadInStore,
  markAllAlertsReadInStore,
  resetAlertsStore,
  subscribeAlertsStore,
} from "./store";
import { markInboxItemRead } from "@/lib/notification-inbox";

/** Driver alerts / notifications — internal name "alerts", route remains /notifications. */
export const alertsRepository = {
  subscribe: subscribeAlertsStore,
  getSnapshot: getAlertsSnapshot,
  getUnreadCount: getUnreadAlertCount,

  async list() {
    return getAlertsSnapshot();
  },

  async markRead(id: string) {
    if (isApiAuthMode() && !id.startsWith("wf-") && !id.startsWith("seed-")) {
      try {
        await markInboxItemRead(id);
      } catch {
        // fall through to local optimistic update
      }
    }
    markAlertReadInStore(id);
  },

  async markAllRead() {
    const snapshot = getAlertsSnapshot();
    const unread = snapshot.filter((a) => a.unread);
    if (isApiAuthMode()) {
      await Promise.all(
        unread
          .filter((a) => !a.id.startsWith("wf-") && !a.id.startsWith("seed-"))
          .map((a) => markInboxItemRead(a.id).catch(() => undefined)),
      );
    }
    markAllAlertsReadInStore();
  },

  reset() {
    resetAlertsStore();
  },
};
