import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { LearnerActivitiesView } from "@/components/app/activities/LearnerActivitiesView";
import { useApp } from "@/lib/app-state";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { isApiAuthMode } from "@/auth/auth-mode";
import { getConnectApiClient } from "@/lib/connect-api";
import type { MeResponse } from "@/lib/api/me-types";
import { listStudents } from "@/lib/students/api";
import {
  children as allChildren,
  getConnectStudentProfile,
} from "@/lib/mock-data";

export const Route = createFileRoute("/activities")({
  head: () => ({ meta: [{ title: "Activities — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <ActivitiesPage />
    </AppShell>
  ),
});

function ActivitiesPage() {
  const { role, activeChildId, activeInstituteId } = useApp();
  const studentPortal = useStudentPortal();
  const apiMode = isApiAuthMode();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [parentStudentId, setParentStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (!apiMode) return;
    void getConnectApiClient()
      .get<MeResponse>("/api/v1/me")
      .then(setMe)
      .catch(() => setMe(null));
  }, [apiMode]);

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

  useEffect(() => {
    if (!apiMode || role !== "parent" || !activeInstituteId || !learner) {
      setParentStudentId(null);
      return;
    }
    let cancelled = false;
    void listStudents({ instituteId: activeInstituteId, status: "active" })
      .then((rows) => {
        if (cancelled) return;
        const match =
          rows.find((s) => s.rollNo === learner.rollNo) ??
          rows.find((s) => s.displayName === learner.name) ??
          null;
        setParentStudentId(match?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setParentStudentId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [apiMode, role, activeInstituteId, learner]);

  const studentId = useMemo(() => {
    if (!apiMode || !activeInstituteId) return null;
    if (role === "student" && me) {
      return (
        me.identities.students.find((s) => s.instituteId === activeInstituteId)?.studentId ?? null
      );
    }
    if (role === "parent") return parentStudentId;
    return null;
  }, [apiMode, me, activeInstituteId, role, parentStudentId]);

  if (role === "teacher") {
    return <Navigate to="/" replace />;
  }

  const subtitle = parentChild
    ? `${parentChild.name} · ${parentChild.className} ${parentChild.section} · squads and groups update when you switch children`
    : `${learner.name} · Class view`;

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <PageHeader
        title="Activities"
        subtitle="Sports squads and extra-curricular groups for the selected learner"
      />
      <LearnerActivitiesView
        key={parentChild?.id ?? learner.childId}
        learner={learner}
        subtitle={subtitle}
        showChildSwitcher={role === "parent"}
        instituteId={activeInstituteId}
        studentId={studentId}
      />
    </div>
  );
}
