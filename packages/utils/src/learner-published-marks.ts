/**
 * Shared bridge: Admin-published marks → students & parents (localStorage).
 * Same-origin only (Admin + Connect on different ports do not share storage).
 */

export const LEARNER_PUBLISHED_MARKS_KEY = "lumenx.learner-published-marks.v1";

export type LearnerPublishedSubjectMark = {
  subject: string;
  marks: number;
  maxMarks: number;
  /** Normalized score out of 100 for report cards. */
  total: number;
  grade: string;
  teacherName: string;
};

export type LearnerPublishedReport = {
  /** examId|classGrade|section|rollNo */
  id: string;
  examId: string;
  examName: string;
  classGrade: string;
  section: string;
  rollNo: string;
  studentName: string;
  publishedOn: string;
  subjects: LearnerPublishedSubjectMark[];
  percentage: number;
  grade: string;
};

function gradeLetter(total: number): string {
  if (total >= 90) return "A+";
  if (total >= 80) return "A";
  if (total >= 70) return "B+";
  if (total >= 60) return "B";
  if (total >= 50) return "C";
  if (total >= 33) return "D";
  return "F";
}

export function normalizeMarksClass(value: string): string {
  const raw = value.trim().toLowerCase();
  if (!raw) return "";
  const digits = raw.match(/\d+/);
  if (digits) return digits[0]!;
  return raw.replace(/^(grade|class|year)\s*/i, "").trim();
}

export function loadLearnerPublishedReports(): LearnerPublishedReport[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(LEARNER_PUBLISHED_MARKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LearnerPublishedReport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLearnerPublishedReports(reports: LearnerPublishedReport[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LEARNER_PUBLISHED_MARKS_KEY, JSON.stringify(reports));
  } catch {
    // Ignore quota / private mode.
  }
}

type PublishableEntry = {
  status: string;
  examId: string;
  examName: string;
  classGrade: string;
  section: string;
  subject: string;
  teacherName: string;
  maxMarks: number;
  publishedAt?: string;
  students: { rollNo: string; name: string; marks: number | null }[];
};

/** Rebuild learner-visible reports from all published admin mark entries. */
export function syncPublishedMarksToLearners(entries: PublishableEntry[]): LearnerPublishedReport[] {
  type Acc = {
    examId: string;
    examName: string;
    classGrade: string;
    section: string;
    rollNo: string;
    studentName: string;
    publishedOn: string;
    subjects: LearnerPublishedSubjectMark[];
  };

  const map = new Map<string, Acc>();

  for (const entry of entries) {
    if (entry.status !== "published") continue;
    const publishedOn = entry.publishedAt ?? new Date().toISOString().slice(0, 10);
    for (const student of entry.students) {
      if (student.marks == null) continue;
      const id = `${entry.examId}|${entry.classGrade}|${entry.section}|${student.rollNo}`;
      let row = map.get(id);
      if (!row) {
        row = {
          examId: entry.examId,
          examName: entry.examName,
          classGrade: entry.classGrade,
          section: entry.section,
          rollNo: student.rollNo,
          studentName: student.name,
          publishedOn,
          subjects: [],
        };
        map.set(id, row);
      }
      if (publishedOn > row.publishedOn) row.publishedOn = publishedOn;
      const total = entry.maxMarks
        ? Math.round((student.marks / entry.maxMarks) * 100)
        : student.marks;
      row.subjects = row.subjects.filter((s) => s.subject !== entry.subject);
      row.subjects.push({
        subject: entry.subject,
        marks: student.marks,
        maxMarks: entry.maxMarks,
        total,
        grade: gradeLetter(total),
        teacherName: entry.teacherName,
      });
    }
  }

  const reports: LearnerPublishedReport[] = [...map.entries()].map(([id, row]) => {
    const percentage = row.subjects.length
      ? Math.round(row.subjects.reduce((a, s) => a + s.total, 0) / row.subjects.length)
      : 0;
    return {
      id,
      examId: row.examId,
      examName: row.examName,
      classGrade: row.classGrade,
      section: row.section,
      rollNo: row.rollNo,
      studentName: row.studentName,
      publishedOn: row.publishedOn,
      subjects: row.subjects.sort((a, b) => a.subject.localeCompare(b.subject)),
      percentage,
      grade: gradeLetter(percentage),
    };
  });

  reports.sort((a, b) => b.publishedOn.localeCompare(a.publishedOn));
  saveLearnerPublishedReports(reports);
  return reports;
}

export function learnerReportsForStudent(
  reports: LearnerPublishedReport[],
  learner: { name?: string; rollNo?: string; className?: string; section?: string },
): LearnerPublishedReport[] {
  const roll = (learner.rollNo ?? "").trim();
  const section = (learner.section ?? "").trim().toUpperCase();
  const cls = normalizeMarksClass(learner.className ?? "");
  const name = (learner.name ?? "").trim().toLowerCase();

  return reports.filter((r) => {
    const classOk = !cls || normalizeMarksClass(r.classGrade) === cls;
    const sectionOk = !section || r.section.toUpperCase() === section;
    if (roll && r.rollNo === roll && classOk && sectionOk) return true;
    if (name && r.studentName.toLowerCase() === name && classOk && sectionOk) return true;
    if (roll && r.rollNo === roll && sectionOk) return true;
    return false;
  });
}
