import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { NotificationBroadcastCompose } from "@/components/notifications/NotificationBroadcastCompose";
import { NotificationCenterInbox } from "@/components/notifications/NotificationCenterInbox";
import {
  getAdminNotifications,
  getAdminUnreadCount,
  subscribeAdminNotifications,
  type AdminNotification,
} from "@/lib/notification-center-store";
import { startTransportAdminNotificationSync } from "@/lib/transport-notification-sync";
import { SegmentedControl } from "@lumenx/ui-admin";

type Tab = "inbox" | "broadcast";

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
  const { tab: tabFromSearch } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [tab, setTab] = useState<Tab>(tabFromSearch === "broadcast" ? "broadcast" : "inbox");
  const [items, setItems] = useState<AdminNotification[]>(() => getAdminNotifications());
  const [unread, setUnread] = useState(() => getAdminUnreadCount());

  const refresh = useCallback(() => {
    setItems(getAdminNotifications());
    setUnread(getAdminUnreadCount());
  }, []);

  useEffect(() => {
    startTransportAdminNotificationSync();
  }, []);

  useEffect(() => subscribeAdminNotifications(refresh), [refresh]);

  useEffect(() => {
    if (tabFromSearch === "broadcast" || tabFromSearch === "inbox") {
      setTab(tabFromSearch);
    }
  }, [tabFromSearch]);

  const onTabChange = (next: Tab) => {
    setTab(next);
    void navigate({ search: { tab: next } });
  };

  return (
    <AppShell
      title="Notification Center"
      subtitle={
        tab === "inbox"
          ? `${unread} unread · Read, search, filter, and open linked pages`
          : "Targeted announcements & emergency alerts"
      }
    >
      <div className="mb-4">
        <SegmentedControl
          value={tab}
          onChange={onTabChange}
          options={[
            { value: "inbox", label: unread > 0 ? `Inbox (${unread})` : "Inbox" },
            { value: "broadcast", label: "Broadcast" },
          ]}
        />
      </div>

      {tab === "inbox" ? (
        <NotificationCenterInbox items={items} onChange={refresh} />
      ) : (
        <NotificationBroadcastCompose />
      )}
    </AppShell>
  );
}
