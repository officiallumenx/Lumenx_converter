import { describe, expect, it } from "vitest";
import {
  learnerItemToStudentAssignment,
  submissionDtoToConnectRow,
} from "./map";
import type { HomeworkSubmissionDto, LearnerHomeworkItemDto } from "./types";

describe("connect homework map", () => {
  it("maps learner homework item to student assignment", () => {
    const item: LearnerHomeworkItemDto = {
      id: "af111111-1111-4111-8111-111111111111",
      kind: "homework",
      title: "Algebra worksheet",
      description: "Complete exercises 1-10",
      instructions: "Show all steps",
      dueDate: "2026-09-15",
      subjectName: "Mathematics",
      teacherName: "Ms Rao",
      publishedOn: "2026-09-01",
      attachment: {
        assetId: "asset-1",
        fileName: "worksheet.pdf",
        contentType: "application/pdf",
      },
    };

    const row = learnerItemToStudentAssignment(item, "10-B");
    expect(row.title).toBe("Algebra worksheet");
    expect(row.type).toBe("homework");
    expect(row.class).toBe("10-B");
  });

  it("maps submission dto to teacher toggle row", () => {
    const dto: HomeworkSubmissionDto = {
      id: "b0111111-1111-4111-8111-111111111111",
      homeworkId: "af111111-1111-4111-8111-111111111111",
      studentId: "ac111111-1111-4111-8111-111111111111",
      enrollmentId: "ad111111-1111-4111-8111-111111111111",
      studentName: "Aarav",
      rollNo: "12",
      status: "submitted",
      markedAt: "2026-09-10T10:00:00.000Z",
    };

    const row = submissionDtoToConnectRow(dto);
    expect(row.timing).toBe("on_time");
    expect(row.studentName).toBe("Aarav");
  });
});
