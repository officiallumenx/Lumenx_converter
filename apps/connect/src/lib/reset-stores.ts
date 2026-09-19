import { alertStore } from "@/lib/alert-store";
import { leaveStore } from "@/lib/leave-store";
import { teacherLeaveStore } from "@/lib/teacher-leave-store";
import { transportStore } from "@/lib/transport-store";
import { studentNotificationStore } from "@/lib/student/notification-store";
import { parentNotificationStore } from "@/lib/parent/notification-store";
import { sentMessagesStore } from "@/lib/messages-store";
import { teacherSessionStore } from "@/lib/teacher-session/teacher-session-store";
import { activityRepository } from "@/lib/activity/repositories";
import { activityHierarchyRepository } from "@/lib/activity/hierarchy";
import { sportsRepository } from "@/lib/activity/sports/repositories";
import { workspaceCommunicationRepository } from "@/lib/activity/workspace-communication";
import { workspaceCalendarRepository } from "@/lib/activity/workspace-calendar";
import { workspaceAchievementsRepository } from "@/lib/activity/workspace-achievements";
import { diaryRepository } from "@/lib/teacher/diary";
import { teacherRepository } from "@/lib/teacher/repositories";
import { clearMainScrollMemory } from "@/lib/main-scroll-memory";
import { clearTeacherPortalApiCache } from "@/lib/teacher-classes/load";

let inFlightReset: Promise<void> | null = null;

async function runReset() {
  alertStore.reset();
  leaveStore.reset();
  teacherLeaveStore.reset();
  transportStore.reset();
  studentNotificationStore.reset();
  parentNotificationStore.reset();
  sentMessagesStore.reset();
  teacherSessionStore.reset();
  teacherRepository.reset();
  clearTeacherPortalApiCache();
  await activityRepository.reset();
  activityHierarchyRepository.reset();
  sportsRepository.reset();
  workspaceCommunicationRepository.reset();
  workspaceCalendarRepository.reset();
  workspaceAchievementsRepository.reset();
  diaryRepository.reset();
  clearMainScrollMemory();
}

/**
 * Tear down all module-singleton stores so a new sign-in (possibly as a different role)
 * never inherits the previous session's in-memory state. Called from AppProvider.signOut().
 *
 * TanStack Query portal caches are cleared by portal registries via
 * removeConnectPortalQueries / removeQueries — QueryClient is not available here.
 */
export function resetAllConnectStores(): Promise<void> {
  if (!inFlightReset) {
    inFlightReset = runReset().finally(() => {
      inFlightReset = null;
    });
  }
  return inFlightReset;
}

/** Resolves when any in-flight sign-out teardown finishes (or immediately if idle). */
export function awaitConnectStoreReset(): Promise<void> {
  return inFlightReset ?? Promise.resolve();
}
