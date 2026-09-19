import { describe, expect, it } from "vitest";
import {
  parseTeacherCsv,
  parseTeacherSheetRows,
  parseTeachingScope,
  splitCsvList,
  validateTeacherImportRow,
} from "./bulk-import-parse";
import { matchSectionIdsByTeacherLabels } from "./bulk-import-resolve";
import type { ClassDto, SectionDto } from "@/lib/classes/types";

describe("teacher bulk import parse", () => {
  it("parses required columns from CSV", () => {
    const csv = [
      "display_name,phone,department,email,subjects,assigned_sections",
      "Ananya Iyer,9876501234,Mathematics,a@school.edu,\"Math, Algebra\",G10-A",
    ].join("\n");
    const result = parseTeacherCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.displayName).toBe("Ananya Iyer");
    expect(splitCsvList(result.rows[0]!.subjects)).toEqual(["Math", "Algebra"]);
  });

  it("rejects invalid phone", () => {
    const errors = validateTeacherImportRow(
      {
        displayName: "A",
        phone: "123",
        department: "Math",
        email: "",
        employeeId: "",
        qualification: "",
        teachingScope: "",
        subjects: "",
        assignedSections: "",
        classTeacherSections: "",
        dateOfBirth: "",
        joinedOn: "",
      },
      2,
    );
    expect(errors.some((e) => e.includes("phone"))).toBe(true);
  });

  it("normalizes Excel-style dates in sheet rows", () => {
    const result = parseTeacherSheetRows([
      ["display_name", "phone", "department", "date_of_birth", "joined_on"],
      ["Ananya Iyer", "9876501234", "Mathematics", "12/05/1990", "01/06/2024"],
    ]);
    expect(result.errors).toEqual([]);
    expect(result.rows[0]?.dateOfBirth).toBe("1990-05-12");
    expect(result.rows[0]?.joinedOn).toBe("2024-06-01");
  });

  it("rejects section labels not in institute catalog", () => {
    const errors = validateTeacherImportRow(
      {
        displayName: "A",
        phone: "9876501234",
        department: "General",
        email: "",
        employeeId: "",
        qualification: "",
        teachingScope: "subject_teacher",
        subjects: "Mathematics",
        assignedSections: "ZZ-X",
        classTeacherSections: "G10-A",
        dateOfBirth: "",
        joinedOn: "",
      },
      2,
      {
        sectionLabels: ["G10-A", "G10-B"],
        subjectNames: ["Mathematics"],
      },
    );
    expect(errors.some((e) => e.includes("assigned_sections"))).toBe(true);
  });

  it("maps teaching scope aliases", () => {
    expect(parseTeachingScope("activity-coordinator")).toBe("activity_coordinator");
    expect(parseTeachingScope("class_teacher")).toBe("subject_teacher");
  });
});

describe("matchSectionIdsByTeacherLabels", () => {
  const classes: ClassDto[] = [
    {
      id: "c1",
      instituteId: "i",
      academicYearId: "y",
      name: "Grade 10",
      code: "G10",
      sortOrder: 1,
      status: "active",
      createdAt: "",
      updatedAt: "",
    },
  ];
  const sections: SectionDto[] = [
    {
      id: "s1",
      instituteId: "i",
      academicYearId: "y",
      classId: "c1",
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

  it("matches G10-A style labels", () => {
    expect(matchSectionIdsByTeacherLabels(["G10-A"], sections, classes)).toEqual(["s1"]);
  });
});
