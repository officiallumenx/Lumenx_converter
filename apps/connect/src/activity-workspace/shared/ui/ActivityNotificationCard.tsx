import { cn } from "@lumenx/ui";
import type { ActivityNotification } from "@/activity-workspace/hub/notifications";

const CATEGORY_LABELS: Record<ActivityNotification["category"], string> = {
  reminder: "Reminder",
  registration: "Registration",
  result: "Result",
  announcement: "Announcement",
  urgent: "Urgent",
};

export function ActivityNotificationCard({
  notification,
  onMarkRead,
}: {
  notification: ActivityNotification;
  onMarkRead?: (id: string) => void;
}) {
  const isUrgent = notification.category === "urgent";

  return (
    <button
      type="button"
      onClick={() => notification.unread && onMarkRead?.(notification.id)}
      className={cn(
        "activity-list-row flex min-w-0 w-full items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left motion-fast hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isUrgent && notification.unread && "border-destructive/40 bg-destructive/5",
      )}
    >
      <div
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          notification.unread && (isUrgent ? "bg-destructive" : "bg-primary"),
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "truncate text-sm text-foreground",
              notification.unread ? "font-semibold" : "font-normal",
            )}
          >
            {notification.title}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              isUrgent ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground",
            )}
          >
            {CATEGORY_LABELS[notification.category]}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>
        <p className="mt-2 text-[10px] text-muted-foreground">{notification.timeAgo}</p>
      </div>
    </button>
  );
}
