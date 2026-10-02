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
  if (items.length === 0) return null;

  return (
    <section
      className="lx-home-section lx-home-panel lx-home-activity lx-home-activity--inbox"
      style={{ "--lx-home-i": 6 } as CSSProperties}
    >
      <div className="lx-home-panel__head">
        <h2 className="lx-home-panel__title">Notifications</h2>
        <div className="flex items-center gap-2">
          {items.some((n) => n.unread) ? (
            <Pill tone="info">{items.filter((n) => n.unread).length} unread</Pill>
          ) : null}
          <Link to="/notifications" search={{ tab: "inbox" }} className="lx-home-panel__link">
            View all →
          </Link>
        </div>
      </div>
      <ul className="lx-home-activity__list">
        {items.slice(0, 5).map((row) => {
          const busy = markingReadId === row.id;
          const isAlert = isNotificationAlertRow(row);
          const Icon = notificationTypeIcon(row.type);
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
                <span className="min-w-0 flex-1 text-left">
                  <span className="flex flex-wrap items-center gap-1.5">
                    {row.unread ? (
                      <span
                        className={`size-1.5 rounded-full shrink-0 ${
                          isAlert ? "bg-destructive" : "bg-primary"
                        }`}
                        aria-label="Unread"
                      />
                    ) : null}
                    <span
                      className={`block text-sm truncate ${
                        row.unread ? "font-semibold" : "font-medium"
                      } ${isAlert ? "text-destructive" : "text-foreground"}`}
                    >
                      {row.title}
                    </span>
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <Pill tone={notificationPillTone(row)}>
                      {isAlert ? "Alert" : notificationCategoryLabel(row.category)}
                    </Pill>
                    {row.priority === "high" && !isAlert ? (
                      <Pill tone="warning">High</Pill>
                    ) : null}
                    <span className="text-[11px] text-muted-foreground truncate">
                      {row.desc}
                    </span>
                  </span>
                </span>
                <span className="lx-home-activity__time">{row.time}</span>
                {row.unread ? (
                  <Pill tone={isAlert ? "danger" : "info"}>New</Pill>
                ) : null}
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
