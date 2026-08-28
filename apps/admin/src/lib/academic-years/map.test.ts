import { describe, expect, it } from "vitest";
import {
  academicYearDtoToListItem,
  academicYearDtosToListItems,
} from "./map";
import type { AcademicYearDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<AcademicYearDto> = {}): AcademicYearDto {
  return {
    id: "yy111111-1111-4111-8111-111111111111",
    instituteId: INST,
    name: "2026-2027",
    code: "AY2627",
    startsOn: "2026-04-01",
    endsOn: "2027-03-31",
    status: "active",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("academic-years DTO mapping", () => {
  it("maps core fields to demo-compatible list item", () => {
    const item = academicYearDtoToListItem(dto());
    expect(item.id).toBe("yy111111-1111-4111-8111-111111111111");
    expect(item.label).toBe("2026-2027");
    expect(item.startDate).toBe("2026-04-01");
    expect(item.endDate).toBe("2027-03-31");
    expect(item.status).toBe("active");
    expect(item.code).toBe("AY2627");
  });

  it("falls back label to code then default", () => {
    expect(academicYearDtoToListItem(dto({ name: "  ", code: "AY2526" })).label).toBe(
      "AY2526",
    );
    expect(academicYearDtoToListItem(dto({ name: "  ", code: "  " })).label).toBe(
      "Academic year",
    );
  });

  it("maps multiple DTOs and rejects malformed payload", () => {
    const items = academicYearDtosToListItems([dto(), dto({ id: "yy-2" })]);
    expect(items).toHaveLength(2);
    expect(() => academicYearDtosToListItems({ not: "array" } as never)).toThrow(
      /array/i,
    );
  });
});
