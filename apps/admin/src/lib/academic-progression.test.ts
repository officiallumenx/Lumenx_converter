import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  loadGraduationRows,
  persistGraduateStudents,
  persistPromoteStudents,
  validateGraduationSelection,
} from "./academic-progression";
import { getStudentAcademicTimeline } from "./student-academic-timeline";
import {
  invalidateStudentDirectoryCache,
  loadStudentDirectory,
  saveStudentDirectory,
  type StudentDirectoryRecord,
} from "./student-directory-store";
import { filterAdminStudents } from "@lumenx/module-students";
import { parseClassSection } from "./class-section-filter";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => store.clear(),
  key: (index: number) => [...store.keys()][index] ?? null,
  get length() {
    return store.size;
  },
});

vi.mock("@lumenx/types", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lumenx/types")>();
  return {
    ...actual,
    readDemoProfileId: () => "multi_institute" as const,
  };
});

function student(overrides: Partial<StudentDirectoryRecord>): StudentDirectoryRecord {
  return {
    id: "STU-1",
    name: "Aanya Sharma",
    firstName: "Aanya",
    surname: "Sharma",
    grade: "9-A",
    attendance: 96,
    gpa: 3.8,
    status: "active",
    parent: "R. Sharma",
    parentName: "Rohan Sharma",
    parentPhone: "9876512345",
    address: "Delhi",
    gender: "Female",
    accessStatus: "active",
    rollNo: "12",
    dateOfBirth: "2014-08-17",
    admissionNumber: "ADM-1",
    ...overrides,
  };
}

function readPromotionHistory() {
  return JSON.parse(
    store.get("lumenx.admin.promotion-history.v1.multi_institute") ?? "{}",
  ) as Record<string, Array<Record<string, string>>>;
}

function readGraduationHistory() {
  return JSON.parse(
    store.get("lumenx.admin.graduation-history.v1.multi_institute") ?? "{}",
  ) as {
    results: Record<string, Record<string, string>>;
    snapshots: Array<Record<string, string>>;
  };
}

