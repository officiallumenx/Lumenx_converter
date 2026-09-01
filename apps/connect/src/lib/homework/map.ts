import type { StudentAssignment } from "@/lib/mock-data";
import type { StudentAssignmentDetail } from "@/lib/assignment-details";
import type { AssignmentSubmission, TeacherAssignment } from "@/lib/teacher/types";
import type {
  HomeworkDto,
  HomeworkSubmissionDto,
  LearnerHomeworkItemDto,
  TeacherHomeworkSheetDto,
} from "./types";

export function learnerItemToStudentAssignment(
  item: LearnerHomeworkItemDto,
  classLabel: string,
): StudentAssignment {
  return {
    id: item.id,
    title: item.title,
    subject: item.subjectName,
    due: item.dueDate,
    dueDate: item.dueDate,
    status: "pending",
    class: classLabel,
    type: item.kind,
  };
}

export function learnerItemToDetail(
  item: LearnerHomeworkItemDto,
  classLabel: string,
): StudentAssignmentDetail {
  const base = learnerItemToStudentAssignment(item, classLabel);
  return {
    ...base,
    description: item.description,
    instructions: item.instructions ?? item.description,
    teacherId: "",
    teacherName: item.teacherName,
    publishedAt: item.publishedOn ?? undefined,
    attachments: item.attachment
      ? [
          {
            id: item.attachment.assetId,
            fileName: item.attachment.fileName ?? "worksheet.pdf",
            fileSize: "PDF",
            mimeType: item.attachment.contentType ?? "application/pdf",
            content: "",
          },
        ]
      : [],
  };
}

export function homeworkDtoToTeacherAssignment(
  dto: HomeworkDto,
  labels: {
    classLabel: string;
    sectionLabel: string;
    subjectLabel: string;
    sheet?: TeacherHomeworkSheetDto | null;
  },
): TeacherAssignment {
  const sheet = labels.sheet;
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    instructions: dto.instructions ?? "",
    subject: labels.subjectLabel,
    classId: dto.sectionId,
    classLabel: labels.classLabel,
    section: labels.sectionLabel,
    due: dto.dueDate,
    dueDate: dto.dueDate,
    status: dto.status === "published" ? "pending" : "pending",
    publishStatus: dto.status === "published" ? "published" : dto.status === "draft" ? "draft" : "expired",
    totalStudents: sheet?.totalCount ?? 0,
    submittedCount: sheet?.submittedCount ?? 0,
    submissionRate:
      sheet && sheet.totalCount > 0
        ? Math.round((sheet.submittedCount / sheet.totalCount) * 100)
        : 0,
    type: dto.kind,
  };
}

export function submissionDtoToConnectRow(dto: HomeworkSubmissionDto): AssignmentSubmission {
  return {
    id: dto.id,
    assignmentId: dto.homeworkId,
    studentId: dto.studentId,
    studentName: dto.studentName,
    roll: dto.rollNo?.trim() || "—",
    timing: dto.status === "submitted" ? "on_time" : "missing",
    submittedAt: dto.markedAt,
    note: dto.status === "submitted" ? "Marked submitted by teacher." : "",
    graded: false,
    marks: null,
    maxMarks: 0,
  };
}

export function submissionRowsToTeacherAssignment(
  dto: HomeworkDto,
  sheet: TeacherHomeworkSheetDto,
  labels: { classLabel: string; sectionLabel: string; subjectLabel: string },
): TeacherAssignment {
  return homeworkDtoToTeacherAssignment(dto, { ...labels, sheet });
}

export type ClassHomeworkOverviewRow = {
  studentId: string;
  studentName: string;
  roll: string;
  submitted: number;
  total: number;
};

export function aggregateClassHomeworkOverview(input: {
  totalItems: number;
  roster: { id: string; name: string; roll: string }[];
  sheets: { rows: Pick<HomeworkSubmissionDto, "studentId" | "studentName" | "rollNo" | "status">[] }[];
}): ClassHomeworkOverviewRow[] {
  const stats = new Map<string, ClassHomeworkOverviewRow>();
  for (const student of input.roster) {
    stats.set(student.id, {
      studentId: student.id,
      studentName: student.name,
      roll: student.roll,
      submitted: 0,
      total: input.totalItems,
    });
  }

  for (const sheet of input.sheets) {
    for (const row of sheet.rows) {
      let stat = stats.get(row.studentId);
      if (!stat) {
        stat = {
          studentId: row.studentId,
          studentName: row.studentName,
          roll: row.rollNo?.trim() || "—",
          submitted: 0,
          total: input.totalItems,
        };
        stats.set(row.studentId, stat);
      }
      if (row.status === "submitted") stat.submitted += 1;
    }
  }

  return [...stats.values()].sort(
    (a, b) =>
      a.roll.localeCompare(b.roll, undefined, { numeric: true }) ||
      a.studentName.localeCompare(b.studentName),
  );
}
