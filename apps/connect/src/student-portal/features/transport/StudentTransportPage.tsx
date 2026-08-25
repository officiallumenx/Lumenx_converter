import { useEffect } from "react";
import { LearnerTransportView } from "@/components/app/transport/LearnerTransportView";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { studentProfile } from "@/lib/mock-data";
import { transportStore } from "@/lib/transport-store";
import { PageSkeleton } from "@/student-portal/shared/ui";

export function StudentTransportPage() {
  const portal = useStudentPortal();
  const learnerId = portal.isStudent
    ? (portal.snapshot?.profile.id ?? studentProfile.id)
    : studentProfile.id;

  useEffect(() => {
    if (portal.isStudent) {
      transportStore.init(learnerId, "student");
    }
  }, [portal.isStudent, learnerId]);

  if (!portal.isStudent) {
    return <PageSkeleton rows={5} />;
  }

  const name = portal.snapshot?.profile.name ?? studentProfile.name;

  return (
    <LearnerTransportView
      viewer="student"
      subtitle={`${name} · Live bus tracking, route & pickup alerts`}
    />
  );
}
