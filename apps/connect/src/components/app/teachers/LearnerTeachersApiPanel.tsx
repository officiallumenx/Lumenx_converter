import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { TeacherCard, TeacherDetailDialog } from "@/components/app/TeacherDetailDialog";
import { loadLearnerTeachers } from "@/lib/teachers";
import { useApp } from "@/lib/app-state";

type LearnerTeachersApiPanelProps = {
  studentId: string;
  subtitle: string;
};

export function LearnerTeachersApiPanel({ studentId, subtitle }: LearnerTeachersApiPanelProps) {
  const { activeInstituteId } = useApp();
  const [status, setStatus] = useState<string>("loading");
  const [error, setError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<
    ReturnType<typeof loadLearnerTeachers> extends Promise<infer T> ? T["teachers"] : never
  >([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    void loadLearnerTeachers({ instituteId: activeInstituteId, studentId }).then((result) => {
      if (cancelled) return;
      setTeachers(result.teachers);
      setStatus(result.status);
      setError(result.errorMessage);
    });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId, studentId, reloadKey]);

  const selected = teachers.find((teacher) => teacher.id === selectedId) ?? null;

  if (status === "loading") {
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
            <button
              type="button"
              className="text-sm text-primary underline"
              onClick={() => setReloadKey((key) => key + 1)}
            >
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
