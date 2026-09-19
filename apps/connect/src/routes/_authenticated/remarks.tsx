import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { TeacherRemarksPage } from "@/teacher-portal";

export const Route = createFileRoute("/_authenticated/remarks")({
  head: () => ({ meta: [{ title: "Remarks — LumenX Connect" }] }),
  component: () => (
    <RemarksRoute />
  ),
});

function RemarksRoute() {
  const { role } = useApp();
  if (role !== "teacher")
    return <div className="py-12 text-center text-muted-foreground">Teacher portal only.</div>;
  return <TeacherRemarksPage />;
}
