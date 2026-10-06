import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { LearnerActivitiesView } from "@/components/app/activities/LearnerActivitiesView";
import { useApp } from "@/lib/app-state";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { isApiAuthMode } from "@/auth/auth-mode";
import { getConnectApiClient } from "@/lib/connect-api";
import type { MeResponse } from "@/lib/api/me-types";
import { isInstituteUuid } from "@/lib/institute-id";

export const Route = createFileRoute("/_authenticated/activities")({
  head: () => ({ meta: [{ title: "Activities — LumenX Connect" }] }),
  component: () => <ActivitiesPage />,
});

function ActivitiesPage() {
  const {
    role,
    activeChildId,
    activeInstituteId,
    linkedChildren,
  } = useApp();
  const studentPortal = useStudentPortal();
  const apiMode = isApiAuthMode();
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    if (!apiMode) return;
    void getConnectApiClient()
      .get<MeResponse>("/api/v1/me")
      .then(setMe)
      .catch(() => setMe(null));
  }, [apiMode]);

  const parentChild =
    role === "parent"
      ? (linkedChildren.find((c) => c.id === activeChildId) ?? linkedChildren[0] ?? null)
      : null;

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
      return {
        name: p.name,
        rollNo: p.rollNo,
        childId: p.id,
      };
    }
    return { name: "Learner", rollNo: "—", childId: "" };
  }, [parentChild, role, studentPortal.isStudent, studentPortal.snapshot]);

  const studentId = useMemo(() => {
    if (!apiMode || !activeInstituteId || !isInstituteUuid(activeInstituteId)) {
      return null;
    }
    if (role === "student" && me) {
      return (
        me.identities.students.find((s) => s.instituteId === activeInstituteId)
          ?.studentId ?? null
      );
    }
    if (role === "parent" && parentChild?.id && isInstituteUuid(parentChild.id)) {
      return parentChild.id;
    }
    return null;
  }, [apiMode, me, activeInstituteId, role, parentChild]);

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
