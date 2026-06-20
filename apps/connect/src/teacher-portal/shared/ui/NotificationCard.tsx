import { cn } from "@lumenx/ui";
import type { TeacherNotification } from "@/lib/teacher/types";

const CATEGORY_LABELS: Partial<Record<TeacherNotification["category"], string>> = {
  announcements: "Announcement",
  events: "Event",
  exam_updates: "Exam",
  staff_notices: "Staff",
  messages: "Message",
  system: "System",
  urgent: "Urgent",
};

export function NotificationCard({
  notification,
  onMarkRead,
}: {
  notification: TeacherNotification;
  onMarkRead?: (id: string) => void;
}) {
  const isUrgent = notification.category === "urgent";
  return (
    <button
      type="button"
      onClick={() => notification.unread && onMarkRead?.(notification.id)}
      className={cn(
        "flex min-w-0 w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
        isUrgent
          ? "border-destructive/30 bg-destructive/5 hover:bg-destructive/10"
          : notification.unread
            ? "border-primary/20 bg-primary/5 hover:bg-primary/10"
            : "border-border bg-card hover:bg-muted/30",
      )}
    >
      <div
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          isUrgent ? "bg-destructive" : notification.unread ? "bg-primary" : "bg-muted-foreground/30",
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium">{notification.title}</span>
          {CATEGORY_LABELS[notification.category] && (
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", isUrgent ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground")}>
              {CATEGORY_LABELS[notification.category]}
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>
      </div>
      <span className="shrink-0 text-[10px] text-muted-foreground sm:text-xs">{notification.time}</span>
    </button>
  );
}
