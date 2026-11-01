import { lazy, Suspense, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { isApiAuthMode } from "@/auth/auth-mode";
import { leaveStore } from "@/lib/leave-store";
import { teacherLeaveStore } from "@/lib/teacher-leave-store";
import { RouteLazyFallback } from "@/components/app/RouteLazyFallback";

const ParentLeavePage = lazy(() =>
  import("@/components/app/leave/ParentLeavePage").then((m) => ({
    default: m.ParentLeavePage,
  })),
);
const TeacherLeavePage = lazy(() =>
  import("@/teacher-portal/features/leave").then((m) => ({
    default: m.TeacherLeavePage,
  })),
);

export const Route = createFileRoute("/_authenticated/leave")({
  head: () => ({ meta: [{ title: "Leave — LumenX Connect" }] }),
  component: () => (
    <Suspense fallback={<RouteLazyFallback />}>
      <LeaveRoutePage />
    </Suspense>
  ),
});

function LeaveRoutePage() {
  const { role } = useApp();
  const apiMode = isApiAuthMode();

  useEffect(() => {
    if (apiMode) return;
    if (role === "teacher" || role === "parent") {
      leaveStore.init();
    }
    if (role === "teacher") {
      teacherLeaveStore.init();
    }
  }, [role, apiMode]);

  if (role === "teacher") return <TeacherLeavePage />;
  if (role === "parent") return <ParentLeavePage />;
  return (
    <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
      Leave applications are submitted by parents. Contact your parent/guardian if you need leave.
    </div>
  );
}
