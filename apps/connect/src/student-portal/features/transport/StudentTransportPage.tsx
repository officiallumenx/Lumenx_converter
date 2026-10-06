import { LearnerTransportApiView } from "@/components/app/transport/LearnerTransportApiView";
import { useApp } from "@/lib/app-state";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { PageSkeleton } from "@/student-portal/shared/ui";

/** Student transport — API-only read surface. */
export function StudentTransportPage() {
  const { activeInstituteId } = useApp();
  const portal = useStudentPortal();
  const learnerId =
    portal.isStudent && portal.snapshot ? portal.snapshot.profile.id : null;

  if (!portal.isStudent) return null;
  if (portal.isLoading && !portal.snapshot) return <PageSkeleton rows={5} />;

  const name = portal.snapshot?.profile.name ?? "Student";
  const subtitle = `${name} · Live bus tracking, route & pickup alerts`;

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
      viewer="student"
    />
  );
}
