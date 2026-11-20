import { describe, expect, it } from "vitest";
import { adminNav } from "@/lib/admin-nav";

describe("Communications navigation — Send consolidation", () => {
  const communications = adminNav.find((g) => g.label === "Communications");

  it("exposes Send and keeps Notifications + Messages + Complaints", () => {
    expect(communications).toBeTruthy();
    const tos = communications!.items.map((i) => i.to);
    expect(tos).toContain("/send");
    expect(tos).toContain("/notifications");
    expect(tos).toContain("/messages");
    expect(tos).toContain("/complaints");
  });

  it("removes Announcements and Alerts as separate nav modules", () => {
    const tos = communications!.items.map((i) => i.to);
    expect(tos).not.toContain("/announcements");
    expect(tos).not.toContain("/alerts");
  });
});
