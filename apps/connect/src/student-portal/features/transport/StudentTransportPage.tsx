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
  const learnerId =
    portal.isStudent && portal.snapshot
      ? portal.snapshot.profile.id
      : apiMode
        ? null
        : studentProfile.id;

  useEffect(() => {
    if (portal.isStudent && !apiMode && learnerId) {
      transportStore.init(learnerId, "student");
    }
  }, [portal.isStudent, learnerId, apiMode]);

  if (!portal.isStudent) return null;
  if (portal.isLoading && !portal.snapshot) return <PageSkeleton rows={5} />;

  const name = portal.snapshot?.profile.name ?? studentProfile.name;
  const subtitle = `${name} · Live bus tracking, route & pickup alerts`;

  if (apiMode) {
    if (!activeInstituteId || !learnerId) {
      return (
        <p className="text-sm text-muted-foreground">
          Transport is unavailable until a student is linked for this institute.
        </p>
      );
    }
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
