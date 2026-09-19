import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { Button, Modal, Pill } from "@lumenx/ui-admin";
import { read, utils } from "xlsx";

import {
  parseTeacherCsv,
  parseTeacherSheetRows,
  TEACHER_CSV_HEADERS,
  TEACHER_IMPORT_REQUIRED_HEADERS,
  type TeacherImportRow,
} from "@/lib/teachers/bulk-import-parse";
import { downloadTeacherBulkImportTemplate } from "@/lib/teachers/bulk-import-template";

export function TeacherBulkImportDialog({
  open,
  onClose,
  onImport,
  importing = false,
  instituteName,
  sectionLabels = [],
  subjectNames = [],
}: {
  open: boolean;
  onClose: () => void;
  onImport: (rows: TeacherImportRow[]) => void;
  importing?: boolean;
  instituteName?: string;
  /** Live institute section labels (e.g. G10-A) for template dropdowns + validation. */
  sectionLabels?: string[];
  /** Live institute subject names for template dropdowns + validation. */
  subjectNames?: string[];
}) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<TeacherImportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [reading, setReading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const catalog = useMemo(
    () => ({
      sectionLabels,
      subjectNames,
    }),
    [sectionLabels, subjectNames],
  );

  useEffect(() => {
    if (!open) return;
    setFileName("");
    setRows([]);
    setErrors([]);
    setReading(false);
    setDownloading(false);
  }, [open]);

  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      await downloadTeacherBulkImportTemplate({
        instituteName,
        sectionLabels,
        subjectNames,
      });
    } catch {
      setErrors(["Could not build the Excel template. Try again."]);
    } finally {
      setDownloading(false);
    }
  };

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
          ? parseTeacherCsv(await file.text(), catalog)
          : await (async () => {
              const workbook = read(await file.arrayBuffer(), {
                type: "array",
                raw: false,
              });
              const preferred =
                workbook.SheetNames.find(
                  (name) => name.trim().toLowerCase() === "teachers",
                ) ?? workbook.SheetNames[0];
              const worksheet = preferred ? workbook.Sheets[preferred] : undefined;
              if (!worksheet) {
                return { rows: [], errors: ["The workbook has no readable worksheet."] };
              }
              return parseTeacherSheetRows(
                utils.sheet_to_json<string[]>(worksheet, {
                  header: 1,
                  raw: false,
                  defval: "",
                }),
                catalog,
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
      title="Bulk import teachers"
      subtitle="Download the institute template (with dropdowns), fill it, then upload"
      size="xl"
      footer={
        <>
          <Button onClick={onClose} disabled={importing}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={reading || importing || rows.length === 0 || errors.length > 0}
            onClick={() => onImport(rows)}
          >
            <Upload className="size-3.5" />{" "}
            {importing ? "Importing…" : `Import ${rows.length || ""} Teachers`}
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
                Use this institute’s template · up to 1,000 rows
              </div>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                className="hidden"
                onChange={(event) => void selectFile(event.target.files?.[0])}
              />
            </div>
          </label>
          <Button
            className="mt-3 w-full"
            onClick={() => void downloadTemplate()}
            disabled={downloading}
          >
            <Download className="size-3.5" />{" "}
            {downloading ? "Building template…" : "Download institute Excel template"}
          </Button>
          {sectionLabels.length === 0 ? (
            <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
              No active classes/sections yet — create them first, then re-download so
              dropdowns match this institute.
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Template includes {sectionLabels.length} section
              {sectionLabels.length === 1 ? "" : "s"}
              {subjectNames.length > 0
                ? ` and ${subjectNames.length} subject${subjectNames.length === 1 ? "" : "s"}`
                : ""}{" "}
              from this institute.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border p-4">
          <div className="text-xs font-semibold">Template columns</div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {TEACHER_CSV_HEADERS.map((header) => (
              <Pill
                key={header}
                tone={
                  TEACHER_IMPORT_REQUIRED_HEADERS.includes(
                    header as (typeof TEACHER_IMPORT_REQUIRED_HEADERS)[number],
                  )
                    ? "info"
                    : "neutral"
                }
              >
                {header}
              </Pill>
            ))}
          </div>
          <div className="mt-4 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Required:</span> display name,
            10-digit phone.
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Dropdowns (this institute):</span>{" "}
            teaching_scope, assigned_sections, class_teacher_sections (one homeroom),
            subjects.
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            For multiple teaching sections or subjects, pick one from the dropdown then
            add more comma-separated labels copied from the Lists sheet.
          </div>
          <div className="mt-4 rounded-lg bg-muted/25 p-3 text-[11px] text-muted-foreground">
            Re-download after you add classes or subjects so Excel lists stay in sync.
            Upload rejects labels that are not in this institute.
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