describe("academic promotion persistence", () => {
  beforeEach(() => {
    store.clear();
    invalidateStudentDirectoryCache();
    saveStudentDirectory([
      student({ id: "STU-1", grade: "9-A", house: "Red" }),
      student({ id: "STU-2", name: "Kabir Shah", firstName: "Kabir", surname: "Shah", grade: "9-B", rollNo: "13" }),
      student({ id: "STU-3", name: "Mira Nair", firstName: "Mira", surname: "Nair", grade: "7-C", rollNo: "07" }),
    ]);
  });

  it("promotes one student into the requested target class and section", () => {
    persistPromoteStudents(["STU-1"], "2027-2028", {
      sourceYearId: "ay-2026-27",
      sourceYearLabel: "2026-2027",
      targetYearId: "ay-2027-28",
      targetYearLabel: "2027-2028",
      targetClass: "10th",
      targetSection: "B",
    });

    const promoted = loadStudentDirectory().find((row) => row.id === "STU-1");
    expect(promoted?.grade).toBe("10-B");
    expect(promoted?.house).toBe("Red");
  });

  it("promotes multiple students without creating duplicate directory records", () => {
    persistPromoteStudents(["STU-1", "STU-2"], "2027-2028", {
      sourceYearId: "ay-2026-27",
      sourceYearLabel: "2026-2027",
      targetYearId: "ay-2027-28",
      targetYearLabel: "2027-2028",
      targetClass: "10th",
      targetSection: "C",
    });

    const rows = loadStudentDirectory();
    expect(rows).toHaveLength(3);
    expect(rows.find((row) => row.id === "STU-1")?.grade).toBe("10-C");
    expect(rows.find((row) => row.id === "STU-2")?.grade).toBe("10-C");
  });

  it("supports different target classes and sections", () => {
    persistPromoteStudents(["STU-3"], "2027-2028", {
      sourceYearId: "ay-2026-27",
      sourceYearLabel: "2026-2027",
      targetYearId: "ay-2027-28",
      targetYearLabel: "2027-2028",
      targetClass: "9th",
      targetSection: "A",
    });

    const promoted = loadStudentDirectory().find((row) => row.id === "STU-3");
    expect(promoted?.grade).toBe("9-A");
    expect(parseClassSection(promoted?.grade ?? "")).toEqual({ classNum: "9", section: "A" });
  });

  it("writes promotion history and timeline entries", () => {
    persistPromoteStudents(["STU-1"], "2027-2028", {
      sourceYearId: "ay-2026-27",
      sourceYearLabel: "2026-2027",
      targetYearId: "ay-2027-28",
      targetYearLabel: "2027-2028",
      targetClass: "10th",
      targetSection: "A",
    });

    const history = readPromotionHistory();
    expect(history["STU-1"]).toHaveLength(1);
    expect(history["STU-1"]?.[0]).toMatchObject({
      sourceYearId: "ay-2026-27",
      targetYearId: "ay-2027-28",
      fromGrade: "9-A",
      toGrade: "10-A",
    });

    const assembled = getStudentAcademicTimeline("STU-1");
    expect(assembled.entries.at(-1)).toMatchObject({
      academicYear: "2027-2028",
      classLabel: "Class 10",
      status: "Active",
      eventKind: "promotion",
    });
  });

  it("survives cache reset / reload after promotion", () => {
    persistPromoteStudents(["STU-2"], "2027-2028", {
      sourceYearId: "ay-2026-27",
      sourceYearLabel: "2026-2027",
      targetYearId: "ay-2027-28",
      targetYearLabel: "2027-2028",
      targetClass: "10th",
      targetSection: "B",
    });

    invalidateStudentDirectoryCache();
    const reloaded = loadStudentDirectory().find((row) => row.id === "STU-2");
    expect(reloaded?.grade).toBe("10-B");
  });

  it("deduplicates accidental duplicate promotion attempts", () => {
    const options = {
      sourceYearId: "ay-2026-27",
      sourceYearLabel: "2026-2027",
      targetYearId: "ay-2027-28",
      targetYearLabel: "2027-2028",
      targetClass: "10th",
      targetSection: "A",
    } as const;

    persistPromoteStudents(["STU-1"], "2027-2028", options);
    persistPromoteStudents(["STU-1"], "2027-2028", options);

    const history = readPromotionHistory();
    expect(history["STU-1"]).toHaveLength(1);

    const rows = loadStudentDirectory().filter((row) => row.id === "STU-1");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.grade).toBe("10-A");
  });

  it("preserves unrelated student fields and other students", () => {
    const beforeOther = loadStudentDirectory().find((row) => row.id === "STU-2");

    persistPromoteStudents(["STU-1"], "2027-2028", {
      sourceYearId: "ay-2026-27",
      sourceYearLabel: "2026-2027",
      targetYearId: "ay-2027-28",
      targetYearLabel: "2027-2028",
      targetClass: "10th",
      targetSection: "A",
    });

    const promoted = loadStudentDirectory().find((row) => row.id === "STU-1");
    const other = loadStudentDirectory().find((row) => row.id === "STU-2");

    expect(promoted?.name).toBe("Aanya Sharma");
    expect(promoted?.parentPhone).toBe("9876512345");
    expect(other).toMatchObject(beforeOther ?? {});
  });
});

