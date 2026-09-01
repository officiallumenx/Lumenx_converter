import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  actorHasInstituteRole,
  requireInstituteId,
  requireTeacherIdentity,
} from "../../authorization/index.js";
import { listEnrollments } from "../academics/repository.js";
import { findExamById } from "../exams/repository.js";
import { findStudentById } from "../students/repository.js";
import { findTeacherById } from "../teachers/repository.js";
import {
  findTeacherAssignmentMatch,
  listMarkEntries,
  listScoresForEntry,
} from "./repository.js";
import {
  assertCanAccessStudentMarks,
} from "./service.js";
import type {
  ReportCardSubjectDto,
  StudentReportCardDto,
  TeacherMarkSheetDto,
  TeacherMarkSheetRowDto,
} from "./types.js";

function gradeLetter(total: number): string {
  if (total >= 90) return "A+";
  if (total >= 80) return "A";
  if (total >= 70) return "B+";
  if (total >= 60) return "B";
  if (total >= 50) return "C";
  if (total >= 33) return "D";
  return "F";
}

function normalizeTo100(marks: number, maxMarks: number): number {
  return maxMarks > 0 ? Math.round((marks / maxMarks) * 100) : marks;
}

async function loadSubjectLabel(
  admin: SupabaseClient,
  subjectId: string,
): Promise<string> {
  const res = await admin
    .from("subject")
    .select("name, code")
    .eq("id", subjectId)
    .maybeSingle();
  const row = res.data as { name: string | null; code: string | null } | null;
  return row?.name?.trim() || row?.code?.trim() || "Subject";
}

async function loadTeacherLabel(
  admin: SupabaseClient,
  teacherId: string,
): Promise<string> {
  const teacher = await findTeacherById(admin, teacherId);
  return teacher?.display_name?.trim() || "Teacher";
}

export async function getStudentReportCardsForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: { instituteId: string; studentId: string },
): Promise<StudentReportCardDto[]> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  await assertCanAccessStudentMarks(admin, actor, instituteId, input.studentId);

  const student = await findStudentById(admin, input.studentId);
  if (!student || student.institute_id !== instituteId) {
    throw AppError.notFound("Student not found");
  }

  const enrollments = await listEnrollments(admin, {
    instituteId,
    studentId: input.studentId,
    status: "active",
  });
  if (enrollments.length === 0) return [];

  const sectionIds = [...new Set(enrollments.map((e) => e.section_id))];
  const entryGroups = await Promise.all(
    sectionIds.map((sectionId) =>
      listMarkEntries(admin, {
        instituteId,
        sectionId,
        status: "published",
      }),
    ),
  );
  const entries = entryGroups.flat();
  if (entries.length === 0) return [];

  const cardsByExam = new Map<
    string,
    {
      examName: string;
      publishedOn: string;
      subjects: ReportCardSubjectDto[];
    }
  >();

  for (const entry of entries) {
    const scores = await listScoresForEntry(admin, entry.id);
    const score = scores.find((s) => s.student_id === input.studentId);
    if (!score || score.marks == null) continue;

    const exam = await findExamById(admin, entry.exam_id);
    const examName = exam?.name?.trim() || "Exam";
    const subject = await loadSubjectLabel(admin, entry.subject_id);
    const teacherName = await loadTeacherLabel(admin, entry.teacher_id);
    const total = normalizeTo100(score.marks, entry.max_marks);
    const publishedOn =
      entry.published_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

    let card = cardsByExam.get(entry.exam_id);
    if (!card) {
      card = { examName, publishedOn, subjects: [] };
      cardsByExam.set(entry.exam_id, card);
    }
    if (publishedOn > card.publishedOn) card.publishedOn = publishedOn;
    card.subjects = card.subjects.filter((s) => s.subjectId !== entry.subject_id);
    card.subjects.push({
      subjectId: entry.subject_id,
      subject,
      marks: score.marks,
      maxMarks: entry.max_marks,
      total,
      grade: gradeLetter(total),
      teacherName,
    });
  }

  const reportCards: StudentReportCardDto[] = [];
  for (const [examId, card] of cardsByExam) {
    const percentage = card.subjects.length
      ? Math.round(
          card.subjects.reduce((sum, s) => sum + s.total, 0) / card.subjects.length,
        )
      : 0;
    reportCards.push({
      id: examId,
      examId,
      examName: card.examName,
      term: card.examName,
      publishedOn: card.publishedOn,
      marks: card.subjects.sort((a, b) => a.subject.localeCompare(b.subject)),
      percentage,
      grade: gradeLetter(percentage),
      status: "published",
    });
  }

  return reportCards.sort((a, b) => b.publishedOn.localeCompare(a.publishedOn));
}

