import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { TeacherDiaryPage } from "@/teacher-portal/features/diary";
import { LearnerDiaryPage } from "@/student-portal/features/diary";

export const Route = createFileRoute("/_authenticated/diary")({
  head: () => ({ meta: [{ title: "Diary Book — LumenX Connect" }] }),
  component: () => (
    <DiaryRoute />
  ),
});

function DiaryRoute() {
  const { role } = useApp();
  if (role === "teacher") return <TeacherDiaryPage />;
  if (role === "student") return <LearnerDiaryPage />;
  if (role === "parent") return <LearnerDiaryPage readOnlyParent />;
  return <div className="py-12 text-center text-muted-foreground">Diary is not available for this role.</div>;
}
