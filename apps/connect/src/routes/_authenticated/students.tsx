import { createFileRoute } from "@tanstack/react-router";
import { ConnectRoleGate } from "@/components/app/ConnectRoleGate";
import { TeacherStudentsPage } from "@/teacher-portal";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({ meta: [{ title: "Students — LumenX Connect" }] }),
  component: () => (
    <ConnectRoleGate allow={["teacher"]}>
      <TeacherStudentsPage />
    </ConnectRoleGate>
  ),
});
