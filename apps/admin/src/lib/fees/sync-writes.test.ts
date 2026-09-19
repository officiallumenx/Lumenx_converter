import { describe, expect, it } from "vitest";
import type { FeesSnapshot } from "@lumenx/module-fees";
import {
  classAmountsForCategory,
  findCategoryByKind,
  resolveClassId,
  resolveClassIds,
} from "./sync-writes";

const CLASS_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CLASS_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
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
      "Class 10": { [TUITION]: 1000 },
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
      { "Class 10": CLASS_A },
    );
    expect(amounts).toEqual({ [CLASS_A]: 1000 });
  });

  it("expands amounts across sibling class ids", () => {
    const amounts = classAmountsForCategory(
      snapshotWithTuition(),
      TUITION,
      { "Class 10": CLASS_A },
      { "Class 10": [CLASS_A, CLASS_B] },
    );
    expect(amounts).toEqual({ [CLASS_A]: 1000, [CLASS_B]: 1000 });
  });

  it("resolves class id or throws", () => {
    expect(resolveClassId("Class 10", { "Class 10": CLASS_A })).toBe(CLASS_A);
    expect(() => resolveClassId("Missing", {})).toThrow(/No class id/);
  });

  it("resolves all sibling class ids", () => {
    expect(
      resolveClassIds("Class 10", { "Class 10": CLASS_A }, {
        "Class 10": [CLASS_A, CLASS_B],
      }),
    ).toEqual([CLASS_A, CLASS_B]);
  });
});
