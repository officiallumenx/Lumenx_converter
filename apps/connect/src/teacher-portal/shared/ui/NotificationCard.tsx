import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  FileText,
  Megaphone,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";
import { cn, Dialog, DialogContent, DialogHeader, DialogTitle, Badge } from "@lumenx/ui";
import type { TeacherNotification } from "@/lib/teacher/types";
import { STUDENT_MODULE_COLORS, studentModuleLightChip } from "@/lib/student/nav";

const CATEGORY_META: Record<
  TeacherNotification["category"],
  { label: string; icon: LucideIcon; color: (typeof STUDENT_MODULE_COLORS)[keyof typeof STUDENT_MODULE_COLORS] }
> = {
  announcements: {
    label: "Announcement",
    icon: Megaphone,
    color: STUDENT_MODULE_COLORS.rose,
  },
  events: {
    label: "Event",
    icon: CalendarDays,
    color: STUDENT_MODULE_COLORS.sky,
  },
  exam_updates: {
    label: "Exam",
    icon: FileText,
    color: STUDENT_MODULE_COLORS.red,
  },
  staff_notices: {
    label: "Staff",
    icon: Users,
    color: STUDENT_MODULE_COLORS.navy,
  },
  messages: {
    label: "Message",
    icon: MessageSquare,
    color: STUDENT_MODULE_COLORS.cyan,
  },
  system: {
    label: "System",
    icon: Settings,
    color: STUDENT_MODULE_COLORS.slate,
  },
  urgent: {
    label: "Urgent",
    icon: AlertTriangle,
    color: STUDENT_MODULE_COLORS.scarlet,
  },
};

export function NotificationCard({
  notification,
  onMarkRead,
}: {
  notification: TeacherNotification;
  onMarkRead?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const meta = CATEGORY_META[notification.category] ?? {
    label: "Update",
    icon: Bell,
    color: STUDENT_MODULE_COLORS.crimson,
  };
  const Icon = meta.icon;
  const isUrgent = notification.category === "urgent";
  const chipBg = studentModuleLightChip(meta.color);

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
          "teacher-list-row flex min-w-0 w-full items-start gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-soft motion-fast hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-4",
          notification.unread && !isUrgent && "border-primary/25",
          isUrgent && notification.unread && "border-destructive/40 bg-destructive/5",
        )}
        style={
          notification.unread && !isUrgent
            ? {
                borderColor: `color-mix(in srgb, ${meta.color.primary} 35%, var(--border))`,
                backgroundColor: `color-mix(in srgb, ${meta.color.primary} 8%, var(--card))`,
              }
            : undefined
        }
      >
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl"
          style={{ color: meta.color.primary, backgroundColor: chipBg }}
          aria-hidden
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "text-xs font-bold",
                !notification.unread && "text-foreground",
                isUrgent && notification.unread && "text-destructive",
              )}
              style={
                notification.unread && !isUrgent
                  ? { color: meta.color.primary }
                  : undefined
              }
            >
              {meta.label}
            </span>
            {notification.unread ? (
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white"
                style={{ backgroundColor: meta.color.primary }}
              >
                Unread
              </span>
            ) : null}
          </div>
          <span
            className={cn(
              "mt-0.5 block text-sm leading-snug text-foreground",
              notification.unread ? "font-semibold" : "font-normal",
            )}
          >
            {notification.title}
          </span>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {notification.unread ? (
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: meta.color.primary }}
              aria-label="Unread"
            />
          ) : (
            <span className="size-2" aria-hidden />
          )}
          <span className="text-xs text-muted-foreground">{notification.time}</span>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "text-sm font-bold",
                  isUrgent ? "text-destructive" : "text-foreground",
                )}
                style={
                  !isUrgent ? { color: meta.color.primary } : undefined
                }
              >
                {meta.label}
              </span>
              {notification.unread ? (
                <Badge className="border-0 bg-primary/15 text-primary">Unread</Badge>
              ) : null}
            </div>
            <DialogTitle className="flex items-start gap-3 text-left">
              <span
                className="grid size-10 shrink-0 place-items-center rounded-xl"
                style={{ color: meta.color.primary, backgroundColor: chipBg }}
                aria-hidden
              >
                <Icon className="size-5" />
              </span>
              <span className="leading-snug">{notification.title}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-xl border bg-muted/30 p-3 leading-relaxed text-foreground">
              {notification.body}
            </div>
            <div className="text-xs text-muted-foreground">Received {notification.time}</div>
            {notification.href ? (
              <a
                href={notification.href}
                className="inline-flex text-sm font-medium text-primary hover:underline"
                onClick={() => setOpen(false)}
              >
                Open related page
              </a>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
