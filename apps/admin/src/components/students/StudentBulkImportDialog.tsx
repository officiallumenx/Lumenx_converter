import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { Button, Modal, Pill } from "@lumenx/ui-admin";
import { read, utils, writeFile } from "xlsx";

import {
  STUDENT_CSV_HEADERS,
  STUDENT_IMPORT_SAMPLE_ROW,
  type StudentImportRow,
} from "@/lib/student-directory-store";
import { parseCsv, parseSheetRows, STUDENT_IMPORT_REQUIRED_HEADERS } from "@/lib/student-import-parse";

function downloadTemplate(): void {
  const worksheet = utils.aoa_to_sheet([
    [...STUDENT_CSV_HEADERS],
    [...STUDENT_IMPORT_SAMPLE_ROW],
  ]);
  worksheet["!cols"] = STUDENT_CSV_HEADERS.map((header) => ({
    wch: Math.max(header.length + 2, 18),
  }));
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "Students");
  writeFile(workbook, "students-bulk-import-template.xlsx", { bookType: "xlsx" });
}

export function StudentBulkImportDialog({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (rows: StudentImportRow[]) => void;
}) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<StudentImportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [reading, setReading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFileName("");
    setRows([]);
    setErrors([]);
    setReading(false);
  }, [open]);

  const selectFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setRows([]);
    setErrors([]);
    const extension = file.name.toLowerCase().split(".").pop();
    if (!["xlsx", "xls", "csv"].includes(extension ?? "")) {
      setErrors(["Use the downloadable Excel template (.xlsx), or upload a CSV file."]);
      return;
    }
    setReading(true);
    try {
      const result =
        extension === "csv"
          ? parseCsv(await file.text())
          : await (async () => {
              const workbook = read(await file.arrayBuffer(), {
                type: "array",
                raw: false,
              });
              const worksheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
              if (!worksheet) {
                return { rows: [], errors: ["The workbook has no readable worksheet."] };
              }
              return parseSheetRows(
                utils.sheet_to_json<string[]>(worksheet, {
                  header: 1,
                  raw: false,
                  defval: "",
                }),
              );
            })();
      setRows(result.rows);
      setErrors(result.errors);
    } catch {
      setErrors(["The selected file could not be read."]);
    } finally {
      setReading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bulk import students"
      subtitle="Download the Excel template, fill it, then upload it here"
      size="xl"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={reading || rows.length === 0 || errors.length > 0}
            onClick={() => onImport(rows)}
          >
            <Upload className="size-3.5" /> Import {rows.length || ""} Students
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <label className="block">
            <div className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-background/40 p-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/[0.03]">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-accent">
                <FileSpreadsheet className="size-5 text-primary" />
              </div>
              <div className="text-sm font-medium">
                {reading ? "Reading file…" : fileName || "Choose Excel file"}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Use the provided template · up to 5,000 rows
              </div>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                className="hidden"
                onChange={(event) => void selectFile(event.target.files?.[0])}
              />
            </div>
          </label>
          <Button className="mt-3 w-full" onClick={downloadTemplate}>
            <Download className="size-3.5" /> Download Excel Template
          </Button>
        </div>

        <div className="rounded-xl border border-border p-4">
          <div className="text-xs font-semibold">Template columns</div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {STUDENT_CSV_HEADERS.map((header) => (
              <Pill
                key={header}
                tone={STUDENT_IMPORT_REQUIRED_HEADERS.includes(header as (typeof STUDENT_IMPORT_REQUIRED_HEADERS)[number]) ? "info" : "neutral"}
              >
                {header}
              </Pill>
            ))}
          </div>
          <div className="mt-4 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Required:</span> first name, surname,
            class, parent name, address, 10-digit parent phone and gender.
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Optional:</span> date of birth,
            admission number and section. To create a Connect account automatically, enter
            student phone and/or email plus an account password.
          </div>
          <div className="mt-4 rounded-lg bg-muted/25 p-3 text-[11px] text-muted-foreground">
            Siblings using the same parent phone are linked automatically. Account rows are
            created with “First login pending” status. Duplicate rows (same admission number,
            student phone/email, or name + parent phone) are skipped and counted in the result.
          </div>
        </div>
      </div>

      {fileName && (
        <div className="mt-4 rounded-lg border border-border px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium">{fileName}</div>
              <div className="text-[10px] text-muted-foreground">
                {rows.length} data rows detected
              </div>
            </div>
            <Pill tone={errors.length > 0 ? "danger" : "success"}>
              {errors.length > 0 ? `${errors.length} errors` : "Ready to import"}
            </Pill>
          </div>
          {errors.length > 0 && (
            <div className="mt-3 max-h-36 overflow-y-auto rounded-md bg-destructive/5 p-3">
              <ul className="list-disc space-y-1 pl-4 text-[11px] text-destructive">
                {errors.map((error, index) => (
                  <li key={`${error}-${index}`}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
