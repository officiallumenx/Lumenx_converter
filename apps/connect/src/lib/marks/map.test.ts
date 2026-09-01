import { describe, expect, it } from "vitest";
import {
  reportCardDtoToReportCard,
  teacherSheetToConnectRows,
} from "./map";
import type { StudentReportCardDto, TeacherMarkSheetDto } from "./types";

describe("connect marks map", () => {
  it("maps report card dto to Connect ReportCard with total-only subjects", () => {
    const dto: StudentReportCardDto = {
      id: "ae111111-1111-4111-8111-111111111111",
      examId: "ae111111-1111-4111-8111-111111111111",
      examName: "Mid-Term",
      term: "Mid-Term",
      publishedOn: "2026-08-01",
      marks: [
        {
          subjectId: "dd111111-1111-4111-8111-111111111111",
          subject: "Mathematics",
          marks: 72,
          maxMarks: 100,
          total: 72,
          grade: "B+",
          teacherName: "Ms Rao",
        },
      ],
      percentage: 72,
      grade: "B+",
      status: "published",
    };

    const card = reportCardDtoToReportCard(dto);
    expect(card.term).toBe("Mid-Term");
    expect(card.marks[0]?.internal).toBe(0);
    expect(card.marks[0]?.exam).toBe(72);
    expect(card.marks[0]?.total).toBe(72);
    expect(card.rank).toBe(0);
  });

  it("maps teacher sheet rows for entry UI", () => {
    const sheet: TeacherMarkSheetDto = {
      entryId: "af111111-1111-4111-8111-111111111111",
      instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      academicYearId: "ee111111-1111-4111-8111-111111111111",
      classId: "ff111111-1111-4111-8111-111111111111",
      sectionId: "cc111111-1111-4111-8111-111111111111",
      examId: "ae111111-1111-4111-8111-111111111111",
      examName: "Mid-Term",
      subjectId: "dd111111-1111-4111-8111-111111111111",
      subjectName: "Mathematics",
      maxMarks: 100,
      status: "pending",
      rows: [
        {
          studentId: "ac111111-1111-4111-8111-111111111111",
          enrollmentId: "ad111111-1111-4111-8111-111111111111",
          studentName: "Aarav",
          rollNo: "12",
          marks: 80,
        },
      ],
    };

    const rows = teacherSheetToConnectRows(sheet);
    expect(rows[0]?.marks).toBe(80);
    expect(rows[0]?.maxMarks).toBe(100);
  });
});
