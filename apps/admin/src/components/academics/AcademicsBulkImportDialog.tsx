import { useEffect, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button, Modal, Pill } from "@lumenx/ui-admin";
import {
  academicsImportTemplateCsv,
  parseClassImportCsv,
  parseSectionImportCsv,
  parseSubjectImportCsv,
  type ClassImportRow,
  type SectionImportRow,
  type SubjectImportRow,
} from "@/lib/academics/bulk-import-parse";
import { previewCommitEligible } from "@/lib/academics/bulk-import-result";

export type AcademicsImportEntity = "classes" | "sections" | "subjects";

type ParsedRows =
  | { entity: "classes"; rows: ClassImportRow[] }
  | { entity: "sections"; rows: SectionImportRow[] }
  | { entity: "subjects"; rows: SubjectImportRow[] };

export function AcademicsBulkImportDialog({
  open,
  onClose,
  entity,
  title,
  importing = false,
  classCodes = [],
  onImportClasses,
  onImportSections,
  onImportSubjects,
}: {
  open: boolean;
  onClose: () => void;
  entity: AcademicsImportEntity;
  title: string;
  importing?: boolean;
  /** Live class codes for section import validation. */
  classCodes?: string[];
  onImportClasses?: (rows: ClassImportRow[]) => void;
  onImportSections?: (rows: SectionImportRow[]) => void;
  onImportSubjects?: (rows: SubjectImportRow[]) => void;
}) {
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedRows | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [reading, setReading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFileName("");
    setParsed(null);
    setErrors([]);
    setReading(false);
  }, [open, entity]);

  const downloadTemplate = () => {
    const csv = academicsImportTemplateCsv(entity);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lumenx-${entity}-import-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setParsed(null);
    setErrors([]);
    const extension = file.name.toLowerCase().split(".").pop();
    if (extension !== "csv") {
      setErrors(["Upload a CSV file matching the downloadable template."]);
      return;
    }
    setReading(true);
    try {
      const text = await file.text();
      if (entity === "classes") {
        const result = parseClassImportCsv(text);
        setErrors(result.errors);
        setParsed({ entity: "classes", rows: result.rows });
      } else if (entity === "sections") {
        const result = parseSectionImportCsv(text, { classCodes });
        setErrors(result.errors);
        setParsed({ entity: "sections", rows: result.rows });
      } else {
        const result = parseSubjectImportCsv(text);
        setErrors(result.errors);
        setParsed({ entity: "subjects", rows: result.rows });
      }
    } catch {
      setErrors(["The selected file could not be read."]);
    } finally {
      setReading(false);
    }
  };

  const canImport =
    !!parsed &&
    previewCommitEligible({
      rowCount: parsed.rows.length,
      errorCount: errors.length,
    }) &&
    !importing &&
    !reading;

  const commit = () => {
    if (!parsed || errors.length > 0) return;
    if (parsed.entity === "classes") onImportClasses?.(parsed.rows);
    else if (parsed.entity === "sections") onImportSections?.(parsed.rows);
    else onImportSubjects?.(parsed.rows);
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!importing) onClose();
      }}
      title={title}
      size="lg"
      footer={
        <>
          <Button onClick={onClose} disabled={importing}>
            Cancel
          </Button>
          <Button variant="primary" onClick={commit} disabled={!canImport}>
            <Upload className="size-3.5" />
            {importing ? "Importing…" : `Import ${parsed?.rows.length ?? 0} row(s)`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={downloadTemplate}>
            <Download className="size-3.5" /> Download CSV template
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
            <Upload className="size-3.5" />
            Choose CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              disabled={importing || reading}
              onChange={(e) => void selectFile(e.target.files?.[0])}
            />
          </label>
          {fileName ? <Pill>{fileName}</Pill> : null}
        </div>
        {errors.length > 0 ? (
          <ul className="max-h-40 list-disc space-y-1 overflow-auto rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-xs text-destructive">
            {errors.slice(0, 20).map((err) => (
              <li key={err}>{err}</li>
            ))}
            {errors.length > 20 ? <li>…and {errors.length - 20} more</li> : null}
          </ul>
        ) : null}
        {parsed && errors.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Preview: {parsed.rows.length} valid row(s) ready to import. Nothing is
            saved until Import succeeds on the server.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
