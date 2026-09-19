/**
 * Parse Excel/CSV rows for Admin teacher bulk import.
 */
import { normalizeDateOnlyInput } from "@/lib/date-only";

export type TeacherImportRow = {
  displayName: string;
  phone: string;
  department: string;
  email: string;
  employeeId: string;
  qualification: string;
  teachingScope: string;
  subjects: string;
  assignedSections: string;
  classTeacherSections: string;
  dateOfBirth: string;
  joinedOn: string;
};

export const TEACHER_CSV_HEADERS = [
  "display_name",
  "phone",
  "department",
  "email",
  "employee_id",
  "qualification",
  "teaching_scope",
  "subjects",
  "assigned_sections",
  "class_teacher_sections",
  "date_of_birth",
  "joined_on",
] as const;

export const TEACHER_IMPORT_REQUIRED_HEADERS = [
  "display_name",
  "phone",
] as const;

export const TEACHER_IMPORT_SAMPLE_ROW = [
  "Ananya Iyer",
  "9876501234",
  "General",
  "ananya.iyer@school.edu",
  "EMP-101",
  "M.Sc Mathematics",
  "subject_teacher",
  "Mathematics, Algebra",
  "G10-A, G10-B",
  "G10-A",
  "1990-05-12",
  "2024-06-01",
] as const;

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]!;
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  values.push(current.trim());
  return values;
}

export function validateTeacherImportRow(
  row: TeacherImportRow,
  rowNumber: number,
  catalog?: {
    sectionLabels?: string[];
    subjectNames?: string[];
  },
): string[] {
  const errors: string[] = [];
  if (!row.displayName.trim()) {
    errors.push(`Row ${rowNumber}: display_name is required.`);
  }
  const phone = normalizePhone(row.phone);
  if (!/^\d{10}$/.test(phone)) {
    errors.push(`Row ${rowNumber}: phone must contain exactly 10 digits.`);
  }
  if (row.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) {
    errors.push(`Row ${rowNumber}: email is not valid.`);
  }
  if (row.dateOfBirth.trim() && !normalizeDateOnlyInput(row.dateOfBirth)) {
    errors.push(
      `Row ${rowNumber}: date_of_birth must be a real date (prefer YYYY-MM-DD).`,
    );
  }
  if (row.joinedOn.trim() && !normalizeDateOnlyInput(row.joinedOn)) {
    errors.push(
      `Row ${rowNumber}: joined_on must be a real date (prefer YYYY-MM-DD).`,
    );
  }
  const scope = row.teachingScope.trim().toLowerCase().replace(/[-\s]+/g, "_");
  if (
    scope &&
    !["subject_teacher", "activity_coordinator", "dual_role", "class_teacher"].includes(
      scope,
    )
  ) {
    errors.push(
      `Row ${rowNumber}: teaching_scope must be subject_teacher, activity_coordinator, dual_role, or class_teacher.`,
    );
  }

  if (catalog?.sectionLabels && catalog.sectionLabels.length > 0) {
    const known = new Set(
      catalog.sectionLabels.map((label) => label.trim().toLowerCase().replace(/\s+/g, "")),
    );
    for (const label of splitCsvList(row.assignedSections)) {
      const key = label.toLowerCase().replace(/\s+/g, "");
      if (!known.has(key)) {
        errors.push(
          `Row ${rowNumber}: assigned_sections value "${label}" is not in this institute’s class list. Re-download the template.`,
        );
      }
    }
    for (const label of splitCsvList(row.classTeacherSections)) {
      const key = label.toLowerCase().replace(/\s+/g, "");
      if (!known.has(key)) {
        errors.push(
          `Row ${rowNumber}: class_teacher_sections value "${label}" is not in this institute’s class list. Re-download the template.`,
        );
      }
    }
    if (splitCsvList(row.classTeacherSections).length > 1) {
      errors.push(
        `Row ${rowNumber}: class_teacher_sections must be a single section (one homeroom).`,
      );
    }
  }

  if (catalog?.subjectNames && catalog.subjectNames.length > 0) {
    const known = new Set(
      catalog.subjectNames.map((name) => name.trim().toLowerCase()),
    );
    for (const subject of splitCsvList(row.subjects)) {
      if (!known.has(subject.toLowerCase())) {
        errors.push(
          `Row ${rowNumber}: subject "${subject}" is not in this institute’s subject catalog. Re-download the template.`,
        );
      }
    }
  }

  return errors;
}

export function parseTeacherSheetRows(
  sheetRows: string[][],
  catalog?: {
    sectionLabels?: string[];
    subjectNames?: string[];
  },
): {
  rows: TeacherImportRow[];
  errors: string[];
} {
  const populatedRows = sheetRows.filter((row) =>
    row.some((cell) => String(cell).trim()),
  );
  if (populatedRows.length === 0) {
    return { rows: [], errors: ["The spreadsheet is empty."] };
  }
  const headers = populatedRows[0]!.map((header) =>
    String(header).trim().toLowerCase(),
  );
  const missing = TEACHER_IMPORT_REQUIRED_HEADERS.filter(
    (header) => !headers.includes(header),
  );
  if (missing.length > 0) {
    return { rows: [], errors: [`Missing required columns: ${missing.join(", ")}.`] };
  }

  const value = (cells: string[], key: string) => {
    const index = headers.indexOf(key);
    return index >= 0 ? String(cells[index] ?? "").trim() : "";
  };

  const rows = populatedRows.slice(1).map((cells) => {
    const rawDob = value(cells, "date_of_birth");
    const rawJoined = value(cells, "joined_on");
    return {
      displayName: value(cells, "display_name"),
      phone: value(cells, "phone"),
      department: value(cells, "department") || "General",
      email: value(cells, "email"),
      employeeId: value(cells, "employee_id"),
      qualification: value(cells, "qualification"),
      teachingScope: value(cells, "teaching_scope"),
      subjects: value(cells, "subjects"),
      assignedSections: value(cells, "assigned_sections"),
      classTeacherSections: value(cells, "class_teacher_sections"),
      // Normalize Excel locale / serial dates early so create payload stays YYYY-MM-DD.
      dateOfBirth: normalizeDateOnlyInput(rawDob) ?? rawDob,
      joinedOn: normalizeDateOnlyInput(rawJoined) ?? rawJoined,
    };
  });

  const errors = rows.flatMap((row, index) =>
    validateTeacherImportRow(row, index + 2, catalog),
  );
  return { rows, errors };
}

export function parseTeacherCsv(
  content: string,
  catalog?: {
    sectionLabels?: string[];
    subjectNames?: string[];
  },
): {
  rows: TeacherImportRow[];
  errors: string[];
} {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  return parseTeacherSheetRows(lines.map(parseCsvLine), catalog);
}

export function splitCsvList(value: string): string[] {
  return value
    .split(/[,;|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function normalizeTeacherPhone(value: string): string {
  return normalizePhone(value);
}

export function parseTeachingScope(
  raw: string,
): "subject_teacher" | "activity_coordinator" | "dual_role" {
  const scope = raw.trim().toLowerCase().replace(/[-\s]+/g, "_");
  if (scope === "activity_coordinator") return "activity_coordinator";
  if (scope === "dual_role" || scope === "both") return "dual_role";
  // class_teacher maps to subject_teacher + class_teacher_sections in create payload
  return "subject_teacher";
}
