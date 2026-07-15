import { useMemo, useState } from "react";
import {
  Card,
  Pill,
  Button,
  SearchInput,
  SegmentedControl,
  DataTable,
  Th,
  Td,
  Tr,
  PageToolbar,
  ToolbarMeta,
  KpiGrid,
  Kpi,
  PageStack,
} from "@lumenx/ui-admin";
import { DOC_TEMPLATES, type DocTemplate, type DocRequestKind } from "@/lib/documents-records-data";
import { FileText } from "lucide-react";

const KIND_LABEL: Record<DocRequestKind, string> = {
  bonafide: "Bonafide",
  transfer: "Transfer",
  conduct: "Conduct",
  marksheet: "Marksheet",
  character: "Character",
  migration: "Migration",
  experience: "Experience",
  salary: "Salary",
  custom: "Custom",
};

const STATUS_TONE: Record<DocTemplate["status"], "success" | "warning" | "neutral"> = {
  active: "success",
  draft: "warning",
  archived: "neutral",
};

export function DocTemplatesView() {
  const [source, setSource] = useState<"all" | "system" | "custom">("all");
  const [status, setStatus] = useState<DocTemplate["status"] | "all">("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return DOC_TEMPLATES.filter((t) => {
      if (source !== "all" && t.source !== source) return false;
      if (status !== "all" && t.status !== status) return false;
      if (q) {
        const lq = q.toLowerCase();
        return `${t.name} ${t.kind} ${t.language}`.toLowerCase().includes(lq);
      }
      return true;
    });
  }, [source, status, q]);

  const stats = useMemo(() => ({
    active: DOC_TEMPLATES.filter((t) => t.status === "active").length,
    system: DOC_TEMPLATES.filter((t) => t.source === "system").length,
    custom: DOC_TEMPLATES.filter((t) => t.source === "custom").length,
    totalUsages: DOC_TEMPLATES.reduce((a, t) => a + t.usageCount, 0),
  }), []);

  return (
    <PageStack>
      <KpiGrid cols={4}>
        <Kpi label="Active templates" value={String(stats.active)} tone="up" />
        <Kpi label="System templates" value={String(stats.system)} />
        <Kpi label="Custom templates" value={String(stats.custom)} />
        <Kpi label="Total usages" value={String(stats.totalUsages)} tone="up" />
      </KpiGrid>

      <Card>
        <PageToolbar>
          <SearchInput
            placeholder="Search templates…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 min-w-[200px] max-w-md"
          />
          <SegmentedControl
            value={source}
            onChange={(v) => setSource(v as typeof source)}
            options={[
              { label: "All", value: "all" },
              { label: "System", value: "system" },
              { label: "Custom", value: "custom" },
            ]}
          />
          <SegmentedControl
            value={status}
            onChange={(v) => setStatus(v as typeof status)}
            options={[
              { label: "All", value: "all" },
              { label: "Active", value: "active" },
              { label: "Draft", value: "draft" },
              { label: "Archived", value: "archived" },
            ]}
          />
          <ToolbarMeta count={filtered.length} label="templates" />
        </PageToolbar>

        <DataTable
          empty={filtered.length === 0}
          emptyMessage="No templates match your filters"
          head={
            <tr>
              <Th>Template name</Th>
              <Th>Type</Th>
              <Th>Source</Th>
              <Th>Language</Th>
              <Th>Size</Th>
              <Th>Usages</Th>
              <Th>Last modified</Th>
              <Th>Status</Th>
            </tr>
          }
        >
          {filtered.map((t) => (
            <Tr key={t.id}>
              <Td>
                <div className="flex items-center gap-2">
                  <FileText className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium">{t.name}</span>
                </div>
              </Td>
              <Td><Pill tone="info">{KIND_LABEL[t.kind]}</Pill></Td>
              <Td>
                <Pill tone={t.source === "system" ? "neutral" : "info"}>{t.source}</Pill>
              </Td>
              <Td className="text-sm">{t.language}</Td>
              <Td className="text-sm text-muted-foreground">{t.size}</Td>
              <Td className="text-sm">{t.usageCount}</Td>
              <Td className="text-xs text-muted-foreground">{t.lastModified}</Td>
              <Td><Pill tone={STATUS_TONE[t.status]}>{t.status}</Pill></Td>
            </Tr>
          ))}
        </DataTable>
      </Card>
    </PageStack>
  );
}