describe("academic graduation persistence", () => {
  beforeEach(() => {
    store.clear();
    invalidateStudentDirectoryCache();
    saveStudentDirectory([
      student({ id: "STU-10A", grade: "10-A", rollNo: "01", house: "Blue" }),
      student({
        id: "STU-10B",
        name: "Kabir Shah",
        firstName: "Kabir",
        surname: "Shah",
        grade: "10-B",
        rollNo: "02",
      }),
      student({ id: "STU-9A", grade: "9-A", rollNo: "03" }),
    ]);
  });

  it("graduates students into the directory with graduated status", () => {
    const count = persistGraduateStudents(["STU-10A"], "ay-2026-27", {
      results: { "STU-10A": "passed" },
    });

    expect(count).toBe(1);
    const graduated = loadStudentDirectory().find((row) => row.id === "STU-10A");
    expect(graduated?.status).toBe("graduated");
    expect(graduated?.grade).toBe("10-A");
    expect(graduated?.house).toBe("Blue");
  });

  it("removes graduated students from the pending present-year roster", () => {
    persistGraduateStudents(["STU-10A"], "ay-2026-27");

    const pending = loadGraduationRows().filter(
      (row) => row.academicYearId === "ay-2026-27" && row.id === "STU-10A",
    );
    expect(pending).toHaveLength(0);
  });

  it("records graduation history with year, status, and date", () => {
    persistGraduateStudents(["STU-10B"], "ay-2026-27", {
      results: { "STU-10B": "failed" },
    });

    const history = readGraduationHistory();
    const snapshot = history.snapshots.find((row) => row.id === "STU-10B");
    expect(snapshot).toMatchObject({
      id: "STU-10B",
      academicYearId: "ay-2026-27",
      result: "failed",
      class: "10th",
      section: "B",
    });
    expect(snapshot?.graduatedAt).toBeTruthy();
    expect(history.results["ay-2026-27"]?.["STU-10B"]).toBe("failed");
  });

  it("blocks duplicate graduation attempts", () => {
    persistGraduateStudents(["STU-10A"], "ay-2026-27");
    const secondAttempt = persistGraduateStudents(["STU-10A"], "ay-2026-27");

    expect(secondAttempt).toBe(0);
    const rows = loadStudentDirectory().filter((row) => row.id === "STU-10A");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("graduated");
  });

  it("validates present-year pending roster before confirmation", () => {
    const pending = loadGraduationRows().filter((row) => row.academicYearId === "ay-2026-27");
    const errors = validateGraduationSelection(["STU-9A"], "ay-2026-27", pending);
    expect(
      errors.some((error) => error.includes("not eligible for graduation")),
    ).toBe(true);

    const pastYearErrors = validateGraduationSelection(["STU-10A"], "ay-2025-26", pending);
    expect(
      pastYearErrors.some((error) => error.includes("present academic year")),
    ).toBe(true);
  });

  it("blocks confirmation without an academic year or selected students", () => {
    const pending = loadGraduationRows().filter((row) => row.academicYearId === "ay-2026-27");

    expect(validateGraduationSelection([], "ay-2026-27", pending)).toContain(
      "Select at least one student before confirming graduation.",
    );
    expect(validateGraduationSelection(["STU-10A"], "", pending)).toContain(
      "Select an academic year before confirming graduation.",
    );
    expect(validateGraduationSelection(["STU-10A"], "invalid-year", pending)).toContain(
      "Select a valid academic year before confirming graduation.",
    );
  });

  it("blocks already graduated students and duplicate graduation records", () => {
    persistGraduateStudents(["STU-10A"], "ay-2026-27");
    const pending = loadGraduationRows().filter((row) => row.academicYearId === "ay-2026-27");

    const graduatedErrors = validateGraduationSelection(["STU-10A"], "ay-2026-27", pending);
    expect(graduatedErrors.some((error) => error.includes("already graduated"))).toBe(true);
    expect(
      graduatedErrors.some((error) => error.includes("already has a graduation record")),
    ).toBe(true);
  });

  it("blocks inactive and ineligible students", () => {
    saveStudentDirectory([
      ...loadStudentDirectory(),
      student({
        id: "STU-10C",
        name: "Inactive Ten",
        firstName: "Inactive",
        surname: "Ten",
        grade: "10-C",
        status: "inactive",
      }),
    ]);
    const pending = loadGraduationRows().filter((row) => row.academicYearId === "ay-2026-27");

    expect(
      validateGraduationSelection(["STU-10C"], "ay-2026-27", pending),
    ).toContain("Inactive Ten is inactive and not eligible for graduation.");
  });

  it("preserves unrelated students and fields", () => {
    const beforeOther = loadStudentDirectory().find((row) => row.id === "STU-10B");

    persistGraduateStudents(["STU-10A"], "ay-2026-27");

    const other = loadStudentDirectory().find((row) => row.id === "STU-10B");
    expect(other).toMatchObject(beforeOther ?? {});
    expect(loadStudentDirectory().find((row) => row.id === "STU-9A")?.status).toBe("active");
  });
});

