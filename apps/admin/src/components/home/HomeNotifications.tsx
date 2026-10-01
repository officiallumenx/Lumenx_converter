import type { CSSProperties } from "react";
import { Bell } from "lucide-react";
import { Button, Pill } from "@lumenx/ui-admin";
import { Link } from "@tanstack/react-router";
import type { NotificationInboxListItem } from "@/lib/notification-inbox/types";

function priorityTone(
  priority: NotificationInboxListItem["priority"],
): "info" | "warning" | "danger" {
  if (priority === "high") return "danger";
  if (priority === "low") return "info";
  return "info";
}

function priorityDot(priority: NotificationInboxListItem["priority"]): string {
  if (priority === "high") return "lx-home-dot lx-home-dot--urgent";
  return "lx-home-dot lx-home-dot--info";
}

/** Compact unread strip — hidden when there are no unread items. */
export function HomeNotifications({
  unread,
  markingReadId,
  onOpen,
}: {
  unread: NotificationInboxListItem[];
  markingReadId: string | null;
  onOpen: (id: string) => void;
}) {
  if (unread.length === 0) return null;

  return (
    <section className="lx-home-section lx-home-panel" style={{ "--lx-home-i": 6 } as CSSProperties}>
      <div className="lx-home-panel__head">
        <h2 className="lx-home-panel__title flex items-center gap-2">
          <Bell className="size-4 text-primary" aria-hidden />
          Unread notifications
        </h2>
        <div className="flex items-center gap-2">
          <Pill tone="info">{unread.length}</Pill>
          <Link to="/notifications" search={{ tab: "inbox" }} className="lx-home-panel__link">
            Inbox →
          </Link>
        </div>
      </div>
      <ul className="lx-home-notif-list">
        {unread.slice(0, 5).map((row) => {
          const busy = markingReadId === row.id;
          return (
            <li key={row.id} className="lx-home-notif-row">
              <span className={priorityDot(row.priority)} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium truncate">{row.title}</span>
                <span className="block text-[11px] text-muted-foreground truncate">
                  {row.desc} · {row.time}
                </span>
              </span>
              <Pill tone={priorityTone(row.priority)}>
                {row.priority === "high" ? "High" : row.priority === "low" ? "Low" : "Normal"}
              </Pill>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => onOpen(row.id)}
              >
                Open
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
