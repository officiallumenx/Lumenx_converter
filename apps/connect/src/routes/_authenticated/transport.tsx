import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { ParentTransportPage } from "@/parent-portal/features/transport";
import { StudentTransportPage } from "@/student-portal/features/transport";
import { TeacherTransportPage } from "@/teacher-portal/features/transport";

export const Route = createFileRoute("/_authenticated/transport")({
  head: () => ({ meta: [{ title: "Transport — LumenX Connect" }] }),
  component: () => <TransportRoutePage />,
});

function TransportRoutePage() {
  const { role } = useApp();

  if (role === "teacher") return <TeacherTransportPage />;
  if (role === "student") return <StudentTransportPage />;
  if (role === "parent") return <ParentTransportPage />;

  return (
    <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
      Sign in as a parent or student to track school transport.
    </div>
  );
}
