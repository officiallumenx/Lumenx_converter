import type { ReportCard, SubjectMark } from "@lumenx/types";
import {
  learnerReportsForStudent,
  loadLearnerPublishedReports,
  type LearnerPublishedReport,
} from "@lumenx/utils";

/** Convert admin-published learner reports into Connect ReportCard shape. */
export function learnerReportToReportCard(report: LearnerPublishedReport): ReportCard {
  const marks: SubjectMark[] = report.subjects.map((s) => {
    // Split total/100 into internal/20 + exam/80 for existing report card UI.
    const exam = Math.round((s.total / 100) * 80);
    const internal = Math.max(0, Math.min(20, s.total - exam));
    return {
      subject: s.subject,
      internal,
      exam,
      total: s.total,
      grade: s.grade,
      remark: `Teacher: ${s.teacherName}`,
    };
  });
  return {
    id: `admin-${report.id}`,
    term: report.examName,
    publishedOn: report.publishedOn,
    marks,
    percentage: report.percentage,
    grade: report.grade,
    rank: 0,
    status: "published",
  };
}

export function publishedReportCardsForLearner(learner: {
  name?: string;
  rollNo?: string;
  className?: string;
  section?: string;
}): ReportCard[] {
  const reports = learnerReportsForStudent(loadLearnerPublishedReports(), learner);
  return reports.map(learnerReportToReportCard);
}

/** Merge admin-published cards ahead of mock/seed cards (dedupe by term + id). */
export function mergeReportCards(base: ReportCard[], fromAdmin: ReportCard[]): ReportCard[] {
  if (fromAdmin.length === 0) return base;
  const seen = new Set(fromAdmin.map((c) => c.id));
  const rest = base.filter((c) => !seen.has(c.id));
  return [...fromAdmin, ...rest];
}
