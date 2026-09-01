import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardHeader, Pill } from "@lumenx/ui-admin";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import {
  listIssuedCertificates,
  issuedCertificateDtosToHistoryItems,
} from "@/lib/certificates";
import {
  listIssuedCertificatesForStudent,
  subscribeCertificateNumbering,
  type IssuedCertificateRecord,
} from "@/lib/certificate-numbering-store";

function formatIssuedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type DisplayRow = {
  id: string;
  templateName: string;
  categoryName: string;
  templateVersion: number;
  issuedAt: string;
  issuedByName: string;
  certificateNumber: string;
  fileName: string;
  status: string;
};

function localRows(studentId: string): DisplayRow[] {
  return listIssuedCertificatesForStudent(studentId).map((row) => ({
    id: row.id,
    templateName: row.templateName,
    categoryName: row.categoryName,
    templateVersion: row.templateVersion,
    issuedAt: row.issuedAt,
    issuedByName: row.issuedByName,
    certificateNumber: row.certificateNumber,
    fileName: row.fileName,
    status: row.status,
  }));
}

export function StudentIssuedCertificatesCard({ studentId }: { studentId: string }) {
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const [local, setLocal] = useState<IssuedCertificateRecord[]>([]);
  const [apiRows, setApiRows] = useState<DisplayRow[]>([]);
  const [apiHint, setApiHint] = useState<string | null>(null);

  useEffect(() => {
    if (apiMode) return;
    const refresh = () => setLocal(listIssuedCertificatesForStudent(studentId));
    refresh();
    return subscribeCertificateNumbering(refresh);
  }, [apiMode, studentId]);

  useEffect(() => {
    if (!apiMode || instituteCtx.status !== "ready" || !instituteCtx.activeInstituteId) {
      return;
    }
    let cancelled = false;
    void listIssuedCertificates({
      instituteId: instituteCtx.activeInstituteId,
      studentId,
      status: "issued",
    })
      .then((rows) => {
        if (cancelled) return;
        setApiRows(
          issuedCertificateDtosToHistoryItems(rows).map((row) => ({
            id: row.id,
            templateName: row.templateName,
            categoryName: row.categoryName,
            templateVersion: row.templateVersion,
            issuedAt: row.issuedAt,
            issuedByName: row.issuedByName,
            certificateNumber: row.certificateNumber,
            fileName: row.fileName,
            status: row.status,
          })),
        );
        setApiHint(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setApiRows([]);
          setApiHint(err instanceof Error ? err.message : "Failed to load certificates");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiMode, instituteCtx.status, instituteCtx.activeInstituteId, studentId]);

  const rows: DisplayRow[] = apiMode
    ? apiRows
    : local.map((row) => ({
        id: row.id,
        templateName: row.templateName,
        categoryName: row.categoryName,
        templateVersion: row.templateVersion,
        issuedAt: row.issuedAt,
        issuedByName: row.issuedByName,
        certificateNumber: row.certificateNumber,
        fileName: row.fileName,
        status: row.status,
      }));

  return (
    <Card>
      <CardHeader
        title="Issued certificates"
        hint="Original template version is kept · not regenerated when a newer version is published"
        action={
          <Pill tone={rows.length > 0 ? "success" : "neutral"}>
            {rows.length} record{rows.length === 1 ? "" : "s"}
          </Pill>
        }
      />
      {apiHint ? (
        <div className="px-5 pb-2 text-xs text-destructive sm:px-6">{apiHint}</div>
      ) : null}
      {rows.length === 0 ? (
        <div className="px-5 pb-5 pt-5 text-xs leading-relaxed text-muted-foreground sm:px-6 sm:pb-6">
          No certificates have been issued for this student yet. Issue from{" "}
          <Link to="/templates" search={{}} className="text-primary hover:underline">
            Certificates
          </Link>
          .
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3 sm:px-6">
              <div className="min-w-0">
                <p className="text-sm font-medium">{row.templateName}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {row.categoryName} · v{row.templateVersion} · {formatIssuedDate(row.issuedAt)} ·{" "}
                  {row.issuedByName}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {row.certificateNumber}
                </p>
                {row.fileName ? (
                  <p className="mt-0.5 break-all text-[11px] text-muted-foreground">{row.fileName}</p>
                ) : null}
              </div>
              <Pill tone="success">{row.status}</Pill>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
