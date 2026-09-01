import type { ReportCard, SubjectMark } from "@lumenx/types";
import type { LearnerExamSchedule, LearnerExamSlot } from "@lumenx/module-exams";
import type { ExamDto } from "@/lib/exams/types";
import type {
  ConnectMarkRow,
  StudentReportCardDto,
  TeacherMarkSheetDto,
} from "./types";

export function reportCardDtoToReportCard(dto: StudentReportCardDto): ReportCard {
  const marks: SubjectMark[] = dto.marks.map((row) => ({
    subject: row.subject,
    internal: 0,
    exam: row.total,
    total: row.total,
    grade: row.grade,
    remark: row.teacherName ? `Teacher: ${row.teacherName}` : undefined,
  }));
  return {
    id: dto.id,
    term: dto.term,
    publishedOn: dto.publishedOn,
    marks,
    percentage: dto.percentage,
    grade: dto.grade,
    rank: 0,
    status: "published",
  };
}

export function reportCardDtosToReportCards(dtos: StudentReportCardDto[]): ReportCard[] {
  return dtos.map(reportCardDtoToReportCard);
}

export function teacherSheetToConnectRows(sheet: TeacherMarkSheetDto): ConnectMarkRow[] {
  return sheet.rows.map((row) => ({
    studentId: row.studentId,
    enrollmentId: row.enrollmentId,
    studentName: row.studentName,
    roll: row.rollNo?.trim() || "—",
    marks: row.marks,
    maxMarks: sheet.maxMarks,
  }));
}

export function examDtoToLearnerSchedule(
  exam: ExamDto,
  subjectLabels: Map<string, string>,
  classGrade?: string,
): LearnerExamSchedule {
  const grades =
    exam.audienceScope === "section"
      ? exam.targetSections.map((t) => classGrade ?? t.classId)
      : [];
  const slots: LearnerExamSlot[] = exam.subjectSchedules.map((schedule, index) => ({
    date: schedule.paperDate,
    dayNumber: index + 1,
    subject:
      subjectLabels.get(schedule.subjectId)?.trim() ||
      schedule.subjectId.slice(0, 8),
    startTime: schedule.startsAt.slice(0, 5),
    endTime: schedule.endsAt.slice(0, 5),
    room: schedule.room ?? undefined,
  }));

  return {
    examId: exam.id,
    examName: exam.name,
    header: exam.header,
    term: exam.name,
    classScope: exam.audienceScope === "year" ? "all" : "selected",
    grades,
    startDate: exam.startDate,
    endDate: exam.endDate,
    startTime: exam.defaultStartsAt.slice(0, 5),
    endTime: exam.defaultEndsAt.slice(0, 5),
    timetableStatus: exam.scheduleStatus === "published" ? "published" : "draft",
    slots,
    updatedAt: exam.updatedAt,
  };
}

export function examDtosToLearnerSchedules(
  exams: ExamDto[],
  subjectLabels: Map<string, string>,
  classGrade?: string,
): LearnerExamSchedule[] {
  return exams
    .filter((exam) => exam.scheduleStatus === "published")
    .map((exam) => examDtoToLearnerSchedule(exam, subjectLabels, classGrade));
}
