import { describe, expect, it } from "vitest";
import { resolveSubjectDetailView } from "./detail-view";
import type { SubjectDetailItem } from "./types";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const detailA: SubjectDetailItem = {
  id: "dd111111-1111-4111-8111-111111111111",
  instituteId: A,
  name: "Mathematics",
  code: "MATH",
  category: "Core",
  periodsPerWeek: 5,
  grades: ["Grade 10"],
  assignedTeacherIds: [],
  status: "active",
  updatedAt: "2026-06-01T10:00:00Z",
};

describe("resolveSubjectDetailView", () => {
  it("invalidates institute A detail when active institute switches to B", () => {
    const view = resolveSubjectDetailView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: B,
      resolvedForInstituteId: A,
      storedSubject: detailA,
      storedStatus: "ready",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.detailValid).toBe(false);
    expect(view.status).toBe("loading");
    expect(view.subject).toBeNull();
  });
});
