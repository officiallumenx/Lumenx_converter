import { alertStore } from "@/lib/alert-store";
import { leaveStore } from "@/lib/leave-store";
import { teacherLeaveStore } from "@/lib/teacher-leave-store";
import { transportStore } from "@/lib/transport-store";
import { studentNotificationStore } from "@/lib/student/notification-store";
import { parentNotificationStore } from "@/lib/parent/notification-store";
import { sentMessagesStore } from "@/lib/messages-store";
import { teacherSessionStore } from "@/lib/teacher-session/teacher-session-store";
import { activityRepository } from "@/lib/activity/repositories";
import { sportsRepository } from "@/lib/activity/sports/repositories";
import { workspaceCommunicationRepository } from "@/lib/activity/workspace-communication";

/**
 * Tear down all module-singleton stores so a new sign-in (possibly as a different role)
 * never inherits the previous session's in-memory state. Called from AppProvider.signOut().
 */
export function resetAllConnectStores() {
  alertStore.reset();
  leaveStore.reset();
  teacherLeaveStore.reset();
  transportStore.reset();
  studentNotificationStore.reset();
  parentNotificationStore.reset();
  sentMessagesStore.reset();
  teacherSessionStore.reset();
  activityRepository.reset();
  sportsRepository.reset();
  workspaceCommunicationRepository.reset();
}
