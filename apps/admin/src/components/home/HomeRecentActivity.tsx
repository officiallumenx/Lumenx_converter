import type { CSSProperties } from "react";
import { Pill } from "@lumenx/ui-admin";
import { Link } from "@tanstack/react-router";
import type { NotificationInboxListItem } from "@/lib/notification-inbox/types";
import {
  isNotificationAlertRow,
  notificationCategoryLabel,
  notificationIconChipClass,
  notificationPillTone,
  notificationRowSurfaceClass,
  notificationTypeIcon,
} from "@/lib/notification-presentation";

/**
 * Recent inbox activity on Home — colors/categories match Notification Center.
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
  const unreadCount = items.filter((n) => n.unread).length;

  return (
    <section
      className="lx-home-section lx-home-panel lx-home-activity lx-home-activity--inbox"
      style={{ "--lx-home-i": 6 } as CSSProperties}
    >
      <div className="lx-home-panel__head">
        <h2 className="lx-home-panel__title">Notifications</h2>
        <div className="flex items-center gap-2">
          {unreadCount > 0 ? <Pill tone="info">{unreadCount} unread</Pill> : null}
          <Link to="/notifications" search={{ tab: "inbox" }} className="lx-home-panel__link">
            View all →
          </Link>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="lx-home-activity__empty" role="status">
          No notifications yet. Inbox updates appear here.
        </p>
      ) : null}
      <ul className="lx-home-activity__list">
        {items.slice(0, 8).map((row) => {
          const busy = markingReadId === row.id;
          const isAlert = isNotificationAlertRow(row);
          const Icon = notificationTypeIcon(row.type, row.category);
          return (
            <li key={row.id}>
              <button
                type="button"
                className={`lx-home-activity__row ${notificationRowSurfaceClass(row)}`.trim()}
                disabled={busy}
                onClick={() => onOpen(row.id)}
              >
                <span
                  className={`lx-home-activity__chip border ${notificationIconChipClass(row)}`}
                  aria-hidden
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="lx-home-activity__body">
                  <span className="lx-home-activity__title-line">
                    {row.unread ? (
                      <span
                        className={`lx-home-activity__unread ${
                          isAlert ? "bg-destructive" : "bg-primary"
                        }`}
                        aria-label="Unread"
                      />
                    ) : null}
                    <span
                      className={`lx-home-activity__title ${
                        row.unread ? "font-semibold" : "font-medium"
                      } ${isAlert ? "text-destructive" : "text-foreground"}`}
                    >
                      {row.title}
                    </span>
                  </span>
                  {row.desc ? (
                    <span className="lx-home-activity__desc">{row.desc}</span>
                  ) : null}
                  <span className="lx-home-activity__tags">
                    <Pill tone={notificationPillTone(row)}>
                      {isAlert ? "Alert" : notificationCategoryLabel(row.category)}
                    </Pill>
                    {row.priority === "high" && !isAlert ? (
                      <Pill tone="warning">High</Pill>
                    ) : null}
                  </span>
                </span>
                <span className="lx-home-activity__aside">
                  <span className="lx-home-activity__time">{row.time}</span>
                  {row.unread ? (
                    <Pill tone={isAlert ? "danger" : "info"}>New</Pill>
                  ) : null}
                </span>
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
