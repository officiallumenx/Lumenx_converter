/**
 * Teacher Portal — feature module entry point.
 * Shared data layer: @/lib/teacher
 */
export { useAsyncAction } from "./core/hooks/useAsyncAction";
export { ConfirmDialog } from "./core/widgets/ConfirmDialog";

export * from "./shared/ui";

export { TeacherDashboardPage } from "./features/dashboard";
export { TeacherAssignmentsPage } from "./features/assignments";
export { TeacherAttendancePage } from "./features/attendance";
export { TeacherClassesPage } from "./features/classes";
export { TeacherStudentsPage, TeacherStudentDetailPage } from "./features/students";
export { TeacherMarksPage } from "./features/marks";
export { TeacherExamsPage } from "./features/exams";
export { TeacherEventsPage } from "./features/events";
export { TeacherMessagesPage } from "./features/messages";
export { TeacherComplaintsPage } from "./features/complaints";
export { TeacherRemarksPage } from "./features/remarks";
export { TeacherProfilePage } from "./features/profile";
export { TeacherTimetablePage } from "./features/timetable";
export { TeacherNotificationsPage } from "./features/notifications";
export { TeacherLeavePage } from "./features/leave";
export { TeacherDiaryPage } from "./features/diary";
export { TeacherTransportPage } from "./features/transport";
