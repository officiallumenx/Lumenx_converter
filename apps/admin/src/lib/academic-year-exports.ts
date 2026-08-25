import { downloadTextToDevice } from "@lumenx/utils";
import { utils, writeFile } from "xlsx";
import {
  getClassesStudiedByStudent,
  type AcademicYearRecordStudent,
} from "@/lib/academic-management-data";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function downloadAcademicYearRecordsExcel(
  yearLabel: string,
  rows: AcademicYearRecordStudent[],
) {
  const sheetRows = rows.map((r) => ({
    Student: r.name,
    "Roll No": r.rollNo,
    Class: r.classLabel,
    Section: r.section,
    Status: r.status,
    "Classes studied": getClassesStudiedByStudent(r.name),
    "Academic year": yearLabel,
  }));
  const workbook = utils.book_new();
  const sheet = utils.json_to_sheet(sheetRows);
  utils.book_append_sheet(workbook, sheet, "Year records");
  const safe = yearLabel.replaceAll(/[^\dA-Za-z-]+/g, "_");
  writeFile(workbook, `academic-year-${safe}.xlsx`, { bookType: "xlsx" });
  return { filename: `academic-year-${safe}.xlsx`, rowCount: rows.length };
}

export function downloadAcademicYearRecordsPdf(
  yearLabel: string,
  rows: AcademicYearRecordStudent[],
  filtersSummary: string,
) {
  const tableRows = rows
    .map(
      (r) => `
      <tr>
        <td>${escapeHtml(r.name)}</td>
        <td>${escapeHtml(r.rollNo)}</td>
        <td>${escapeHtml(r.classLabel)}</td>
        <td>${escapeHtml(r.section)}</td>
        <td>${escapeHtml(r.status)}</td>
        <td>${escapeHtml(getClassesStudiedByStudent(r.name))}</td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Academic year ${escapeHtml(yearLabel)}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; color: #111; margin: 2rem; }
    h1 { font-size: 1.35rem; margin: 0 0 0.35rem; }
    .meta { color: #555; font-size: 0.85rem; margin-bottom: 1.25rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    th, td { border: 1px solid #ccc; padding: 0.45rem 0.55rem; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; }
    @media print { body { margin: 0.75rem; } }
  </style>
</head>
<body>
  <h1>Academic year records — ${escapeHtml(yearLabel)}</h1>
  <p class="meta">${escapeHtml(filtersSummary)} · ${rows.length} row(s) · LumenX Admin demo</p>
  <table>
    <thead>
      <tr>
        <th>Student</th>
        <th>Roll No</th>
        <th>Class</th>
        <th>Section</th>
        <th>Status</th>
        <th>Classes studied</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows || `<tr><td colspan="6">No records</td></tr>`}
    </tbody>
  </table>
  <p class="meta" style="margin-top:1.5rem">Open this file · Print → Save as PDF</p>
</body>
</html>`;

  const safe = yearLabel.replaceAll(/[^\dA-Za-z-]+/g, "_");
  const filename = `academic-year-${safe}.html`;
  downloadTextToDevice(filename, html, "text/html;charset=utf-8");
  return { filename, rowCount: rows.length };
}
