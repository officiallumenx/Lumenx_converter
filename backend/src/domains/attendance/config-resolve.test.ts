import { describe, expect, it } from "vitest";
import { pickConfigForSection } from "./config-resolve.js";
import type { AttendanceConfigVersionRow } from "./types.js";

function row(
  overrides: Partial<AttendanceConfigVersionRow> & Pick<AttendanceConfigVersionRow, "id">,
): AttendanceConfigVersionRow {
  return {
    institute_id: "inst",
    effective_from: "2025-04-01",
    method: "daily",
    owner: "class_teacher",
    scope: "institute",
    class_codes: [],
    section_codes: [],
    created_by_user_profile_id: null,
    created_at: "2025-04-01T00:00:00Z",
    updated_at: "2025-04-01T00:00:00Z",
    deleted_at: null,
    ...overrides,
  };
}

describe("pickConfigForSection", () => {
  it("resolves section → class → institute precedence", () => {
    const configs = [
      row({
        id: "inst",
        scope: "institute",
        effective_from: "2025-06-01",
        owner: "attendance_incharge",
      }),
      row({
        id: "class",
        scope: "class",
        class_codes: ["G10"],
        effective_from: "2025-07-01",
        owner: "current_period_teacher",
      }),
      row({
        id: "section",
        scope: "section",
        section_codes: ["A"],
        effective_from: "2025-05-01",
        owner: "class_teacher",
      }),
    ];
    const picked = pickConfigForSection(configs, "2025-08-01", "G10", "A");
    expect(picked?.id).toBe("section");
  });

  it("falls back to class when section does not match", () => {
    const configs = [
      row({ id: "inst", scope: "institute" }),
      row({
        id: "class",
        scope: "class",
        class_codes: ["G10"],
        owner: "current_period_teacher",
      }),
      row({
        id: "other-section",
        scope: "section",
        section_codes: ["B"],
        owner: "class_teacher",
      }),
    ];
    const picked = pickConfigForSection(configs, "2025-08-01", "G10", "A");
    expect(picked?.id).toBe("class");
  });
});
