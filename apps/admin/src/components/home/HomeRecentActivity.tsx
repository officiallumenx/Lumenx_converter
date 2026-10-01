import type { CSSProperties } from "react";
import { Clock } from "lucide-react";
import { Pill } from "@lumenx/ui-admin";
import { Link } from "@tanstack/react-router";
import type { NotificationInboxListItem } from "@/lib/notification-inbox/types";

function priorityTone(
  priority: NotificationInboxListItem["priority"],
): "info" | "warning" | "danger" {
  if (priority === "high") return "danger";
  return "info";
}

function iconClass(priority: NotificationInboxListItem["priority"]): string {
  if (priority === "high") return "lx-home-activity__icon lx-home-activity__icon--urgent";
  return "lx-home-activity__icon lx-home-activity__icon--info";
}

/**
 * Recent Activity — real inbox items only.
 * Hidden when there is nothing to show (no demo/fake feed).
 */
export function HomeRecentActivity({
  items,
  markingReadId,
  onOpen,
}: {
  items: NotificationInboxListItem[];
  markingReadId: string | null;
  onOpen: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="lx-home-section lx-home-panel lx-home-activity" style={{ "--lx-home-i": 6 } as CSSProperties}>
      <div className="lx-home-panel__head">
        <h2 className="lx-home-panel__title flex items-center gap-2">
          <Clock className="size-4 text-primary" aria-hidden />
          Recent Activity
        </h2>
        <Link to="/notifications" search={{ tab: "inbox" }} className="lx-home-panel__link">
          View all →
        </Link>
      </div>
      <ul className="lx-home-activity__list">
        {items.slice(0, 5).map((row) => {
          const busy = markingReadId === row.id;
          return (
            <li key={row.id}>
              <button
                type="button"
                className="lx-home-activity__row"
                disabled={busy}
                onClick={() => onOpen(row.id)}
              >
                <span className={iconClass(row.priority)} aria-hidden>
                  <Clock className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-sm font-medium text-foreground truncate">
                    {row.title}
                  </span>
                  <span className="block text-[11px] text-muted-foreground truncate">
                    {row.desc}
                  </span>
                </span>
                <span className="lx-home-activity__time">{row.time}</span>
                {row.unread ? <Pill tone={priorityTone(row.priority)}>New</Pill> : null}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="lx-home-activity__footer">
        <Link to="/notifications" search={{ tab: "inbox" }} className="lx-home-panel__link">
          Open inbox →
        </Link>
      </div>
    </section>
  );
}
