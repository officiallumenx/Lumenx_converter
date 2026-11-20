import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Card,
  CardBody,
  CardHeader,
  DataTable,
  EmptyState,
  Button,
  Field,
  Modal,
  Pill,
  SearchInput,
  Select,
  TextInput,
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
import type { IssuedCertificateHistoryItem } from "@/lib/certificates";
import {
  filterPublishedItems,
  sortPublishedItems,
  templateFilterOptions,
} from "@/lib/docs-certs/published-list";

type HistoryRow = IssuedCertificateRecord | IssuedCertificateHistoryItem;

function statusTone(
  status: HistoryRow["status"],
): "success" | "warning" | "neutral" | "danger" {
  if (status === "issued") return "success";
  if (status === "superseded") return "warning";
  if (status === "revoked") return "danger";
  return "neutral";
}

function formatIssuedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fileReference(row: HistoryRow): string {
  if ("hasServerFile" in row && row.hasServerFile === false) {
    return row.fileName || "Ledger only (no server file)";
  }
  if ("bundleFileName" in row && row.bundleFileName && row.fileName) {
    return `${row.fileName} · ${row.bundleFileName}`;
  }
  return row.fileName || ("bundleFileName" in row ? row.bundleFileName : undefined) || "—";
}

type CertificateHistoryPanelProps = {
  records?: IssuedCertificateHistoryItem[];
  listBlocked?: boolean;
  listHint?: string | null;
  writesEnabled?: boolean;
  onRevokeCertificate?: (id: string, reason: string) => void | Promise<void>;
  /** Real template records for the Published template filter. */
  templateOptions?: Array<{ id: string; name: string }>;
};

export function CertificateHistoryPanel({
  records,
  listBlocked = false,
  listHint = null,
  writesEnabled = false,
  onRevokeCertificate,
  templateOptions = [],
}: CertificateHistoryPanelProps) {
  const [rows, setRows] = useState<HistoryRow[]>(() => records ?? listIssuedCertificates());
  const [query, setQuery] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("Issued in error");

  useEffect(() => {
    if (records) {
      setRows(records);
      return;
    }
    const refresh = () => setRows(listIssuedCertificates());
    refresh();
    return subscribeCertificateNumbering(refresh);
  }, [records]);

  const filterTemplates = useMemo(
    () => templateFilterOptions(templateOptions),
    [templateOptions],
  );

  // Must stay above any listBlocked early return — flipping listBlocked must not
  // change the hook call count (React hooks-order crash).
  const visible = useMemo(() => {
    const mapped = rows.map((row) => ({
      id: row.id,
      studentName: row.studentName,
      classSection: row.admissionNumber,
      templateId: row.templateId ?? null,
      templateName: row.templateName,
      documentNumber: row.certificateNumber,
      publishedAt: row.issuedAt,
      status: row.status,
      raw: row,
    }));
    const filtered = filterPublishedItems(mapped, { query, templateId });
    return sortPublishedItems(filtered, "published_desc").map((item) => item.raw);
  }, [rows, query, templateId]);

  if (listBlocked) {
    return (
      <Card>
        <CardHeader title="Issued history" hint="Permanent records from the institute ledger" />
        <CardBody>
          <div className="py-8 text-center text-sm text-muted-foreground">
            {listHint ?? "Loading issued certificates…"}
          </div>
        </CardBody>
      </Card>
    );
  }

  const activeTemplateName =
    filterTemplates.find((t) => t.id === templateId)?.name ?? null;

  return (
    <Card>
      <CardHeader
        title="Published certificates"
        hint="Newest first · filter by template · revoke when permitted"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search student, number, template…"
              className="w-full sm:w-64"
            />
            {filterTemplates.length > 0 ? (
              <Select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                aria-label="Filter by template"
              >
                <option value="">All templates</option>
                {filterTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            ) : null}
            {templateId ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => setTemplateId("")}>
                Clear filter
              </Button>
            ) : null}
          </div>
        }
      />
      {activeTemplateName ? (
        <p className="px-5 pb-2 text-xs text-muted-foreground">
          Showing template:{" "}
          <span className="font-medium text-foreground">{activeTemplateName}</span>
        </p>
      ) : null}
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
                {writesEnabled && onRevokeCertificate ? <Th>Actions</Th> : null}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <Tr key={row.id}>
                  <Td>
                    {row.studentId ? (
                      <Link
                        to="/students/$id"
                        params={{ id: row.studentId }}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {row.studentName}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium">{row.studentName}</span>
                    )}
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
                    <Pill tone={statusTone(row.status)}>{row.status}</Pill>
                  </Td>
                  {writesEnabled && onRevokeCertificate ? (
                    <Td>
                      {row.status === "issued" ? (
                        <Button size="sm" onClick={() => setRevokeId(row.id)}>
                          Revoke
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </Td>
                  ) : null}
                </Tr>
              ))}
            </tbody>
          </DataTable>
        </CardBody>
      )}
      {writesEnabled && onRevokeCertificate ? (
        <Modal
          open={Boolean(revokeId)}
          onClose={() => setRevokeId(null)}
          title="Revoke certificate"
          size="sm"
          footer={
            <>
              <Button onClick={() => setRevokeId(null)}>Cancel</Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (!revokeId) return;
                  void Promise.resolve(
                    onRevokeCertificate(revokeId, revokeReason.trim() || "Revoked"),
                  ).then(() => {
                    setRevokeId(null);
                    setRevokeReason("Issued in error");
                  });
                }}
              >
                Revoke
              </Button>
            </>
          }
        >
          <Field label="Reason">
            <TextInput
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
            />
          </Field>
        </Modal>
      ) : null}
    </Card>
  );
}
