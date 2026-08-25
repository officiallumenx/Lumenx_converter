import { describe, expect, it } from "vitest";
import { rankTopQuickActions } from "./quick-actions-usage";

const items = [
  { to: "/storage", label: "Storage" },
  { to: "/students", label: "Students" },
  { to: "/fees", label: "Fees" },
  { to: "/marks", label: "Marks" },
  { to: "/teachers", label: "Teachers" },
];

describe("rankTopQuickActions", () => {
  it("uses the default daily-ops order when there is no usage yet", () => {
    const ranked = rankTopQuickActions(items, {}, ["/students", "/teachers", "/marks", "/fees"], 4);
    expect(ranked.map((item) => item.to)).toEqual([
      "/students",
      "/teachers",
      "/marks",
      "/fees",
    ]);
  });

  it("promotes modules the admin actually opens", () => {
    const ranked = rankTopQuickActions(
      items,
      { "/storage": 9, "/fees": 4 },
      ["/students", "/teachers", "/marks", "/fees"],
      4,
    );
    expect(ranked.map((item) => item.to)).toEqual([
      "/storage",
      "/fees",
      "/students",
      "/teachers",
    ]);
  });
});
