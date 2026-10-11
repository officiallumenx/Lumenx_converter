import { beforeEach, describe, expect, it, vi } from "vitest";

const getScope = vi.fn(() => null as { timezone?: string } | null);

vi.mock("../route-setup/store", () => ({
  getRouteSetupDriverScope: () => getScope(),
}));

describe("resolveTransportServiceDate", () => {
  beforeEach(() => {
    getScope.mockReturnValue(null);
    vi.resetModules();
  });

  it("uses Asia/Kolkata when scope has no timezone", async () => {
    const { resolveTransportServiceDate } = await import("./service-date");
    const nearIstMidnight = new Date("2026-03-15T18:30:00.000Z");
    expect(resolveTransportServiceDate(nearIstMidnight)).toBe("2026-03-16");
  });

  it("prefers scope timezone over default", async () => {
    getScope.mockReturnValue({ timezone: "UTC" });
    const { resolveTransportServiceDate } = await import("./service-date");
    const nearIstMidnight = new Date("2026-03-15T18:30:00.000Z");
    expect(resolveTransportServiceDate(nearIstMidnight)).toBe("2026-03-15");
  });

  it("explicit timeZone argument wins over scope", async () => {
    getScope.mockReturnValue({ timezone: "UTC" });
    const { resolveTransportServiceDate } = await import("./service-date");
    const nearIstMidnight = new Date("2026-03-15T18:30:00.000Z");
    expect(resolveTransportServiceDate(nearIstMidnight, "Asia/Kolkata")).toBe(
      "2026-03-16",
    );
  });
});
