import { useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  KpiGrid,
  Kpi,
  DataTable,
  Th,
  Td,
  Tr,
  Pill,
  SearchInput,
  SegmentedControl,
  PageToolbar,
  ToolbarMeta,
  Button,
} from "@lumenx/ui-admin";
import {
  DOC_CATEGORIES,
  documentSummary,
  getDocuments,
  type DocCategory,
  type DocOwner,
  type VerificationStatus,
} from "@/lib/documents-data";
import { FileText, Upload } from "lucide-react";

function verifyPill(v: VerificationStatus) {
  if (v === "verified") return <Pill tone="success">Verified</Pill>;
  if (v === "pending") return <Pill tone="warning">Pending</Pill>;
  if (v === "expired") return <Pill tone="danger">Expired</Pill>;
  return <Pill tone="danger">Rejected</Pill>;
}

export function DocumentsRegistryPanel() {
  const [docs, setDocs] = useState(getDocuments);
  const [owner, setOwner] = useState<DocOwner | "all">("all");
  const [category, setCategory] = useState<DocCategory | "all">("all");
  const [q, setQ] = useState("");

  const summary = useMemo(() => documentSummary(docs), [docs]);
  const filtered = useMemo(() => {
    return docs.filter((d) => {
      if (owner !== "all" && d.ownerType !== owner) return false;
      if (category !== "all" && d.category !== category) return false;
      if (!q.trim()) return true;
      const hay = `${d.title} ${d.ownerName} ${d.category} ${d.fileName}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [docs, owner, category, q]);

  const verify = (id: string) =>
    setDocs((p) => p.map((d) => (d.id === id ? { ...d, verification: "verified" as const } : d)));

  return (
    <div className="space-y-4">
      <KpiGrid cols={5}>
        <Kpi label="Total documents" value={String(summary.total)} />
        <Kpi label="Student docs" value={String(summary.student)} />
        <Kpi label="Teacher docs" value={String(summary.teacher)} />
        <Kpi label="Pending verification" value={String(summary.pending)} tone="down" />
        <Kpi label="Expired" value={String(summary.expired)} tone="down" />
      </KpiGrid>

      <Card>
        <CardHeader
          title="Document registry"
          hint="Certificates · TC · bonafide · identity · contracts"
          action={
            <Button size="sm" variant="primary">
              <Upload className="size-3.5" /> Upload
            </Button>
          }
        />
        <PageToolbar>
          <SegmentedControl
            value={owner}
            onChange={setOwner}
            options={[
              { value: "all", label: "All owners" },
              { value: "student", label: "Students" },
              { value: "teacher", label: "Teachers" },
            ]}
          />
          <SegmentedControl
            value={category}
            onChange={setCategory}
            options={[
              { value: "all", label: "All categories" },
              ...DOC_CATEGORIES.map((c) => ({ value: c, label: c })),
            ]}
          />
          <SearchInput
            placeholder="Search documents…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 min-w-[180px] max-w-sm"
          />
          <ToolbarMeta>{filtered.length} files</ToolbarMeta>
        </PageToolbar>

        <DataTable>
          <thead>
            <tr>
              <Th>Document</Th>
              <Th>Owner</Th>
              <Th>Category</Th>
              <Th>Uploaded</Th>
              <Th>Expiry</Th>
              <Th>Status</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <Tr key={d.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <FileText className="size-3.5 text-muted-foreground shrink-0" />
                    <div>
                      <div className="font-medium">{d.title}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{d.fileName}</div>
                    </div>
                  </div>
                </Td>
                <Td>
                  <div>{d.ownerName}</div>
                  <div className="text-[10px] text-muted-foreground capitalize">{d.ownerType} · {d.ownerRef}</div>
                </Td>
                <Td>{d.category}</Td>
                <Td mono>{d.uploadedAt}</Td>
                <Td mono>{d.expiryDate ?? "—"}</Td>
                <Td>{verifyPill(d.verification)}</Td>
                <Td align="right">
                  {d.verification === "pending" ? (
                    <Button size="sm" variant="primary" onClick={() => verify(d.id)}>
                      Verify
                    </Button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">{d.sizeMb} MB</span>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
        {filtered.length === 0 && (
          <CardBody>
            <p className="text-sm text-muted-foreground text-center py-6">No documents match your filters.</p>
          </CardBody>
        )}
      </Card>
    </div>
  );
}
