import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useApp } from "@/lib/app-state";
import { StudentAchievementsPage } from "@/student-portal";

export const Route = createFileRoute("/achievements")({
  head: () => ({ meta: [{ title: "Achievements — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <AchievementsRoute />
    </AppShell>
  ),
});

function AchievementsRoute() {
  const { role } = useApp();
  if (role === "student") return <StudentAchievementsPage />;
  if (role === "parent") return <StudentAchievementsPage readOnlyParent />;
  return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      Achievements is available in the Student or Parent portal.
    </div>
  );
}
