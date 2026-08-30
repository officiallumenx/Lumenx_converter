import { describe, expect, it } from "vitest";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  pickAttendanceConfigForRegister,
  slotFieldsFromMethod,
} from "./register-create-helpers";
import type { AttendanceConfigDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function config(overrides: Partial<AttendanceConfigDto> = {}): AttendanceConfigDto {
  return {
    id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    instituteId: INST,
    effectiveFrom: "2025-04-01",
    method: "daily",
    owner: "class_teacher",
    scope: "institute",
    classCodes: [],
    sectionCodes: [],
    createdByUserProfileId: null,
    createdAt: "2025-04-01T00:00:00Z",
    updatedAt: "2025-04-01T00:00:00Z",
    ...overrides,
  };
}

describe("register-create-helpers", () => {
  it("picks latest eligible config for attendance date", () => {
    const picked = pickAttendanceConfigForRegister({
      configs: [
        config({ id: "older", effectiveFrom: "2025-01-01" }),
        config({ id: "newer", effectiveFrom: "2025-06-01" }),
        config({ id: "future", effectiveFrom: "2026-01-01" }),
      ],
      attendanceDate: "2025-08-01",
      classCode: "G10",
      sectionCode: "A",
    });
    expect(picked?.id).toBe("newer");
  });

  it("maps daily method to day slot fields", () => {
    expect(slotFieldsFromMethod("daily")).toEqual({
      slotKind: "day",
      slotCode: "slot:day",
      slotLabel: "Full day",
      periodIndex: null,
    });
  });
});

describe("student attendance write gate", () => {
  it("disables writes when institute context is not ready", () => {
    expect(
      resolveWritesEnabled(true, {
        status: "loading",
        activeInstituteId: INST,
      }),
    ).toBe(false);
    expect(
      resolveWritesEnabled(true, {
        status: "ready",
        activeInstituteId: null,
      }),
    ).toBe(false);
    expect(
      resolveWritesEnabled(true, {
        status: "ready",
        activeInstituteId: INST,
      }),
    ).toBe(true);
  });
});
