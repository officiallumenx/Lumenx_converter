import { useMemo, useState } from "react";
import {
  Card,
  CardBody,
  DataTable,
  Th,
  Td,
  Tr,
  Pill,
  SearchInput,
  SegmentedControl,
  Button,
  PageToolbar,
  ToolbarMeta,
} from "@lumenx/ui-admin";
import type { TemplateKind } from "@/lib/template-management/types";
import { getGeneratedDocuments } from "@/lib/template-management/store";
import { useTemplateStore } from "@/components/templates/useTemplateStore";
import { useAdminToast } from "@/components/AdminActionToast";
import { Download, RefreshCw, Archive } from "lucide-react";

export function TemplateGeneratedView() {
  const revision = useTemplateStore();
  const notify = useAdminToast();
  const [kind, setKind] = useState<TemplateKind | "all">("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    let list = getGeneratedDocuments();
    if (kind !== "all") list = list.filter((d) => d.kind === kind);
    if (q.trim()) {
      const lq = q.toLowerCase();
      list = list.filter(
        (d) =>
          d.templateName.toLowerCase().includes(lq) ||
          d.recipientName.toLowerCase().includes(lq) ||
          d.recipientRef.toLowerCase().includes(lq) ||
          (d.certificateNumber?.toLowerCase().includes(lq) ?? false),
      );
    }
    return list.sort(
      (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
    );
  }, [kind, q, revision]);

  return (
    <Card>
      <PageToolbar>
        <SearchInput
          placeholder="Search generated documents…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 min-w-[200px] max-w-md"
        />
        <SegmentedControl
          value={kind}
          onChange={setKind}
          options={[
            { value: "all", label: "All" },
            { value: "certificate", label: "Certificates" },
            { value: "report", label: "Reports" },
            { value: "id_card", label: "ID cards" },
            { value: "document", label: "Documents" },
          ]}
        />
        <ToolbarMeta>{rows.length} records</ToolbarMeta>
      </PageToolbar>
      <CardBody noPadding>
        {rows.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-muted-foreground">
            No generated documents yet. Generate from a template in the library.
          </div>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Document</Th>
                <Th>Recipient</Th>
                <Th>Type</Th>
                <Th>Generated</Th>
                <Th>Ref / batch</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <Tr key={d.id}>
                  <Td>
                    <div className="text-sm font-medium">{d.templateName}</div>
                    {d.certificateNumber && (
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {d.certificateNumber}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <div className="text-sm">{d.recipientName}</div>
                    <div className="text-xs text-muted-foreground">{d.recipientRef}</div>
                  </Td>
                  <Td>
                    <Pill tone="info">{d.kind.replace("_", " ")}</Pill>
                  </Td>
                  <Td className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(d.generatedAt).toLocaleString()}
                  </Td>
                  <Td className="text-xs text-muted-foreground">
                    {d.batchId ?? "—"}
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        onClick={() => notify(`Download started · ${d.templateName} (demo)`)}
                      >
                        <Download className="size-3" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => notify(`Regenerating ${d.recipientName} (demo)`)}
                      >
                        <RefreshCw className="size-3" />
                      </Button>
                      <Button size="sm" onClick={() => notify(`Archived ${d.id} (demo)`)}>
                        <Archive className="size-3" />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </CardBody>
    </Card>
  );
}
