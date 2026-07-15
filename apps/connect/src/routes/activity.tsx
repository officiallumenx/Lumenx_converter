import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/activity")({
  component: ActivityLayout,
});

function ActivityLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
