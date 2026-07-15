import { useEffect } from "react";
import { ChildSwitcher } from "@/components/app/ChildSwitcher";
import { LearnerTransportView } from "@/components/app/transport/LearnerTransportView";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { children } from "@/lib/mock-data";
import { transportStore } from "@/lib/transport-store";
import { PageSkeleton } from "@/student-portal/shared/ui/PageSkeleton";

export function ParentTransportPage() {
  const { activeChildId } = useApp();
  const portal = useParentPortal();

  useEffect(() => {
    if (portal.isParent) {
      transportStore.init(activeChildId, "parent");
    }
  }, [portal.isParent, activeChildId]);

  if (!portal.isParent) {
    return <PageSkeleton rows={5} />;
  }

  const activeChild = children.find((c) => c.id === activeChildId) ?? children[0];
  const snap = portal.snapshot;
  const childName = snap?.child.name ?? activeChild?.name ?? "Your child";
  const classTag =
    snap?.classTag ??
    (activeChild ? `${activeChild.className.replace("Class ", "")}-${activeChild.section}` : "");

  return (
    <LearnerTransportView
      subtitle={`Track ${childName}'s bus · ${classTag} · pickup alerts & live route`}
      headerExtra={
        <div className="mb-1">
          <ChildSwitcher />
        </div>
      }
    />
  );
}
