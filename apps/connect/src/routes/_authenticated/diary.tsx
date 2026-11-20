import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { RouteLazyFallback } from "@/components/app/RouteLazyFallback";

const TeacherDiaryPage = lazy(() =>
  import("@/teacher-portal/features/diary").then((m) => ({
    default: m.TeacherDiaryPage,
  })),
);
const LearnerDiaryPage = lazy(() =>
  import("@/student-portal/features/diary").then((m) => ({
    default: m.LearnerDiaryPage,
  })),
);

export const Route = createFileRoute("/_authenticated/diary")({
  head: () => ({ meta: [{ title: "Diary Book — LumenX Connect" }] }),
  component: () => (
    <Suspense fallback={<RouteLazyFallback />}>
      <DiaryRoute />
    </Suspense>
  ),
});

function DiaryRoute() {
  const { role } = useApp();
  if (role === "teacher") return <TeacherDiaryPage />;
  if (role === "student") return <LearnerDiaryPage />;
  if (role === "parent") return <LearnerDiaryPage readOnlyParent />;
  return (
    <div className="py-12 text-center text-muted-foreground">
      Diary is not available for this role.
    </div>
  );
}
