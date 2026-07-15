import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useApp } from "@/lib/app-state";
import { TeacherRemarksPage } from "@/teacher-portal";

export const Route = createFileRoute("/remarks")({
  head: () => ({ meta: [{ title: "Remarks — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <RemarksRoute />
    </AppShell>
  ),
});

function RemarksRoute() {
  const { role } = useApp();
  if (role !== "teacher")
    return <div className="py-12 text-center text-muted-foreground">Teacher portal only.</div>;
  return <TeacherRemarksPage />;
}
