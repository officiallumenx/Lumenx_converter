import { useState } from "react";
import {
  AlertTriangle,
  Award,
  Bell,
  ClipboardCheck,
  Dumbbell,
  Megaphone,
  MessageSquare,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  cn,
} from "@lumenx/ui";
import type { ActivityNotification } from "@/activity-workspace/hub/notifications";
import { ACTIVITY_MODULE_COLORS } from "@/activity-workspace/core/nav";
import { studentModuleLightChip } from "@/lib/student/nav";

const CATEGORY_LABELS: Record<ActivityNotification["category"], string> = {
  reminder: "Reminder",
  registration: "Registration",
  result: "Result",
  announcement: "Announcement",
  urgent: "Urgent",
};

const CATEGORY_ICONS: Record<ActivityNotification["category"], LucideIcon> = {
  reminder: Bell,
  registration: Sparkles,
  result: Award,
  announcement: Megaphone,
  urgent: AlertTriangle,
};

/** Prefer a more specific icon from the audience / title when possible. */
function resolveIcon(notification: ActivityNotification): LucideIcon {
  const hay = `${notification.title} ${notification.timeAgo}`.toLowerCase();
  if (hay.includes("practice")) return Dumbbell;
  if (hay.includes("attendance")) return ClipboardCheck;
  if (hay.includes("message")) return MessageSquare;
  if (hay.includes("announce")) return Megaphone;
  if (hay.includes("achievement") || hay.includes("result")) return Trophy;
  if (hay.includes("sports") || hay.includes("team")) return Trophy;
  if (hay.includes("eca") || hay.includes("group")) return Sparkles;
  return CATEGORY_ICONS[notification.category];
}

export function ActivityNotificationCard({
  notification,
  onMarkRead,
}: {
  notification: ActivityNotification;
  onMarkRead?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isUrgent = notification.category === "urgent";
  const Icon = resolveIcon(notification);
  const accent = isUrgent
    ? { primary: "#DC2626", chip: "color-mix(in srgb, #DC2626 20%, var(--card))" }
    : {
        primary: ACTIVITY_MODULE_COLORS.notifications.primary,
        chip: studentModuleLightChip(ACTIVITY_MODULE_COLORS.notifications),
      };

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
          "activity-list-row flex min-w-0 w-full items-start gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-soft motion-fast hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-4",
          notification.unread && !isUrgent && "border-primary/25",
          isUrgent && notification.unread && "border-destructive/40 bg-destructive/5",
        )}
        style={
          notification.unread && !isUrgent
            ? {
                borderColor: `color-mix(in srgb, ${accent.primary} 35%, var(--border))`,
                backgroundColor: `color-mix(in srgb, ${accent.primary} 8%, var(--card))`,
              }
            : undefined
        }
      >
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl"
          style={{ color: accent.primary, backgroundColor: accent.chip }}
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
                isUrgent && "text-destructive",
              )}
              style={
                notification.unread && !isUrgent
                  ? { color: accent.primary }
                  : undefined
              }
            >
              {CATEGORY_LABELS[notification.category]}
            </span>
            {notification.unread ? (
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white"
                style={{ backgroundColor: accent.primary }}
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
          <p className="mt-2 text-[10px] text-muted-foreground">{notification.timeAgo}</p>
        </div>
        {notification.unread ? (
          <span
            className="mt-1.5 size-2 shrink-0 rounded-full"
            style={{ backgroundColor: accent.primary }}
            aria-label="Unread"
          />
        ) : null}
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
                style={!isUrgent ? { color: accent.primary } : undefined}
              >
                {CATEGORY_LABELS[notification.category]}
              </span>
              {notification.unread ? (
                <Badge className="border-0 bg-primary/15 text-primary">Unread</Badge>
              ) : null}
            </div>
            <DialogTitle className="flex items-start gap-3 text-left">
              <span
                className="grid size-10 shrink-0 place-items-center rounded-xl"
                style={{ color: accent.primary, backgroundColor: accent.chip }}
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
            <p className="text-xs text-muted-foreground">{notification.timeAgo}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
