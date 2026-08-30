import { describe, expect, it } from "vitest";
import {
  isDemoClassSectionKey,
  resolveClassAudienceForApi,
  type ApiClassSectionAudienceOption,
} from "./class-section-audience";

const OPTIONS: ApiClassSectionAudienceOption[] = [
  {
    key: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    grade: "Grade 10",
    section: "A",
    label: "Grade 10 · Sec A",
    classId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    sectionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  },
];

describe("class-section-audience", () => {
  it("detects demo keys", () => {
    expect(isDemoClassSectionKey("10::B")).toBe(true);
    expect(isDemoClassSectionKey("cccccccc-cccc-4ccc-8ccc-cccccccccccc")).toBe(false);
  });

  it("maps a selected section UUID to class_id and section_id", () => {
    const resolved = resolveClassAudienceForApi({
      visibilityIsClasses: true,
      classScope: "selected",
      selectedKeys: [OPTIONS[0]!.key],
      options: OPTIONS,
      baseAudienceScope: "all",
      baseAudienceLabel: "All",
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.fields.audienceScope).toBe("classes");
    expect(resolved.fields.classId).toBe(OPTIONS[0]!.classId);
    expect(resolved.fields.sectionId).toBe(OPTIONS[0]!.sectionId);
  });

  it("rejects demo keys in API mode", () => {
    const resolved = resolveClassAudienceForApi({
      visibilityIsClasses: true,
      classScope: "selected",
      selectedKeys: ["10::B"],
      options: OPTIONS,
      baseAudienceScope: "classes",
      baseAudienceLabel: "Classes",
    });
    expect(resolved.ok).toBe(false);
  });

  it("maps classes-all to institute-wide all scope", () => {
    const resolved = resolveClassAudienceForApi({
      visibilityIsClasses: true,
      classScope: "all",
      selectedKeys: [],
      options: OPTIONS,
      baseAudienceScope: "classes",
      baseAudienceLabel: "Classes",
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.fields.audienceScope).toBe("all");
    expect(resolved.fields.classId).toBeNull();
    expect(resolved.fields.sectionId).toBeNull();
  });
});
