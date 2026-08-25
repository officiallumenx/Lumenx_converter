/**
 * Admin marks entries — one unit per teacher × subject × class × section × exam.
 * Status flow: pending → submitted → published | returned | rejected.
 * Admin may Approve (publish), Reject, or Return to Teacher — never edit scores.
 */

import {
  ADMIN_CLASSES,
  ADMIN_EXAMS,
  ADMIN_SECTIONS,
  ADMIN_SUBJECTS,
  MARK_ROWS,
} from "@/lib/admin-module-data";
import { loadClassDirectory } from "@/lib/class-directory-store";
import {
  getInstituteTeachers,
  getSubjectCatalog,
  type InstituteTeacher,
} from "@/lib/subjects-data";
import { syncPublishedMarksToLearners } from "@lumenx/utils";
import { notifyExamResultsPublished } from "@lumenx/module-notifications";
import { createLocalStorageStore } from "@/lib/client-data-store";

export type MarkEntryStatus =
  | "pending"
  | "submitted"
  | "published"
  | "returned"
  | "rejected";

export type MarkStudentScore = {
  studentId: string;
  rollNo: string;
  name: string;
  marks: number | null;
};

export type MarkEntry = {
  id: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  classGrade: string;
  section: string;
  examId: string;
  examName: string;
  maxMarks: number;
  status: MarkEntryStatus;
  submittedAt?: string;
  publishedAt?: string;
  adminNote?: string;
  students: MarkStudentScore[];
};

export type MarksInstituteSummary = {
  classes: number;
  sections: number;
  subjects: number;
  teachers: number;
  pending: number;
  submitted: number;
  published: number;
  total: number;
};

export type TeacherMarksSummary = {
  teacherId: string;
  teacherName: string;
  pending: number;
  submitted: number;
  published: number;
  total: number;
  subjects: string[];
};

const STORAGE_KEY = "lumenx.admin.marks-entries.v1";
const MARKS_CHANGED_EVENT = "lumenx-admin-marks-changed";

function entryId(
  teacherId: string,
  examId: string,
  classGrade: string,
  section: string,
  subject: string,
): string {
  return `${teacherId}|${examId}|${classGrade}|${section}|${subject}`;
}

function maxForExam(examId: string): number {
  if (examId === "EX-MID") return 80;
  if (examId === "EX-FIN") return 100;
  return 50;
}

function teacherForSubject(
  subject: string,
  classGrade: string,
  section: string,
  teachers: InstituteTeacher[],
): InstituteTeacher | null {
  const classes = loadClassDirectory();
  const cls = classes.find(
    (c) =>
      (c.timetableGrade === classGrade || c.name.includes(classGrade.replace("Grade ", ""))) &&
      c.section === section,
  );
  const assignedName = cls?.subjectTeacherAssignments?.[subject]?.trim();
  if (assignedName) {
    const byName = teachers.find((t) => t.name === assignedName);
    if (byName) return byName;
  }

  const catalog = getSubjectCatalog().find(
    (s) =>
      s.name === subject &&
      s.status === "active" &&
      (s.grades.length === 0 || s.grades.includes(classGrade)),
  );
  if (catalog?.assignedTeacherIds[0]) {
    const byId = teachers.find((t) => t.id === catalog.assignedTeacherIds[0]);
    if (byId) return byId;
  }

  const byDept = teachers.find(
    (t) =>
      t.subjects.some((s) => s === subject || s.toLowerCase().includes(subject.toLowerCase())) ||
      t.department === subject,
  );
  return byDept ?? teachers[0] ?? null;
}

function studentsForClassSection(classGrade: string, section: string): MarkStudentScore[] {
  const seen = new Map<string, MarkStudentScore>();
  for (const row of MARK_ROWS) {
    if (row.classGrade !== classGrade || row.section !== section) continue;
    if (!seen.has(row.rollNo)) {
      seen.set(row.rollNo, {
        studentId: `ST-${row.rollNo}`,
        rollNo: row.rollNo,
        name: row.name,
        marks: null,
      });
    }
  }
  if (seen.size > 0) return [...seen.values()];

  return [1, 2, 3].map((n) => ({
    studentId: `ST-${classGrade}-${section}-${n}`,
    rollNo: `${classGrade.replace(/\D/g, "")}${section}${n}`.slice(0, 6),
    name: `Student ${n}`,
    marks: null,
  }));
}

