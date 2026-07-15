import { useState } from "react";
import { cn, Dialog, DialogContent, DialogHeader, DialogTitle, Badge } from "@lumenx/ui";
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
  const [open, setOpen] = useState(false);
  const isUrgent = notification.category === "urgent";

  const openDetail = () => {
    setOpen(true);
    if (notification.unread) onMarkRead?.(notification.id);
  };

  return (
    <>
      <button
        type="button"
        onClick={openDetail}
        className={cn(
          "teacher-list-row flex min-w-0 w-full items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left motion-fast hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
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
            {CATEGORY_LABELS[notification.category] && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  isUrgent ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground",
                )}
              >
                {CATEGORY_LABELS[notification.category]}
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{notification.time}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {CATEGORY_LABELS[notification.category] && (
                <Badge
                  variant="outline"
                  className={cn(
                    isUrgent && "border-destructive/40 bg-destructive/10 text-destructive",
                  )}
                >
                  {CATEGORY_LABELS[notification.category]}
                </Badge>
              )}
              {notification.unread && (
                <Badge className="border-0 bg-primary/15 text-primary">Unread</Badge>
              )}
            </div>
            <DialogTitle className="text-left leading-snug">{notification.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-xl border bg-muted/30 p-3 leading-relaxed text-foreground">
              {notification.body}
            </div>
            <div className="text-xs text-muted-foreground">Received {notification.time}</div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
