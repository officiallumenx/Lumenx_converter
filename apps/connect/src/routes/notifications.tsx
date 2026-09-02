import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { cn } from "@lumenx/ui";
import { useMemo, useState, useEffect, useSyncExternalStore } from "react";
import { Button } from "@lumenx/ui";
import { CheckCheck } from "lucide-react";
import { parentNotificationStore } from "@/lib/parent/notification-store";
import { TeacherNotificationsPage } from "@/teacher-portal";
import { StudentNotificationsPage, NotificationList } from "@/student-portal";
import { useTeacherPortalAccess } from "@/lib/teacher-session";
import { ACTIVITY_WORKSPACE_BASE } from "@/activity-workspace/core/routes";
import type { NotificationCategory } from "@lumenx/types";
import { listAttendanceNotificationInbox } from "@lumenx/module-attendance";
import {
  mergePortalNotificationsWithAttendanceInbox,
  resolveParentChildAttendanceStudentId,
  subscribeAttendanceInbox,
} from "@/lib/attendance/notification-bridge";
import { listFeesParentInbox, listPhase7Inbox, listPhase8Inbox, dedupeNotificationsById, isImportantNotification } from "@lumenx/module-notifications";
import {
  announcementInboxEpoch,
  subscribeAnnouncementInboxSync,
} from "@/lib/announcements/inbox-sync";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useConnectApiInbox } from "@/hooks/use-connect-api-inbox";

function combinedInboxSubscribe(onStoreChange: () => void) {
  const unsubAttendance = subscribeAttendanceInbox(onStoreChange);
  const unsubAnnouncements = subscribeAnnouncementInboxSync(onStoreChange);
  return () => {
    unsubAttendance();
    unsubAnnouncements();
  };
}

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <NotificationsPage />
    </AppShell>
  ),
});

const PARENT_CATEGORIES: { id: "all" | "important" | NotificationCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "important", label: "Important" },
  { id: "academic", label: "Academic" },
  { id: "attendance", label: "Attendance" },
  { id: "assignments", label: "Assignments" },
  { id: "exams", label: "Exams" },
  { id: "fees", label: "Fees" },
  { id: "sports", label: "Sports" },
  { id: "events", label: "Events" },
  { id: "holidays", label: "Holidays" },
  { id: "circulars", label: "Circulars" },
  { id: "emergency", label: "Emergency" },
];

function parentInboxEpoch(): string {
  const items = listAttendanceNotificationInbox("parent");
  const p7 = listPhase7Inbox("parent");
  const p8 = listPhase8Inbox("parent");
  return `${items.length}:${items[0]?.id ?? ""}:${p7.length}:${p7[0]?.id ?? ""}:${p8.length}:${p8[0]?.id ?? ""}:${announcementInboxEpoch()}`;
}

function NotificationsPage() {
  const { role } = useApp();
  const teacherAccess = useTeacherPortalAccess();

  // Activity Coordinator uses a separate inbox — never the Subject Teacher module.
  if (
    role === "teacher" &&
    teacherAccess.isReady &&
    teacherAccess.isActivityWorkspaceActive
  ) {
    return <Navigate to={`${ACTIVITY_WORKSPACE_BASE}/notifications`} replace />;
  }

  if (role === "teacher") return <TeacherNotificationsPage />;
  if (role === "student") return <StudentNotificationsPage />;
  return <ParentNotifications />;
}

function ParentNotifications() {
  const portal = useParentPortal();
  const { activeChildId, activeInstituteId } = useApp();
  const apiMode = isApiAuthMode();
  const apiInbox = useConnectApiInbox(apiMode ? activeInstituteId : null);

  const snapshot = portal.isParent ? portal.snapshot : null;
  const syncChildId =
    snapshot && snapshot.child.id === activeChildId ? snapshot.child.id : null;

  const inboxEpoch = useSyncExternalStore(
    combinedInboxSubscribe,
    parentInboxEpoch,
    () => "0",
  );

  useEffect(() => {
    if (apiMode || !syncChildId || !snapshot) return;
    const attendanceStudentId = resolveParentChildAttendanceStudentId(snapshot.child);
    const merged = mergePortalNotificationsWithAttendanceInbox({
      recipient: "parent",
      portalNotifications: snapshot.notifications,
      attendanceStudentId,
    });
    parentNotificationStore.syncForChild(
      syncChildId,
      dedupeNotificationsById([
        ...listFeesParentInbox(),
        ...listPhase7Inbox("parent"),
        ...listPhase8Inbox("parent"),
        ...merged,
      ]),
    );
  }, [apiMode, syncChildId, snapshot, inboxEpoch]);

  const demoAll = useSyncExternalStore(
    parentNotificationStore.subscribe,
    parentNotificationStore.getItems,
    parentNotificationStore.getItems,
  );
  const all = apiMode ? apiInbox.items : demoAll;

  const [filter, setFilter] = useState<(typeof PARENT_CATEGORIES)[number]["id"]>("all");

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: all.length };
    map.important = all.filter(isImportantNotification).length;
    for (const n of all) map[n.category] = (map[n.category] ?? 0) + 1;
    return map;
  }, [all]);

  const unread = all.filter((n) => n.unread).length;
  const list =
    filter === "all"
      ? all
      : filter === "important"
        ? all.filter(isImportantNotification)
        : all.filter((n) => n.category === filter);

  if (apiMode && apiInbox.loading) {
    return (
      <div className="min-w-0 max-w-full px-1 py-8 text-sm text-muted-foreground">
        Loading notifications…
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Notifications"
        subtitle={
          portal.isParent && portal.snapshot
            ? `For ${portal.snapshot.child.name} · ${unread} unread`
            : `${unread} unread`
        }
        action={
          unread > 0 ? (
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() =>
                apiMode ? void apiInbox.markAllRead() : parentNotificationStore.markAllRead()
              }
            >
              <CheckCheck className="size-4" /> Mark all read
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex min-w-0 flex-wrap gap-2">
        {PARENT_CATEGORIES.map((c) => {
          const n = counts[c.id] ?? 0;
          const active = filter === c.id;
          if (n === 0 && c.id !== "all") return null;
          return (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={cn(
                "h-8 inline-flex items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-muted/40",
              )}
            >
              {c.label}
              <span
                className={cn(
                  "tabular-nums rounded-full px-1.5 py-px text-[10px]",
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
        onSelect={(id) => (apiMode ? void apiInbox.markRead(id) : parentNotificationStore.markRead(id))}
      />
      {apiMode && apiInbox.error ? (
        <p className="mt-3 text-sm text-destructive">{apiInbox.error}</p>
      ) : null}
    </div>
  );
}
