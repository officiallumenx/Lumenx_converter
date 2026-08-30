import type {
  MarkEntryDto,
  MarkEntryListItem,
  MarksLookupMaps,
  MarkStudentScoreItem,
} from "./types";

function shortRef(id: string, prefix: string): string {
  const token = id?.trim().slice(0, 8) || "—";
  return `${prefix} · ${token}`;
}

function mapScores(
  dto: MarkEntryDto,
  lookups?: MarksLookupMaps,
): MarkStudentScoreItem[] {
  const scores = dto.scores ?? [];
  return scores.map((score) => {
    const enrollment = lookups?.enrollmentsById?.get(score.enrollmentId);
    return {
      studentId: score.studentId,
      enrollmentId: score.enrollmentId,
      rollNo: enrollment?.rollNo?.trim() || "—",
      name:
        enrollment?.studentName?.trim() ||
        shortRef(score.studentId, "Student"),
      marks: score.marks,
    };
  });
}

export function markEntryDtoToListItem(
  dto: MarkEntryDto,
  lookups?: MarksLookupMaps,
): MarkEntryListItem {
  const exam = lookups?.examsById?.get(dto.examId);
  const subject = lookups?.subjectsById?.get(dto.subjectId);
  const teacher = lookups?.teachersById?.get(dto.teacherId);
  const section = lookups?.sectionsById?.get(dto.sectionId);
  const cls =
    lookups?.classesById?.get(dto.classId) ??
    (section ? lookups?.classesById?.get(section.classId) : undefined);

  return {
    id: dto.id,
    instituteId: dto.instituteId,
    academicYearId: dto.academicYearId,
    classId: dto.classId,
    sectionId: dto.sectionId,
    subjectId: dto.subjectId,
    teacherId: dto.teacherId,
    teacherName: teacher?.name?.trim() || shortRef(dto.teacherId, "Teacher"),
    subject:
      subject?.name?.trim() ||
      subject?.code?.trim() ||
      shortRef(dto.subjectId, "Subject"),
    classGrade:
      cls?.name?.trim() || cls?.code?.trim() || shortRef(dto.classId, "Class"),
    section:
      section?.code?.trim() ||
      section?.name?.trim() ||
      shortRef(dto.sectionId, "Sec"),
    examId: dto.examId,
    examName: exam?.name?.trim() || shortRef(dto.examId, "Exam"),
    maxMarks: dto.maxMarks,
    status: dto.status,
    submittedAt: dto.submittedAt ?? undefined,
    publishedAt: dto.publishedAt ?? undefined,
    adminNote: dto.adminNote ?? undefined,
    students: mapScores(dto, lookups),
  };
}

export function markEntryDtosToListItems(
  rows: MarkEntryDto[],
  lookups?: MarksLookupMaps,
): MarkEntryListItem[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Marks API response must be an array");
  }
  return rows.map((dto) => markEntryDtoToListItem(dto, lookups));
}

export function isMarksEntryEditable(status: string): boolean {
  return status === "pending" || status === "returned" || status === "rejected";
}
