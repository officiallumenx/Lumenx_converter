import { useEffect, useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { EmptyState, PageSkeleton } from "@/student-portal/shared/ui";
import { useApp } from "@/lib/app-state";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { useParentPortal } from "@/context/ParentPortalContext";
import { isApiAuthMode } from "@/auth/auth-mode";
import { listDiaryDays } from "@/lib/diary/api";
import type { DiaryDayDto } from "@/lib/diary/types";
import { Badge } from "@lumenx/ui";

type LearnerDiaryPageProps = {
  readOnlyParent?: boolean;
};

const DEMO_DAYS: DiaryDayDto[] = [
  {
    id: "demo-diary-1",
    instituteId: "demo",
    academicYearId: null,
    teacherId: "demo-teacher",
    diaryDate: "2026-09-04",
    scope: "subject",
    submittedAt: "2026-09-04T16:00:00.000Z",
    createdAt: "2026-09-04T10:00:00.000Z",
    updatedAt: "2026-09-04T16:00:00.000Z",
    rows: [
      {
        id: "demo-row-1",
        sectionId: null,
        classLabel: "Class demo",
        description: "Completed chapter review and practice problems.",
        sortOrder: 0,
        createdAt: "2026-09-04T10:00:00.000Z",
        updatedAt: "2026-09-04T16:00:00.000Z",
      },
    ],
  },
];

export function LearnerDiaryPage({ readOnlyParent = false }: LearnerDiaryPageProps) {
  const { activeInstituteId, role } = useApp();
  const studentPortal = useStudentPortal();
  const parentPortal = useParentPortal();
  const [days, setDays] = useState<DiaryDayDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const childName = useMemo(() => {
    if (readOnlyParent && parentPortal.snapshot) return parentPortal.snapshot.child.name;
    if (studentPortal.snapshot) return studentPortal.snapshot.profile.name;
    return null;
  }, [readOnlyParent, parentPortal.snapshot, studentPortal.snapshot]);

  const instituteId = readOnlyParent
    ? parentPortal.instituteId ?? activeInstituteId
    : activeInstituteId;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      if (!isApiAuthMode()) {
        if (!cancelled) {
          setDays(DEMO_DAYS);
          setLoading(false);
        }
        return;
      }
      if (!instituteId) {
        if (!cancelled) {
          setDays([]);
          setError("Select an institute to view class diary.");
          setLoading(false);
        }
        return;
      }
      try {
        const rows = await listDiaryDays({
          instituteId,
          submitted: true,
        });
        if (!cancelled) {
          setDays(
            rows
              .slice()
              .sort((a, b) => b.diaryDate.localeCompare(a.diaryDate)),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setDays([]);
          setError(err instanceof Error ? err.message : "Failed to load diary");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [instituteId]);

  if (readOnlyParent && role !== "parent") return null;
  if (!readOnlyParent && role !== "student") return null;
  if (readOnlyParent && parentPortal.isLoading && !parentPortal.snapshot) {
    return <PageSkeleton rows={5} />;
  }
  if (loading) return <PageSkeleton rows={5} />;

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Class Diary"
        subtitle={
          readOnlyParent
            ? `Read-only submitted diary${childName ? ` for ${childName}` : ""}`
            : "Submitted class work notes from your teachers"
        }
      />

      {error ? (
        <EmptyState
          icon={BookOpen}
          title="Diary unavailable"
          description={error}
        />
      ) : days.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No diary entries yet"
          description="Submitted class diary notes for your section will appear here."
        />
      ) : (
        <div className="space-y-3">
          {days.map((day) => (
            <SectionCard
              key={day.id}
              title={day.diaryDate}
              action={
                <Badge variant="outline" className="capitalize">
                  {day.scope}
                </Badge>
              }
            >
              <div className="space-y-2">
                {day.rows.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    <div className="text-xs font-medium text-muted-foreground">
                      {row.classLabel}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-foreground">
                      {row.description}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
