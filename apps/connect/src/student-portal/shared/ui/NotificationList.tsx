import { useState } from "react";
import type { AppNotification, NotificationCategory } from "@lumenx/types";
import { isAlertNotification } from "@lumenx/notifications";
import { Dialog, DialogContent, DialogHeader, DialogTitle, Badge, cn } from "@lumenx/ui";
import { Bell, Sparkles, AlertTriangle, Info, Flame, ChevronRight } from "lucide-react";
import { STUDENT_NOTIFICATION_COLOR, studentModuleIconStyle } from "@/lib/student/nav";

const NOTIFICATION_ACCENT = STUDENT_NOTIFICATION_COLOR;
const NOTIFICATION_ICON_STYLE = studentModuleIconStyle(NOTIFICATION_ACCENT);

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  academic: "Academic",
  attendance: "Attendance",
  assignments: "Assignments",
  exams: "Exams",
  fees: "Fees",
  sports: "Sports",
  events: "Events",
  holidays: "Holidays",
  circulars: "Circulars",
  emergency: "Emergency",
};

const TYPE_STYLES = {
  warning: {
    icon: AlertTriangle,
    tone: "bg-warning/15 text-warning-foreground border-warning/30",
    label: "Needs attention",
    labelClass: "text-warning-foreground",
    unreadRow: "border-warning/30 bg-warning/5",
    barClass: "bg-warning",
  },
  positive: {
    icon: Sparkles,
    tone: "bg-success/15 text-success border-success/30",
    label: "Good news",
    labelClass: "text-success",
    unreadRow: "border-success/30 bg-success/5",
    barClass: "bg-success",
  },
  info: {
    icon: Info,
    tone: "",
    label: "Update",
    labelClass: "",
    unreadRow: "border-primary/25 bg-primary/5",
    barClass: "",
  },
} as const;

function notificationMeta(n: AppNotification) {
  if (isAlertNotification(n) || n.category === "emergency") {
    return {
      icon: AlertTriangle,
      tone: "bg-destructive/15 text-destructive border-destructive/40",
      label: "Important alert",
      labelClass: "text-destructive",
      unreadRow: "border-destructive/45 bg-destructive/[0.07] ring-1 ring-destructive/20",
      barClass: "bg-destructive",
    };
  }
  return TYPE_STYLES[n.type];
}

