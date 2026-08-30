/**
 * Class · section audience helpers for API-mode communications.
 * Demo mode keeps grade::section keys from institute setup / exam-timetable-data.
 */
import { isInstituteUuid } from "@/lib/active-institute";
import { listClassesCatalog } from "@/lib/classes/api";
import { classLabelForSection } from "@/lib/classes/map";
import type { ClassSectionOption } from "@/lib/exam-timetable-data";

export type ApiClassSectionAudienceOption = ClassSectionOption & {
  classId: string;
  sectionId: string;
};

export type ClassAudienceScope = "all" | "students" | "parents" | "teachers" | "classes";

export type ClassAudienceApiFields = {
  audienceScope: ClassAudienceScope;
  audienceLabel: string;
  classId: string | null;
  sectionId: string | null;
};

/** Demo / attendance-style keys such as `10::B` — not valid for API writes. */
export function isDemoClassSectionKey(key: string): boolean {
  return key.includes("::");
}

export async function loadApiClassSectionAudienceOptions(
  instituteId: string,
): Promise<ApiClassSectionAudienceOption[]> {
  const { sections, classes } = await listClassesCatalog({ instituteId });
  const classesById = new Map(classes.map((c) => [c.id, c]));
  return sections
    .map((section) => {
      const grade = classLabelForSection(section, classesById);
      const sec = section.code?.trim() || section.name?.trim() || "—";
      return {
        key: section.id,
        grade,
        section: sec,
        label: `${grade} · Sec ${sec}`,
        classId: section.classId,
        sectionId: section.id,
      };
    })
    .sort((a, b) => {
      const byGrade = a.grade.localeCompare(b.grade, undefined, { numeric: true });
      return byGrade !== 0 ? byGrade : a.section.localeCompare(b.section);
    });
}

export function resolveClassAudienceForApi(input: {
  visibilityIsClasses: boolean;
  classScope: "all" | "selected";
  selectedKeys: string[];
  options: ApiClassSectionAudienceOption[];
  baseAudienceScope: ClassAudienceScope;
  baseAudienceLabel: string;
}):
  | { ok: true; fields: ClassAudienceApiFields }
  | { ok: false; error: string } {
  if (!input.visibilityIsClasses) {
    return {
      ok: true,
      fields: {
        audienceScope: input.baseAudienceScope,
        audienceLabel: input.baseAudienceLabel,
        classId: null,
        sectionId: null,
      },
    };
  }

  if (input.classScope === "all") {
    return {
      ok: true,
      fields: {
        audienceScope: "all",
        audienceLabel: "Classes · All",
        classId: null,
        sectionId: null,
      },
    };
  }

  if (input.selectedKeys.length === 0) {
    return { ok: false, error: "Select a class · section audience" };
  }
  if (input.selectedKeys.length > 1) {
    return {
      ok: false,
      error: "API mode supports one class · section per item",
    };
  }

  const key = input.selectedKeys[0]!;
  if (isDemoClassSectionKey(key)) {
    return { ok: false, error: "Demo class keys cannot be used in API mode" };
  }
  if (!isInstituteUuid(key)) {
    return { ok: false, error: "Class · section must be a valid section UUID" };
  }

  const match = input.options.find((o) => o.key === key);
  if (!match) {
    return { ok: false, error: "Selected section is not in this institute" };
  }

  return {
    ok: true,
    fields: {
      audienceScope: "classes",
      audienceLabel: `Classes · ${match.label}`,
      classId: match.classId,
      sectionId: match.sectionId,
    },
  };
}

export function apiClassAudienceSelectionValid(input: {
  visibilityIsClasses: boolean;
  classScope: "all" | "selected";
  selectedKeys: string[];
}): boolean {
  if (!input.visibilityIsClasses) return true;
  if (input.classScope === "all") return true;
  return input.selectedKeys.length === 1 && !isDemoClassSectionKey(input.selectedKeys[0] ?? "");
}
