import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { StudentAttendanceWorkspace } from "@/components/student-attendance";
import { StudentAttendanceApiPage } from "@/components/student-attendance/StudentAttendanceApiPage";
import { isApiAuthMode } from "@/auth/auth-mode";

import { ADMIN_MODULE_LABELS as M, adminPageTitle } from "@/lib/admin-module-labels";

export const Route = createFileRoute("/student-attendance")({
  head: () => ({ meta: [{ title: adminPageTitle("/student-attendance") }] }),
  component: StudentAttendancePage,
});

function StudentAttendancePage() {
  const apiMode = isApiAuthMode();

  return (
    <AppShell
      title={M.attendance}
      subtitle={
        apiMode
          ? "API mode · enrollments roster · create / mark / submit registers by class · section · date"
          : "Select class · section · date · mark via Attendance Engine"
      }
    >
      {apiMode ? <StudentAttendanceApiPage /> : <StudentAttendanceWorkspace />}
    </AppShell>
  );
}
