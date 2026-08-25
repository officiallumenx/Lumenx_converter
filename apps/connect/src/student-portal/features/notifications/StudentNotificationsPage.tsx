import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { Button, cn } from "@lumenx/ui";
import { CheckCheck } from "lucide-react";
import {
  studentNotificationStore,
  STUDENT_NOTIFICATION_FILTERS,
  filterStudentNotifications,
  type StudentNotificationFilterId,
} from "@/lib/student/notification-store";
import { NotificationList, PageSkeleton } from "@/student-portal/shared/ui";
import { listAttendanceNotificationInbox } from "@lumenx/module-attendance";
import {
  mergePortalNotificationsWithAttendanceInbox,
  resolveStudentProfileAttendanceStudentId,
  subscribeAttendanceInbox,
} from "@/lib/attendance/notification-bridge";
import { listPhase7Inbox, listPhase8Inbox, dedupeNotificationsById } from "@lumenx/module-notifications";

function studentInboxEpoch(): string {
  const items = listAttendanceNotificationInbox("student");
  const p7 = listPhase7Inbox("student");
  const p8 = listPhase8Inbox("student");
  return `${items.length}:${items[0]?.id ?? ""}:${p7.length}:${p7[0]?.id ?? ""}:${p8.length}:${p8[0]?.id ?? ""}`;
}

export function StudentNotificationsPage() {
  const portal = useStudentPortal();

  const inboxEpoch = useSyncExternalStore(
    subscribeAttendanceInbox,
    studentInboxEpoch,
    () => "0",
  );

  useEffect(() => {
    if (!portal.isStudent || !portal.snapshot) return;
    const attendanceStudentId = resolveStudentProfileAttendanceStudentId(
      portal.snapshot.profile,
    );
    const merged = mergePortalNotificationsWithAttendanceInbox({
      recipient: "student",
      portalNotifications: portal.snapshot.notifications,
      attendanceStudentId,
    });
    studentNotificationStore.syncFromSource(
      dedupeNotificationsById([
        ...listPhase7Inbox("student"),
        ...listPhase8Inbox("student"),
        ...merged,
      ]),
    );
  }, [portal.isStudent, portal.snapshot, inboxEpoch]);

  const all = useSyncExternalStore(
    studentNotificationStore.subscribe,
    studentNotificationStore.getItems,
    studentNotificationStore.getItems,
  );
  const [filter, setFilter] = useState<StudentNotificationFilterId>("all");

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: all.length };
    for (const f of STUDENT_NOTIFICATION_FILTERS) {
      if (f.id === "all") continue;
      map[f.id] = filterStudentNotifications(all, f.id).length;
    }
    return map;
  }, [all]);

  if (!portal.isStudent) return null;
  if (portal.isLoading) return <PageSkeleton rows={6} />;

  const unread = all.filter((n) => n.unread).length;
  const list = filterStudentNotifications(all, filter);

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Notifications"
        subtitle={`${unread} unread`}
        action={
          unread > 0 ? (
            <Button
              variant="outline"
              className="student-primary-action rounded-xl gap-2"
              onClick={() => studentNotificationStore.markAllRead()}
            >
              <CheckCheck className="size-4" /> Mark all read
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex min-w-0 flex-wrap gap-2">
        {STUDENT_NOTIFICATION_FILTERS.map((c) => {
          const n = counts[c.id] ?? 0;
          const active = filter === c.id;
          if (n === 0 && c.id !== "all") return null;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              className={cn("student-filter-chip", active && "is-active")}
            >
              {c.label}
              <span
                className={cn(
                  "tabular-nums rounded-full px-1.5 py-0.5 text-xs",
                  active ? "bg-white/25 text-primary-foreground" : "bg-muted text-foreground/70",
                )}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      <NotificationList list={list} onSelect={(id) => studentNotificationStore.markRead(id)} />
    </div>
  );
}
