import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { StudentAttendanceWorkspace } from "@/components/student-attendance";

import { ADMIN_MODULE_LABELS as M, adminPageTitle } from "@/lib/admin-module-labels";

export const Route = createFileRoute("/student-attendance")({
  head: () => ({ meta: [{ title: adminPageTitle("/student-attendance") }] }),
  component: StudentAttendancePage,
});

function StudentAttendancePage() {
  return (
    <AppShell
      title={M.attendance}
      subtitle="Select class · section · date · mark via Attendance Engine"
    >
      <StudentAttendanceWorkspace />
    </AppShell>
  );
}
