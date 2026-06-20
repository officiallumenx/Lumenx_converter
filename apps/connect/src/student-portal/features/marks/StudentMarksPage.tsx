import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { ReportCardView } from "@/components/app/ReportCardView";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { countPassFail, isPassing, passFailLabel } from "@/lib/marks-utils";
import { cn } from "@lumenx/ui";
import { ArrowRight } from "lucide-react";
import { PageSkeleton } from "@/student-portal/shared/ui";

export function StudentMarksPage() {
  const portal = useStudentPortal();
  const [selectedExamId, setSelectedExamId] = useState<string | undefined>();

  const snap = portal.isStudent ? portal.snapshot : null;
  const published = useMemo(
    () => snap?.reportCards.filter((r) => r.status === "published") ?? [],
    [snap?.reportCards],
  );

  const selected =
    published.find((r) => r.id === selectedExamId) ?? published[published.length - 1];
  const marks = selected?.marks ?? [];

  const analytics = useMemo(() => {
    const { passed, failed } = countPassFail(marks);
    const strongest = [...marks].sort((a, b) => b.total - a.total)[0];
    return {
      passed,
      failed,
      strongest,
      total: marks.length,
      examLabel: selected?.term ?? "—",
      overall: selected ? passFailLabel(selected.percentage) : "—",
      overallPass: selected ? isPassing(selected.percentage) : false,
    };
  }, [marks, selected]);

  if (!portal.isStudent) return null;
  if (portal.isLoading || !snap) return <PageSkeleton rows={6} />;

  const profile = snap.profile;

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <PageHeader
        title="My Marks & Report Cards"
        subtitle={`${profile.name} • ${profile.class} ${profile.section} • Roll ${profile.rollNo}`}
      />

      {selected && (
        <SectionCard title={`${analytics.examLabel} — summary`}>
          <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
            <AnalyticsStat
              label="Overall result"
              value={analytics.overall}
              tone={analytics.overallPass ? "success" : "warning"}
            />
            <AnalyticsStat label="Subjects passed" value={`${analytics.passed}/${analytics.total}`} tone="success" />
            <AnalyticsStat
              label="Subjects failed"
              value={String(analytics.failed)}
              tone={analytics.failed > 0 ? "warning" : "default"}
            />
            <AnalyticsStat
              label="Strongest subject"
              value={analytics.strongest ? `${analytics.strongest.total}%` : "—"}
              hint={analytics.strongest?.subject}
              tone="primary"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Link to="/academic-history" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
              Full academic history <ArrowRight className="size-3" />
            </Link>
          </div>
        </SectionCard>
      )}

      <ReportCardView
        reportCards={snap.reportCards}
        termPerformance={snap.performance}
        showTeacherRemarks={false}
        detailsLinkTo="/academic-history"
        hideDrafts
        selectedId={selectedExamId ?? selected?.id}
        onSelectedIdChange={setSelectedExamId}
      />
    </div>
  );
}

function AnalyticsStat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "primary" | "success" | "warning";
}) {
  const toneCls = {
    default: "",
    primary: "border-primary/20 bg-primary/5",
    success: "border-success/20 bg-success/5",
    warning: "border-warning/20 bg-warning/5",
  }[tone];
  return (
    <div className={cn("rounded-xl border bg-muted/20 p-3", toneCls)}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-display text-xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
