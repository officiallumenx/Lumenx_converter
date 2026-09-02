import { useEffect } from "react";
import { isApiAuthMode } from "@/lib/auth/auth-mode";
import { useTransportAuth } from "@/lib/auth/transport-auth";
import {
  inboxItemDtosToTransportNotifications,
  listInboxNotifications,
} from "@/lib/notification-inbox";
import { setApiTransportNotifications } from "@/lib/transport/alerts/store";
import { dispatchInAppAlert } from "@lumenx/notifications";

const POLL_MS = 45_000;

/** Polls driver notification inbox for alerts badge + urgent toasts. */
export function TransportAlertsSync(): null {
  const { user, apiMode } = useTransportAuth();

  useEffect(() => {
    if (!apiMode || !isApiAuthMode() || !user?.instituteId) {
      setApiTransportNotifications([]);
      return;
    }

    let cancelled = false;
    let seenIds: Set<string> | null = null;
    let initialDone = false;

    const refresh = async () => {
      try {
        const rows = await listInboxNotifications({ instituteId: user.instituteId! });
        if (cancelled) return;
        const mapped = inboxItemDtosToTransportNotifications(rows);
        setApiTransportNotifications(mapped);

        const currentIds = new Set(mapped.map((row) => row.id));
        if (seenIds !== null && initialDone) {
          for (const row of mapped) {
            if (!row.unread || row.kind !== "urgent" || seenIds.has(row.id)) continue;
            dispatchInAppAlert({
              title: row.title,
              body: row.message,
              href: row.href ?? "/alerts",
              variant: "alert",
              severity: "critical",
            });
          }
        }
        seenIds = currentIds;
        initialDone = true;
      } catch {
        if (!cancelled) setApiTransportNotifications([]);
      }
    };

    void refresh();
    const timer = window.setInterval(refresh, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [apiMode, user?.instituteId]);

  return null;
}
