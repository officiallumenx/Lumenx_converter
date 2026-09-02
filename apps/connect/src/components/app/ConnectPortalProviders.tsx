import type { ReactNode } from "react";
import { InAppAlertListener } from "@/components/app/InAppAlertListener";
import { PushDeviceTokenRegistration } from "@/components/app/PushDeviceTokenRegistration";
import { ConnectSchoolAlertsSync } from "@/components/app/ConnectSchoolAlertsSync";
import { AppProvider } from "@/lib/app-state";
import { ParentPortalRegistry } from "@/context/ParentPortalContext";
import { TeacherPortalRegistry } from "@/context/TeacherPortalContext";
import { StudentPortalRegistry } from "@/context/StudentPortalContext";
import { TeacherSessionRegistry } from "@/context/TeacherSessionContext";
import { ActivityWorkspaceRegistry } from "@/context/ActivityWorkspaceContext";
import { ConnectFeedbackTransportBridge } from "@/components/app/ConnectFeedbackTransportBridge";

/**
 * Connect session + portal registries for all non-isolated routes.
 * Careers/Admissions are excluded in `__root.tsx` and use their own providers.
 */
export function ConnectPortalProviders({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AppProvider>
      <ParentPortalRegistry>
        <TeacherPortalRegistry>
          <TeacherSessionRegistry>
            <StudentPortalRegistry>
              <ActivityWorkspaceRegistry>
              <ConnectFeedbackTransportBridge />
              <InAppAlertListener />
              <PushDeviceTokenRegistration enabled />
              <ConnectSchoolAlertsSync />
              {children}
            </ActivityWorkspaceRegistry>
            </StudentPortalRegistry>
          </TeacherSessionRegistry>
        </TeacherPortalRegistry>
      </ParentPortalRegistry>
    </AppProvider>
  );
}
