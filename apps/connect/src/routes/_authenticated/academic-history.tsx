import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { RouteLazyFallback } from "@/components/app/RouteLazyFallback";

const StudentAcademicHistoryPage = lazy(() =>
  import("@/student-portal/features/academic-history").then((m) => ({
    default: m.StudentAcademicHistoryPage,
  })),
);

export const Route = createFileRoute("/_authenticated/academic-history")({
  head: () => ({ meta: [{ title: "Academic History — LumenX Connect" }] }),
  component: () => (
    <Suspense fallback={<RouteLazyFallback />}>
      <AcademicHistoryRoute />
    </Suspense>
  ),
});

function AcademicHistoryRoute() {
  const { role } = useApp();
  if (role === "student") return <StudentAcademicHistoryPage />;
  if (role === "parent") return <StudentAcademicHistoryPage readOnlyParent />;
  return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      Academic History is available in the Student or Parent portal.
    </div>
  );
}
