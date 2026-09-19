import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { TeacherAssignmentsPage } from "@/teacher-portal";
import { ParentHomeworkPage } from "@/components/app/homework/ParentHomeworkPage";

export const Route = createFileRoute("/_authenticated/assignments")({
  head: () => ({ meta: [{ title: "Homework — LumenX Connect" }] }),
  component: () => (
    <AssignmentsPage />
  ),
});

function AssignmentsPage() {
  const { role } = useApp();
  if (role === "teacher") return <TeacherAssignmentsPage />;
  return <ParentHomeworkPage />;
}
