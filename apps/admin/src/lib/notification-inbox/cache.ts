import type { QueryClient } from "@tanstack/react-query";
import { adminModulePrefix, adminQueryKeys, adminQueryRoots } from "@/lib/admin-queries";
import type { NotificationInboxListItem } from "./types";
import type { NotificationInboxListState } from "./load";

/** Optimistically patch the Admin notifications TanStack Query cache. */
export function patchAdminNotificationsQuery(
  queryClient: QueryClient,
  instituteId: string,
  updater: (prev: NotificationInboxListItem[]) => NotificationInboxListItem[],
): void {
  queryClient.setQueryData<NotificationInboxListState>(
    adminQueryKeys.notifications(instituteId),
    (prev) => {
      if (!prev) return prev;
      const items = updater(prev.items);
      return {
        ...prev,
        items,
        status: items.length === 0 ? "empty" : prev.status === "empty" ? "ready" : prev.status,
        errorMessage: null,
      };
    },
  );
}

export function optimisticMarkNotificationRead(
  queryClient: QueryClient,
  instituteId: string,
  id: string,
): void {
  patchAdminNotificationsQuery(queryClient, instituteId, (prev) =>
    prev.map((n) => (n.id === id ? { ...n, unread: false } : n)),
  );
}

export function optimisticMarkAllNotificationsRead(
  queryClient: QueryClient,
  instituteId: string,
): void {
  patchAdminNotificationsQuery(queryClient, instituteId, (prev) =>
    prev.map((n) => ({ ...n, unread: false })),
  );
}

/** Re-sync inbox from server after a failed optimistic write. */
export function refreshAdminNotificationsQuery(
  queryClient: QueryClient,
  instituteId: string,
): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: adminModulePrefix(instituteId, adminQueryRoots.notifications),
  });
}
