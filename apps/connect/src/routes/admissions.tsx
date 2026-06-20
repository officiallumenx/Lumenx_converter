import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdmissionsAuthProvider } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { AdmissionsThemeProvider } from "@/admissions-portal/core/AdmissionsThemeProvider";
import { AdmissionsShell } from "@/admissions-portal/shared/ui/AdmissionsShell";

export const Route = createFileRoute("/admissions")({
  component: AdmissionsLayout,
});

function AdmissionsLayout() {
  return (
    <AdmissionsThemeProvider>
      <AdmissionsAuthProvider>
        <AdmissionsShell>
          <Outlet />
        </AdmissionsShell>
      </AdmissionsAuthProvider>
    </AdmissionsThemeProvider>
  );
}
