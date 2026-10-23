/**
 * CSV parsers for academics bulk import (classes / sections / subjects).
 * Column names match bulk-import-contract.ts and create APIs.
 */

import {
  CLASS_BULK_IMPORT_FIELDS,
  SECTION_BULK_IMPORT_FIELDS,
  SUBJECT_BULK_IMPORT_FIELDS,
} from "./bulk-import-contract";

export type ClassImportRow = {
  name: string;
  code: string;
  sortOrder: string;
  sectionName: string;
  sectionCode: string;
};

export type SectionImportRow = {
  classCode: string;
  name: string;
  code: string;
  capacity: string;
  room: string;
};

export type SubjectImportRow = {
  name: string;
  code: string;
  capacity: string;
  category: string;
};

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  values.push(current.trim());
  return values;
}

function headerIndex(headers: string[], column: string): number {
  return headers.findIndex((h) => h.trim().toLowerCase() === column.toLowerCase());
}

function cell(cells: string[], headers: string[], column: string): string {
  const idx = headerIndex(headers, column);
  return idx >= 0 ? (cells[idx] ?? "").trim() : "";
}

function missingRequiredHeaders(
  headers: string[],
  fields: { column: string; required: boolean }[],
): string[] {
  return fields
    .filter((f) => f.required)
    .map((f) => f.column)
    .filter((col) => headerIndex(headers, col) < 0);
}

export function parseClassImportCsv(text: string): {
  rows: ClassImportRow[];
  errors: string[];
} {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length === 0) {
    return { rows: [], errors: ["The spreadsheet is empty."] };
  }
  const headers = parseCsvLine(lines[0]!);
  const missing = missingRequiredHeaders(headers, CLASS_BULK_IMPORT_FIELDS);
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [`Missing required column(s): ${missing.join(", ")}`],
    };
  }

  const rows: ClassImportRow[] = [];
  const errors: string[] = [];
  const seenCodes = new Set<string>();
  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]!);
    if (cells.every((c) => !c.trim())) continue;
    const rowNumber = i + 1;
    const row: ClassImportRow = {
      name: cell(cells, headers, "name"),
      code: cell(cells, headers, "code"),
      sortOrder: cell(cells, headers, "sort_order"),
      sectionName: cell(cells, headers, "section_name"),
      sectionCode: cell(cells, headers, "section_code"),
    };
    if (!row.name) errors.push(`Row ${rowNumber}: name is required.`);
    if (!row.code) errors.push(`Row ${rowNumber}: code is required.`);
    if (row.sortOrder) {
      if (!/^\d+$/.test(row.sortOrder)) {
        errors.push(
          `Row ${rowNumber}: sort_order must be a nonnegative integer.`,
        );
      }
    }
    const codeKey = row.code.trim().toLowerCase();
    if (codeKey && seenCodes.has(codeKey)) {
      errors.push(`Row ${rowNumber}: duplicate class code "${row.code}" in file.`);
    }
    if (codeKey) seenCodes.add(codeKey);
    rows.push(row);
  }
  return { rows, errors };
}

