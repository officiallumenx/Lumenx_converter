import { describe, expect, it } from "vitest";
import { remainingFailedAfterOuterError } from "./bulk-import-counts";

describe("bulk import count integrity", () => {
  it("does not double-count rows already created when an outer error fires", () => {
    expect(
      remainingFailedAfterOuterError({
        totalRows: 5,
        created: 2,
        failed: 1,
      }),
    ).toBe(2);
    expect(
      remainingFailedAfterOuterError({
        totalRows: 5,
        created: 5,
        failed: 0,
      }),
    ).toBe(0);
    expect(
      remainingFailedAfterOuterError({
        totalRows: 3,
        created: 0,
        failed: 0,
      }),
    ).toBe(3);
  });
});
