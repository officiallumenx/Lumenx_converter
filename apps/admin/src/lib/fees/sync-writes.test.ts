import { describe, expect, it } from "vitest";
import type { FeesSnapshot } from "@lumenx/module-fees";
import {
  classAmountsForCategory,
  findCategoryByKind,
  resolveClassId,
} from "./sync-writes";

const CLASS = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const TUITION = "11111111-1111-4111-8111-111111111111";

function snapshotWithTuition(): FeesSnapshot {
  return {
    version: 1,
    categories: [
      {
        id: TUITION,
        key: "tuition",
        name: "Tuition",
        active: true,
        assignedToAll: true,
        assignedClassKeys: [],
      },
    ],
    classDefaults: {
      "Grade 10": { [TUITION]: 1000 },
    },
    publish: { status: "draft", scope: { type: "institute" }, publishedAt: null },
    overrides: [],
    collections: {},
    payments: [],
    transportStopFees: {},
  };
}

describe("fees sync-writes helpers", () => {
  it("finds category by kind", () => {
    expect(findCategoryByKind(snapshotWithTuition(), "tuition")?.id).toBe(TUITION);
    expect(findCategoryByKind(snapshotWithTuition(), "books")).toBeNull();
  });

  it("builds class amounts with UUID keys", () => {
    const amounts = classAmountsForCategory(
      snapshotWithTuition(),
      TUITION,
      { "Grade 10": CLASS },
    );
    expect(amounts).toEqual({ [CLASS]: 1000 });
  });

  it("resolves class id or throws", () => {
    expect(resolveClassId("Grade 10", { "Grade 10": CLASS })).toBe(CLASS);
    expect(() => resolveClassId("Missing", {})).toThrow(/No class id/);
  });
});
