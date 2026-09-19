import { useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { TeacherCard, TeacherDetailDialog } from "@/components/app/TeacherDetailDialog";
import { useApp } from "@/lib/app-state";
import { useLearnerTeachersQuery } from "@/lib/connect-queries/hooks";

type LearnerTeachersApiPanelProps = {
  studentId: string;
  subtitle: string;
};

export function LearnerTeachersApiPanel({ studentId, subtitle }: LearnerTeachersApiPanelProps) {
  const { activeInstituteId } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, isError, refresh } = useLearnerTeachersQuery(
    activeInstituteId,
    studentId,
  );

  const status = data?.status ?? (isLoading ? "loading" : isError ? "error" : "loading");
  const teachers = data?.teachers ?? [];
  const error = data?.errorMessage ?? (isError ? "Failed to load teachers." : null);
  const selected = teachers.find((teacher) => teacher.id === selectedId) ?? null;

  if (status === "loading" || (isLoading && !data)) {
    return (
      <div className="min-w-0 max-w-full space-y-4">
        <PageHeader title="Teachers" subtitle={subtitle} />
        <p className="px-1 text-sm text-muted-foreground">Loading faculty…</p>
      </div>
    );
  }

  if (status === "needs_institute") {
    return (
      <div className="min-w-0 max-w-full space-y-4">
        <PageHeader title="Teachers" subtitle={subtitle} />
        <p className="px-1 text-sm text-muted-foreground">Select an institute to view teachers.</p>
      </div>
    );
  }

  if (status === "forbidden" || status === "error") {
    return (
      <div className="min-w-0 max-w-full space-y-4">
        <PageHeader
          title="Teachers"
          subtitle={subtitle}
          action={
            <button type="button" className="text-sm text-primary underline" onClick={refresh}>
              Retry
            </button>
          }
        />
        <p className="px-1 text-sm text-destructive">{error ?? "Failed to load teachers."}</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <PageHeader title="Teachers" subtitle={subtitle} />
      {teachers.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">No faculty assigned yet.</p>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teachers.map((teacher) => (
            <TeacherCard key={teacher.id} teacher={teacher} onSelect={setSelectedId} />
          ))}
        </div>
      )}
      <TeacherDetailDialog
        teacher={selected}
        open={selectedId !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </div>
  );
}
