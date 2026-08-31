import { describe, expect, it } from "vitest";
import { countExpiringSoon, daysLeftFromDeletedAt } from "./stats";

describe("nexus recycle stats", () => {
  it("computes retention days left", () => {
    const now = new Date("2026-08-31T12:00:00.000Z").getTime();
    expect(daysLeftFromDeletedAt("2026-08-25T00:00:00.000Z", now)).toBe(84);
  });

  it("counts expiring soon", () => {
    const now = new Date("2026-08-31T12:00:00.000Z").getTime();
    expect(
      countExpiringSoon([{ deletedAt: "2026-06-05T00:00:00.000Z" }], 7, now),
    ).toBe(1);
  });
});
