/**
 * Documented bulk-import contracts for Admin academics entities.
 * Field lists are derived from API/schema — do not invent columns.
 */

import { TEACHER_CSV_HEADERS, TEACHER_IMPORT_REQUIRED_HEADERS } from "@/lib/teachers/bulk-import-parse";

export type BulkImportEntity = "classes" | "sections" | "subjects" | "teachers";

export type BulkImportField = {
  column: string;
  required: boolean;
  notes: string;
};

/** Teachers — aligned with TEACHER_CSV_HEADERS / live Excel importer. */
export const TEACHER_BULK_IMPORT_FIELDS: BulkImportField[] = [
  { column: "display_name", required: true, notes: "Teacher display name" },
  { column: "phone", required: true, notes: "10-digit mobile (Connect OTP)" },
  { column: "department", required: false, notes: "Defaults to General" },
  { column: "email", required: false, notes: "Contact email" },
  { column: "employee_id", required: false, notes: "Institute employee code" },
  { column: "qualification", required: false, notes: "Free text" },
  {
    column: "teaching_scope",
    required: false,
    notes: "subject_teacher | activity_coordinator | dual_role | class_teacher",
  },
  { column: "subjects", required: false, notes: "Comma-separated subject catalog names" },
  {
    column: "assigned_sections",
    required: false,
    notes: "Teaching section labels (e.g. G10-A) from institute catalog",
  },
  {
    column: "class_teacher_sections",
    required: false,
    notes: "Single homeroom section label resolved to section UUID",
  },
  { column: "date_of_birth", required: false, notes: "YYYY-MM-DD preferred" },
  { column: "joined_on", required: false, notes: "YYYY-MM-DD preferred" },
];

/**
 * Classes — POST /api/v1/classes (academic_year chosen in UI, not a free CSV UUID).
 */
export const CLASS_BULK_IMPORT_FIELDS: BulkImportField[] = [
  { column: "name", required: true, notes: "Class display name" },
  { column: "code", required: true, notes: "Unique within academic year" },
  { column: "sort_order", required: false, notes: "Integer sort rank" },
  {
    column: "section_name",
    required: false,
    notes: "Optional first section name; when set, also creates a section",
  },
  {
    column: "section_code",
    required: false,
    notes: "Optional first section code (defaults to section_name)",
  },
];

/**
 * Sections — POST /api/v1/sections; class resolved by class_code within selected year.
 */
export const SECTION_BULK_IMPORT_FIELDS: BulkImportField[] = [
  { column: "class_code", required: true, notes: "Parent class code in selected year" },
  { column: "name", required: true, notes: "Section name (e.g. A)" },
  { column: "code", required: true, notes: "Section code" },
  { column: "capacity", required: false, notes: "Seat capacity (section.capacity)" },
  { column: "room", required: false, notes: "Room label" },
];

/**
 * Subjects — create form fields only (no class_periods on import).
 */
export const SUBJECT_BULK_IMPORT_FIELDS: BulkImportField[] = [
  { column: "name", required: true, notes: "Subject name" },
  { column: "code", required: true, notes: "Unique subject code" },
  { column: "capacity", required: false, notes: "Optional catalog capacity ≥ 0" },
  { column: "category", required: false, notes: "Defaults to Core" },
];

export function bulkImportFieldsFor(entity: BulkImportEntity): BulkImportField[] {
  switch (entity) {
    case "classes":
      return CLASS_BULK_IMPORT_FIELDS;
    case "sections":
      return SECTION_BULK_IMPORT_FIELDS;
    case "subjects":
      return SUBJECT_BULK_IMPORT_FIELDS;
    case "teachers":
      return TEACHER_BULK_IMPORT_FIELDS;
  }
}

export function requiredColumns(entity: BulkImportEntity): string[] {
  return bulkImportFieldsFor(entity)
    .filter((f) => f.required)
    .map((f) => f.column);
}

/** Sanity: teacher contract stays locked to the live parser headers. */
export function teacherContractMatchesParser(): boolean {
  const contract = TEACHER_BULK_IMPORT_FIELDS.map((f) => f.column);
  const headers = [...TEACHER_CSV_HEADERS];
  if (contract.length !== headers.length) return false;
  if (!contract.every((col, i) => col === headers[i])) return false;
  return TEACHER_IMPORT_REQUIRED_HEADERS.every((h) =>
    TEACHER_BULK_IMPORT_FIELDS.some((f) => f.column === h && f.required),
  );
}