function applySeedScores(entries: MarkEntry[]): MarkEntry[] {
  const teachers = getInstituteTeachers();
  const byKey = new Map(
    entries.map((e) => [e.id, { ...e, students: e.students.map((s) => ({ ...s })) }]),
  );

  for (const row of MARK_ROWS) {
    for (const subject of ADMIN_SUBJECTS) {
      const score = row.marks[subject];
      if (score == null) continue;
      const teacher = teacherForSubject(subject, row.classGrade, row.section, teachers);
      if (!teacher) continue;
      const id = entryId(teacher.id, row.examId, row.classGrade, row.section, subject);
      const entry = byKey.get(id);
      if (!entry) continue;

      const student = entry.students.find((s) => s.rollNo === row.rollNo);
      if (student) student.marks = score;
      else {
        entry.students.push({
          studentId: `ST-${row.rollNo}`,
          rollNo: row.rollNo,
          name: row.name,
          marks: score,
        });
      }

      if (row.adminPublished) {
        entry.status = "published";
        entry.publishedAt = entry.publishedAt ?? "2026-03-01";
        entry.submittedAt = entry.submittedAt ?? "2026-02-28";
      } else if (row.teacherPublished) {
        if (entry.status !== "published") {
          entry.status = "submitted";
          entry.submittedAt = entry.submittedAt ?? "2026-02-28";
        }
      }
    }
  }

  return [...byKey.values()];
}

