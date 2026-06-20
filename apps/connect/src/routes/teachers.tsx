import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { TeacherCard, TeacherDetailDialog } from "@/components/app/TeacherDetailDialog";
import { teachers } from "@/lib/mock-data";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";

export const Route = createFileRoute("/teachers")({
  head: () => ({ meta: [{ title: "Teachers — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <TeachersPage />
    </AppShell>
  ),
});

function TeachersPage() {
  const { role } = useApp();
  const portal = useParentPortal();
  const snap = role === "parent" && portal.isParent ? portal.snapshot : null;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sorted = [...teachers].sort((a, b) => Number(b.isClassTeacher) - Number(a.isClassTeacher));

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <PageHeader
        title="Teachers"
        subtitle={
          snap
            ? `Faculty for ${snap.child.name} (${snap.classTag}) — tap a card for full profile`
            : "Class 10-B faculty — tap a card for full profile"
        }
      />
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((t) => (
          <TeacherCard key={t.id} teacher={t} onSelect={setSelectedId} />
        ))}
      </div>
      <TeacherDetailDialog
        teacherId={selectedId}
        open={selectedId !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </div>
  );
}
