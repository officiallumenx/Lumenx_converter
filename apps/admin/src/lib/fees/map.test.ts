import { describe, expect, it } from "vitest";
import { feeBundleToFeesSnapshot, pickActiveFeePlan } from "./map";
import type { FeeComponentDto, FeePlanDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PLAN = "ee111111-1111-4111-8111-111111111111";
const CLASS = "cd111111-1111-4111-8111-111111111111";
const COMP = "ef111111-1111-4111-8111-111111111111";

describe("pickActiveFeePlan", () => {
  it("prefers published plans", () => {
    const draft: FeePlanDto = {
      id: "dd111111-1111-4111-8111-111111111111",
      instituteId: INST,
      academicYearId: "cc111111-1111-4111-8111-111111111111",
      status: "draft",
      publishScope: "institute",
      publishedClassIds: [],
      publishedAt: null,
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-02T10:00:00Z",
    };
    const published: FeePlanDto = {
      ...draft,
      id: PLAN,
      status: "published",
      publishedAt: "2026-06-03T10:00:00Z",
      updatedAt: "2026-06-01T10:00:00Z",
    };
    expect(pickActiveFeePlan([draft, published])?.id).toBe(PLAN);
  });
});

describe("feeBundleToFeesSnapshot", () => {
  const plan: FeePlanDto = {
    id: PLAN,
    instituteId: INST,
    academicYearId: "cc111111-1111-4111-8111-111111111111",
    status: "published",
    publishScope: "institute",
    publishedClassIds: [],
    publishedAt: "2026-06-03T10:00:00Z",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-03T10:00:00Z",
  };

  const components: FeeComponentDto[] = [
    {
      id: COMP,
      feePlanId: PLAN,
      instituteId: INST,
      kind: "tuition",
      name: "Tuition",
      active: true,
      assignedToAll: true,
      assignedClassIds: [],
      classAmounts: { [CLASS]: 10000 },
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-01T10:00:00Z",
    },
  ];

  it("maps components into FeesSnapshot categories and class defaults", () => {
    const snapshot = feeBundleToFeesSnapshot({
      plan,
      components,
      concessions: [],
      payments: [],
      classLabels: [{ id: CLASS, label: "Grade 10" }],
    });
    expect(snapshot.categories).toHaveLength(1);
    expect(snapshot.classDefaults["Grade 10"]?.[COMP]).toBe(10000);
    expect(snapshot.publish.status).toBe("published");
  });

  it("preserves concession ids on overrides for delete wiring", () => {
    const concessionId = "aa111111-1111-4111-8111-111111111111";
    const studentId = "bb111111-1111-4111-8111-111111111111";
    const snapshot = feeBundleToFeesSnapshot({
      plan,
      components,
      concessions: [
        {
          id: concessionId,
          feePlanId: PLAN,
          instituteId: INST,
          studentId,
          feeComponentId: COMP,
          amount: 500,
          note: "Sibling",
          createdAt: "2026-06-01T10:00:00Z",
          updatedAt: "2026-06-01T10:00:00Z",
        },
      ],
      payments: [],
      classLabels: [{ id: CLASS, label: "Grade 10" }],
    });
    expect(snapshot.overrides[0]?.id).toBe(concessionId);
    expect(snapshot.overrides[0]?.categoryId).toBe(COMP);
  });
});
