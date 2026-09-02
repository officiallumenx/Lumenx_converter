import { useCallback, useEffect, useRef, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { loadConnectPortalInbox } from "@/lib/connect-inbox/load";
import { markInboxItemRead } from "@/lib/notification-inbox";
import { isAlertNotification } from "@lumenx/notifications";
import type { AppNotification } from "@lumenx/types";

export function useConnectApiInbox(activeInstituteId: string | null) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(isApiAuthMode());
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const seenIdsRef = useRef<Set<string> | null>(null);

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!isApiAuthMode()) {
      setLoading(false);
      return;
    }
    if (!activeInstituteId) {
      setItems([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void loadConnectPortalInbox(activeInstituteId)
      .then((rows) => {
        if (!cancelled) {
          setItems(rows);
          setError(null);
          const currentIds = new Set(rows.map((r) => r.id));
          if (seenIdsRef.current !== null) {
            for (const row of rows) {
              if (
                row.unread &&
                isAlertNotification(row as AppNotification & { payload?: Record<string, unknown> }) &&
                !seenIdsRef.current.has(row.id)
              ) {
                void import("@lumenx/notifications").then(({ dispatchInAppAlert }) => {
                  dispatchInAppAlert({
                    title: row.title,
                    body: row.desc,
                    href: row.href ?? "/alerts",
                    variant: "alert",
                    severity: "mandatory",
                  });
                });
              }
            }
          }
          seenIdsRef.current = currentIds;
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load notifications");
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeInstituteId, reloadKey]);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    if (!isApiAuthMode() || id.startsWith("ann-row-")) return;
    try {
      await markInboxItemRead(id);
    } catch {
      // optimistic UI — ignore
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const unread = items.filter((n) => n.unread);
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
    if (!isApiAuthMode()) return;
    await Promise.all(
      unread
        .filter((n) => !n.id.startsWith("ann-row-"))
        .map((n) => markInboxItemRead(n.id).catch(() => undefined)),
    );
  }, [items]);

  return { items, loading, error, markRead, markAllRead, reload };
}