export async function getTeacherMarkSheetForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: {
    instituteId: string;
    sectionId: string;
    examId: string;
    subjectId: string;
  },
): Promise<TeacherMarkSheetDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertInstituteAccess(actor, instituteId);

  if (!actorHasInstituteRole(actor, instituteId, "teacher")) {
    throw AppError.forbidden("Insufficient permissions");
  }

  const identity = requireTeacherIdentity(actor, instituteId);
  const sectionRes = await admin
    .from("section")
    .select("id, institute_id, academic_year_id, class_id")
    .eq("id", input.sectionId)
    .maybeSingle();
  const section = sectionRes.data as {
    id: string;
    institute_id: string;
    academic_year_id: string;
    class_id: string;
  } | null;
  if (!section || section.institute_id !== instituteId) {
    throw AppError.notFound("Section not found");
  }

  const assignment = await findTeacherAssignmentMatch(admin, {
    teacherId: identity.teacherId,
    instituteId,
    academicYearId: section.academic_year_id,
    classId: section.class_id,
    sectionId: input.sectionId,
    subjectId: input.subjectId,
  });
  if (!assignment) {
    throw AppError.forbidden("Teacher is not assigned to this section/subject");
  }

  const exam = await findExamById(admin, input.examId);
  if (!exam || exam.institute_id !== instituteId) {
    throw AppError.notFound("Exam not found");
  }

  const enrollments = await listEnrollments(admin, {
    instituteId,
    sectionId: input.sectionId,
    status: "active",
  });

  const entries = await listMarkEntries(admin, {
    instituteId,
    sectionId: input.sectionId,
    examId: input.examId,
    subjectId: input.subjectId,
    teacherId: identity.teacherId,
  });
  const entry = entries[0] ?? null;
  const scores = entry ? await listScoresForEntry(admin, entry.id) : [];
  const scoreByEnrollment = new Map(scores.map((s) => [s.enrollment_id, s.marks]));

  const rows: TeacherMarkSheetRowDto[] = [];
  for (const enr of enrollments) {
    const student = await findStudentById(admin, enr.student_id);
    rows.push({
      studentId: enr.student_id,
      enrollmentId: enr.id,
      studentName: student?.display_name?.trim() || "Student",
      rollNo: enr.roll_no,
      marks: scoreByEnrollment.get(enr.id) ?? null,
    });
  }

  rows.sort((a, b) =>
    (a.rollNo ?? "").localeCompare(b.rollNo ?? "", undefined, { numeric: true }) ||
    a.studentName.localeCompare(b.studentName),
  );

  const examName = exam.name?.trim() || "Exam";
  const subjectName = await loadSubjectLabel(admin, input.subjectId);

  return {
    entryId: entry?.id ?? null,
    instituteId,
    academicYearId: section.academic_year_id,
    classId: section.class_id,
    sectionId: input.sectionId,
    examId: input.examId,
    examName,
    subjectId: input.subjectId,
    subjectName,
    maxMarks: entry?.max_marks ?? exam.total_marks ?? 100,
    status: entry?.status ?? "none",
    rows,
  };
}
