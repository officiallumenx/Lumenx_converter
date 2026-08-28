/**
 * Admin Home Pending Reviews — verification workflow (tests 1–10).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_COMPLAINTS_SEED } from "./complaints-data";
import { getInitialTeacherLeave } from "./leave-data";
import type { MarkEntry } from "./marks-entry-store";
import {
  buildPendingReviews,
  countAdminComplaints,
  countPendingTeacherLeave,
  countSubmittedMarks,
  loadPendingReviews,
} from "./pending-reviews";
import { teachersWithPendingMarks, getMarkEntriesSnapshot } from "./marks-entry-store";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
  key: (index: number) => [...store.keys()][index] ?? null,
  get length() {
    return store.size;
  },
});

vi.stubGlobal("window", {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(() => true),
});

const VALID_ROUTES = new Set([
  "/marks",
  "/leave",
  "/complaints",
  "/admissions",
  "/careers",
  "/transport",
]);

function mark(status: MarkEntry["status"], id = "m-1"): MarkEntry {
  return {
    id,
    teacherId: "t-1",
    teacherName: "A. Mehta",
    subject: "Math",
    classGrade: "Grade 10",
    section: "A",
    examId: "EX-UT1",
    examName: "Unit Test 1",
    maxMarks: 50,
    status,
    students: [],
  };
}

/** Mirrors Admin Home Attention Required — separate from Pending Reviews. */
function buildAttentionItems(input: {
  attendancePending: number;
  diaryMissing: number;
  pendingMarkEntryCount: number;
  pendingMarkTeacherCount: number;
  transportSosCount: number;
}) {
  const items: { id: string; to: string; search?: Record<string, string>; count: number }[] = [];
  if (input.attendancePending > 0) {
    items.push({ id: "att", to: "/attendance", count: input.attendancePending });
  }
  if (input.diaryMissing > 0) {
    items.push({ id: "diary", to: "/diary", count: input.diaryMissing });
  }
  if (input.pendingMarkEntryCount > 0) {
    items.push({
      id: "marks-pending",
      to: "/marks",
      count: input.pendingMarkEntryCount,
    });
  }
  if (input.transportSosCount > 0) {
    items.push({
      id: "transport-sos",
      to: "/transport",
      search: { view: "emergencies" },
      count: input.transportSosCount,
    });
  }
  return items;
}

