import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useApp } from "@/lib/app-state";

const ParentDashboardPage = lazy(() =>
  import("@/parent-portal/features/dashboard").then((m) => ({ default: m.ParentDashboardPage })),
);
const TeacherDashboardPage = lazy(() =>
  import("@/teacher-portal/features/dashboard").then((m) => ({ default: m.TeacherDashboardPage })),
);
const StudentDashboardPage = lazy(() =>
  import("@/student-portal/features/dashboard").then((m) => ({ default: m.StudentDashboardPage })),
);

function DashboardFallback() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-muted" />
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <AppShell>
      <Inner />
    </AppShell>
  );
}

function Inner() {
  const { role } = useApp();
  return (
    <Suspense fallback={<DashboardFallback />}>
      {role === "parent" && <ParentDashboardPage />}
      {role === "teacher" && <TeacherDashboardPage />}
      {role !== "parent" && role !== "teacher" && <StudentDashboardPage />}
    </Suspense>
  );
}
