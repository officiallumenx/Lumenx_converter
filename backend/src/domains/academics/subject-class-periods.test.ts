import { describe, expect, it } from "vitest";
import { toSubjectDto } from "./service.js";
import type { SubjectRow } from "./types.js";

function row(overrides: Partial<SubjectRow> = {}): SubjectRow {
  return {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    institute_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "Mathematics",
    code: "MATH",
    category: "Core",
    periods_per_week: 5,
    applicable_class_codes: ["6", "7"],
    capacity: 40,
    class_periods: { "6": 4, "7": 5 },
    status: "active",
    created_at: "2026-10-23T00:00:00Z",
    updated_at: "2026-10-23T00:00:00Z",
    deleted_at: null,
    ...overrides,
  };
}

describe("subject capacity and class periods DTO", () => {
  it("maps capacity and per-class periods", () => {
    const dto = toSubjectDto(row());
    expect(dto.capacity).toBe(40);
    expect(dto.classPeriods).toEqual({ "6": 4, "7": 5 });
  });

  it("normalizes invalid class period entries away", () => {
    const dto = toSubjectDto(
      row({ class_periods: { "6": 4, bad: 0, "8": -1 } as Record<string, number> }),
    );
    expect(dto.classPeriods).toEqual({ "6": 4 });
  });

  it("defaults missing capacity/class_periods for legacy rows", () => {
    const dto = toSubjectDto(
      row({
        capacity: null,
        class_periods: undefined as unknown as Record<string, number>,
      }),
    );
    expect(dto.capacity).toBeNull();
    expect(dto.classPeriods).toEqual({});
  });

  it("keeps class period values independent after DTO mapping", () => {
    const dto = toSubjectDto(row({ class_periods: { "6": 4, "7": 5, "8": 3 } }));
    expect(dto.classPeriods["6"]).toBe(4);
    expect(dto.classPeriods["7"]).toBe(5);
    expect(dto.classPeriods["8"]).toBe(3);
  });
});
