import {
  validateImportRow,
  type StudentImportRow,
} from "@/lib/student-directory-store";

export const STUDENT_IMPORT_REQUIRED_HEADERS = [
  "first_name",
  "surname",
  "class",
  "parent_name",
  "address",
  "parent_phone",
  "gender",
] as const;

export function parseCsvLine(line: string): string[] {
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

export function parseCsv(content: string): {
  rows: StudentImportRow[];
  errors: string[];
} {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  return parseSheetRows(lines.map(parseCsvLine));
}

export function parseSheetRows(sheetRows: string[][]): {
  rows: StudentImportRow[];
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
  const missing = STUDENT_IMPORT_REQUIRED_HEADERS.filter(
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
    return {
      firstName: value(cells, "first_name"),
      surname: value(cells, "surname"),
      className: value(cells, "class"),
      parentName: value(cells, "parent_name"),
      address: value(cells, "address"),
      parentPhone: value(cells, "parent_phone"),
      gender: value(cells, "gender"),
      dateOfBirth: value(cells, "date_of_birth"),
      admissionNumber: value(cells, "admission_number"),
      rollNo: value(cells, "roll_no"),
      section: value(cells, "section"),
      studentPhone: value(cells, "student_phone"),
      studentEmail: value(cells, "student_email"),
      accountPassword: value(cells, "account_password"),
    };
  });
  const errors = rows.flatMap((row, index) => validateImportRow(row, index + 2));
  return { rows, errors };
}
