import { describe, expect, it } from "vitest";
import {
  parseStopNotificationRadiusM,
  STOP_RADIUS_DEFAULT_M,
  STOP_RADIUS_MAX_M,
  STOP_RADIUS_MIN_M,
} from "./stop-radius.js";
import { AppError } from "../../errors/app-error.js";

describe("parseStopNotificationRadiusM", () => {
  it("accepts product bounds including 50/100/150", () => {
    expect(parseStopNotificationRadiusM(50)).toBe(50);
    expect(parseStopNotificationRadiusM(100)).toBe(100);
    expect(parseStopNotificationRadiusM(150)).toBe(150);
    expect(parseStopNotificationRadiusM(STOP_RADIUS_MIN_M)).toBe(STOP_RADIUS_MIN_M);
    expect(parseStopNotificationRadiusM(STOP_RADIUS_MAX_M)).toBe(STOP_RADIUS_MAX_M);
  });

  it("rejects null, NaN, zero, negative, and absurd values", () => {
    expect(() => parseStopNotificationRadiusM(null)).toThrow(AppError);
    expect(() => parseStopNotificationRadiusM(Number.NaN)).toThrow(AppError);
    expect(() => parseStopNotificationRadiusM(0)).toThrow(AppError);
    expect(() => parseStopNotificationRadiusM(-1)).toThrow(AppError);
    expect(() => parseStopNotificationRadiusM(19)).toThrow(AppError);
    expect(() => parseStopNotificationRadiusM(STOP_RADIUS_MAX_M + 1)).toThrow(AppError);
    expect(() => parseStopNotificationRadiusM(12.5)).toThrow(AppError);
  });

  it("allows omit when not required", () => {
    expect(parseStopNotificationRadiusM(undefined)).toBeUndefined();
    expect(STOP_RADIUS_DEFAULT_M).toBe(150);
  });
});
