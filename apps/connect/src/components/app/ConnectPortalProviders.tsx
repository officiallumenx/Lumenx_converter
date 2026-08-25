import type { ReactNode } from "react";
import { AppProvider } from "@/lib/app-state";
import { ParentPortalRegistry } from "@/context/ParentPortalContext";
import { TeacherPortalRegistry } from "@/context/TeacherPortalContext";
import { StudentPortalRegistry } from "@/context/StudentPortalContext";
import { TeacherSessionRegistry } from "@/context/TeacherSessionContext";
import { ActivityWorkspaceRegistry } from "@/context/ActivityWorkspaceContext";

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
              <ActivityWorkspaceRegistry>{children}</ActivityWorkspaceRegistry>
            </StudentPortalRegistry>
          </TeacherSessionRegistry>
        </TeacherPortalRegistry>
      </ParentPortalRegistry>
    </AppProvider>
  );
}
