/**
 * Canonical Attendance identity — single SoT for class / section / student keys.
 *
 * Internal identifiers (never diverge):
 * - Class:  `10`, `9`, `11` (stripped of Grade/Class prefixes)
 * - Section key: `10::B`
 * - Student: `stu:10:B:14` (class + section + roll)
 *
 * Display labels ("Grade 10", "Class 10") may differ in UI only.
 */

const CLASS_PREFIX =
  /^(?:grade|class|std|standard|year)\s+/i;

/** Strip display prefixes → canonical class id (`Grade 10` / `Class 10` → `10`). */
export function canonicalAttendanceClassId(classLabel: string): string {
  let value = (classLabel ?? "").trim();
  // Repeat for odd stacked prefixes ("Grade Class 10")
  for (let i = 0; i < 2; i++) {
    value = value.replace(CLASS_PREFIX, "").trim();
  }
  return value.replace(/\s+/g, " ").trim();
}

/** Canonical section key: `{classId}::{section}` e.g. `10::B`. */
export function canonicalAttendanceSectionKey(
  classLabel: string,
  section: string,
): string {
  const classId = canonicalAttendanceClassId(classLabel);
  const sec = (section ?? "").trim().toUpperCase();
  return `${classId}::${sec}`;
}

/**
 * Normalize any legacy section key to canonical form.
 * `Grade 10::B` / `Class 10::B` / `10::B` → `10::B`
 */
export function normalizeAttendanceSectionKey(raw: string): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  const sep = trimmed.indexOf("::");
  if (sep < 0) {
    return canonicalAttendanceClassId(trimmed);
  }
  const left = trimmed.slice(0, sep);
  const right = trimmed.slice(sep + 2);
  return canonicalAttendanceSectionKey(left, right);
}

/** Pad roll for stable student ids (`14` → `14`, `6` → `06` when numeric). */
export function canonicalAttendanceRoll(rollNo: string): string {
  const raw = (rollNo ?? "").trim();
  if (!raw) return "00";
  if (/^\d+$/.test(raw)) {
    return raw.padStart(Math.max(2, raw.length), "0");
  }
  return raw.replace(/\s+/g, "");
}

/**
 * Canonical attendance student id.
 * Format: `stu:{classId}:{section}:{roll}` e.g. `stu:10:B:14`
 */
export function canonicalAttendanceStudentId(input: {
  classLabel: string;
  section: string;
  rollNo: string;
}): string {
  const classId = canonicalAttendanceClassId(input.classLabel);
  const section = (input.section ?? "").trim().toUpperCase();
  const roll = canonicalAttendanceRoll(input.rollNo);
  return `stu:${classId}:${section}:${roll}`;
}

const STU_RE = /^stu:([^:]+):([^:]+):(.+)$/i;

/** Parse a canonical student id; null if not canonical. */
export function parseAttendanceStudentId(
  id: string,
): { classId: string; section: string; rollNo: string } | null {
  const m = (id ?? "").trim().match(STU_RE);
  if (!m) return null;
  return {
    classId: m[1]!,
    section: m[2]!.toUpperCase(),
    rollNo: m[3]!,
  };
}

/** True when id already uses the canonical `stu:…` form. */
export function isCanonicalAttendanceStudentId(id: string): boolean {
  return parseAttendanceStudentId(id) !== null;
}

/**
 * Map a roster/local student into the canonical attendance student id.
 * Prefer roll + class + section; fall back to existing id only if already canonical.
 */
export function toAttendanceStudentId(input: {
  id?: string;
  classLabel: string;
  section: string;
  rollNo?: string;
}): string {
  const roll = (input.rollNo ?? "").trim();
  if (roll) {
    return canonicalAttendanceStudentId({
      classLabel: input.classLabel,
      section: input.section,
      rollNo: roll,
    });
  }
  if (input.id && isCanonicalAttendanceStudentId(input.id)) {
    return input.id;
  }
  // Last resort: stable placeholder from local id (demo only)
  const classId = canonicalAttendanceClassId(input.classLabel);
  const section = (input.section ?? "").trim().toUpperCase();
  const suffix = (input.id ?? "x").replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "x";
  return `stu:${classId}:${section}:${suffix}`;
}

/** Normalize a list of section keys (coordinator allow-lists, filters). */
export function normalizeAttendanceSectionKeys(
  keys: readonly string[],
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    const n = normalizeAttendanceSectionKey(key);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}
