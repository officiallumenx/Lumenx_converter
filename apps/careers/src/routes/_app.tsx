import { createFileRoute, Outlet } from "@tanstack/react-router";
import { InAppAlertListener } from "@/components/app/InAppAlertListener";
import { PushDeviceTokenRegistration } from "@/components/app/PushDeviceTokenRegistration";
import { CareersAuthProvider } from "@/careers-portal/core/CareersAuthProvider";
import { CareersThemeProvider } from "@/careers-portal/core/CareersThemeProvider";
import { CareersShell } from "@/careers-portal/shared/ui/CareersShell";

export const Route = createFileRoute("/_app")({
  component: CareersLayout,
});

function CareersLayout() {
  return (
    <CareersThemeProvider>
      <CareersAuthProvider>
        <PushDeviceTokenRegistration enabled />
        <InAppAlertListener />
        <CareersShell>
          <Outlet />
        </CareersShell>
      </CareersAuthProvider>
    </CareersThemeProvider>
  );
}
