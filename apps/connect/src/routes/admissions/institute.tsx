import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RequireInstituteAdmin } from "@/admissions-portal/core/guards";

export const Route = createFileRoute("/admissions/institute")({
  component: InstituteLayout,
});

function InstituteLayout() {
  return (
    <RequireInstituteAdmin>
      <Outlet />
    </RequireInstituteAdmin>
  );
}