describe("academic graduation workflow verification", () => {
  beforeEach(() => {
    store.clear();
    invalidateStudentDirectoryCache();
    saveStudentDirectory([
      student({ id: "STU-10A", grade: "10-A", rollNo: "01", house: "Blue" }),
      student({
        id: "STU-10B",
        name: "Kabir Shah",
        firstName: "Kabir",
        surname: "Shah",
        grade: "10-B",
        rollNo: "02",
      }),
      student({ id: "STU-9A", grade: "9-A", rollNo: "03" }),
    ]);
  });

  it("1. graduates one student and updates directory status", () => {
    expect(persistGraduateStudents(["STU-10A"], "ay-2026-27")).toBe(1);
    expect(loadStudentDirectory().find((row) => row.id === "STU-10A")?.status).toBe("graduated");
  });

  it("2. graduates multiple students without duplicate directory records", () => {
    expect(persistGraduateStudents(["STU-10A", "STU-10B"], "ay-2026-27")).toBe(2);
    expect(loadStudentDirectory()).toHaveLength(3);
    const history = readGraduationHistory();
    const keys = history.snapshots.map((row) => `${row.academicYearId}:${row.id}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(history.snapshots.filter((row) => row.id === "STU-10A")).toHaveLength(1);
    expect(history.snapshots.filter((row) => row.id === "STU-10B")).toHaveLength(1);
  });

  it("3. blocks already graduated students", () => {
    persistGraduateStudents(["STU-10A"], "ay-2026-27");
    const pending = loadGraduationRows().filter((row) => row.academicYearId === "ay-2026-27");
    const errors = validateGraduationSelection(["STU-10A"], "ay-2026-27", pending);
    expect(errors.some((error) => error.includes("already graduated"))).toBe(true);
  });

  it("4. blocks duplicate graduation attempts", () => {
    persistGraduateStudents(["STU-10A"], "ay-2026-27");
    expect(persistGraduateStudents(["STU-10A"], "ay-2026-27")).toBe(0);
    const history = readGraduationHistory();
    expect(history.snapshots.filter((row) => row.id === "STU-10A")).toHaveLength(1);
  });

  it("5. blocks confirmation with no selected students", () => {
    const pending = loadGraduationRows().filter((row) => row.academicYearId === "ay-2026-27");
    expect(validateGraduationSelection([], "ay-2026-27", pending)).toContain(
      "Select at least one student before confirming graduation.",
    );
  });

  it("6. blocks confirmation with a missing academic year", () => {
    const pending = loadGraduationRows().filter((row) => row.academicYearId === "ay-2026-27");
    expect(validateGraduationSelection(["STU-10A"], "", pending)).toContain(
      "Select an academic year before confirming graduation.",
    );
  });

  it("7. keeps student directory data intact after graduation", () => {
    const before = loadStudentDirectory().find((row) => row.id === "STU-10A");
    persistGraduateStudents(["STU-10A"], "ay-2026-27");
    const after = loadStudentDirectory().find((row) => row.id === "STU-10A");
    expect(after).toMatchObject({
      id: before?.id,
      name: before?.name,
      grade: before?.grade,
      rollNo: before?.rollNo,
      house: before?.house,
      parentPhone: before?.parentPhone,
      status: "graduated",
    });
  });

  it("8. persists graduation history with year, status, and date", () => {
    persistGraduateStudents(["STU-10B"], "ay-2026-27", {
      results: { "STU-10B": "dropped_out" },
    });
    const history = readGraduationHistory();
    expect(history.results["ay-2026-27"]?.["STU-10B"]).toBe("dropped_out");
    expect(history.snapshots.find((row) => row.id === "STU-10B")).toMatchObject({
      academicYearId: "ay-2026-27",
      result: "dropped_out",
    });
    expect(history.snapshots.find((row) => row.id === "STU-10B")?.graduatedAt).toBeTruthy();
  });

  it("9. survives cache reset and reload after graduation", () => {
    persistGraduateStudents(["STU-10A"], "ay-2026-27");
    invalidateStudentDirectoryCache();

    expect(loadStudentDirectory().find((row) => row.id === "STU-10A")?.status).toBe("graduated");
    expect(
      loadGraduationRows().some(
        (row) => row.id === "STU-10A" && row.academicYearId === "ay-2026-27",
      ),
    ).toBe(false);
    expect(readGraduationHistory().snapshots.some((row) => row.id === "STU-10A")).toBe(true);
  });

  it("keeps the student module filter working for graduated status", () => {
    persistGraduateStudents(["STU-10A"], "ay-2026-27");
    const directory = loadStudentDirectory();
    const graduatedOnly = filterAdminStudents(directory, "", "graduated");
    expect(graduatedOnly.map((row) => row.id)).toEqual(["STU-10A"]);
    expect(filterAdminStudents(directory, "", "active").some((row) => row.id === "STU-10A")).toBe(
      false,
    );
  });
});
