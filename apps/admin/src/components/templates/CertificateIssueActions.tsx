import { useEffect, useMemo, useState } from "react";
import { Button, Modal, Select } from "@lumenx/ui-admin";
import {
  buildCertificateSlidePreview,
  certificateFillValuesFromFields,
  type CertificateSlidePreview,
  type CertificateTemplate,
} from "@lumenx/module-certificates";
import { Eye, FileDown } from "lucide-react";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  downloadCertificatePrintHtml,
  issueFilledCertificates,
  type CertificateIssueRow,
} from "@/lib/certificate-issue";

function CertificateSlideCanvas({ slide }: { slide: CertificateSlidePreview }) {
  const heightPt = (slide.heightEmu / 914400) * 72;
  return (
    <div
      className="relative w-full overflow-hidden shadow-sm [container-type:size]"
      style={{
        aspectRatio: `${slide.widthEmu} / ${slide.heightEmu}`,
        background: slide.background,
      }}
    >
      {slide.pictures.map((picture, index) => (
        <img
          key={`pic-${index}`}
          alt=""
          src={picture.dataUrl}
          className="absolute object-fill"
          style={{
            left: `${picture.xPct}%`,
            top: `${picture.yPct}%`,
            width: `${picture.wPct}%`,
            height: `${picture.hPct}%`,
          }}
        />
      ))}
      {slide.texts.map((text, index) => (
        <div
          key={text.targetId ?? `text-${index}`}
          className="absolute overflow-hidden whitespace-pre-wrap"
          style={{
            left: `${text.xPct}%`,
            top: `${text.yPct}%`,
            width: `${text.wPct}%`,
            height: `${text.hPct}%`,
            display: "flex",
            alignItems:
              text.valign === "middle" ? "center" : text.valign === "bottom" ? "flex-end" : "flex-start",
            justifyContent:
              text.align === "center" ? "center" : text.align === "right" ? "flex-end" : "flex-start",
            color: text.color,
            textAlign: text.align,
            fontFamily: text.fontFamily,
            fontSize: `calc(${text.fontSizePt} * 100cqh / ${heightPt})`,
            lineHeight: 1.15,
          }}
        >
          {text.text}
        </div>
      ))}
    </div>
  );
}