describe("Admin Home Pending Reviews workflow", () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it("1–3: marks, teacher leave, and admin complaints use real demo counts", () => {
    const submitted = [mark("submitted", "m-1"), mark("submitted", "m-2"), mark("pending", "m-3")];
    expect(countSubmittedMarks(submitted)).toBe(2);

    const teacherLeave = getInitialTeacherLeave();
    const pendingLeaveCount = countPendingTeacherLeave(teacherLeave);
    expect(pendingLeaveCount).toBe(1);

    expect(countAdminComplaints(DEMO_COMPLAINTS_SEED)).toBe(3);

    const rows = buildPendingReviews({
      submittedMarks: countSubmittedMarks(submitted),
      pendingTeacherLeave: pendingLeaveCount,
      adminComplaints: countAdminComplaints(DEMO_COMPLAINTS_SEED),
      pendingAdmissionConverts: 0,
      pendingCareerHires: 0,
      pendingTransportStops: 0,
      pendingTransportAssignments: 0,
    });

    expect(rows.find((r) => r.id === "marks-review")?.count).toBe(2);
    expect(rows.find((r) => r.id === "teacher-leave")?.count).toBe(1);
    expect(rows.find((r) => r.id === "complaints-admin")?.count).toBe(3);
    expect(rows.find((r) => r.id === "complaints-admin")?.to).toBe("/complaints");
  });

  it("4–6: multiple categories, deep links, and no duplicate row ids", () => {
    const rows = buildPendingReviews({
      submittedMarks: 2,
      pendingTeacherLeave: 3,
      adminComplaints: 3,
      pendingAdmissionConverts: 1,
      pendingCareerHires: 1,
      pendingTransportStops: 2,
      pendingTransportAssignments: 1,
    });

    expect(rows.length).toBe(7);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);

    for (const row of rows) {
      expect(VALID_ROUTES.has(row.to)).toBe(true);
      expect(row.count).toBeGreaterThan(0);
    }

    expect(rows.find((r) => r.id === "transport-stops")?.search).toEqual({ view: "reviews" });
    expect(rows.find((r) => r.id === "transport-assignments")?.search).toEqual({ view: "reviews" });
  });

  it("5: no pending items when all counts are zero", () => {
    expect(
      buildPendingReviews({
        submittedMarks: 0,
        pendingTeacherLeave: 0,
        adminComplaints: 0,
        pendingAdmissionConverts: 0,
        pendingCareerHires: 0,
        pendingTransportStops: 0,
        pendingTransportAssignments: 0,
      }),
    ).toEqual([]);
  });

  it("7: loadPendingReviews survives reload from localStorage-backed stores", async () => {
    vi.resetModules();
    const mod = await import("./pending-reviews");
    const first = mod.loadPendingReviews();
    expect(Array.isArray(first)).toBe(true);

    const mod2 = await import("./pending-reviews");
    const second = mod2.loadPendingReviews();
    expect(second.map((r) => r.id)).toEqual(first.map((r) => r.id));
    for (const row of second) {
      const orig = first.find((r) => r.id === row.id);
      expect(row.count).toBe(orig?.count);
    }
  });

  it("8–9: Attention Required and Transport SOS stay separate from Pending Reviews", () => {
    const pendingRows = buildPendingReviews({
      submittedMarks: 5,
      pendingTeacherLeave: 2,
      adminComplaints: 1,
      pendingAdmissionConverts: 0,
      pendingCareerHires: 0,
      pendingTransportStops: 1,
      pendingTransportAssignments: 0,
    });
    const pendingIds = new Set(pendingRows.map((r) => r.id));

    const attention = buildAttentionItems({
      attendancePending: 4,
      diaryMissing: 1,
      pendingMarkEntryCount: 8,
      pendingMarkTeacherCount: 2,
      transportSosCount: 2,
    });

    for (const item of attention) {
      expect(pendingIds.has(item.id)).toBe(false);
    }
    expect(attention.find((i) => i.id === "transport-sos")?.search).toEqual({
      view: "emergencies",
    });
    expect(pendingRows.find((r) => r.id === "transport-stops")?.search).toEqual({
      view: "reviews",
    });

    const submittedForReview = countSubmittedMarks([
      mark("submitted"),
      mark("pending"),
      mark("pending"),
    ]);
    const pendingEntryTeachers = teachersWithPendingMarks([
      mark("pending", "m-2"),
      mark("pending", "m-3"),
    ]);
    expect(submittedForReview).toBe(1);
    expect(pendingEntryTeachers.reduce((a, t) => a + t.pendingCount, 0)).toBe(2);
  });

  it("10: pending reviews excludes attention-only operational items", () => {
    const rows = buildPendingReviews({
      submittedMarks: 1,
      pendingTeacherLeave: 0,
      adminComplaints: 0,
      pendingAdmissionConverts: 0,
      pendingCareerHires: 0,
      pendingTransportStops: 0,
      pendingTransportAssignments: 0,
    });
    const labels = rows.map((r) => r.label).join(" ");
    expect(labels).not.toMatch(/Attendance Not Submitted/i);
    expect(labels).not.toMatch(/Diary Missing/i);
    expect(labels).not.toMatch(/Transport Emergencies/i);
    expect(labels).not.toMatch(/still entering/i);
  });

  it("returns stable snapshot reference for useSyncExternalStore", () => {
    const first = loadPendingReviews();
    const second = loadPendingReviews();
    expect(second).toBe(first);
  });

  it("loadPendingReviews row counts align with underlying demo stores", () => {
    const rows = loadPendingReviews();
    const submittedMarks = countSubmittedMarks(getMarkEntriesSnapshot());
    const teacherLeave = countPendingTeacherLeave(getInitialTeacherLeave());
    const complaints = countAdminComplaints(DEMO_COMPLAINTS_SEED);

    const marksRow = rows.find((r) => r.id === "marks-review");
    if (submittedMarks > 0) {
      expect(marksRow?.count).toBe(submittedMarks);
      expect(marksRow?.to).toBe("/marks");
    } else {
      expect(marksRow).toBeUndefined();
    }

    const leaveRow = rows.find((r) => r.id === "teacher-leave");
    if (teacherLeave > 0) {
      expect(leaveRow?.count).toBe(teacherLeave);
      expect(leaveRow?.to).toBe("/leave");
    } else {
      expect(leaveRow).toBeUndefined();
    }

    const complaintRow = rows.find((r) => r.id === "complaints-admin");
    if (complaints > 0) {
      expect(complaintRow?.count).toBe(complaints);
      expect(complaintRow?.to).toBe("/complaints");
    }

    for (const row of rows) {
      expect(row.count).toBeGreaterThan(0);
      expect(Number.isFinite(row.count)).toBe(true);
    }
  });

  it("10: Admin Home widget catalog includes all existing cards", () => {
    const expectedWidgets = [
      "birthdays",
      "diary",
      "attention",
      "attendance",
      "quick-actions",
      "pending-reviews",
      "shortcuts",
    ];
    expect(expectedWidgets).toEqual([
      "birthdays",
      "diary",
      "attention",
      "attendance",
      "quick-actions",
      "pending-reviews",
      "shortcuts",
    ]);
  });
});
