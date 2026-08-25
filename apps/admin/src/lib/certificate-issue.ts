/**
 * Certificate preview + issue downloads.
 * Fills a copy of the Nexus PPTX; never writes the catalog or student records.
 * Certificate numbers are allocated onto issued records at Issue time.
 */
import { downloadBlobToDevice, downloadTextToDevice } from "@lumenx/utils";
import {
  applyCertificateNumberToFields,
  buildCertificatePrintHtml,
  buildCertificateSlidePreview,
  certificateFieldsFallbackHtml,
  certificateFillValuesFromFields,
  certificateSlideToHtml,
  fillCertificatePptxCopies,
  filledPptxBlob,
  getCertificateCategory,
  zipStore,
  bytesToBlob,
  type CertificateTemplate,
  type PopulatedCertificateMapping,
} from "@lumenx/module-certificates";
import { loadSession } from "@/auth/auth-store";
import {
  allocateIssuedCertificates,
  attachIssuedCertificateFiles,
  type IssuedCertificateFileKind,
  type IssuedCertificateRecord,
} from "@/lib/certificate-numbering-store";
import { notifyCertificateIssued } from "@lumenx/module-notifications";

export type CertificateIssueRow = {
  studentId: string;
  studentName: string;
  admissionNumber?: string;
  fields: PopulatedCertificateMapping[];
};

function safeFilePart(value: string): string {
  return value.trim().replace(/[^\w.-]+/g, "_").slice(0, 48) || "certificate";
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function rowFilename(
  templateName: string,
  row: CertificateIssueRow,
  ext: string,
  certificateNumber?: string,
): string {
  const student = row.admissionNumber
    ? `${row.studentName}-${row.admissionNumber}`
    : row.studentName;
  const numbered = certificateNumber ? `${certificateNumber}-${student}` : student;
  return `${safeFilePart(templateName)}-${safeFilePart(numbered)}.${ext}`;
}

async function pageBodyHtml(
  template: CertificateTemplate,
  row: CertificateIssueRow,
): Promise<string> {
  const values = certificateFillValuesFromFields(row.fields);
  const slides = await buildCertificateSlidePreview(template.file, values);
  if (slides?.length) {
    return slides.map((slide) => certificateSlideToHtml(slide)).join("");
  }
  return certificateFieldsFallbackHtml({
    templateName: template.name,
    studentName: row.studentName,
    fields: row.fields.map((field) => ({
      displayName: field.displayName,
      value: field.value,
    })),
  });
}

export async function downloadCertificatePrintHtml(input: {
  template: CertificateTemplate;
  rows: CertificateIssueRow[];
}): Promise<{ filename: string; count: number }> {
  const pages = [];
  for (const row of input.rows) {
    pages.push({
      studentName: row.studentName,
      bodyHtml: await pageBodyHtml(input.template, row),
    });
  }
  const filename =
    input.rows.length === 1
      ? rowFilename(input.template.name, input.rows[0]!, "html")
      : `certificates-${safeFilePart(input.template.name)}-${stamp()}.html`;
  downloadTextToDevice(
    filename,
    buildCertificatePrintHtml({
      title: `${input.template.name} certificates`,
      pages,
    }),
    "text/html;charset=utf-8",
  );
  return { filename, count: input.rows.length };
}

export async function issueFilledCertificates(input: {
  template: CertificateTemplate;
  rows: CertificateIssueRow[];
}): Promise<{
  filename: string;
  count: number;
  kind: "pptx" | "zip" | "html";
  issued: IssuedCertificateRecord[];
}> {
  const session = loadSession();
  const issued = allocateIssuedCertificates({
    template: input.template,
    categoryName:
      getCertificateCategory(input.template.categoryId)?.name ?? input.template.categoryId,
    issuedBy: {
      id: session?.userId ?? "admin",
      name: session?.name ?? "Admin",
    },
    rows: input.rows.map((row) => ({
      studentId: row.studentId,
      studentName: row.studentName,
      admissionNumber: row.admissionNumber,
    })),
  });
  const numberedRows = input.rows.map((row, index) => ({
    ...row,
    fields: applyCertificateNumberToFields(
      row.fields,
      issued[index]?.certificateNumber ?? "",
    ),
  }));

  const items = numberedRows.map((row, index) => ({
    filename: rowFilename(
      input.template.name,
      row,
      "pptx",
      issued[index]?.certificateNumber,
    ),
    values: certificateFillValuesFromFields(row.fields),
  }));

  const attach = (
    kind: IssuedCertificateFileKind,
    downloadName: string,
    bundle?: boolean,
  ): IssuedCertificateRecord[] =>
    attachIssuedCertificateFiles(
      issued.map((record, index) => ({
        id: record.id,
        fileName: kind === "html" ? downloadName : items[index]?.filename ?? downloadName,
        fileKind: kind,
        bundleFileName: bundle ? downloadName : undefined,
      })),
    );

  const filled = await fillCertificatePptxCopies(input.template.file, items);
  if (filled && filled.size > 0) {
    if (filled.size === 1) {
      const first = [...filled.entries()][0];
      if (first) {
        downloadBlobToDevice(first[0], filledPptxBlob(first[1]));
        const attached = attach("pptx", first[0]);
        for (const rec of attached) {
          notifyCertificateIssued({
            certificateId: rec.id,
            certificateName: input.template.name,
            studentName: rec.studentName,
            certificateNumber: rec.certificateNumber,
          });
        }
        return { filename: first[0], count: 1, kind: "pptx", issued: attached };
      }
    }

    const zipName = `certificates-${safeFilePart(input.template.name)}-${stamp()}.zip`;
    const zipBytes = zipStore(filled);
    downloadBlobToDevice(zipName, bytesToBlob(zipBytes, "application/zip"));
    const attached = attach("pptx", zipName, true);
    for (const rec of attached) {
      notifyCertificateIssued({
        certificateId: rec.id,
        certificateName: input.template.name,
        studentName: rec.studentName,
        certificateNumber: rec.certificateNumber,
      });
    }
    return { filename: zipName, count: filled.size, kind: "zip", issued: attached };
  }

  const html = await downloadCertificatePrintHtml({
    template: input.template,
    rows: numberedRows,
  });
  const attached = attach("html", html.filename, html.count > 1);
  for (const rec of attached) {
    notifyCertificateIssued({
      certificateId: rec.id,
      certificateName: input.template.name,
      studentName: rec.studentName,
      certificateNumber: rec.certificateNumber,
    });
  }
  return {
    filename: html.filename,
    count: html.count,
    kind: "html" as const,
    issued: attached,
  };
}
