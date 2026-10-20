import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { RouteLazyFallback } from "@/components/app/RouteLazyFallback";

const TeacherAssignmentsPage = lazy(() =>
  import("@/teacher-portal/features/assignments").then((m) => ({
    default: m.TeacherAssignmentsPage,
  })),
);
const ParentHomeworkPage = lazy(() =>
  import("@/components/app/homework/ParentHomeworkPage").then((m) => ({
    default: m.ParentHomeworkPage,
  })),
);

export const Route = createFileRoute("/_authenticated/assignments")({
  head: () => ({ meta: [{ title: "Homework — LumenX Connect" }] }),
  component: () => (
    <Suspense fallback={<RouteLazyFallback />}>
      <AssignmentsPage />
    </Suspense>
  ),
});

function AssignmentsPage() {
  const { role } = useApp();
  if (role === "teacher") return <TeacherAssignmentsPage />;
  return <ParentHomeworkPage />;
}
