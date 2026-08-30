import { describe, expect, it } from "vitest";
import { resolveSectionDetailView } from "./detail-view";
import type { SectionDetailItem } from "./types";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const detailA: SectionDetailItem = {
  id: "ff111111-1111-4111-8111-111111111111",
  instituteId: A,
  classId: "ee111111-1111-4111-8111-111111111111",
  name: "Grade 10 · A",
  levelId: "ee111111-1111-4111-8111-111111111111",
  timetableGrade: "10",
  section: "A",
  teacher: "Teacher A",
  students: 30,
  capacity: 40,
  room: "A-101",
  hasTimetable: false,
  classCode: "10",
  sectionStatus: "active",
  classStatus: "active",
  academicYearId: "cc111111-1111-4111-8111-111111111111",
  updatedAt: "2026-06-01T10:00:00Z",
};

describe("resolveSectionDetailView", () => {
  it("invalidates institute A detail when active institute switches to B", () => {
    const view = resolveSectionDetailView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: B,
      resolvedForInstituteId: A,
      storedSection: detailA,
      storedStatus: "ready",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.detailValid).toBe(false);
    expect(view.status).toBe("loading");
    expect(view.section).toBeNull();
  });

  it("rejects ready detail whose instituteId mismatches active institute", () => {
    const view = resolveSectionDetailView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: A,
      resolvedForInstituteId: A,
      storedSection: { ...detailA, instituteId: B },
      storedStatus: "ready",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.detailValid).toBe(true);
    expect(view.status).toBe("empty");
    expect(view.section).toBeNull();
  });
});
