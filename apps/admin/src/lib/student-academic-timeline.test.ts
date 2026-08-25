import { beforeEach, describe, expect, it, vi } from "vitest";

import { persistGraduateStudents, persistPromoteStudents } from "./academic-progression";
import {
  compareTimelineEntriesNewestFirst,
  formatTimelineYearDisplay,
  getStudentAcademicTimeline,
  getTimelineEntriesNewestFirst,
  groupTimelineEntriesByAcademicYear,
  recordAdmissionOnTimeline,
  subscribeStudentAcademicTimelines,
  TIMELINE_EMPTY_MESSAGE,
  timelineEntryEventLabel,
  type AcademicTimelineEntry,
} from "./student-academic-timeline";
import {
  invalidateStudentDirectoryCache,
  loadStudentDirectory,
  saveStudentDirectory,
  type StudentDirectoryRecord,
} from "./student-directory-store";

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

function entryDedupeKeys(entries: AcademicTimelineEntry[]): string[] {
  return entries.map((entry) =>
    [
      entry.eventKind,
      entry.academicYear.trim(),
      entry.classLabel.trim(),
      entry.section?.trim() ?? "",
      entry.eventAt ?? entry.eventDate ?? "",
      entry.graduationResult ?? "",
    ].join("|"),
  );
}

function snapshotDirectory(): string {
  return JSON.stringify(loadStudentDirectory());
}