function FallbackPreview({
  templateName,
  row,
}: {
  templateName: string;
  row: CertificateIssueRow;
}) {
  const filled = row.fields.filter((field) => field.value.trim());
  return (
    <div className="rounded-xl border border-border bg-background px-6 py-10 text-center">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {templateName}
      </p>
      <h3 className="mt-2 text-lg font-semibold tracking-tight">{row.studentName}</h3>
      <div className="mx-auto mt-6 max-w-md space-y-2">
        {filled.map((field) => (
          <div key={field.targetId} className="rounded-lg border border-dashed border-border px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {field.displayName}
            </p>
            <p className="mt-0.5 text-sm font-medium">{field.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-[11px] text-muted-foreground">
        Layout preview is unavailable for this file · values below are applied on issue
      </p>
    </div>
  );
}

export function CertificateIssueActions({
  template,
  rows,
  canIssue,
  blockedCount,
  instituteId,
}: {
  template: CertificateTemplate;
  rows: CertificateIssueRow[];
  canIssue: boolean;
  blockedCount: number;
  instituteId?: string | null;
}) {
  const notify = useAdminToast();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [studentId, setStudentId] = useState(rows[0]?.studentId ?? "");
  const [slides, setSlides] = useState<CertificateSlidePreview[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [busy, setBusy] = useState<"preview-pdf" | "issue" | null>(null);

  useEffect(() => {
    if (rows.some((row) => row.studentId === studentId)) return;
    setStudentId(rows[0]?.studentId ?? "");
  }, [rows, studentId]);

  const activeRow = useMemo(
    () => rows.find((row) => row.studentId === studentId) ?? rows[0],
    [rows, studentId],
  );

  useEffect(() => {
    if (!previewOpen || !activeRow) {
      setSlides(null);
      return;
    }
    let cancelled = false;
    setLoadingPreview(true);
    const values = certificateFillValuesFromFields(activeRow.fields);
    void buildCertificateSlidePreview(template.file, values)
      .then((next) => {
        if (!cancelled) setSlides(next);
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });
    return () => {
      cancelled = true;
    };
  }, [previewOpen, activeRow, template.file, template.id]);

  const runIssue = async () => {
    if (!canIssue || rows.length === 0) return;
    setBusy("issue");
    try {
      const result = await issueFilledCertificates({ template, rows, instituteId });
      const numbers = result.issued.map((row) => row.certificateNumber);
      const numberLabel =
        numbers.length === 1
          ? numbers[0]
          : numbers.length > 0
            ? `${numbers[0]}–${numbers[numbers.length - 1]}`
            : result.filename;
      const via =
        result.kind === "html"
          ? "open the HTML file, then Print → Save as PDF"
          : "original Nexus template is unchanged";
      notify(
        `Issued ${result.count} certificate${result.count === 1 ? "" : "s"} · ${numberLabel} · ${via}`,
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not issue certificates");
    } finally {
      setBusy(null);
    }
  };

  const runPrintPdf = async (targetRows: CertificateIssueRow[]) => {
    if (targetRows.length === 0) return;
    setBusy("preview-pdf");
    try {
      const result = await downloadCertificatePrintHtml({ template, rows: targetRows });
      notify(
        `Saved ${result.filename} · ${result.count} certificate${result.count === 1 ? "" : "s"} · Print → Save as PDF`,
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not build print preview");
    } finally {
      setBusy(null);
    }
  };

  if (rows.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
          <Eye className="size-3.5" />
          Preview
        </Button>
        <Button type="button" variant="primary" disabled={!canIssue || busy !== null} onClick={() => void runIssue()}>
          <FileDown className="size-3.5" />
          {busy === "issue" ? "Issuing…" : "Issue"}
        </Button>
      </div>
      <p className={`text-sm ${canIssue ? "text-muted-foreground" : "text-destructive"}`}>
        {canIssue
          ? "Preview uses the selected Nexus template with mapped values and this institute's next certificate numbers. Issue assigns those numbers permanently to the issued records."
          : `Complete all required fields before issuing (${blockedCount} student${blockedCount === 1 ? "" : "s"} blocked).`}
      </p>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Certificate preview"
        subtitle={`${template.name} · v${template.version} · filled copy · original template is not changed`}
        size="xl"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null || !activeRow}
              onClick={() => activeRow && void runPrintPdf([activeRow])}
            >
              Save this as PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null}
              onClick={() => void runPrintPdf(rows)}
            >
              Save all as PDF
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!canIssue || busy !== null}
              onClick={() => void runIssue()}
            >
              {busy === "issue" ? "Issuing…" : "Issue"}
            </Button>
          </>
        }
      >
        {rows.length > 1 ? (
          <Select
            value={activeRow?.studentId ?? ""}
            onChange={(event) => setStudentId(event.target.value)}
            aria-label="Preview student"
          >
            {rows.map((row) => (
              <option key={row.studentId} value={row.studentId}>
                {row.studentName}
                {row.admissionNumber ? ` · ${row.admissionNumber}` : ""}
              </option>
            ))}
          </Select>
        ) : null}

        {loadingPreview ? (
          <p className="text-sm text-muted-foreground">Building preview from the Nexus template…</p>
        ) : slides && slides.length > 0 ? (
          <div className="space-y-4">
            {slides.map((slide, index) => (
              <CertificateSlideCanvas key={index} slide={slide} />
            ))}
          </div>
        ) : activeRow ? (
          <FallbackPreview templateName={template.name} row={activeRow} />
        ) : null}
      </Modal>
    </>
  );
}
