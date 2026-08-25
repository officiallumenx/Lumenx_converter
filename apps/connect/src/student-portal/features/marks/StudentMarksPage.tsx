import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { ReportCardView } from "@/components/app/ReportCardView";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { countPassFail, isPassing, passFailLabel } from "@/lib/marks-utils";
import {
  mergeReportCards,
  publishedReportCardsForLearner,
} from "@/lib/learner-published-marks";
import { LEARNER_PUBLISHED_MARKS_KEY } from "@lumenx/utils";
import { cn, useLocalStorageExternalStore } from "@lumenx/ui";
import { ArrowRight } from "lucide-react";
import { PageSkeleton } from "@/student-portal/shared/ui";

export function StudentMarksPage() {
  const portal = useStudentPortal();
  const [selectedExamId, setSelectedExamId] = useState<string | undefined>();
  useLocalStorageExternalStore(LEARNER_PUBLISHED_MARKS_KEY);

  const snap = portal.isStudent ? portal.snapshot : null;

  const reportCards = useMemo(() => {
    if (!snap) return [];
    const fromAdmin = publishedReportCardsForLearner({
      name: snap.profile.name,
      rollNo: snap.profile.rollNo,
      className: snap.profile.class,
      section: snap.profile.section,
    });
    return mergeReportCards(snap.reportCards, fromAdmin);
  }, [snap]);

  const published = useMemo(
    () => reportCards.filter((r) => r.status === "published"),
    [reportCards],
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
          <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
            <AnalyticsStat
              label="Overall result"
              value={analytics.overall}
              tone={analytics.overallPass ? "pass" : "fail"}
            />
            <AnalyticsStat
              label="Subjects passed"
              value={`${analytics.passed}/${analytics.total}`}
              tone="passed"
            />
            <AnalyticsStat
              label="Subjects failed"
              value={String(analytics.failed)}
              tone={analytics.failed > 0 ? "fail" : "neutral"}
            />
            <AnalyticsStat
              label="Strongest subject"
              value={analytics.strongest ? `${analytics.strongest.total}%` : "—"}
              hint={analytics.strongest?.subject}
              tone="strong"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Link to="/academic-history" className="student-section-link whitespace-nowrap">
              Full academic history <ArrowRight className="size-3 shrink-0" aria-hidden />
            </Link>
          </div>
        </SectionCard>
      )}

      <ReportCardView
        reportCards={reportCards}
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
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "pass" | "fail" | "passed" | "strong";
}) {
  const toneCls = {
    neutral: "border-border bg-muted/20",
    pass: "border-emerald-500/30 bg-emerald-500/[0.09] dark:bg-emerald-500/15",
    fail: "border-rose-500/30 bg-rose-500/[0.09] dark:bg-rose-500/15",
    passed: "border-sky-500/30 bg-sky-500/[0.09] dark:bg-sky-500/15",
    strong: "border-amber-500/30 bg-amber-500/[0.09] dark:bg-amber-500/15",
  }[tone];
  return (
    <div className={cn("min-w-0 rounded-xl border p-2.5 shadow-soft sm:p-3", toneCls)}>
      <div className="student-stat-label">{label}</div>
      <div className="mt-0.5 font-display text-lg font-semibold tabular-nums text-foreground sm:text-xl">
        {value}
      </div>
      {hint && <div className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