describe("Student Academic Timeline verification", () => {
  beforeEach(() => {
    store.clear();
    invalidateStudentDirectoryCache();
    saveStudentDirectory([
      student({ id: "STU-10A", grade: "7-A", rollNo: "01" }),
      student({
        id: "STU-10B",
        name: "Kabir Shah",
        firstName: "Kabir",
        surname: "Shah",
        grade: "10-B",
        rollNo: "02",
      }),
      student({
        id: "STU-10C",
        name: "Meera Rao",
        firstName: "Meera",
        surname: "Rao",
        grade: "9-C",
        rollNo: "03",
      }),
    ]);
  });

  it("1. student with no history shows empty state and no invented entries", () => {
    const timeline = getStudentAcademicTimeline("STU-10C");
    expect(timeline.entries).toHaveLength(0);
    expect(timeline.admissionDate).toBe("");
    expect(timeline.promotionDate).toBeUndefined();
    expect(timeline.graduationDate).toBeUndefined();
    expect(TIMELINE_EMPTY_MESSAGE).toBe("No academic history available yet.");
  });

  it("2. student with admission history shows a single admission entry", () => {
    const admitted = loadStudentDirectory().find((row) => row.id === "STU-10A");
    expect(admitted).toBeTruthy();
    recordAdmissionOnTimeline(admitted!, "2024-2025");

    const timeline = getStudentAcademicTimeline("STU-10A");
    expect(timeline.entries).toHaveLength(1);
    expect(timeline.entries[0]).toMatchObject({
      eventKind: "admission",
      academicYear: "2024-2025",
      classLabel: "Class 7",
      section: "A",
      status: "Active",
    });
    expect(timelineEntryEventLabel(timeline.entries[0]!)).toBe("Joined Institute");
    expect(timeline.admissionDate).toBeTruthy();
    expect(formatTimelineYearDisplay(timeline.entries[0]!, timeline.admissionDate)).toBe("2024");
  });

  it("3. student with promotion history shows promotion with class, section, and date", () => {
    persistPromoteStudents(["STU-10A"], "2025-2026", {
      sourceYearId: "ay-2024-25",
      sourceYearLabel: "2024-2025",
      targetYearId: "ay-2025-26",
      targetYearLabel: "2025-2026",
      targetClass: "8th",
      targetSection: "A",
    });

    const timeline = getStudentAcademicTimeline("STU-10A");
    expect(timeline.entries).toHaveLength(1);
    expect(timeline.entries[0]).toMatchObject({
      eventKind: "promotion",
      academicYear: "2025-2026",
      classLabel: "Class 8",
      section: "A",
      status: "Active",
    });
    expect(timelineEntryEventLabel(timeline.entries[0]!)).toBe("Promoted to Class 8");
    expect(timeline.entries[0]?.eventDate).toBeTruthy();
    expect(timeline.promotionDate).toBe(timeline.entries[0]?.eventDate);
    expect(formatTimelineYearDisplay(timeline.entries[0]!)).toBe("2025–26");
  });

  it("4. student with multiple promotions shows each promotion without duplicates", () => {
    persistPromoteStudents(["STU-10A"], "2025-2026", {
      sourceYearId: "ay-2024-25",
      sourceYearLabel: "2024-2025",
      targetYearId: "ay-2025-26",
      targetYearLabel: "2025-2026",
      targetClass: "8th",
      targetSection: "A",
    });
    persistPromoteStudents(["STU-10A"], "2026-2027", {
      sourceYearId: "ay-2025-26",
      sourceYearLabel: "2025-2026",
      targetYearId: "ay-2026-27",
      targetYearLabel: "2026-2027",
      targetClass: "9th",
      targetSection: "A",
    });

    const timeline = getStudentAcademicTimeline("STU-10A");
    expect(timeline.entries).toHaveLength(2);
    expect(new Set(entryDedupeKeys(timeline.entries)).size).toBe(2);

    const newestFirst = getTimelineEntriesNewestFirst(timeline);
    expect(newestFirst[0]?.eventKind).toBe("promotion");
    expect(newestFirst[0]?.classLabel).toBe("Class 9");
    expect(newestFirst[1]?.classLabel).toBe("Class 8");
    expect(timeline.promotionDate).toBe(newestFirst[0]?.eventDate);
  });

  it("5. student with graduation history shows graduation entry only from records", () => {
    persistGraduateStudents(["STU-10B"], "ay-2026-27", {
      results: { "STU-10B": "passed" },
    });

    const timeline = getStudentAcademicTimeline("STU-10B");
    expect(timeline.entries).toHaveLength(1);
    expect(timeline.entries[0]).toMatchObject({
      eventKind: "graduation",
      classLabel: "Class 10",
      section: "B",
      status: "Completed",
      graduationResult: "passed",
    });
    expect(timelineEntryEventLabel(timeline.entries[0]!)).toContain("Graduated · Class 10");
    expect(timeline.graduationDate).toBeTruthy();
    expect(timeline.entries[0]?.eventDate).toBe(timeline.graduationDate);
  });

  it("6. student with promotion and graduation shows both without active promotion", () => {
    saveStudentDirectory([
      student({ id: "STU-10A", grade: "7-A", rollNo: "01" }),
      student({
        id: "STU-10B",
        name: "Kabir Shah",
        firstName: "Kabir",
        surname: "Shah",
        grade: "9-B",
        rollNo: "02",
      }),
      student({
        id: "STU-10C",
        name: "Meera Rao",
        firstName: "Meera",
        surname: "Rao",
        grade: "9-C",
        rollNo: "03",
      }),
    ]);

    persistPromoteStudents(["STU-10B"], "2026-2027", {
      sourceYearId: "ay-2025-26",
      sourceYearLabel: "2025-2026",
      targetYearId: "ay-2026-27",
      targetYearLabel: "2026-2027",
      targetClass: "10th",
      targetSection: "B",
    });
    persistGraduateStudents(["STU-10B"], "ay-2026-27", {
      results: { "STU-10B": "passed" },
    });

    const timeline = getStudentAcademicTimeline("STU-10B");
    expect(timeline.entries).toHaveLength(2);
    expect(new Set(entryDedupeKeys(timeline.entries)).size).toBe(2);

    const promotion = timeline.entries.find((entry) => entry.eventKind === "promotion");
    const graduation = timeline.entries.find((entry) => entry.eventKind === "graduation");
    expect(promotion).toMatchObject({ classLabel: "Class 10", section: "B", status: "Completed" });
    expect(graduation).toMatchObject({ classLabel: "Class 10", section: "B", status: "Completed" });
    expect(timeline.entries.every((entry) => entry.status !== "Active")).toBe(true);
  });

  it("7. timeline survives reload and duplicate admission attempts", () => {
    const admitted = loadStudentDirectory().find((row) => row.id === "STU-10A");
    expect(admitted).toBeTruthy();
    recordAdmissionOnTimeline(admitted!, "2024-2025");
    recordAdmissionOnTimeline(admitted!, "2024-2025");

    persistPromoteStudents(["STU-10A"], "2025-2026", {
      sourceYearId: "ay-2024-25",
      sourceYearLabel: "2024-2025",
      targetYearId: "ay-2025-26",
      targetYearLabel: "2025-2026",
      targetClass: "8th",
      targetSection: "A",
    });

    const beforeReload = getStudentAcademicTimeline("STU-10A");
    invalidateStudentDirectoryCache();
    const afterReload = getStudentAcademicTimeline("STU-10A");

    expect(afterReload.entries).toHaveLength(2);
    expect(afterReload.entries.map((entry) => entry.id)).toEqual(
      beforeReload.entries.map((entry) => entry.id),
    );
    expect(afterReload.entries.filter((entry) => entry.eventKind === "admission")).toHaveLength(1);
  });

  it("8. different students keep isolated timelines", () => {
    const studentA = loadStudentDirectory().find((row) => row.id === "STU-10A");
    expect(studentA).toBeTruthy();
    recordAdmissionOnTimeline(studentA!, "2024-2025");

    persistPromoteStudents(["STU-10C"], "2025-2026", {
      sourceYearId: "ay-2024-25",
      sourceYearLabel: "2024-2025",
      targetYearId: "ay-2025-26",
      targetYearLabel: "2025-2026",
      targetClass: "10th",
      targetSection: "C",
    });

    const timelineA = getStudentAcademicTimeline("STU-10A");
    const timelineB = getStudentAcademicTimeline("STU-10B");
    const timelineC = getStudentAcademicTimeline("STU-10C");

    expect(timelineA.entries).toHaveLength(1);
    expect(timelineA.entries[0]?.eventKind).toBe("admission");
    expect(timelineB.entries).toHaveLength(0);
    expect(timelineC.entries).toHaveLength(1);
    expect(timelineC.entries[0]?.eventKind).toBe("promotion");
    expect(timelineC.entries[0]?.section).toBe("C");
  });

  it("does not mutate student directory when assembling timelines", () => {
    const admitted = loadStudentDirectory().find((row) => row.id === "STU-10A");
    expect(admitted).toBeTruthy();
    recordAdmissionOnTimeline(admitted!, "2024-2025");
    persistPromoteStudents(["STU-10A"], "2025-2026", {
      sourceYearId: "ay-2024-25",
      sourceYearLabel: "2024-2025",
      targetYearId: "ay-2025-26",
      targetYearLabel: "2025-2026",
      targetClass: "8th",
      targetSection: "A",
    });

    const before = snapshotDirectory();
    getStudentAcademicTimeline("STU-10A");
    getStudentAcademicTimeline("STU-10B");
    getStudentAcademicTimeline("STU-10C");
    groupTimelineEntriesByAcademicYear(getStudentAcademicTimeline("STU-10A"));
    expect(snapshotDirectory()).toBe(before);
  });

  it("timeline subscription does not fire on read-only assembly", () => {
    let listenerCalls = 0;
    const unsubscribe = subscribeStudentAcademicTimelines(() => {
      listenerCalls += 1;
    });

    getStudentAcademicTimeline("STU-10C");
    getStudentAcademicTimeline("STU-10A");
    expect(listenerCalls).toBe(0);
    unsubscribe();
  });
});

