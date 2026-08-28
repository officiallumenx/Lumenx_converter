import type { MarkEntryDto, MarkEntryListItem } from "./types";

function shortRef(id: string, prefix: string): string {
  const token = id?.trim().slice(0, 8) || "—";
  return `${prefix} · ${token}`;
}

export function markEntryDtoToListItem(dto: MarkEntryDto): MarkEntryListItem {
  const scores = dto.scores ?? [];
  return {
    id: dto.id,
    teacherId: dto.teacherId,
    teacherName: shortRef(dto.teacherId, "Teacher"),
    subject: shortRef(dto.subjectId, "Subject"),
    classGrade: shortRef(dto.classId, "Class"),
    section: shortRef(dto.sectionId, "Sec"),
    examId: dto.examId,
    examName: shortRef(dto.examId, "Exam"),
    maxMarks: dto.maxMarks,
    status: dto.status,
    submittedAt: dto.submittedAt ?? undefined,
    publishedAt: dto.publishedAt ?? undefined,
    adminNote: dto.adminNote ?? undefined,
    students: scores.map((score) => ({
      studentId: score.studentId,
      rollNo: "—",
      name: shortRef(score.studentId, "Student"),
      marks: score.marks,
    })),
  };
}

export function markEntryDtosToListItems(
  rows: MarkEntryDto[],
): MarkEntryListItem[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Marks API response must be an array");
  }
  return rows.map(markEntryDtoToListItem);
}
