import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useActivityApiSession } from "@/hooks/use-activity-api-session";
import { PageSkeleton } from "@/activity-workspace/shared/ui/PageSkeleton";

export const Route = createFileRoute("/activity")({
  component: ActivityLayout,
});

function ActivityLayout() {
  const { ready, apiMode } = useActivityApiSession();

  if (apiMode && !ready) {
    return (
      <AppShell>
        <PageSkeleton variant="list" rows={4} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
