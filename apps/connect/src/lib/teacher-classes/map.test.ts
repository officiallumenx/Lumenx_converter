import { describe, expect, it } from "vitest";
import { assignmentsToTeacherClasses, enrollmentsToTeacherStudents } from "./map";
import type {
  ClassDto,
  EnrollmentDto,
  SectionDto,
  SubjectDto,
  TeacherAssignmentDto,
} from "./api";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SECTION = "ss111111-1111-4111-8111-111111111111";
const CLASS_ID = "cc111111-1111-4111-8111-111111111111";
const TEACHER = "tt111111-1111-4111-8111-111111111111";
const SUBJECT = "su111111-1111-4111-8111-111111111111";

describe("teacher-classes map", () => {
  it("groups assignments by section with real section UUID as class id", () => {
    const sections: SectionDto[] = [
      {
        id: SECTION,
        instituteId: INST,
        academicYearId: "y",
        classId: CLASS_ID,
        name: "A",
        code: "A",
        capacity: 40,
        room: null,
        sortOrder: 1,
        status: "active",
        createdAt: "",
        updatedAt: "",
      },
    ];
    const classes: ClassDto[] = [
      {
        id: CLASS_ID,
        instituteId: INST,
        academicYearId: "y",
        name: "Grade 10",
        code: "G10",
        sortOrder: 1,
        status: "active",
        createdAt: "",
        updatedAt: "",
      },
    ];
    const assignments: TeacherAssignmentDto[] = [
      {
        id: "a1",
        instituteId: INST,
        academicYearId: "y",
        classId: CLASS_ID,
        sectionId: SECTION,
        subjectId: SUBJECT,
        teacherId: TEACHER,
        status: "active",
      },
    ];
    const subjects: SubjectDto[] = [
      {
        id: SUBJECT,
        instituteId: INST,
        name: "Mathematics",
        code: "MATH",
        status: "active",
      },
    ];
    const enrollments: EnrollmentDto[] = [
      {
        id: "e1",
        instituteId: INST,
        academicYearId: "y",
        studentId: "st1",
        studentName: "Aarav",
        classId: CLASS_ID,
        sectionId: SECTION,
        rollNo: "12",
        status: "active",
        enrolledOn: "2026-01-01",
        withdrawnOn: null,
        createdAt: "",
        updatedAt: "",
      },
    ];

    const teacherClasses = assignmentsToTeacherClasses(
      assignments,
      sections,
      classes,
      enrollments,
      subjects,
    );
    expect(teacherClasses).toHaveLength(1);
    expect(teacherClasses[0]?.id).toBe(SECTION);
    expect(teacherClasses[0]?.className).toBe("Grade 10");
    expect(teacherClasses[0]?.subject).toBe("Mathematics");
    expect(teacherClasses[0]?.studentCount).toBe(1);

    const students = enrollmentsToTeacherStudents(enrollments, sections, classes);
    expect(students[0]?.classId).toBe(SECTION);
    expect(students[0]?.name).toBe("Aarav");
  });
});
