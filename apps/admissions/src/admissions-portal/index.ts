/**
 * Admissions portal — public feature module entry.
 * Prefer importing from `@/admissions-portal` in routes instead of deep feature paths.
 */
export { AdmissionsAuthProvider, useAdmissionsAuth } from "./core/AdmissionsAuthProvider";
export {
  RequireAdmissionsAuth,
  RequireParentAuth,
  RedirectIfAuthed,
} from "./core/guards";
export {
  AdmissionsShell,
  ProgramCard,
  ApplicationStatusTimeline,
  DocumentUploadCard,
} from "./shared/ui/AdmissionsShell";
export { AdmissionsPageHeader } from "./shared/ui/AdmissionsPageHeader";
export { PageSkeleton, EmptyState } from "./shared/ui/PageSkeleton";

export { AdmissionsHomePage } from "./features/home/AdmissionsHomePage";
export { InstituteDirectoryPage } from "./features/directory/InstituteDirectoryPage";
export { InstituteProfilePage } from "./features/institutes/InstituteProfilePage";
export { InstituteDetailPanel } from "./features/institutes/InstituteDetailPanel";
export { InstituteDetailPage } from "./features/institutes/InstituteDetailPage";
export {
  InstitutesBrowsePage,
  InstitutePreviewStrip,
} from "./features/institutes/InstitutesBrowsePage";
export { ApplicantDashboardPage } from "./features/dashboard/ApplicantDashboardPage";
export { SignInFlow } from "./features/auth/AuthFlows";
export { AdmissionsNotificationsPage } from "./features/support/SupportPages";
