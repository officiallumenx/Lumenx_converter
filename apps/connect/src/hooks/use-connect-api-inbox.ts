import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useApp } from "@/lib/app-state";
import { useConnectInboxQuery } from "@/lib/connect-queries/hooks";
import { connectQueryKeys } from "@/lib/connect-queries/keys";
import { markInboxItemRead } from "@/lib/notification-inbox";
import { isAlertNotification, subscribeInAppAlerts } from "@lumenx/notifications";
import type { AppNotification } from "@lumenx/types";

export function useConnectApiInbox(activeInstituteId: string | null) {
  const { role } = useApp();
  const apiMode = isApiAuthMode();
  const queryClient = useQueryClient();
  const seenIdsRef = useRef<Set<string> | null>(null);
  const roleKey = role || "_";

  const query = useConnectInboxQuery(
    activeInstituteId,
    roleKey,
    apiMode && Boolean(activeInstituteId),
  );

  useEffect(() => subscribeInAppAlerts(query.refresh), [query.refresh]);

  useEffect(() => {
    const rows = query.data;
    if (!rows) return;
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
  }, [query.data]);

  const items = query.data ?? [];
  const loading = apiMode && Boolean(activeInstituteId) && query.isLoading && !query.data;
  const error =
    query.isError
      ? query.error instanceof Error
        ? query.error.message
        : "Failed to load notifications"
      : null;

  const patchItems = useCallback(
    (updater: (prev: AppNotification[]) => AppNotification[]) => {
      if (!activeInstituteId) return;
      queryClient.setQueryData<AppNotification[]>(
        connectQueryKeys.inbox(activeInstituteId, roleKey),
        (prev) => updater(prev ?? []),
      );
    },
    [activeInstituteId, queryClient, roleKey],
  );

  const markRead = useCallback(
    async (id: string) => {
      patchItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
      if (!isApiAuthMode() || id.startsWith("ann-row-")) return;
      try {
        await markInboxItemRead(id);
      } catch {
        // optimistic UI — ignore
      }
    },
    [patchItems],
  );

  const markAllRead = useCallback(async () => {
    const unread = items.filter((n) => n.unread);
    patchItems((prev) => prev.map((n) => ({ ...n, unread: false })));
    if (!isApiAuthMode()) return;
    await Promise.all(
      unread
        .filter((n) => !n.id.startsWith("ann-row-"))
        .map((n) => markInboxItemRead(n.id).catch(() => undefined)),
    );
  }, [items, patchItems]);

  return { items, loading, error, markRead, markAllRead, reload: query.refresh };
}
