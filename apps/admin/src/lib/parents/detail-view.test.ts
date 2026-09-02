import { describe, expect, it } from "vitest";
import { resolveParentsDetailView } from "./detail-view";
import type { ParentDetailItem } from "./types";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const detailA: ParentDetailItem = {
  id: "ba111111-1111-4111-8111-111111111111",
  instituteId: A,
  name: "Parent A",
  phone: "9876543210",
  email: "a@example.com",
  address: "1 Main St",
  legacyCode: null,
  relationship: "Father",
  identityLabel: "Father · ba111111…",
  accessStatus: "active",
  inviteStatus: "active",
  linkedStudentIds: [],
  linkedChildrenCount: 1,
  linkedChildrenLabel: "1 child",
  linkedChildrenDisplay: "1 child",
  hasPortalLogin: true,
  password: "",
  links: [],
  updatedAt: "2026-06-01T10:00:00Z",
};

describe("resolveParentsDetailView", () => {
  it("invalidates institute A detail when active institute switches to B", () => {
    const view = resolveParentsDetailView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: B,
      resolvedForInstituteId: A,
      storedParent: detailA,
      storedStatus: "ready",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.detailValid).toBe(false);
    expect(view.status).toBe("loading");
    expect(view.parent).toBeNull();
  });

  it("rejects ready detail whose instituteId mismatches active institute", () => {
    const view = resolveParentsDetailView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: A,
      resolvedForInstituteId: A,
      storedParent: { ...detailA, instituteId: B },
      storedStatus: "ready",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.detailValid).toBe(true);
    expect(view.status).toBe("empty");
    expect(view.parent).toBeNull();
  });
});
