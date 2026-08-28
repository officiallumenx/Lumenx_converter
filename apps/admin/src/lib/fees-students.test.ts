import { describe, expect, it } from "vitest";
import {
  FEES_STUDENT_OPTIONS,
  feesStudentClasses,
  feesStudentsFor,
  studentListItemsToFeesStudentOptions,
} from "./fees-students";
import type { StudentListItem } from "@/lib/students/types";

const row = (overrides: Partial<StudentListItem> = {}): StudentListItem => ({
  id: "ss111111-1111-4111-8111-111111111111",
  name: "Aarav Sharma",
  firstName: "Aarav",
  surname: "Sharma",
  displayName: "Aarav Sharma",
  grade: "Grade 10-A",
  classLabel: "Grade 10",
  sectionLabel: "A",
  rollNo: "12",
  admissionNumber: null,
  status: "active",
  accessStatus: "active",
  gender: "male",
  dateOfBirth: null,
  attendance: 0,
  gpa: 0,
  parent: "",
  ...overrides,
});

describe("fees student picker mapping", () => {
  it("maps Students API list items to fee picker options", () => {
    const options = studentListItemsToFeesStudentOptions([row()]);
    expect(options[0]).toEqual({
      id: "ss111111-1111-4111-8111-111111111111",
      name: "Aarav Sharma",
      classKey: "Grade 10",
      section: "A",
      rollNo: "12",
    });
  });

  it("uses em dash placeholders for missing class metadata", () => {
    const options = studentListItemsToFeesStudentOptions([
      row({ classLabel: null, sectionLabel: null, rollNo: null }),
    ]);
    expect(options[0]?.classKey).toBe("—");
    expect(options[0]?.section).toBe("—");
    expect(options[0]?.rollNo).toBe("—");
  });

  it("filters demo roster by class and section", () => {
    const classes = feesStudentClasses(FEES_STUDENT_OPTIONS);
    expect(classes.length).toBeGreaterThan(0);
    const firstClass = classes[0]!;
    const students = feesStudentsFor(FEES_STUDENT_OPTIONS, firstClass, "A");
    expect(students.every((s) => s.classKey === firstClass && s.section === "A")).toBe(true);
  });

  it("rejects malformed student arrays", () => {
    expect(() => studentListItemsToFeesStudentOptions({ not: "array" } as never)).toThrow(
      /array/i,
    );
  });
});
