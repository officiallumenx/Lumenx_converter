import { useMemo, useSyncExternalStore } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@lumenx/ui";
import { PageHeader } from "@/components/app/PageHeader";
import { ActivityNotificationCard } from "@/activity-workspace/shared/ui/ActivityNotificationCard";
import { ActivityEmptyState } from "@/activity-workspace/shared/ui/ActivityEmptyState";
import { ActivityPageShell } from "@/activity-workspace/shared/ui/ActivityPageShell";
import { workspaceCommunicationRepository } from "@/lib/activity/workspace-communication";
import type { ActivityNotification } from "@/activity-workspace/hub/notifications";
import type { WorkspaceCommunicationItem } from "@/lib/activity/workspace-communication";

function formatTimeLabel(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function categoryFromItem(item: {
  title: string;
  audienceLabel: string;
}): ActivityNotification["category"] {
  const hay = `${item.title} ${item.audienceLabel}`.toLowerCase();
  if (hay.includes("urgent") || hay.includes("emergency")) return "urgent";
  if (hay.includes("announce")) return "announcement";
  if (hay.includes("achievement") || hay.includes("result") || hay.includes("certificate")) {
    return "result";
  }
  if (hay.includes("register") || hay.includes("roster") || hay.includes("added")) {
    return "registration";
  }
  return "reminder";
}

function toCardNotification(item: WorkspaceCommunicationItem): ActivityNotification {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    category: categoryFromItem(item),
    timeAgo: `${item.audienceLabel} · ${formatTimeLabel(item.sentAt)}`,
    unread: Boolean(item.unread),
  };
}

/**
 * Activity Coordinator notifications — separate from Subject Teacher `/notifications`.
 * Inbox is fed by Activity actions (practice, attendance, messages, etc.).
 */
export function ActivityNotificationsPage() {
  const items = useSyncExternalStore(
    workspaceCommunicationRepository.subscribe,
    workspaceCommunicationRepository.getSnapshot,
    workspaceCommunicationRepository.getSnapshot,
  );

  const notifications = useMemo(
    () =>
      items
        .filter((i) => i.kind === "notification")
        .slice()
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
    [items],
  );
  const unreadCount = notifications.filter((n) => n.unread).length;

  const markRead = (id: string) => {
    void workspaceCommunicationRepository.markRead(id);
  };

  const markAllRead = () => {
    void workspaceCommunicationRepository.markAllNotificationsRead();
  };

  return (
    <ActivityPageShell>
      <PageHeader
        title="Notifications"
        subtitle={`Activity alerts only · ${unreadCount} unread · not Subject Teacher notices`}
        action={
          unreadCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-xl gap-2"
              onClick={markAllRead}
            >
              <CheckCheck className="size-4" />
              Mark all read
            </Button>
          ) : null
        }
      />

      {notifications.length === 0 ? (
        <ActivityEmptyState
          icon={Bell}
          title="No Activity notifications yet"
          description="Assign practice, mark attendance, send a message or announcement — alerts for those actions show here."
          className="py-8"
        />
      ) : (
        <ul className="space-y-2.5">
          {notifications.map((n) => (
            <li key={n.id}>
              <ActivityNotificationCard
                notification={toCardNotification(n)}
                onMarkRead={markRead}
              />
            </li>
          ))}
        </ul>
      )}

      {notifications.length > 0 ? (
        <p className="pt-1 text-center text-[11px] text-muted-foreground">
          Tap a notification to open details
        </p>
      ) : null}
    </ActivityPageShell>
  );
}
