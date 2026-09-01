import { describe, expect, it } from "vitest";
import { buildSectionEnrichment } from "./enrich";

describe("buildSectionEnrichment", () => {
  const SECTION = "ss111111-1111-4111-8111-111111111111";
  const TEACHER = "tt111111-1111-4111-8111-111111111111";
  const SUBJECT = "su111111-1111-4111-8111-111111111111";

  it("counts active enrollments per section", () => {
    const enrich = buildSectionEnrichment(
      [
        {
          id: "e1",
          instituteId: "i",
          academicYearId: "y",
          studentId: "s1",
          studentName: "A",
          classId: "c",
          sectionId: SECTION,
          rollNo: "1",
          status: "active",
          enrolledOn: "2026-01-01",
          withdrawnOn: null,
          createdAt: "",
          updatedAt: "",
        },
        {
          id: "e2",
          instituteId: "i",
          academicYearId: "y",
          studentId: "s2",
          studentName: "B",
          classId: "c",
          sectionId: SECTION,
          rollNo: "2",
          status: "graduated",
          enrolledOn: "2026-01-01",
          withdrawnOn: null,
          createdAt: "",
          updatedAt: "",
        },
      ],
      [],
      new Map(),
      new Map(),
    );
    expect(enrich.enrollmentCountBySection.get(SECTION)).toBe(1);
  });

  it("maps teacher labels and subject assignments", () => {
    const enrich = buildSectionEnrichment(
      [],
      [
        {
          id: "a1",
          instituteId: "i",
          academicYearId: "y",
          classId: "c",
          sectionId: SECTION,
          subjectId: SUBJECT,
          teacherId: TEACHER,
          status: "active",
        },
      ],
      new Map([[TEACHER, { name: "Ms Rao" }]]),
      new Map([[SUBJECT, { name: "Math", code: "MATH" }]]),
    );
    expect(enrich.teachersBySection.get(SECTION)).toBe("Ms Rao");
    expect(enrich.subjectTeacherBySection.get(SECTION)?.[SUBJECT]).toBe("Ms Rao");
  });
});
