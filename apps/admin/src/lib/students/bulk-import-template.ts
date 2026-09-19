/**
 * Institute-aware Excel template for student bulk import.
 * Dropdowns for class, section, and gender come from the active institute catalog.
 */
import ExcelJS from "exceljs";

import {
  STUDENT_CSV_HEADERS,
  STUDENT_IMPORT_SAMPLE_ROW,
} from "@/lib/student-directory-store";
import type { StudentImportClassOption } from "./bulk-import";

export const STUDENT_IMPORT_GENDER_OPTIONS = [
  "Female",
  "Male",
  "Other",
  "Prefer not to say",
] as const;

export type StudentBulkImportTemplateOptions = {
  instituteName?: string;
  classOptions: StudentImportClassOption[];
  dataRows?: number;
};

function headerColumn(header: (typeof STUDENT_CSV_HEADERS)[number]): number {
  const index = STUDENT_CSV_HEADERS.indexOf(header);
  return index >= 0 ? index + 1 : 1;
}

function colLetter(index1Based: number): string {
  let n = index1Based;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function applyListValidation(
  sheet: ExcelJS.Worksheet,
  columnIndex: number,
  startRow: number,
  endRow: number,
  formula: string,
): void {
  const col = colLetter(columnIndex);
  for (let row = startRow; row <= endRow; row += 1) {
    sheet.getCell(`${col}${row}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [formula],
      showErrorMessage: true,
      errorTitle: "Invalid value",
      error: "Pick a value from the institute list (see Lists sheet).",
      showInputMessage: true,
      promptTitle: "Institute list",
      prompt: "Choose from this institute's live options.",
    };
  }
}

/** Build and download students-bulk-import-template.xlsx for the active institute. */
export async function downloadStudentBulkImportTemplate(
  options: StudentBulkImportTemplateOptions,
): Promise<void> {
  const classOptions = options.classOptions
    .map((item) => ({
      classLabel: item.classLabel.trim(),
      sectionLabels: [
        ...new Set(item.sectionLabels.map((s) => s.trim()).filter(Boolean)),
      ].sort((a, b) => a.localeCompare(b)),
    }))
    .filter((item) => item.classLabel && item.sectionLabels.length > 0)
    .sort((a, b) => a.classLabel.localeCompare(b.classLabel));

  const classLabels = classOptions.map((item) => item.classLabel);
  const allSectionLabels = [
    ...new Set(classOptions.flatMap((item) => item.sectionLabels)),
  ].sort((a, b) => a.localeCompare(b));

  const pairs = classOptions.flatMap((item) =>
    item.sectionLabels.map((sectionLabel) => ({
      classLabel: item.classLabel,
      sectionLabel,
    })),
  );

  const dataRows = Math.max(options.dataRows ?? 500, 20);
  const endRow = 1 + dataRows;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LumenX Admin";
  workbook.created = new Date();

  const students = workbook.addWorksheet("Students", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  const lists = workbook.addWorksheet("Lists");
  const guide = workbook.addWorksheet("Instructions");

  students.addRow([...STUDENT_CSV_HEADERS]);
  const headerRow = students.getRow(1);
  headerRow.font = { bold: true };
  headerRow.commit();

  const sample = [...STUDENT_IMPORT_SAMPLE_ROW] as string[];
  const classIdx = STUDENT_CSV_HEADERS.indexOf("class");
  const sectionIdx = STUDENT_CSV_HEADERS.indexOf("section");
  const genderIdx = STUDENT_CSV_HEADERS.indexOf("gender");
  if (classOptions[0] && classIdx >= 0) {
    sample[classIdx] = classOptions[0].classLabel;
  }
  if (classOptions[0]?.sectionLabels[0] && sectionIdx >= 0) {
    sample[sectionIdx] = classOptions[0].sectionLabels[0];
  }
  if (genderIdx >= 0) sample[genderIdx] = STUDENT_IMPORT_GENDER_OPTIONS[0];
  students.addRow(sample);

  for (let i = 0; i < dataRows - 1; i += 1) {
    students.addRow(STUDENT_CSV_HEADERS.map(() => ""));
  }

  STUDENT_CSV_HEADERS.forEach((header, index) => {
    students.getColumn(index + 1).width = Math.max(header.length + 2, 16);
  });

  lists.getCell("A1").value = "class_name";
  lists.getCell("B1").value = "section_label";
  lists.getCell("C1").value = "gender";
  lists.getCell("E1").value = "valid_class";
  lists.getCell("F1").value = "valid_section";
  lists.getRow(1).font = { bold: true };

  const maxListRows = Math.max(
    classLabels.length,
    allSectionLabels.length,
    STUDENT_IMPORT_GENDER_OPTIONS.length,
    pairs.length,
    1,
  );
  for (let i = 0; i < maxListRows; i += 1) {
    const row = i + 2;
    if (classLabels[i]) lists.getCell(`A${row}`).value = classLabels[i];
    if (allSectionLabels[i]) lists.getCell(`B${row}`).value = allSectionLabels[i];
    if (STUDENT_IMPORT_GENDER_OPTIONS[i]) {
      lists.getCell(`C${row}`).value = STUDENT_IMPORT_GENDER_OPTIONS[i];
    }
    if (pairs[i]) {
      lists.getCell(`E${row}`).value = pairs[i]!.classLabel;
      lists.getCell(`F${row}`).value = pairs[i]!.sectionLabel;
    }
  }
  lists.getColumn(1).width = 22;
  lists.getColumn(2).width = 18;
  lists.getColumn(3).width = 20;
  lists.getColumn(5).width = 22;
  lists.getColumn(6).width = 18;

  const classEnd = Math.max(classLabels.length, 1) + 1;
  const sectionEnd = Math.max(allSectionLabels.length, 1) + 1;
  const genderEnd = STUDENT_IMPORT_GENDER_OPTIONS.length + 1;

  applyListValidation(
    students,
    headerColumn("gender"),
    2,
    endRow,
    `Lists!$C$2:$C$${genderEnd}`,
  );
  if (classLabels.length > 0) {
    applyListValidation(
      students,
      headerColumn("class"),
      2,
      endRow,
      `Lists!$A$2:$A$${classEnd}`,
    );
  }
  if (allSectionLabels.length > 0) {
    applyListValidation(
      students,
      headerColumn("section"),
      2,
      endRow,
      `Lists!$B$2:$B$${sectionEnd}`,
    );
  }

  guide.getColumn(1).width = 92;
  const instituteLine = options.instituteName?.trim()
    ? `Institute: ${options.instituteName.trim()}`
    : "Institute: (active institute in Admin)";
  const guideLines = [
    "Student bulk import - use this file for the active institute only",
    instituteLine,
    "",
    "1. Fill rows on the Students sheet. Keep the header row unchanged.",
    "2. class and section dropdowns use THIS institute's live Classes & Sections.",
    "3. Pick class and section that belong together - see Lists columns valid_class / valid_section.",
    "4. gender - pick from Female, Male, Other, Prefer not to say.",
    "5. Do not invent Grade/Section names from another school.",
    "6. Keep the sheet name Students when uploading.",
    "",
    classLabels.length === 0
      ? "WARNING: No active classes/sections found - create them in Admin, then re-download."
      : `Classes in this template: ${classLabels.length} · class-section pairs: ${pairs.length}`,
  ];
  guideLines.forEach((line, index) => {
    guide.getCell(`A${index + 1}`).value = line;
    if (index === 0) guide.getCell(`A${index + 1}`).font = { bold: true, size: 12 };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safeName =
    options.instituteName
      ?.trim()
      .replace(/[^\w\-]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "institute";
  anchor.href = url;
  anchor.download = `students-bulk-import-${safeName}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}
