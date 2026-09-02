import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useApp } from "@/lib/app-state";
import { useConnectApiInbox } from "@/hooks/use-connect-api-inbox";
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
import {
  announcementInboxEpoch,
  subscribeAnnouncementInboxSync,
} from "@/lib/announcements/inbox-sync";

function combinedInboxSubscribe(onStoreChange: () => void) {
  const unsubAttendance = subscribeAttendanceInbox(onStoreChange);
  const unsubAnnouncements = subscribeAnnouncementInboxSync(onStoreChange);
  return () => {
    unsubAttendance();
    unsubAnnouncements();
  };
}

function studentInboxEpoch(): string {
  const items = listAttendanceNotificationInbox("student");
  const p7 = listPhase7Inbox("student");
  const p8 = listPhase8Inbox("student");
  return `${items.length}:${items[0]?.id ?? ""}:${p7.length}:${p7[0]?.id ?? ""}:${p8.length}:${p8[0]?.id ?? ""}:${announcementInboxEpoch()}`;
}

export function StudentNotificationsPage() {
  const portal = useStudentPortal();
  const { activeInstituteId } = useApp();
  const apiMode = isApiAuthMode();
  const apiInbox = useConnectApiInbox(apiMode ? activeInstituteId : null);

  const inboxEpoch = useSyncExternalStore(
    combinedInboxSubscribe,
    studentInboxEpoch,
    () => "0",
  );

  useEffect(() => {
    if (apiMode || !portal.isStudent || !portal.snapshot) return;
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
  }, [apiMode, portal.isStudent, portal.snapshot, inboxEpoch]);

  const demoAll = useSyncExternalStore(
    studentNotificationStore.subscribe,
    studentNotificationStore.getItems,
    studentNotificationStore.getItems,
  );
  const all = apiMode ? apiInbox.items : demoAll;
  const [filter, setFilter] = useState<StudentNotificationFilterId>("all");

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: all.length };
    for (const f of STUDENT_NOTIFICATION_FILTERS) {
      if (f.id === "all") continue;
      map[f.id] = filterStudentNotifications(all, f.id).length;
    }
    return map;
  }, [all]);

  if (!portal.isStudent && !apiMode) return null;
  if (!apiMode && portal.isLoading) return <PageSkeleton rows={6} />;
  if (apiMode && apiInbox.loading) return <PageSkeleton rows={6} />;

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
              onClick={() => (apiMode ? void apiInbox.markAllRead() : studentNotificationStore.markAllRead())}
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

      <NotificationList
        list={list}
        onSelect={(id) => (apiMode ? void apiInbox.markRead(id) : studentNotificationStore.markRead(id))}
      />
      {apiMode && apiInbox.error ? (
        <p className="mt-3 text-sm text-destructive">{apiInbox.error}</p>
      ) : null}
    </div>
  );
}
