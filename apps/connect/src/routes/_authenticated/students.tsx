import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { TeacherStudentsPage } from "@/teacher-portal";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({ meta: [{ title: "Students — LumenX Connect" }] }),
  component: () => (
    <StudentsRoute />
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
