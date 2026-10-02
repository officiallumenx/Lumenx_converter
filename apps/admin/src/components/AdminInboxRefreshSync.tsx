import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import {
  adminQueryRoots,
  invalidateAdminModule,
} from "@/lib/admin-queries";
import { subscribeInAppAlerts } from "@lumenx/notifications";

/** Keep inbox unread counts fresh while Admin is open (mirror Connect). */
const INBOX_POLL_MS = 45_000;

/**
 * Invalidates notifications on in-app alert / push toast events and light polling.
 * Does NOT enable push permission bootstrap — that stays contextual on Notifications/Alerts.
 */
export function AdminInboxRefreshSync(): null {
  const instituteCtx = useInstituteContext();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isApiAuthMode()) return;
    if (instituteCtx.status !== "ready" || !instituteCtx.activeInstituteId) return;

    const instituteId = instituteCtx.activeInstituteId;

    const refresh = () => {
      void invalidateAdminModule(
        queryClient,
        instituteId,
        adminQueryRoots.notifications,
      );
    };

    const unsubscribe = subscribeInAppAlerts(refresh);
    const timer = window.setInterval(refresh, INBOX_POLL_MS);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [instituteCtx.status, instituteCtx.activeInstituteId, queryClient]);

  return null;
}
