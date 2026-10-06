import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ModuleHero } from "@/components/module-shell";
import { SegmentedControl } from "@lumenx/ui-admin";
import { StudentAttendanceWorkspace } from "@/components/student-attendance";
import { StudentAttendanceApiPage } from "@/components/student-attendance/StudentAttendanceApiPage";
import { StudentAttendanceSettingsPanel } from "@/components/student-attendance/StudentAttendanceSettingsPanel";
import { isApiAuthMode } from "@/auth/auth-mode";
import { ADMIN_MODULE_LABELS as M, adminPageTitle } from "@/lib/admin-module-labels";

export const Route = createFileRoute("/student-attendance")({
  head: () => ({ meta: [{ title: adminPageTitle("/student-attendance") }] }),
  component: StudentAttendancePage,
});

type AttendanceSection = "take" | "settings";

function StudentAttendancePage() {
  const apiMode = isApiAuthMode();
  const [section, setSection] = useState<AttendanceSection>("take");

  return (
    <AppShell
      title={M.attendance}
      subtitle={
        section === "settings"
          ? "Method · owner · notifications"
          : "Mark by class · section · date"
      }
    >
      <ModuleHero
        compact
        eyebrow="Academics"
        title={M.attendance}
        subtitle={
          section === "settings"
            ? "Method · owner · notifications"
            : "Mark by class · section · date"
        }
      />
      <div className="mb-4 max-w-md">
        <SegmentedControl
          value={section}
          onChange={(value) => setSection(value as AttendanceSection)}
          options={[
            { value: "take", label: "Take attendance" },
            { value: "settings", label: "Attendance settings" },
          ]}
        />
      </div>
      {section === "settings" ? (
        <StudentAttendanceSettingsPanel />
      ) : apiMode ? (
        <StudentAttendanceApiPage />
      ) : (
        <StudentAttendanceWorkspace />
      )}
    </AppShell>
  );
}
