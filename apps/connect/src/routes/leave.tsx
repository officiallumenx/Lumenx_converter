import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/app/AppShell";
import { useApp } from "@/lib/app-state";
import { ParentLeavePage } from "@/components/app/leave/ParentLeavePage";
import { TeacherLeavePage } from "@/teacher-portal/features/leave";
import { leaveStore } from "@/lib/leave-store";
import { teacherLeaveStore } from "@/lib/teacher-leave-store";

export const Route = createFileRoute("/leave")({
  head: () => ({ meta: [{ title: "Leave — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <LeaveRoutePage />
    </AppShell>
  ),
});

function LeaveRoutePage() {
  const { role } = useApp();

  useEffect(() => {
    if (role === "teacher" || role === "parent") {
      leaveStore.init();
    }
    if (role === "teacher") {
      teacherLeaveStore.init();
    }
  }, [role]);

  if (role === "teacher") return <TeacherLeavePage />;
  if (role === "parent") return <ParentLeavePage />;
  return (
    <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
      Leave applications are submitted by parents. Contact your parent/guardian if you need leave.
    </div>
  );
}
