/**

 * Activity Workspace — feature module entry point inside the single Teacher Portal.

 * Independent from the Subject Teacher modules (@/teacher-portal).

 *

 * Structure:

 * - workspace/  — module registry (Dashboard = landing page)

 * - hub/        — internal shared types & utilities (no UI, no routes)

 * - features/   — workspace modules

 * - core/       — routing & navigation

 */

export * from "./shared/ui";



export {

  ACTIVITY_WORKSPACE_BASE,

  ACTIVITY_PORTAL_BASE,

  isActivityWorkspacePath,

  isActivityPortalPath,

} from "./core/routes";

export { getActivityNavItems, ACTIVITY_NAV, ACTIVITY_MOBILE_PRIMARY } from "./core/nav";

export type { ActivityModuleId, ActivityWorkspaceModuleId } from "./core/types";

export {

  ACTIVITY_WORKSPACE_MODULES,

  ACTIVITY_WORKSPACE_PRIMARY_MODULES,

  ACTIVITY_WORKSPACE_LANDING,

  isActivityLandingModule,

  getActivityWorkspaceModule,

} from "./workspace";

export type { ActivityWorkspaceModule } from "./workspace";



export { ActivityDashboardPage } from "./features/dashboard";

export { ActivitySportsPage } from "./features/sports";

export { ActivityExtraCurricularPage } from "./features/extra-curricular";

export { ActivityCalendarPage } from "./features/calendar";

export { WorkspaceCommunicationPage } from "./features/communication";

export { ActivityEventsPage } from "./features/events";

export { ActivityCompetitionsPage } from "./features/competitions";

export { ActivityClubsPage } from "./features/clubs";

export { ActivityWorkshopsPage } from "./features/workshops";

export { ActivityAttendancePage } from "./features/attendance";

export { ActivityAchievementsPage } from "./features/achievements";

export { ActivityCertificatesPage } from "./features/certificates";

export { ActivityPracticePage } from "./features/practice";

export { ActivityMessagesPage } from "./features/messages";

export { ActivityNotificationsPage } from "./features/notifications";

export { ActivityAnnouncementsPage } from "./features/announcements";

export { ActivityProfilePage } from "./features/profile";

