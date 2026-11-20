import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  useNotificationsListQuery,
  adminModulePrefix,
  adminQueryRoots,
} from "@/lib/admin-queries";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ModuleHero } from "@/components/module-shell";
import { NotificationCenterInbox } from "@/components/notifications/NotificationCenterInbox";
import {
  getAdminNotifications,
  subscribeAdminNotifications,
  type AdminNotification,
} from "@/lib/notification-center-store";
import { startTransportAdminNotificationSync } from "@/lib/transport-notification-sync";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import { enableAdminPushBootstrap } from "@/lib/push-bootstrap-gate";
import {
  resolveNotificationInboxListView,
  type NotificationInboxListItem,
  type NotificationInboxListStatus,
} from "@/lib/notification-inbox";
import { ApiClientError } from "@/lib/api";

type InboxRow = AdminNotification | NotificationInboxListItem;

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notification Center — LumenX Admin" }] }),
  validateSearch: (search: Record<string, unknown>): { tab?: string } => {
    if (typeof search.tab === "string") return { tab: search.tab };
    return {};
  },
  beforeLoad: ({ search }) => {
    // Legacy Notifications "Send" tab → dedicated Send module
    if (search.tab === "broadcast" || search.tab === "send") {
      throw redirect({ to: "/send" });
    }
  },
  component: NotificationsPage,
});

function NotificationsPage() {
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });

  useEffect(() => {
    enableAdminPushBootstrap();
  }, []);

  const [demoItems, setDemoItems] = useState<AdminNotification[]>(() =>
    apiMode ? [] : getAdminNotifications(),
  );

  const queryClient = useQueryClient();
  const listEnabled =
    apiMode &&
    instituteCtx.status === "ready" &&
    Boolean(instituteCtx.activeInstituteId);
  const notificationsQuery = useNotificationsListQuery(
    instituteCtx.activeInstituteId,
    listEnabled,
  );

  const bumpNotificationsReload = useCallback(() => {
    if (instituteCtx.activeInstituteId) {
      void queryClient.invalidateQueries({
        queryKey: adminModulePrefix(
          instituteCtx.activeInstituteId,
          adminQueryRoots.notifications,
        ),
      });
    }
  }, [instituteCtx.activeInstituteId, queryClient]);

  const queryState = notificationsQuery.data;
  const queryError = notificationsQuery.isError
    ? notificationsQuery.error instanceof ApiClientError &&
      notificationsQuery.error.status === 403
      ? ("forbidden" as const)
      : ("error" as const)
    : null;

  const resolvedForInstituteId =
    instituteCtx.status === "ready" &&
    instituteCtx.activeInstituteId &&
    (queryState != null || queryError != null)
      ? instituteCtx.activeInstituteId
      : null;

  let storedStatus: NotificationInboxListStatus = "loading";
  if (!apiMode) {
    storedStatus = "demo";
  } else if (queryError) {
    storedStatus = queryError;
  } else if (queryState) {
    storedStatus = queryState.status;
  } else if (notificationsQuery.isLoading && !queryState) {
    storedStatus = "loading";
  }

  const listView = resolveNotificationInboxListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: queryState?.items ?? [],
    storedStatus,
    storedErrorMessage:
      queryError != null
        ? notificationsQuery.error instanceof Error
          ? notificationsQuery.error.message
          : "Failed to load notifications"
        : (queryState?.errorMessage ?? null),
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const displayItems: InboxRow[] = apiMode ? listView.items : demoItems;
  const displayUnread = displayItems.filter((n) => n.unread).length;

  const refreshDemo = useCallback(() => {
    setDemoItems(getAdminNotifications());
  }, []);

  useEffect(() => {
    if (apiMode) return;
    startTransportAdminNotificationSync();
  }, [apiMode]);

  useEffect(() => {
    if (apiMode) return;
    return subscribeAdminNotifications(refreshDemo);
  }, [apiMode, refreshDemo]);

  const refreshList = useCallback(() => {
    if (apiMode) {
      bumpNotificationsReload();
      return;
    }
    refreshDemo();
  }, [apiMode, bumpNotificationsReload, refreshDemo]);

  const unreadLabel =
    apiMode && !listView.rowsValid
      ? "…"
      : displayUnread > 0
        ? String(displayUnread)
        : "0";

  const listHint =
    listView.status === "loading"
      ? "Loading notifications…"
      : listView.status === "needs_institute"
        ? "Select an active institute to load notifications"
        : listView.status === "forbidden"
          ? "You do not have access to notifications for this institute"
          : listView.status === "error"
            ? listView.errorMessage ?? "Failed to load notifications"
            : listView.status === "empty"
              ? "No notifications yet"
              : null;

  const subtitle = apiMode
    ? "Mark read / delete notifications"
    : `${unreadLabel} unread · Read, search, filter, and open linked pages`;

  return (
    <AppShell title="Notification Center" subtitle={subtitle}>
      <div className="flex flex-col gap-2">
        <ModuleHero
          compact
          eyebrow="Communications"
          title="Notification Center"
          subtitle={subtitle}
         helpKey="notifications" />
        <NotificationCenterInbox
          items={displayItems}
          onChange={refreshList}
          writesEnabled={writesEnabled}
          rowsValid={listView.rowsValid}
          listHint={listHint}
          instituteResetKey={instituteCtx.activeInstituteId}
          instituteId={instituteCtx.activeInstituteId}
        />
      </div>
    </AppShell>
  );
}