export function parseSectionImportCsv(
  text: string,
  catalog?: { classCodes?: string[] },
): {
  rows: SectionImportRow[];
  errors: string[];
} {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length === 0) {
    return { rows: [], errors: ["The spreadsheet is empty."] };
  }
  const headers = parseCsvLine(lines[0]!);
  const missing = missingRequiredHeaders(headers, SECTION_BULK_IMPORT_FIELDS);
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [`Missing required column(s): ${missing.join(", ")}`],
    };
  }

  const knownCodes = new Set(
    (catalog?.classCodes ?? []).map((c) => c.trim().toLowerCase()),
  );
  const rows: SectionImportRow[] = [];
  const errors: string[] = [];
  const seenSectionKeys = new Set<string>();
  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]!);
    if (cells.every((c) => !c.trim())) continue;
    const rowNumber = i + 1;
    const row: SectionImportRow = {
      classCode: cell(cells, headers, "class_code"),
      name: cell(cells, headers, "name"),
      code: cell(cells, headers, "code"),
      capacity: cell(cells, headers, "capacity"),
      room: cell(cells, headers, "room"),
    };
    if (!row.classCode) errors.push(`Row ${rowNumber}: class_code is required.`);
    if (!row.name) errors.push(`Row ${rowNumber}: name is required.`);
    if (!row.code) errors.push(`Row ${rowNumber}: code is required.`);
    if (row.capacity && !/^\d+$/.test(row.capacity)) {
      errors.push(`Row ${rowNumber}: capacity must be a nonnegative integer.`);
    }
    if (
      row.classCode &&
      knownCodes.size > 0 &&
      !knownCodes.has(row.classCode.toLowerCase())
    ) {
      errors.push(
        `Row ${rowNumber}: class_code "${row.classCode}" is not in this institute’s class list.`,
      );
    }
    if (row.classCode && catalog && (catalog.classCodes?.length ?? 0) === 0) {
      errors.push(
        `Row ${rowNumber}: class catalog is empty; cannot resolve class_code.`,
      );
    }
    const sectionKey = `${row.classCode.trim().toLowerCase()}::${row.code.trim().toLowerCase()}`;
    if (row.classCode && row.code && seenSectionKeys.has(sectionKey)) {
      errors.push(
        `Row ${rowNumber}: duplicate section "${row.code}" for class_code "${row.classCode}" in file.`,
      );
    }
    if (row.classCode && row.code) seenSectionKeys.add(sectionKey);
    rows.push(row);
  }
  return { rows, errors };
}

export function parseSubjectImportCsv(text: string): {
  rows: SubjectImportRow[];
  errors: string[];
} {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length === 0) {
    return { rows: [], errors: ["The spreadsheet is empty."] };
  }
  const headers = parseCsvLine(lines[0]!);
  const missing = missingRequiredHeaders(headers, SUBJECT_BULK_IMPORT_FIELDS);
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [`Missing required column(s): ${missing.join(", ")}`],
    };
  }

  const rows: SubjectImportRow[] = [];
  const errors: string[] = [];
  const seenCodes = new Set<string>();
  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]!);
    if (cells.every((c) => !c.trim())) continue;
    const rowNumber = i + 1;
    const row: SubjectImportRow = {
      name: cell(cells, headers, "name"),
      code: cell(cells, headers, "code"),
      capacity: cell(cells, headers, "capacity"),
      category: cell(cells, headers, "category"),
    };
    if (!row.name) errors.push(`Row ${rowNumber}: name is required.`);
    if (!row.code) errors.push(`Row ${rowNumber}: code is required.`);
    if (row.capacity && !/^\d+$/.test(row.capacity)) {
      errors.push(`Row ${rowNumber}: capacity must be a nonnegative integer.`);
    }
    const codeKey = row.code.toLowerCase();
    if (codeKey && seenCodes.has(codeKey)) {
      errors.push(`Row ${rowNumber}: duplicate subject code "${row.code}" in file.`);
    }
    if (codeKey) seenCodes.add(codeKey);
    rows.push(row);
  }
  return { rows, errors };
}

export function academicsImportTemplateCsv(
  entity: "classes" | "sections" | "subjects",
): string {
  const fields =
    entity === "classes"
      ? CLASS_BULK_IMPORT_FIELDS
      : entity === "sections"
        ? SECTION_BULK_IMPORT_FIELDS
        : SUBJECT_BULK_IMPORT_FIELDS;
  const header = fields.map((f) => f.column).join(",");
  const example =
    entity === "classes"
      ? "Grade 6,G6,60,A,A"
      : entity === "sections"
        ? "G6,A,A,40,R101"
        : "Mathematics,MATH,40,Core";
  return `${header}\n${example}\n`;
}
