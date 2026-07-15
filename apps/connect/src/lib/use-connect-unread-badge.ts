import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { Role } from "@lumenx/types";
import { parentNotificationStore } from "@/lib/parent/notification-store";
import { studentNotificationStore } from "@/lib/student/notification-store";
import { teacherRepository } from "@/lib/teacher/repositories";
import { useWorkspaceCommunicationUnread } from "@/lib/activity/workspace-communication";
import { useTeacherPortalAccess } from "@/lib/teacher-session";
import type { ParentPortalState } from "@/context/ParentPortalContext";

/** Unread notification count for the header bell badge (alerts use the Alerts nav item). */
export function useConnectUnreadBadge(role: Role | null, portal: ParentPortalState): number {
  useEffect(() => {
    if (role !== "parent" || !portal.isParent) return;
    // Only sync once the loaded snapshot matches the active child. Syncing the generic
    // fallback during a child switch would attach read state to the wrong child bucket.
    if (!portal.snapshot || portal.snapshot.child.id !== portal.activeChildId) return;
    parentNotificationStore.syncForChild(portal.activeChildId, portal.snapshot.notifications);
  }, [role, portal.isParent, portal.isParent ? portal.activeChildId : null, portal.isParent ? portal.snapshot : null]);

  const studentNotifUnread = useSyncExternalStore(
    studentNotificationStore.subscribe,
    studentNotificationStore.getUnreadCount,
    () => 0,
  );

  const parentNotifUnread = useSyncExternalStore(
    parentNotificationStore.subscribe,
    parentNotificationStore.getUnreadCount,
    () => 0,
  );

  const teacherAccess = useTeacherPortalAccess();
  const activityNotifUnread = useWorkspaceCommunicationUnread("notification");

  const teacherNotifUnread = useSyncExternalStore(
    teacherRepository.subscribeNotifications,
    teacherRepository.getSubjectNotificationUnreadCount,
    () => 0,
  );

  return useMemo(() => {
    if (!role) return 0;
    if (role === "student") return studentNotifUnread;
    if (role === "parent") return parentNotifUnread;
    if (role === "teacher") {
      if (teacherAccess.isReady && teacherAccess.isActivityWorkspaceActive) {
        return activityNotifUnread;
      }
      return teacherNotifUnread;
    }
    return 0;
  }, [
    role,
    studentNotifUnread,
    parentNotifUnread,
    teacherNotifUnread,
    activityNotifUnread,
    teacherAccess.isReady,
    teacherAccess.isActivityWorkspaceActive,
  ]);
}

export function formatUnreadBadgeCount(count: number): string {
  if (count > 99) return "99+";
  if (count > 9) return "9+";
  return String(count);
}
