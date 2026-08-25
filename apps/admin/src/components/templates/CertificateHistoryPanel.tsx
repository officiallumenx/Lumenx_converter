import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Card,
  CardBody,
  CardHeader,
  DataTable,
  EmptyState,
  Pill,
  SearchInput,
  Th,
  Td,
  Tr,
} from "@lumenx/ui-admin";
import { Award } from "lucide-react";
import {
  listIssuedCertificates,
  subscribeCertificateNumbering,
  type IssuedCertificateRecord,
} from "@/lib/certificate-numbering-store";

function formatIssuedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fileReference(row: IssuedCertificateRecord): string {
  if (row.bundleFileName && row.fileName) return `${row.fileName} · ${row.bundleFileName}`;
  return row.fileName || row.bundleFileName || "—";
}

function matchesQuery(row: IssuedCertificateRecord, query: string): boolean {
  if (!query) return true;
  const hay = [
    row.studentName,
    row.admissionNumber,
    row.categoryName,
    row.templateName,
    String(row.templateVersion),
    row.certificateNumber,
    row.issuedByName,
    row.fileName,
    row.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(query);
}

export function CertificateHistoryPanel() {
  const [rows, setRows] = useState<IssuedCertificateRecord[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const refresh = () => setRows(listIssuedCertificates());
    refresh();
    return subscribeCertificateNumbering(refresh);
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => matchesQuery(row, q));
  }, [rows, query]);

  return (
    <Card>
      <CardHeader
        title="Issued history"
        hint="Permanent records · original template version is kept · not regenerated when Nexus publishes a newer version"
        action={
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search student, number, template…"
            className="w-full sm:w-64"
          />
        }
      />
      {visible.length === 0 ? (
        <CardBody>
          <EmptyState
            icon={<Award className="size-5" />}
            title={rows.length === 0 ? "No certificates issued yet" : "No matching records"}
            hint={
              rows.length === 0
                ? "Issue a certificate above to create a history record."
                : "Try a different search."
            }
          />
        </CardBody>
      ) : (
        <CardBody noPadding>
          <DataTable>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Category</Th>
                <Th>Template</Th>
                <Th>Version</Th>
                <Th>Number</Th>
                <Th>Issued</Th>
                <Th>Issued by</Th>
                <Th>File</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <Tr key={row.id}>
                  <Td>
                    <Link
                      to="/students/$id"
                      params={{ id: row.studentId }}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {row.studentName}
                    </Link>
                    {row.admissionNumber ? (
                      <div className="text-[11px] text-muted-foreground">{row.admissionNumber}</div>
                    ) : null}
                  </Td>
                  <Td className="text-sm">{row.categoryName}</Td>
                  <Td className="text-sm">{row.templateName}</Td>
                  <Td>
                    <span className="font-mono text-xs">v{row.templateVersion}</span>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs">{row.certificateNumber}</span>
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatIssuedDate(row.issuedAt)}
                  </Td>
                  <Td className="text-sm">{row.issuedByName}</Td>
                  <Td>
                    <span className="text-[11px] text-muted-foreground break-all">
                      {fileReference(row)}
                    </span>
                  </Td>
                  <Td>
                    <Pill tone="success">{row.status}</Pill>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        </CardBody>
      )}
    </Card>
  );
}
