/**
 * Display helpers for class / section naming in Admin create flows.
 * School product language: "Class" (not "Grade").
 */

const CLASS_PREFIX = /^(?:grade|class|std|standard|year)\s+/i;

/** Title-case words: "class 8" → "Class 8", "CLASS 10" → "Class 10". */
export function capitalizeClassName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

/** Section codes are uppercase: "a" → "A", "b1" → "B1". */
export function capitalizeSectionName(raw: string): string {
  return raw.trim().replace(/\s+/g, "").toUpperCase();
}

/**
 * Canonical identity for matching ("Grade 8", "Class 8", "8", "CLASS-8" → "8").
 */
export function classIdentityKey(raw: string): string {
  let value = (raw ?? "").trim().replace(/\s+/g, " ");
  if (!value) return "";
  // Slug codes: CLASS-8 → Class 8
  value = value.replace(/[-_]+/g, " ");
  for (let i = 0; i < 3; i++) {
    value = value.replace(CLASS_PREFIX, "").trim();
  }
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Canonical display name for school classes.
 * "8" / "Grade 8" / "class 8" → "Class 8"; "Nursery" stays title-cased.
 */
export function normalizeSchoolClassName(raw: string): string {
  const key = classIdentityKey(raw);
  if (!key) return "";
  const compact = key.replace(/\s+/g, "");
  // Pure numeric (or 8A) class levels → Class N
  if (/^\d+[a-z]?$/.test(compact)) {
    const match = compact.match(/^(\d+)([a-z]?)$/i);
    const num = match?.[1] ?? compact;
    const suffix = match?.[2] ? match[2].toUpperCase() : "";
    return `Class ${num}${suffix}`;
  }
  return capitalizeClassName(key);
}

/** Stable API code from a display name: "Class 8" → "CLASS-8". */
export function classCodeFromName(raw: string): string {
  const name = normalizeSchoolClassName(raw) || capitalizeClassName(raw);
  return (
    name
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toUpperCase()
      .slice(0, 50) || "CLASS"
  );
}

/**
 * Numeric rank for automatic class ordering.
 * Class 1…12 sort by number; non-numeric names (Nursery, LKG) share a later bucket
 * and are ordered alphabetically by the caller.
 */
export function classSortRank(raw: string): number {
  const key = classIdentityKey(raw);
  if (!key) return 9999;
  const match = key.match(/^(\d+)/);
  if (match) return Number(match[1]);
  return 1000;
}

/**
 * Pull the section letter/code from noisy labels:
 * "A", "Sec A", "Section B", "8-A" → A / B.
 */
export function sectionIdentityKey(raw: string): string {
  const compact = capitalizeSectionName(raw);
  if (!compact) return "";
  // Bare letter or letter+digits: A, B1
  if (/^[A-Z]\d*$/.test(compact)) return compact;
  // "SECA" / "SECTIONB" after space strip
  const stripped = compact.replace(/^(?:SEC|SECTION|SECT)/, "");
  if (/^[A-Z]\d*$/.test(stripped)) return stripped;
  // "8-A" / "CLASS8A" style — take trailing letter(+digits)
  const trailing = compact.match(/([A-Z]\d*)$/);
  if (trailing) return trailing[1]!;
  return compact;
}

/** Section letter order: A=1, B=2, …; unknown → after letters. */
export function sectionSortRank(raw: string): number {
  const code = sectionIdentityKey(raw);
  if (!code) return 999;
  if (/^[A-Z]$/.test(code)) return code.charCodeAt(0) - 64;
  if (/^[A-Z]\d+$/.test(code)) {
    return (code.charCodeAt(0) - 64) * 100 + Number(code.slice(1));
  }
  return 500 + code.charCodeAt(0);
}

/** True when two labels/codes refer to the same school class. */
export function classesReferToSame(
  left: { name?: string | null; code?: string | null },
  rightName: string,
  rightCode?: string | null,
): boolean {
  const leftKey =
    classIdentityKey(left.name ?? "") || classIdentityKey(left.code ?? "");
  const rightKey =
    classIdentityKey(rightName) || classIdentityKey(rightCode ?? "");
  return Boolean(leftKey && rightKey && leftKey === rightKey);
}

export function classSectionExists(
  items: Array<{ name?: string; code?: string; section?: string }>,
  className: string,
  sectionName: string,
): boolean {
  const classKey = classIdentityKey(className);
  const sectionKey = capitalizeSectionName(sectionName).toLowerCase();
  if (!classKey || !sectionKey) return false;
  return items.some((item) => {
    const itemClassKey =
      classIdentityKey(item.name ?? "") || classIdentityKey(item.code ?? "");
    const sectionPart = capitalizeSectionName(
      item.section ?? item.code ?? "",
    ).toLowerCase();
    // Demo rows use "Class 8-A" / "Class 8 · Sec A"
    const combined = `${item.name ?? ""}`.toLowerCase();
    if (itemClassKey && itemClassKey === classKey && sectionPart === sectionKey) {
      return true;
    }
    if (
      classKey &&
      combined.includes(classKey) &&
      (combined.includes(`-${sectionKey}`) ||
        combined.includes(`· sec ${sectionKey}`) ||
        sectionPart === sectionKey)
    ) {
      return true;
    }
    return false;
  });
}
