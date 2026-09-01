import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useActivityApiSession } from "@/hooks/use-activity-api-session";
import { PageSkeleton } from "@/activity-workspace/shared/ui/PageSkeleton";

export const Route = createFileRoute("/activity")({
  component: ActivityLayout,
});

function ActivityLayout() {
  const { ready, apiMode, error } = useActivityApiSession();

  if (apiMode && !ready) {
    return (
      <AppShell>
        <PageSkeleton variant="list" rows={4} />
      </AppShell>
    );
  }

  if (apiMode && error) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
