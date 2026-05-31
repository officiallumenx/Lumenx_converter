import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useApp } from "@/lib/app-state";
import { ParentDashboard } from "@/components/app/dashboards/ParentDashboard";
import { TeacherDashboard } from "@/components/app/dashboards/TeacherDashboard";
import { StudentDashboard } from "@/components/app/dashboards/StudentDashboard";

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
  if (role === "parent") return <ParentDashboard />;
  if (role === "teacher") return <TeacherDashboard />;
  return <StudentDashboard />;
}
