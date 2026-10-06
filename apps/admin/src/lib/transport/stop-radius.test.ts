import { describe, expect, it } from "vitest";
import {
  parseStopRadiusInput,
  STOP_RADIUS_MAX_M,
  STOP_RADIUS_MIN_M,
} from "./stop-radius";

describe("parseStopRadiusInput", () => {
  it("accepts 50/100/150", () => {
    expect(parseStopRadiusInput(50)).toEqual({ ok: true, meters: 50 });
    expect(parseStopRadiusInput("100")).toEqual({ ok: true, meters: 100 });
    expect(parseStopRadiusInput(150)).toEqual({ ok: true, meters: 150 });
  });

  it("rejects invalid values without silent default", () => {
    expect(parseStopRadiusInput("")).toMatchObject({ ok: false });
    expect(parseStopRadiusInput(null)).toMatchObject({ ok: false });
    expect(parseStopRadiusInput(0)).toMatchObject({ ok: false });
    expect(parseStopRadiusInput(STOP_RADIUS_MIN_M - 1)).toMatchObject({ ok: false });
    expect(parseStopRadiusInput(STOP_RADIUS_MAX_M + 1)).toMatchObject({ ok: false });
    expect(parseStopRadiusInput(Number.NaN)).toMatchObject({ ok: false });
  });
});