export function NotificationList({
  list,
  onSelect,
}: {
  list: AppNotification[];
  onSelect?: (id: string) => void;
}) {
  const [selected, setSelected] = useState<AppNotification | null>(null);

  const openDetail = (n: AppNotification) => {
    onSelect?.(n.id);
    const withHref =
      n.href && n.href.trim()
        ? n
        : {
            ...n,
            href:
              n.category === "attendance"
                ? "/attendance"
                : n.category === "fees"
                  ? "/fees"
                  : n.category === "assignments"
                    ? "/homework"
                    : n.category === "exams"
                      ? "/exams"
                      : n.category === "events"
                        ? "/events"
                        : "/notifications",
          };
    setSelected({ ...withHref, unread: false });
  };

  return (
    <>
      <div className="min-w-0 space-y-2">
        {list.map((n) => {
          const meta = notificationMeta(n);
          const Icon = meta.icon;
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => openDetail(n)}
              className={cn(
                "student-list-row group flex min-w-0 w-full items-stretch gap-0 overflow-hidden rounded-2xl border border-border bg-card text-left motion-fast",
                n.unread && "shadow-soft",
                n.unread && meta.unreadRow,
                "hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              )}
              style={
                n.unread && n.type === "info"
                  ? {
                      borderColor: `color-mix(in srgb, ${NOTIFICATION_ACCENT.primary} 35%, var(--border))`,
                      backgroundColor: `color-mix(in srgb, ${NOTIFICATION_ACCENT.primary} 8%, var(--card))`,
                    }
                  : undefined
              }
            >
              <div
                className={cn("w-1 shrink-0", n.unread && meta.barClass)}
                style={n.unread && n.type === "info" ? { backgroundColor: NOTIFICATION_ACCENT.primary } : undefined}
                aria-hidden
              />
              <div className="flex min-w-0 flex-1 items-start gap-3 p-4">
                <div
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl",
                    meta.tone,
                    !n.unread && "opacity-80",
                  )}
                  style={n.type === "info" ? NOTIFICATION_ICON_STYLE : undefined}
                >
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "text-xs font-bold",
                        n.unread ? meta.labelClass || "text-foreground" : "text-foreground",
                      )}
                      style={
                        n.unread && n.type === "info"
                          ? { color: NOTIFICATION_ACCENT.primary }
                          : undefined
                      }
                    >
                      {CATEGORY_LABELS[n.category]}
                    </span>
                    {n.unread && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white",
                          n.type === "warning" && "bg-warning text-warning-foreground",
                          n.type === "positive" && "bg-success",
                        )}
                        style={
                          n.type === "info"
                            ? { backgroundColor: NOTIFICATION_ACCENT.primary }
                            : undefined
                        }
                      >
                        Unread
                      </span>
                    )}
                    {n.priority === "high" && (
                      <Badge
                        variant="outline"
                        className="h-5 gap-1 border-destructive/40 px-1.5 text-xs text-destructive"
                      >
                        <Flame className="size-3" /> High
                      </Badge>
                    )}
                  </div>
                  <div
                    className={cn(
                      "mt-0.5 leading-snug text-foreground",
                      n.unread ? "font-semibold" : "font-normal",
                    )}
                  >
                    {n.title}
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{n.desc}</div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-70">
                    Tap for details <ChevronRight className="size-3" />
                  </div>
                </div>
                <div className="shrink-0 self-start text-right">
                  {n.unread && (
                    <span
                      className={cn(
                        "mb-1 ml-auto block size-2 rounded-full",
                        n.type === "warning" && "bg-warning",
                        n.type === "positive" && "bg-success",
                      )}
                      style={
                        n.type === "info" ? { backgroundColor: NOTIFICATION_ACCENT.primary } : undefined
                      }
                      aria-label="Unread"
                    />
                  )}
                  <div
                    className={cn(
                      "text-xs font-bold",
                      n.unread ? meta.labelClass || "text-foreground" : "text-foreground",
                    )}
                    style={
                      n.unread && n.type === "info"
                        ? { color: NOTIFICATION_ACCENT.primary }
                        : undefined
                    }
                  >
                    {meta.label}
                  </div>
                  <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">{n.time}</div>
                </div>
              </div>
            </button>
          );
        })}
        {list.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center sm:py-12">
            <Bell className="mx-auto mb-3 size-8 opacity-40" aria-hidden />
            <div className="font-medium">No notifications here</div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              You&apos;re all caught up in this category.
            </p>
          </div>
        )}
      </div>

      <NotificationDetailDialog
        notification={selected}
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  );
}

function NotificationDetailDialog({
  notification,
  open,
  onOpenChange,
}: {
  notification: AppNotification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!notification) return null;
  const meta = notificationMeta(notification);
  const Icon = meta.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={cn("text-sm font-bold", meta.labelClass || "text-foreground")}
              style={
                notification.type === "info"
                  ? { color: NOTIFICATION_ACCENT.primary }
                  : undefined
              }
            >
              {CATEGORY_LABELS[notification.category]}
            </span>
            <span
              className={cn("text-sm font-bold", meta.labelClass || "text-foreground")}
              style={
                notification.type === "info"
                  ? { color: NOTIFICATION_ACCENT.primary }
                  : undefined
              }
            >
              {meta.label}
            </span>
            {notification.priority === "high" && (
              <Badge className="border-0 bg-destructive/15 text-destructive">High priority</Badge>
            )}
          </div>
          <DialogTitle className="flex items-start gap-3 text-left">
            <div
              className={cn("grid size-10 shrink-0 place-items-center rounded-xl", notification.type !== "info" && meta.tone)}
              style={notification.type === "info" ? NOTIFICATION_ICON_STYLE : undefined}
            >
              <Icon className="size-5" />
            </div>
            <span className="leading-snug">{notification.title}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="font-medium text-foreground">{notification.desc}</p>
          {notification.detail ? (
            <div className="rounded-xl border bg-muted/30 p-3 leading-relaxed text-muted-foreground">
              {notification.detail}
            </div>
          ) : (
            <p className="text-muted-foreground">
              No additional details were attached to this alert. Check the related section in the
              app for the latest status.
            </p>
          )}
          <div className="text-xs text-muted-foreground">Received {notification.time}</div>
          {notification.href ? (
            <a
              href={notification.href}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              onClick={() => onOpenChange(false)}
            >
              Open related page <ChevronRight className="size-3.5" />
            </a>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