describe("student academic timeline assembly", () => {
  beforeEach(() => {
    store.clear();
    invalidateStudentDirectoryCache();
    saveStudentDirectory([
      student({ id: "STU-10A", grade: "9-A", rollNo: "01" }),
      student({
        id: "STU-10B",
        name: "Kabir Shah",
        firstName: "Kabir",
        surname: "Shah",
        grade: "10-B",
        rollNo: "02",
      }),
    ]);
  });

  it("formats promotion years as compact academic labels", () => {
    expect(
      formatTimelineYearDisplay({
        id: "promotion-1",
        academicYear: "2025-2026",
        classLabel: "Class 8",
        status: "Completed",
        eventKind: "promotion",
      }),
    ).toBe("2025–26");
  });

  it("shows admission year from the admission date", () => {
    expect(
      formatTimelineYearDisplay(
        {
          id: "admission-1",
          academicYear: "2024-2025",
          classLabel: "Class 6",
          status: "Completed",
          eventKind: "admission",
          eventDate: "08 Jun 2024",
        },
        "08 Jun 2024",
      ),
    ).toBe("2024");
  });

  it("builds timeline from admission meta and promotion history without duplicates", () => {
    const admitted = loadStudentDirectory().find((row) => row.id === "STU-10A");
    expect(admitted).toBeTruthy();
    recordAdmissionOnTimeline(admitted!, "2024-2025");

    persistPromoteStudents(["STU-10A"], "2025-2026", {
      sourceYearId: "ay-2024-25",
      sourceYearLabel: "2024-2025",
      targetYearId: "ay-2025-26",
      targetYearLabel: "2025-2026",
      targetClass: "10th",
      targetSection: "A",
    });

    const timeline = getStudentAcademicTimeline("STU-10A");
    expect(timeline.entries).toHaveLength(2);
    expect(timelineEntryEventLabel(timeline.entries[0]!)).toBe("Joined Institute");
    expect(timelineEntryEventLabel(timeline.entries[1]!)).toBe("Promoted to Class 10");
    expect(timeline.entries[1]?.section).toBe("A");
    expect(timeline.entries[1]?.status).toBe("Active");
    expect(timeline.promotionDate).toBeTruthy();
  });

  it("builds graduation entries from graduation history records", () => {
    persistGraduateStudents(["STU-10B"], "ay-2026-27", {
      results: { "STU-10B": "passed" },
    });

    const timeline = getStudentAcademicTimeline("STU-10B");
    expect(timeline.entries).toHaveLength(1);
    expect(timeline.entries[0]?.eventKind).toBe("graduation");
    expect(timelineEntryEventLabel(timeline.entries[0]!)).toContain("Graduated");
    expect(timeline.graduationDate).toBeTruthy();
  });

  it("does not invent milestones when no records exist", () => {
    const timeline = getStudentAcademicTimeline("STU-10B");
    expect(timeline.entries).toHaveLength(0);
    expect(timeline.admissionDate).toBe("");
    expect(TIMELINE_EMPTY_MESSAGE).toBe("No academic history available yet.");
  });

  it("orders entries newest-first using actual event timestamps", () => {
    const admitted = loadStudentDirectory().find((row) => row.id === "STU-10A");
    expect(admitted).toBeTruthy();
    recordAdmissionOnTimeline(admitted!, "2024-2025");

    persistPromoteStudents(["STU-10A"], "2025-2026", {
      sourceYearId: "ay-2024-25",
      sourceYearLabel: "2024-2025",
      targetYearId: "ay-2025-26",
      targetYearLabel: "2025-2026",
      targetClass: "10th",
      targetSection: "A",
    });

    const timeline = getStudentAcademicTimeline("STU-10A");
    const newestFirst = getTimelineEntriesNewestFirst(timeline);
    expect(newestFirst[0]?.eventKind).toBe("promotion");
    expect(newestFirst.at(-1)?.eventKind).toBe("admission");
    expect(compareTimelineEntriesNewestFirst(newestFirst[0]!, newestFirst[1]!)).toBeLessThan(0);
  });

  it("groups entries by academic year with newest year first", () => {
    const admitted = loadStudentDirectory().find((row) => row.id === "STU-10A");
    expect(admitted).toBeTruthy();
    recordAdmissionOnTimeline(admitted!, "2024-2025");

    persistPromoteStudents(["STU-10A"], "2025-2026", {
      sourceYearId: "ay-2024-25",
      sourceYearLabel: "2024-2025",
      targetYearId: "ay-2025-26",
      targetYearLabel: "2025-2026",
      targetClass: "10th",
      targetSection: "A",
    });

    const timeline = getStudentAcademicTimeline("STU-10A");
    const groups = groupTimelineEntriesByAcademicYear(timeline);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.yearLabel).toBe("2025–26");
    expect(groups[1]?.yearLabel).toBe("2024");
    expect(groups[0]?.entries[0]?.eventKind).toBe("promotion");
    expect(groups[1]?.entries[0]?.eventKind).toBe("admission");
  });
});
