import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { LearnerSportsView } from "@/components/app/sports/LearnerSportsView";
import { useApp } from "@/lib/app-state";
import { useStudentPortal } from "@/context/StudentPortalContext";
import {
  children as allChildren,
  getConnectStudentProfile,
} from "@/lib/mock-data";

export const Route = createFileRoute("/sports")({
  head: () => ({ meta: [{ title: "Sports — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <SportsPage />
    </AppShell>
  ),
});

function SportsPage() {
  const { role, activeChildId } = useApp();
  const studentPortal = useStudentPortal();

  const parentChild =
    role === "parent" ? (allChildren.find((c) => c.id === activeChildId) ?? allChildren[0]) : null;

  const learner = useMemo(() => {
    if (parentChild) {
      return {
        name: parentChild.name,
        rollNo: parentChild.rollNo,
        childId: parentChild.id,
      };
    }
    if (role === "student" && studentPortal.isStudent && studentPortal.snapshot) {
      const p = studentPortal.snapshot.profile;
      const linked =
        allChildren.find((c) => c.name === p.name) ??
        allChildren.find((c) => c.rollNo === p.rollNo) ??
        allChildren[0];
      return { name: p.name, rollNo: p.rollNo, childId: linked?.id ?? allChildren[0]?.id ?? "C1" };
    }
    const p = getConnectStudentProfile();
    const linked =
      allChildren.find((c) => c.name === p.name) ??
      allChildren.find((c) => c.rollNo === p.rollNo) ??
      allChildren[0];
    return { name: p.name, rollNo: p.rollNo, childId: linked?.id ?? "C1" };
  }, [parentChild, role, studentPortal.isStudent, studentPortal.snapshot]);

  if (role === "teacher") {
    return <Navigate to="/" replace />;
  }

  const subtitle = parentChild
    ? `${parentChild.name} · ${parentChild.className} ${parentChild.section} · squads, events, and results update when you switch children`
    : `${learner.name} · Class view`;

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <PageHeader
        title="Sports & Cultural"
        subtitle="Live squads, schedules, and results for the selected learner"
      />
      <LearnerSportsView
        key={parentChild?.id ?? learner.childId}
        learner={learner}
        subtitle={subtitle}
        showChildSwitcher={role === "parent"}
      />
    </div>
  );
}
