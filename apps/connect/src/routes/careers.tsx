import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CareersAuthProvider } from "@/careers-portal/core/CareersAuthProvider";
import { CareersThemeProvider } from "@/careers-portal/core/CareersThemeProvider";
import { CareersShell } from "@/careers-portal/shared/ui/CareersShell";

export const Route = createFileRoute("/careers")({
  component: CareersLayout,
});

function CareersLayout() {
  return (
    <CareersThemeProvider>
      <CareersAuthProvider>
        <CareersShell>
          <Outlet />
        </CareersShell>
      </CareersAuthProvider>
    </CareersThemeProvider>
  );
}
