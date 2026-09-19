import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useActivityApiSession } from "@/hooks/use-activity-api-session";
import { PageSkeleton } from "@/activity-workspace/shared/ui/PageSkeleton";

export const Route = createFileRoute("/_authenticated/activity")({
  component: ActivityLayout,
});

function ActivityLayout() {
  const { ready, apiMode, error } = useActivityApiSession();

  if (apiMode && !ready) {
    return <PageSkeleton variant="list" rows={4} />;
  }

  if (apiMode && error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return <Outlet />;
}
