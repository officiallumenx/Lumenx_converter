import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useApp } from "@/lib/app-state";
import { TeacherAssignmentsPage } from "@/teacher-portal";
import { ParentHomeworkPage } from "@/components/app/homework/ParentHomeworkPage";

export const Route = createFileRoute("/assignments")({
  head: () => ({ meta: [{ title: "Homework — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <AssignmentsPage />
    </AppShell>
  ),
});

function AssignmentsPage() {
  const { role } = useApp();
  if (role === "teacher") return <TeacherAssignmentsPage />;
  return <ParentHomeworkPage />;
}
