import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Bus, CalendarClock, CircleAlert, School } from "lucide-react";
import { cn } from "@lumenx/ui";

import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import type { TransportNotification, TransportNotificationKind } from "@/lib/transport";
import { MODULE_COLORS, type ModuleColor } from "@/theme/colors";

const kindMeta: Record<
  TransportNotificationKind,
  { label: string; icon: LucideIcon; color: ModuleColor }
> = {
  route: { label: "Route", icon: Bus, color: MODULE_COLORS.primary },
  school: { label: "School", icon: School, color: MODULE_COLORS.success },
  reminder: { label: "Reminder", icon: CalendarClock, color: MODULE_COLORS.transport },
  urgent: { label: "Urgent", icon: CircleAlert, color: MODULE_COLORS.warning },
};

export function TransportNotificationCard({
  notification,
  onMarkRead,
}: {
  notification: TransportNotification;
  onMarkRead?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const meta = kindMeta[notification.kind];
  const Icon = meta.icon;
  const isUrgent = notification.kind === "urgent";

  const openDetail = () => {
    setOpen(true);
    if (notification.unread) onMarkRead?.(notification.id);
  };

  const openHref = () => {
    if (!notification.href) return;
    setOpen(false);
    const raw = notification.href.trim();
    try {
      if (raw.startsWith("http://") || raw.startsWith("https://")) {
        window.location.assign(raw);
        return;
      }
      const qIndex = raw.indexOf("?");
      const pathname = (qIndex >= 0 ? raw.slice(0, qIndex) : raw) || "/";
      void navigate({ to: pathname as "/" });
    } catch {
      void navigate({ to: "/" });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openDetail}
        className={cn(
          "transport-pressable flex min-w-0 w-full items-start gap-3 rounded-2xl border bg-card p-4 text-left shadow-soft sm:p-5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          notification.unread && "border-primary/25 bg-primary/[0.04]",
          isUrgent && notification.unread && "border-destructive/35 bg-destructive/5",
        )}
      >
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl"
          style={{
            color: meta.color.primary,
            backgroundColor: meta.color.iconBackground,
          }}
          aria-hidden
        >
          <Icon className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {meta.label}
            </span>
            {notification.unread ? (
              <Badge variant="default" className="h-5 border-0 px-1.5 text-[10px]">
                New
              </Badge>
            ) : null}
          </div>

          <p
            className={cn(
              "mt-1 font-display text-sm leading-snug text-foreground sm:text-base",
              notification.unread ? "font-bold" : "font-medium",
            )}
          >
            {notification.title}
          </p>

          <p
            className={cn(
              "mt-1.5 line-clamp-2 text-sm leading-relaxed",
              notification.unread ? "font-medium text-foreground/80" : "text-muted-foreground",
            )}
          >
            {notification.message}
          </p>

          <p className="mt-2 text-xs font-medium text-muted-foreground">{notification.time}</p>
        </div>

        {notification.unread ? (
          <span
            className="mt-1 size-2.5 shrink-0 rounded-full bg-primary"
            aria-label="Unread"
          />
        ) : null}
      </button>

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={notification.title}
        description={meta.label}
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            {notification.href ? (
              <Button type="button" variant="default" expanded onClick={openHref}>
                Open related screen
              </Button>
            ) : null}
            <Button type="button" variant="outline" expanded onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{meta.label}</Badge>
            {notification.unread ? (
              <Badge variant="default" className="border-0">
                New
              </Badge>
            ) : (
              <Badge variant="secondary" className="border-0">
                Read
              </Badge>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm leading-relaxed text-foreground">
            {notification.message}
          </div>

          <p className="text-xs font-medium text-muted-foreground">Received {notification.time}</p>
        </div>
      </BottomSheet>
    </>
  );
}
