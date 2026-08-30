import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
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
import {
  loadNotificationInboxList,
  resolveNotificationInboxListView,
  shouldCommitNotificationInboxLoad,
  type NotificationInboxListItem,
  type NotificationInboxListStatus,
} from "@/lib/notification-inbox";

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
  const writesEnabled = resolveWritesEnabled(apiMode, { status: instituteCtx.status, activeInstituteId: instituteCtx.activeInstituteId });

  const { tab: tabFromSearch } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [tab, setTab] = useState<Tab>(
    tabFromSearch === "broadcast" ? "broadcast" : "inbox",
  );

  const [demoItems, setDemoItems] = useState<AdminNotification[]>(() =>
    apiMode ? [] : getAdminNotifications(),
  );

  const [apiItems, setApiItems] = useState<NotificationInboxListItem[]>([]);
  const [listStatus, setListStatus] = useState<NotificationInboxListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<
    string | null
  >(null);
  const [reloadKey, setReloadKey] = useState(0);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const listView = resolveNotificationInboxListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: apiItems,
    storedStatus: listStatus,
    storedErrorMessage: listError,
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

  useEffect(() => {
    if (!apiMode) return;

    if (instituteCtx.status === "loading") {
      setApiItems([]);
      setListStatus("loading");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiItems([]);
      setListStatus(
        instituteCtx.status === "forbidden" ? "forbidden" : "error",
      );
      setListError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiItems([]);
      setListStatus("needs_institute");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setListStatus("loading");
    setListError(null);
    void loadNotificationInboxList(requestInstituteId).then((next) => {
      if (
        !shouldCommitNotificationInboxLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setApiItems(next.items);
      setListStatus(next.status);
      setListError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
  ]);

  const onTabChange = (next: Tab) => {
    setTab(next);
    void navigate({ search: { tab: next } });
  };

  const refreshList = useCallback(() => {
    if (apiMode) {
      setReloadKey((k) => k + 1);
      return;
    }
    refreshDemo();
  }, [apiMode, refreshDemo]);

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
            ? "API mode · mark read / delete via notifications API"
            : "API mode · emit via POST /api/v1/notifications"
          : tab === "inbox"
            ? `${unreadLabel} unread · Read, search, filter, and open linked pages`
            : "Targeted announcements & emergency alerts"
      }
    >
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
