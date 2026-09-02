import { useEffect } from "react";
import { ChildSwitcher } from "@/components/app/ChildSwitcher";
import { LearnerTransportApiView } from "@/components/app/transport/LearnerTransportApiView";
import { LearnerTransportView } from "@/components/app/transport/LearnerTransportView";
import { useApp } from "@/lib/app-state";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useParentPortal } from "@/context/ParentPortalContext";
import { children } from "@/lib/mock-data";
import { transportStore } from "@/lib/transport-store";
import { PageSkeleton } from "@/student-portal/shared/ui/PageSkeleton";

export function ParentTransportPage() {
  const { activeChildId, activeInstituteId } = useApp();
  const portal = useParentPortal();
  const apiMode = isApiAuthMode();

  useEffect(() => {
    if (portal.isParent && !apiMode) {
      transportStore.init(activeChildId, "parent");
    }
  }, [portal.isParent, activeChildId, apiMode]);

  if (!portal.isParent) {
    return <PageSkeleton rows={5} />;
  }

  const activeChild = children.find((c) => c.id === activeChildId) ?? children[0];
  const snap = portal.snapshot;
  const childName = snap?.child.name ?? activeChild?.name ?? "Your child";
  const classTag =
    snap?.classTag ??
    (activeChild ? `${activeChild.className.replace("Class ", "")}-${activeChild.section}` : "");
  const studentId = snap?.child.id ?? activeChildId;
  const subtitle = `Track ${childName}'s bus · ${classTag} · pickup alerts & live route`;

  if (apiMode && activeInstituteId && studentId) {
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

  return (
    <LearnerTransportView
      viewer="parent"
      subtitle={subtitle}
      headerExtra={
        <div className="mb-1">
          <ChildSwitcher />
        </div>
      }
    />
  );
}
