import { useEffect } from "react";
import { LearnerTransportApiView } from "@/components/app/transport/LearnerTransportApiView";
import { LearnerTransportView } from "@/components/app/transport/LearnerTransportView";
import { useApp } from "@/lib/app-state";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { studentProfile } from "@/lib/mock-data";
import { transportStore } from "@/lib/transport-store";
import { PageSkeleton } from "@/student-portal/shared/ui";

export function StudentTransportPage() {
  const { activeInstituteId } = useApp();
  const portal = useStudentPortal();
  const apiMode = isApiAuthMode();
  const learnerId = portal.isStudent
    ? (portal.snapshot?.profile.id ?? studentProfile.id)
    : studentProfile.id;

  useEffect(() => {
    if (portal.isStudent && !apiMode) {
      transportStore.init(learnerId, "student");
    }
  }, [portal.isStudent, learnerId, apiMode]);

  if (!portal.isStudent) {
    return <PageSkeleton rows={5} />;
  }

  const name = portal.snapshot?.profile.name ?? studentProfile.name;
  const subtitle = `${name} · Live bus tracking, route & pickup alerts`;

  if (apiMode && activeInstituteId && learnerId) {
    return (
      <LearnerTransportApiView
        instituteId={activeInstituteId}
        studentId={learnerId}
        subtitle={subtitle}
      />
    );
  }

  return <LearnerTransportView viewer="student" subtitle={subtitle} />;
}
