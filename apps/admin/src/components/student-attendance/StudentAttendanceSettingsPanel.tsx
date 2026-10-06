/**
 * Student Attendance → Attendance settings (method, owner, notifications).
 */
import { PageStack } from "@lumenx/ui-admin";
import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiReadUnavailablePanel } from "@/components/ApiReadUnavailablePanel";
import { AttendanceConfigApiPanel } from "@/components/settings/AttendanceConfigApiPanel";
import { AttendanceConfigurationPanel } from "@/components/academic-management/views/AttendanceConfigurationPanel";
import { AttendanceNotificationConfigPanel } from "@/components/academic-management/views/AttendanceNotificationConfigPanel";

export function StudentAttendanceSettingsPanel() {
  const apiMode = isApiAuthMode();

  if (apiMode) {
    return (
      <PageStack>
        <AttendanceConfigApiPanel />
        <ApiReadUnavailablePanel
          title="Attendance notifications unavailable"
          domainLabel="Attendance notification configuration"
          hint="Attendance notification routing is not available for this institute yet."
        />
      </PageStack>
    );
  }

  return (
    <PageStack>
      <AttendanceConfigurationPanel />
      <AttendanceNotificationConfigPanel />
    </PageStack>
  );
}
