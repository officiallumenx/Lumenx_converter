import { describe, expect, it } from "vitest";
import {
  countExpiringSoon,
  daysLeftFromDeletedAt,
  filterRecycleByModule,
  listRecycleModules,
} from "./stats";

describe("recycle stats", () => {
  const now = new Date("2026-08-31T12:00:00.000Z").getTime();

  it("computes days left from deletedAt", () => {
    expect(daysLeftFromDeletedAt("2026-08-20T00:00:00.000Z", now)).toBe(79);
    expect(daysLeftFromDeletedAt("2026-05-01T00:00:00.000Z", now)).toBe(0);
  });

  it("counts expiring soon items", () => {
    const items = [
      { deletedAt: "2026-06-05T00:00:00.000Z" },
      { deletedAt: "2026-08-01T00:00:00.000Z" },
    ];
    expect(countExpiringSoon(items, 7, now)).toBe(1);
  });

  it("filters and lists modules", () => {
    const items = [
      { module: "Students", deletedAt: "2026-08-01T00:00:00.000Z" },
      { module: "Teachers", deletedAt: "2026-08-02T00:00:00.000Z" },
    ];
    expect(listRecycleModules(items)).toEqual(["Students", "Teachers"]);
    expect(filterRecycleByModule(items, "Students")).toHaveLength(1);
  });
});
