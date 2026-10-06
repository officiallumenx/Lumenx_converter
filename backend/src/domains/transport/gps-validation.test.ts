import { describe, expect, it } from "vitest";
import { AppError } from "../../errors/app-error.js";
import { validateGpsPingInput } from "./gps-validation.js";
import { classifyGpsFreshness } from "./gps-freshness.js";

describe("validateGpsPingInput", () => {
  it("accepts valid coordinates", () => {
    const v = validateGpsPingInput({
      latitude: 12.97,
      longitude: 77.59,
      accuracyM: 12,
      clientEventId: "evt-1",
      sequenceNumber: 3,
    });
    expect(v.latitude).toBe(12.97);
    expect(v.clientEventId).toBe("evt-1");
    expect(v.sequenceNumber).toBe(3);
  });

  it("rejects out-of-range and absurd accuracy", () => {
    expect(() => validateGpsPingInput({ latitude: 99, longitude: 0 })).toThrow(AppError);
    expect(() => validateGpsPingInput({ latitude: 0, longitude: 200 })).toThrow(AppError);
    expect(() =>
      validateGpsPingInput({ latitude: 0, longitude: 0, accuracyM: 9999 }),
    ).toThrow(AppError);
    expect(() =>
      validateGpsPingInput({ latitude: 0, longitude: 0, accuracyM: -1 }),
    ).toThrow(AppError);
  });

  it("rejects stale and far-future timestamps", () => {
    const old = new Date(Date.now() - 2 * 60 * 60_000).toISOString();
    expect(() =>
      validateGpsPingInput({ latitude: 1, longitude: 1, capturedAt: old }),
    ).toThrow(AppError);
    const future = new Date(Date.now() + 10 * 60_000).toISOString();
    expect(() =>
      validateGpsPingInput({ latitude: 1, longitude: 1, capturedAt: future }),
    ).toThrow(AppError);
  });
});

describe("classifyGpsFreshness", () => {
  it("bands live/recent/stale/offline", () => {
    const now = Date.now();
    expect(classifyGpsFreshness(new Date(now - 10_000).toISOString(), now)).toBe("live");
    expect(classifyGpsFreshness(new Date(now - 90_000).toISOString(), now)).toBe("recent");
    expect(classifyGpsFreshness(new Date(now - 5 * 60_000).toISOString(), now)).toBe("stale");
    expect(classifyGpsFreshness(new Date(now - 20 * 60_000).toISOString(), now)).toBe("offline");
    expect(classifyGpsFreshness(null, now)).toBe("offline");
  });
});
