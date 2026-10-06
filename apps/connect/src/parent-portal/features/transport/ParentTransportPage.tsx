import { ChildSwitcher } from "@/components/app/ChildSwitcher";
import { LearnerTransportApiView } from "@/components/app/transport/LearnerTransportApiView";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { PageSkeleton } from "@/student-portal/shared/ui/PageSkeleton";

/** Parent transport — API-only read surface (writes: Not Riding / undo / report issue). */
export function ParentTransportPage() {
  const { activeInstituteId } = useApp();
  const portal = useParentPortal();
  const snap = portal.isParent ? portal.snapshot : null;
  const studentId = snap?.child.id ?? null;

  if (!portal.isParent) return null;
  if (portal.isLoading && !snap) return <PageSkeleton rows={5} />;

  const childName = snap?.child.name ?? "Your child";
  const classTag = snap?.classTag ?? "";
  const subtitle = `Track ${childName}'s bus · ${classTag} · pickup alerts & live route`;

  if (!activeInstituteId || !studentId) {
    return (
      <p className="text-sm text-muted-foreground">
        Transport is unavailable until a child is linked for this institute.
      </p>
    );
  }

  return (
    <LearnerTransportApiView
      instituteId={activeInstituteId}
      studentId={studentId}
      subtitle={subtitle}
      headerExtra={
        <div className="mb-1">
          <ChildSwitcher />
        </div>
      }
    />
  );
}
