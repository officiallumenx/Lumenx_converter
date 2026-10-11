import { createFileRoute } from "@tanstack/react-router";
import { ConnectRoleGate } from "@/components/app/ConnectRoleGate";
import { TeacherRemarksPage } from "@/teacher-portal";

export const Route = createFileRoute("/_authenticated/remarks")({
  head: () => ({ meta: [{ title: "Remarks — LumenX Connect" }] }),
  component: () => (
    <ConnectRoleGate allow={["teacher"]}>
      <TeacherRemarksPage />
    </ConnectRoleGate>
  ),
});
