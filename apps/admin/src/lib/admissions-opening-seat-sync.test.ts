import { beforeEach, describe, expect, it, vi } from "vitest";
import { SCHOOL_ACADEMIC } from "@lumenx/types";
import {
  applyOpeningSeatUpdateAfterConversion,
  buildClassSeatAvailability,
  OPENINGS_STORAGE_KEY,
  remainingSeatsAfterConversion,
} from "./admissions-opening-seat-sync";
import {
  invalidateStudentDirectoryCache,
  loadStudentDirectory,
  saveStudentDirectory,
  type StudentDirectoryRecord,
} from "./student-directory-store";
import { classGroupsToSections, saveClassDirectory } from "./class-directory-store";

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

vi.mock("@/lib/academic-data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/academic-data")>();
  return {
    ...actual,
    isCollegeMode: () => false,
    getAcademicConfig: () => SCHOOL_ACADEMIC,
  };
});

vi.mock("@lumenx/types", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lumenx/types")>();
  return {
    ...actual,
    readDemoProfileId: () => "multi_institute" as const,
  };
});

const INSTITUTE_ID = "ins-test1school";

function seedFreshAdminState() {
  store.clear();
  invalidateStudentDirectoryCache();
  saveClassDirectory(classGroupsToSections());
  loadStudentDirectory();
}

function student(overrides: Partial<StudentDirectoryRecord>): StudentDirectoryRecord {
  return {
    id: "STU-9001",
    name: "Test Student",
    firstName: "Test",
    surname: "Student",
    grade: "9-A",
    attendance: 100,
    gpa: 0,
    status: "active",
    parent: "Parent",
    parentName: "Parent",
    parentPhone: "9876543210",
    address: "Delhi",
    gender: "Female",
    accessStatus: "active",
    ...overrides,
  };
}

function grade10Row(rows: ReturnType<typeof buildClassSeatAvailability>) {
  return rows.find((row) => row.classLabel === "Grade 10");
}

