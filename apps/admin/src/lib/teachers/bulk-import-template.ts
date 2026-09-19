/**
 * Institute-aware Excel template for teacher bulk import.
 * Uses ExcelJS so columns get real dropdowns from live class/section/subject lists.
 */
import ExcelJS from "exceljs";

import {
  TEACHER_CSV_HEADERS,
  TEACHER_IMPORT_SAMPLE_ROW,
} from "./bulk-import-parse";

export const TEACHER_TEACHING_SCOPE_OPTIONS = [
  "subject_teacher",
  "activity_coordinator",
  "dual_role",
  "class_teacher",
] as const;

export type TeacherBulkImportTemplateOptions = {
  instituteName?: string;
  /** Labels like G10-A - must match import resolve. */
  sectionLabels: string[];
  /** Subject catalog names for this institute. */
  subjectNames: string[];
  /** Empty data rows with dropdowns (header is row 1). */
  dataRows?: number;
};

function headerColumn(header: (typeof TEACHER_CSV_HEADERS)[number]): number {
  const index = TEACHER_CSV_HEADERS.indexOf(header);
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

/** Build and download teachers-bulk-import-template.xlsx for the active institute. */
export async function downloadTeacherBulkImportTemplate(
  options: TeacherBulkImportTemplateOptions,
): Promise<void> {
  const sectionLabels = [
    ...new Set(options.sectionLabels.map((s) => s.trim()).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));
  const subjectNames = [
    ...new Set(options.subjectNames.map((s) => s.trim()).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));
  const dataRows = Math.max(options.dataRows ?? 200, 20);
  const endRow = 1 + dataRows;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LumenX Admin";
  workbook.created = new Date();

  const teachers = workbook.addWorksheet("Teachers", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  const lists = workbook.addWorksheet("Lists");
  const guide = workbook.addWorksheet("Instructions");

  teachers.addRow([...TEACHER_CSV_HEADERS]);
  const headerRow = teachers.getRow(1);
  headerRow.font = { bold: true };
  headerRow.commit();

  const sample = [...TEACHER_IMPORT_SAMPLE_ROW] as string[];
  const assignedIdx = TEACHER_CSV_HEADERS.indexOf("assigned_sections");
  const classTeacherIdx = TEACHER_CSV_HEADERS.indexOf("class_teacher_sections");
  const subjectsIdx = TEACHER_CSV_HEADERS.indexOf("subjects");
  const scopeIdx = TEACHER_CSV_HEADERS.indexOf("teaching_scope");
  const deptIdx = TEACHER_CSV_HEADERS.indexOf("department");
  if (sectionLabels[0] && assignedIdx >= 0) sample[assignedIdx] = sectionLabels[0];
  if (sectionLabels[0] && classTeacherIdx >= 0) {
    sample[classTeacherIdx] = sectionLabels[0];
  }
  if (subjectNames[0] && subjectsIdx >= 0) sample[subjectsIdx] = subjectNames[0];
  if (scopeIdx >= 0) sample[scopeIdx] = TEACHER_TEACHING_SCOPE_OPTIONS[0];
  if (deptIdx >= 0) sample[deptIdx] = "General";
  teachers.addRow(sample);

  for (let i = 0; i < dataRows - 1; i += 1) {
    teachers.addRow(TEACHER_CSV_HEADERS.map(() => ""));
  }

  TEACHER_CSV_HEADERS.forEach((header, index) => {
    teachers.getColumn(index + 1).width = Math.max(header.length + 2, 18);
  });

  lists.getCell("A1").value = "section_label";
  lists.getCell("B1").value = "subject_name";
  lists.getCell("C1").value = "teaching_scope";
  lists.getRow(1).font = { bold: true };

  const maxListRows = Math.max(
    sectionLabels.length,
    subjectNames.length,
    TEACHER_TEACHING_SCOPE_OPTIONS.length,
    1,
  );
  for (let i = 0; i < maxListRows; i += 1) {
    const row = i + 2;
    if (sectionLabels[i]) lists.getCell(`A${row}`).value = sectionLabels[i];
    if (subjectNames[i]) lists.getCell(`B${row}`).value = subjectNames[i];
    if (TEACHER_TEACHING_SCOPE_OPTIONS[i]) {
      lists.getCell(`C${row}`).value = TEACHER_TEACHING_SCOPE_OPTIONS[i];
    }
  }
  lists.getColumn(1).width = 18;
  lists.getColumn(2).width = 28;
  lists.getColumn(3).width = 22;

  const sectionEnd = Math.max(sectionLabels.length, 1) + 1;
  const subjectEnd = Math.max(subjectNames.length, 1) + 1;
  const scopeEnd = TEACHER_TEACHING_SCOPE_OPTIONS.length + 1;

  const sectionFormula = `Lists!$A$2:$A$${sectionEnd}`;
  const subjectFormula = `Lists!$B$2:$B$${subjectEnd}`;
  const scopeFormula = `Lists!$C$2:$C$${scopeEnd}`;

  applyListValidation(
    teachers,
    headerColumn("teaching_scope"),
    2,
    endRow,
    scopeFormula,
  );
  if (sectionLabels.length > 0) {
    applyListValidation(
      teachers,
      headerColumn("assigned_sections"),
      2,
      endRow,
      sectionFormula,
    );
    applyListValidation(
      teachers,
      headerColumn("class_teacher_sections"),
      2,
      endRow,
      sectionFormula,
    );
  }
  if (subjectNames.length > 0) {
    applyListValidation(
      teachers,
      headerColumn("subjects"),
      2,
      endRow,
      subjectFormula,
    );
  }

  guide.getColumn(1).width = 92;
  const instituteLine = options.instituteName?.trim()
    ? `Institute: ${options.instituteName.trim()}`
    : "Institute: (active institute in Admin)";
  const guideLines = [
    "Teacher bulk import - use this file for the active institute only",
    instituteLine,
    "",
    "1. Fill rows on the Teachers sheet. Keep the header row unchanged.",
    "2. Dropdown columns use THIS institute's live Classes / Sections / Subjects (Lists sheet).",
    "3. teaching_scope - pick one: subject_teacher, activity_coordinator, dual_role, or class_teacher.",
    "4. class_teacher_sections - pick ONE homeroom section (class teacher).",
    "5. assigned_sections - pick one teaching section from the dropdown.",
    "   For more than one section: type extra labels separated by commas,",
    "   using exact labels from Lists!section_label (example: G10-A, G10-B).",
    "6. subjects - pick one from the dropdown; for more, comma-separate exact names from Lists.",
    "7. Do not invent class codes from another school - labels must match Lists.",
    "8. Upload only the Teachers sheet content (keep sheet name Teachers).",
    "",
    sectionLabels.length === 0
      ? "WARNING: No active sections found - create Classes & Sections in Admin, then re-download."
      : `Sections in this template: ${sectionLabels.length}`,
    subjectNames.length === 0
      ? "WARNING: No subjects found - create Subjects in Admin, then re-download."
      : `Subjects in this template: ${subjectNames.length}`,
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
  anchor.download = `teachers-bulk-import-${safeName}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}
