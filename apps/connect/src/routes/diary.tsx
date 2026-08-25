import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useApp } from "@/lib/app-state";
import { TeacherDiaryPage } from "@/teacher-portal/features/diary";

export const Route = createFileRoute("/diary")({
  head: () => ({ meta: [{ title: "Diary Book — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <DiaryRoute />
    </AppShell>
  ),
});

function DiaryRoute() {
  const { role } = useApp();
  if (role !== "teacher")
    return <div className="py-12 text-center text-muted-foreground">Teacher portal only.</div>;
  return <TeacherDiaryPage />;
}
