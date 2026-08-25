import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardHeader, Pill } from "@lumenx/ui-admin";
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

export function StudentIssuedCertificatesCard({ studentId }: { studentId: string }) {
  const [rows, setRows] = useState<IssuedCertificateRecord[]>([]);

  useEffect(() => {
    const refresh = () => setRows(listIssuedCertificatesForStudent(studentId));
    refresh();
    return subscribeCertificateNumbering(refresh);
  }, [studentId]);

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
