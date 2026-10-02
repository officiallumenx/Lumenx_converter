import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  useNotificationsListQuery,
  adminModulePrefix,
  adminQueryRoots,
} from "@/lib/admin-queries";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ModuleHero } from "@/components/module-shell";
import { NotificationBroadcastCompose } from "@/components/notifications/NotificationBroadcastCompose";
import { NotificationApiEmitCompose } from "@/components/notifications/NotificationApiEmitCompose";
import { NotificationCenterInbox } from "@/components/notifications/NotificationCenterInbox";
import {
  getAdminNotifications,
  subscribeAdminNotifications,
  type AdminNotification,
} from "@/lib/notification-center-store";
import { startTransportAdminNotificationSync } from "@/lib/transport-notification-sync";
import { SegmentedControl } from "@lumenx/ui-admin";
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

type Tab = "inbox" | "broadcast";

type InboxRow = AdminNotification | NotificationInboxListItem;

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notification Center — LumenX Admin" }] }),
  validateSearch: (search: Record<string, unknown>): { tab?: Tab } => {
    if (search.tab === "broadcast" || search.tab === "inbox") {
      return { tab: search.tab };
    }
    return {};
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

  const { tab: tabFromSearch } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [tab, setTab] = useState<Tab>(
    tabFromSearch === "broadcast" ? "broadcast" : "inbox",
  );

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
  } else if (notificationsQuery.isLoading) {
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

  useEffect(() => {
    if (tabFromSearch === "broadcast" || tabFromSearch === "inbox") {
      setTab(tabFromSearch);
    }
  }, [tabFromSearch]);

  const onTabChange = (next: Tab) => {
    setTab(next);
    void navigate({ search: { tab: next } });
  };

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

  return (
    <AppShell
      title="Notification Center"
      subtitle={
        apiMode
          ? tab === "inbox"
            ? "Mark read / delete notifications"
            : "Send broadcasts"
          : tab === "inbox"
            ? `${unreadLabel} unread · Read, search, filter, and open linked pages`
            : "Targeted announcements & emergency alerts"
      }
    >
      <ModuleHero
        eyebrow="Communications"
        title="Notification Center"
        subtitle={
          apiMode
            ? tab === "inbox"
              ? "Mark read / delete notifications"
              : "Send broadcasts"
            : tab === "inbox"
              ? `${unreadLabel} unread · Read, search, filter, and open linked pages`
              : "Targeted announcements & emergency alerts"
        }
      />
      <div className="mb-4">
        <SegmentedControl
          value={tab}
          onChange={onTabChange}
          options={[
            {
              value: "inbox",
              label: displayUnread > 0 ? `Inbox (${displayUnread})` : "Inbox",
            },
            {
              value: "broadcast",
              label: apiMode ? "Emit" : "Broadcast",
            },
          ]}
        />
      </div>

      {tab === "inbox" ? (
        <NotificationCenterInbox
          items={displayItems}
          onChange={refreshList}
          writesEnabled={writesEnabled}
          rowsValid={listView.rowsValid}
          listHint={listHint}
          instituteResetKey={instituteCtx.activeInstituteId}
          instituteId={instituteCtx.activeInstituteId}
        />
      ) : apiMode ? (
        <NotificationApiEmitCompose
          onEmitted={() => {
            refreshList();
            setTab("inbox");
            void navigate({ search: { tab: "inbox" } });
          }}
        />
      ) : (
        <NotificationBroadcastCompose />
      )}
    </AppShell>
  );
}
