import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusChip } from "@/components/ui/status-chip";
import { useAlerts } from "@/hooks/use-alerts";
import { alertsRepository } from "@/lib/transport";

import { TransportNotificationCard } from "./TransportNotificationCard";

type NotificationsPageProps = {
  title?: string;
  subtitle?: string;
};

export function NotificationsPage({
  title = "Notifications",
  subtitle = "Route updates, reminders, and school notices",
}: NotificationsPageProps) {
  const notifications = useAlerts();
  const unreadCount = notifications.filter((notification) => notification.unread).length;

  const markRead = (id: string) => {
    void alertsRepository.markRead(id);
  };

  const markAllRead = () => {
    void alertsRepository.markAllRead();
  };

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <SectionHeader
        as="h1"
        size="page"
        title={title}
        subtitle={
          unreadCount > 0
            ? `${unreadCount} unread · ${subtitle}`
            : subtitle
        }
        action={
          unreadCount > 0 ? (
            <StatusChip label={`${unreadCount} new`} tone="primary" withDot={false} />
          ) : undefined
        }
      />

      {unreadCount > 0 ? (
        <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={markAllRead}>
          Mark all as read
        </Button>
      ) : null}

      <section className="space-y-2.5" aria-label="Notification list">
        {notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="You're all caught up. New route and school updates will appear here."
          />
        ) : (
          notifications.map((notification) => (
            <TransportNotificationCard
              key={notification.id}
              notification={notification}
              onMarkRead={markRead}
            />
          ))
        )}
      </section>
    </div>
  );
}
