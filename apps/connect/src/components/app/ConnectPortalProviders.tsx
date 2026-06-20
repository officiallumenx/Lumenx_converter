import type { ReactNode } from "react";
import { AppProvider } from "@/lib/app-state";
import { ParentPortalRegistry } from "@/context/ParentPortalContext";
import { TeacherPortalRegistry } from "@/context/TeacherPortalContext";
import { StudentPortalRegistry } from "@/context/StudentPortalContext";

export function ConnectPortalProviders({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <ParentPortalRegistry>
        <TeacherPortalRegistry>
          <StudentPortalRegistry>{children}</StudentPortalRegistry>
        </TeacherPortalRegistry>
      </ParentPortalRegistry>
    </AppProvider>
  );
}
