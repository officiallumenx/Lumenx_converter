import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useApp } from "@/lib/app-state";
import { TeacherStudentsPage } from "@/teacher-portal";

export const Route = createFileRoute("/students")({
  head: () => ({ meta: [{ title: "Students — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <StudentsRoute />
    </AppShell>
  ),
});

function StudentsRoute() {
  const { role } = useApp();
  if (role !== "teacher") {
    return (
      <div className="py-12 text-center text-muted-foreground">
        This page is available in the Teacher portal.
      </div>
    );
  }
  return <TeacherStudentsPage />;
}
