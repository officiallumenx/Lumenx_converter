import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useApp } from "@/lib/app-state";
import { StudentAcademicHistoryPage } from "@/student-portal";

export const Route = createFileRoute("/academic-history")({
  head: () => ({ meta: [{ title: "Academic History — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <AcademicHistoryRoute />
    </AppShell>
  ),
});

function AcademicHistoryRoute() {
  const { role } = useApp();
  if (role === "student") return <StudentAcademicHistoryPage />;
  if (role === "parent") return <StudentAcademicHistoryPage readOnlyParent />;
  return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      Academic History is available in the Student or Parent portal.
    </div>
  );
}