describe("admissions seat availability", () => {
  beforeEach(() => {
    seedFreshAdminState();
  });

  it("1/10 fresh Admin with no openings shows all academic levels (no empty state)", () => {
    const rows = buildClassSeatAvailability(INSTITUTE_ID, SCHOOL_ACADEMIC);
    expect(rows.length).toBe(SCHOOL_ACADEMIC.levels.length);
    expect(rows.every((row) => row.totalCapacity > 0)).toBe(true);
    expect(rows.every((row) => row.available >= 0)).toBe(true);
  });

  it("2/10 uses class directory capacity totals per grade", () => {
    const rows = buildClassSeatAvailability(INSTITUTE_ID, SCHOOL_ACADEMIC);
    const grade10 = grade10Row(rows);
    expect(grade10?.source).toBe("class-directory");
    expect(grade10?.totalCapacity).toBe(44);
  });

  it("3/10 counts existing students as occupied", () => {
    const rows = buildClassSeatAvailability(INSTITUTE_ID, SCHOOL_ACADEMIC);
    const grade10 = grade10Row(rows);
    expect(grade10?.occupied).toBe(2);
    expect(grade10?.available).toBe(42);
  });

  it("4/10 never produces negative available seats", () => {
    const directory = loadStudentDirectory();
    const packed = [
      ...directory,
      ...Array.from({ length: 50 }, (_, index) =>
        student({
          id: `STU-FILL-${index}`,
          grade: "10-A",
          name: `Fill ${index}`,
        }),
      ),
    ];
    saveStudentDirectory(packed);
    const grade10 = grade10Row(buildClassSeatAvailability(INSTITUTE_ID, SCHOOL_ACADEMIC));
    expect(grade10!.available).toBe(0);
    expect(grade10!.available).toBeGreaterThanOrEqual(0);
  });

  it("5/7 conversion increases occupied and decreases available immediately", () => {
    const before = grade10Row(buildClassSeatAvailability(INSTITUTE_ID, SCHOOL_ACADEMIC))!;
    const directory = loadStudentDirectory();
    saveStudentDirectory([
      ...directory,
      student({
        id: "STU-NEW",
        grade: "10-A",
        name: "Converted Applicant",
      }),
    ]);

    const after = grade10Row(buildClassSeatAvailability(INSTITUTE_ID, SCHOOL_ACADEMIC))!;
    expect(after.occupied).toBe(before.occupied + 1);
    expect(after.available).toBe(before.available - 1);
  });

  it("8/9 full class shows zero available", () => {
    const sections = classGroupsToSections().map((section) =>
      section.levelId === "10" ? { ...section, capacity: 2 } : section,
    );
    saveClassDirectory(sections);
    saveStudentDirectory([
      student({ id: "STU-A", grade: "10-A" }),
      student({ id: "STU-B", grade: "10-B" }),
    ]);

    const grade10 = grade10Row(buildClassSeatAvailability(INSTITUTE_ID, SCHOOL_ACADEMIC))!;
    expect(grade10.totalCapacity).toBe(2);
    expect(grade10.occupied).toBe(2);
    expect(grade10.available).toBe(0);
  });

  it("10/10 missing opening data still shows class/student derived seats", () => {
    expect(store.has(OPENINGS_STORAGE_KEY)).toBe(false);
    const rows = buildClassSeatAvailability(INSTITUTE_ID, SCHOOL_ACADEMIC);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => !row.hasOpening)).toBe(true);
    expect(rows.every((row) => row.available === row.totalCapacity - row.occupied)).toBe(true);
  });

  it("respects Connect opening remaining seats without corrupting storage shape", () => {
    const opening = {
      id: "open-test-10",
      instituteId: INSTITUTE_ID,
      name: "Class 10",
      grades: ["Class 10"],
      seatsAvailable: 5,
      status: "open" as const,
      description: "Test opening",
      updatedAt: new Date().toISOString(),
    };
    store.set(OPENINGS_STORAGE_KEY, JSON.stringify([opening]));

    const grade10 = grade10Row(buildClassSeatAvailability(INSTITUTE_ID, SCHOOL_ACADEMIC))!;
    expect(grade10.hasOpening).toBe(true);
    expect(grade10.available).toBe(5);

    const parsed = JSON.parse(store.get(OPENINGS_STORAGE_KEY)!) as typeof opening[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.id).toBe("open-test-10");
  });

  it("conversion updates opening seats without duplicating records", () => {
    const opening = {
      id: "open-test-10",
      instituteId: INSTITUTE_ID,
      name: "Class 10",
      grades: ["Class 10"],
      seatsAvailable: 20,
      status: "open" as const,
      description: "Test opening",
      updatedAt: new Date().toISOString(),
    };
    store.set(OPENINGS_STORAGE_KEY, JSON.stringify([opening]));

    const nextSeats = remainingSeatsAfterConversion(20);
    const result = applyOpeningSeatUpdateAfterConversion({
      instituteId: INSTITUTE_ID,
      className: "Grade 10",
      seatsRemaining: nextSeats,
    });

    expect(result.updated).toBe(true);
    const parsed = JSON.parse(store.get(OPENINGS_STORAGE_KEY)!) as typeof opening[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.seatsAvailable).toBe(19);

    const grade10 = grade10Row(buildClassSeatAvailability(INSTITUTE_ID, SCHOOL_ACADEMIC))!;
    expect(grade10.available).toBe(19);
  });

  it("available formula holds: max(0, totalCapacity - occupied)", () => {
    const rows = buildClassSeatAvailability(INSTITUTE_ID, SCHOOL_ACADEMIC);
    for (const row of rows) {
      const expected = Math.max(0, row.totalCapacity - row.occupied);
      if (!row.hasOpening) {
        expect(row.available).toBe(expected);
      } else {
        expect(row.available).toBeLessThanOrEqual(expected);
        expect(row.available).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