function buildClassSectionPairs(): { classGrade: string; section: string }[] {
  const classes = loadClassDirectory();
  const pairs: { classGrade: string; section: string }[] = [];
  const seen = new Set<string>();

  for (const c of classes) {
    const mapped =
      ADMIN_CLASSES.find((g) => c.timetableGrade === g || c.name.includes(g)) ??
      ADMIN_CLASSES.find((g) => {
        const num = g.replace("Grade ", "");
        return c.timetableGrade.includes(num) || c.name.includes(num);
      });
    if (!mapped) continue;
    const key = `${mapped}|${c.section}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({ classGrade: mapped, section: c.section });
  }

  if (pairs.length > 0) return pairs;

  for (const classGrade of ADMIN_CLASSES) {
    for (const section of ADMIN_SECTIONS) {
      pairs.push({ classGrade, section });
    }
  }
  return pairs;
}

/** Build the full matrix of expected mark entries for the institute. */
export function buildMarkEntries(): MarkEntry[] {
  const teachers = getInstituteTeachers();
  const pairs = buildClassSectionPairs();
  const entries: MarkEntry[] = [];
  const seen = new Set<string>();

  for (const exam of ADMIN_EXAMS) {
    for (const { classGrade, section } of pairs) {
      for (const subject of ADMIN_SUBJECTS) {
        const teacher = teacherForSubject(subject, classGrade, section, teachers);
        if (!teacher) continue;
        const id = entryId(teacher.id, exam.id, classGrade, section, subject);
        if (seen.has(id)) continue;
        seen.add(id);
        entries.push({
          id,
          teacherId: teacher.id,
          teacherName: teacher.name,
          subject,
          classGrade,
          section,
          examId: exam.id,
          examName: exam.name,
          maxMarks: maxForExam(exam.id),
          status: "pending",
          students: studentsForClassSection(classGrade, section),
        });
      }
    }
  }

  return applySeedScores(entries);
}

function seedMarksEntries(): MarkEntry[] {
  return buildMarkEntries();
}

function parseStoredEntries(raw: string): MarkEntry[] {
  const parsed = JSON.parse(raw) as MarkEntry[];
  return Array.isArray(parsed) && parsed.length > 0 ? parsed : seedMarksEntries();
}

const marksEntriesStore = createLocalStorageStore<MarkEntry[]>({
  storageKey: STORAGE_KEY,
  eventName: MARKS_CHANGED_EVENT,
  seed: seedMarksEntries,
  parse: parseStoredEntries,
});

export function saveMarkEntries(entries: MarkEntry[]): void {
  marksEntriesStore.set(entries);
}

/** Pure snapshot for React subscriptions — no learner sync side effects. */
export function getMarkEntriesSnapshot(): MarkEntry[] {
  return marksEntriesStore.load();
}

export function loadMarkEntries(): MarkEntry[] {
  const entries = marksEntriesStore.load();
  syncPublishedMarksToLearners(entries);
  return entries;
}

export function resetMarkEntries(): MarkEntry[] {
  const fresh = buildMarkEntries();
  marksEntriesStore.set(fresh);
  syncPublishedMarksToLearners(fresh);
  return fresh;
}

export function subscribeMarkEntries(listener: () => void): () => void {
  return marksEntriesStore.subscribe(listener);
}

export function useMarkEntriesSnapshot(): MarkEntry[] {
  return marksEntriesStore.useSnapshot();
}

export function mutateMarkEntries(updater: (entries: MarkEntry[]) => MarkEntry[]): MarkEntry[] {
  const next = marksEntriesStore.mutate(updater);
  syncPublishedMarksToLearners(next);
  return next;
}

export function summarizeMarks(entries: MarkEntry[]): MarksInstituteSummary {
  const classSet = new Set(entries.map((e) => e.classGrade));
  const sectionSet = new Set(entries.map((e) => `${e.classGrade}|${e.section}`));
  const subjectSet = new Set(entries.map((e) => e.subject));
  const teacherSet = new Set(entries.map((e) => e.teacherId));
  return {
    classes: classSet.size,
    sections: sectionSet.size,
    subjects: subjectSet.size,
    teachers: teacherSet.size,
    pending: entries.filter(
      (e) => e.status === "pending" || e.status === "returned" || e.status === "rejected",
    ).length,
    submitted: entries.filter((e) => e.status === "submitted").length,
    published: entries.filter((e) => e.status === "published").length,
    total: entries.length,
  };
}

export function summarizeByTeacher(entries: MarkEntry[]): TeacherMarksSummary[] {
  const map = new Map<string, TeacherMarksSummary>();
  for (const e of entries) {
    let row = map.get(e.teacherId);
    if (!row) {
      row = {
        teacherId: e.teacherId,
        teacherName: e.teacherName,
        pending: 0,
        submitted: 0,
        published: 0,
        total: 0,
        subjects: [],
      };
      map.set(e.teacherId, row);
    }
    row.total += 1;
    if (e.status === "pending" || e.status === "returned" || e.status === "rejected") {
      row.pending += 1;
    } else if (e.status === "submitted") {
      row.submitted += 1;
    } else if (e.status === "published") {
      row.published += 1;
    }
    if (!row.subjects.includes(e.subject)) row.subjects.push(e.subject);
  }
  return [...map.values()].sort((a, b) => {
    if (b.pending !== a.pending) return b.pending - a.pending;
    if (b.submitted !== a.submitted) return b.submitted - a.submitted;
    return a.teacherName.localeCompare(b.teacherName);
  });
}

/** Teachers who still have at least one pending mark paper (for principal alerts). */
export function teachersWithPendingMarks(entries: MarkEntry[]): {
  teacherId: string;
  teacherName: string;
  pendingCount: number;
}[] {
  return summarizeByTeacher(entries)
    .filter((t) => t.pending > 0)
    .map((t) => ({
      teacherId: t.teacherId,
      teacherName: t.teacherName,
      pendingCount: t.pending,
    }));
}

export function filterMarkEntries(
  entries: MarkEntry[],
  filters: {
    teacherId?: string;
    subject?: string;
    classGrade?: string;
    section?: string;
    examId?: string;
    status?: MarkEntryStatus | "all";
    q?: string;
  },
): MarkEntry[] {
  const q = filters.q?.trim().toLowerCase() ?? "";
  return entries.filter((e) => {
    if (filters.teacherId && filters.teacherId !== "all" && e.teacherId !== filters.teacherId)
      return false;
    if (filters.subject && filters.subject !== "all" && e.subject !== filters.subject) return false;
    if (filters.classGrade && filters.classGrade !== "all" && e.classGrade !== filters.classGrade)
      return false;
    if (filters.section && filters.section !== "all" && e.section !== filters.section) return false;
    if (filters.examId && filters.examId !== "all" && e.examId !== filters.examId) return false;
    if (filters.status && filters.status !== "all" && e.status !== filters.status) return false;
    if (
      q &&
      !e.teacherName.toLowerCase().includes(q) &&
      !e.subject.toLowerCase().includes(q) &&
      !e.examName.toLowerCase().includes(q) &&
      !e.classGrade.toLowerCase().includes(q)
    ) {
      return false;
    }
    return true;
  });
}

export function publishMarkEntry(entries: MarkEntry[], entryIdValue: string): MarkEntry[] {
  const now = new Date().toISOString().slice(0, 10);
  const next = entries.map((e) => {
    if (e.id !== entryIdValue) return e;
    if (e.status !== "submitted") return e;
    return {
      ...e,
      status: "published" as const,
      publishedAt: now,
      adminNote: undefined,
    };
  });
  syncPublishedMarksToLearners(next);
  const published = next.find((e) => e.id === entryIdValue && e.status === "published");
  if (published) {
    notifyExamResultsPublished({
      examId: published.examId,
      examName: published.examName,
      subject: published.subject,
    });
  }
  return next;
}

export function publishAllSubmitted(entries: MarkEntry[], ids: string[]): MarkEntry[] {
  const set = new Set(ids);
  const now = new Date().toISOString().slice(0, 10);
  const next = entries.map((e) => {
    if (!set.has(e.id) || e.status !== "submitted") return e;
    return {
      ...e,
      status: "published" as const,
      publishedAt: now,
      adminNote: undefined,
    };
  });
  syncPublishedMarksToLearners(next);
  const published = next.filter((e) => set.has(e.id) && e.status === "published");
  const byExam = new Map<string, MarkEntry>();
  for (const e of published) byExam.set(e.examId, e);
  for (const e of byExam.values()) {
    notifyExamResultsPublished({
      examId: e.examId,
      examName: e.examName,
      subject: e.subject,
    });
  }
  return next;
}

/** Approve = publish submitted marks (Admin never edits scores). */
export function approveMarkEntry(entries: MarkEntry[], entryIdValue: string): MarkEntry[] {
  return publishMarkEntry(entries, entryIdValue);
}

/** Return submitted marks to the teacher for correction. */
export function returnMarkEntry(
  entries: MarkEntry[],
  entryIdValue: string,
  note?: string,
): MarkEntry[] {
  return entries.map((e) => {
    if (e.id !== entryIdValue || e.status !== "submitted") return e;
    return {
      ...e,
      status: "returned" as const,
      submittedAt: undefined,
      adminNote: note?.trim() || "Returned to teacher for correction.",
    };
  });
}

/** Reject submitted marks (teacher must resubmit). */
export function rejectMarkEntry(
  entries: MarkEntry[],
  entryIdValue: string,
  note?: string,
): MarkEntry[] {
  return entries.map((e) => {
    if (e.id !== entryIdValue || e.status !== "submitted") return e;
    return {
      ...e,
      status: "rejected" as const,
      submittedAt: undefined,
      adminNote: note?.trim() || "Rejected by Admin.",
    };
  });
}

export function markEntryAvgPct(entry: MarkEntry): number | null {
  const scored = entry.students.filter((s) => s.marks != null);
  if (scored.length === 0 || !entry.maxMarks) return null;
  const sum = scored.reduce((a, s) => a + (s.marks ?? 0), 0);
  return Math.round((sum / (scored.length * entry.maxMarks)) * 100);
}

export { ADMIN_CLASSES, ADMIN_SECTIONS, ADMIN_EXAMS, ADMIN_SUBJECTS };
