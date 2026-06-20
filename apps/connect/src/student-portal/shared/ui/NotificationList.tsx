import { useState } from "react";
import type { AppNotification, NotificationCategory } from "@lumenx/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Badge,
  cn,
} from "@lumenx/ui";
import {
  Bell,
  Sparkles,
  AlertTriangle,
  Info,
  Flame,
  ChevronRight,
} from "lucide-react";

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
  },
  positive: {
    icon: Sparkles,
    tone: "bg-success/15 text-success border-success/30",
    label: "Good news",
  },
  info: {
    icon: Info,
    tone: "bg-primary/10 text-primary border-primary/20",
    label: "Update",
  },
} as const;

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
    setSelected(n);
  };

  return (
    <>
      <div className="min-w-0 space-y-2">
        {list.map((n) => {
          const meta = TYPE_STYLES[n.type];
          const Icon = meta.icon;
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => openDetail(n)}
              className={cn(
                "group flex min-w-0 w-full items-stretch gap-0 overflow-hidden rounded-2xl border bg-card text-left shadow-soft transition-colors",
                n.unread ? "border-primary/35" : "border-border",
                "hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              )}
            >
              <div
                className={cn(
                  "w-1 shrink-0",
                  n.type === "warning" && "bg-warning",
                  n.type === "positive" && "bg-success",
                  n.type === "info" && "bg-primary",
                )}
                aria-hidden
              />
              <div className="flex min-w-0 flex-1 items-start gap-3 p-4">
                <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl", meta.tone)}>
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {CATEGORY_LABELS[n.category]}
                    </span>
                    {n.unread && (
                      <span className="rounded-full bg-primary px-1.5 py-px text-[9px] font-medium text-primary-foreground">
                        New
                      </span>
                    )}
                    {n.priority === "high" && (
                      <Badge variant="outline" className="h-5 gap-1 border-destructive/40 px-1.5 text-[10px] text-destructive">
                        <Flame className="size-3" /> High
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 font-medium leading-snug">{n.title}</div>
                  <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{n.desc}</div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Tap for details <ChevronRight className="size-3" />
                  </div>
                </div>
                <div className="shrink-0 self-start text-right">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {meta.label}
                  </div>
                  <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">{n.time}</div>
                </div>
              </div>
            </button>
          );
        })}
        {list.length === 0 && (
          <div className="rounded-2xl border border-dashed py-12 text-center">
            <Bell className="mx-auto mb-2 size-8 opacity-40" />
            <div className="font-medium">No notifications here</div>
            <p className="mt-1 text-sm text-muted-foreground">You&apos;re all caught up in this category.</p>
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
  const meta = TYPE_STYLES[notification.type];
  const Icon = meta.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {CATEGORY_LABELS[notification.category]}
            </Badge>
            <Badge variant="outline" className={cn("border-0", meta.tone)}>
              {meta.label}
            </Badge>
            {notification.priority === "high" && (
              <Badge className="border-0 bg-destructive/15 text-destructive">High priority</Badge>
            )}
          </div>
          <DialogTitle className="flex items-start gap-3 text-left">
            <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl", meta.tone)}>
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
              No additional details were attached to this alert. Check the related section in the app
              for the latest status.
            </p>
          )}
          <div className="text-xs text-muted-foreground">Received {notification.time}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
