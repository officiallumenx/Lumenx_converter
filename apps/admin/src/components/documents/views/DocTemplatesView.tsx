import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
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
import {
  getAllTemplates,
  activateTemplate,
} from "@/lib/template-management/store";
import { categoryLabel } from "@/lib/template-management/categories";
import type { TemplateRecord, TemplateStatus } from "@/lib/template-management/types";
import { useTemplateStore } from "@/components/templates/useTemplateStore";
import { useAdminToast } from "@/components/AdminActionToast";
import { FileText, ExternalLink, Power, Wand2, FileCheck } from "lucide-react";

type DocTemplatesViewProps = {
  templates?: TemplateRecord[];
  writesEnabled?: boolean;
  listBlocked?: boolean;
  listHint?: string | null;
  onActivateTemplate?: (id: string) => void | Promise<void>;
};

const KIND_LABEL = {
  certificate: "Certificate",
  report: "Report",
  document: "Document",
  id_card: "ID Card",
} as const;

const STATUS_TONE: Record<TemplateStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  draft: "warning",
  archived: "neutral",
};

/**
 * Documents hub Templates tab — same store as Certificates module.
 * Edit / activate / issue live in /templates.
 */
export function DocTemplatesView({
  templates,
  writesEnabled = true,
  listBlocked = false,
  listHint = null,
  onActivateTemplate,
}: DocTemplatesViewProps) {
  const revision = useTemplateStore();
  const notify = useAdminToast();
  const [source, setSource] = useState<"all" | "system" | "custom" | "imported">("all");
  const [status, setStatus] = useState<TemplateStatus | "all">("all");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const rows =
      templates ??
      getAllTemplates().filter((t) => t.kind === "document" || t.kind === "certificate");
    return rows;
  }, [templates, revision]);

  const filtered = useMemo(() => {
    return list.filter((t) => {
      if (status === "all" && t.status === "archived") return false;
      if (status !== "all" && t.status !== status) return false;
      if (source !== "all" && t.source !== source) return false;
      if (q) {
        const lq = q.toLowerCase();
        return `${t.name} ${t.kind} ${categoryLabel(t.categoryId)}`.toLowerCase().includes(lq);
      }
      return true;
    });
  }, [list, source, status, q]);

  const stats = useMemo(() => {
    const visible = list.filter((t) => t.status !== "archived");
    return {
      active: visible.filter((t) => t.status === "active").length,
      draft: visible.filter((t) => t.status === "draft").length,
      system: visible.filter((t) => t.source === "system").length,
      custom: visible.filter((t) => t.source === "custom" || t.source === "imported").length,
    };
  }, [list]);

  if (listBlocked) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {listHint ?? "Loading document templates…"}
      </div>
    );
  }

  return (
    <PageStack>
      <Card className="border-primary/20 bg-primary/5">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Managed in Certificates</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Same library as Certificates & Documents. Activate drafts there, then issue from either hub.
            </p>
          </div>
          {writesEnabled ? (
            <>
              <Link to="/templates" search={{ view: "library" }}>
                <Button size="sm" variant="primary">
                  <ExternalLink className="size-3.5" /> Open Library
                </Button>
              </Link>
              <Link to="/templates" search={{ view: "builder" }}>
                <Button size="sm">
                  <Wand2 className="size-3.5" /> Builder
                </Button>
              </Link>
            </>
          ) : (
            <Pill tone="neutral">Read-only · API mode</Pill>
          )}
        </div>
      </Card>

      <KpiGrid cols={4}>
        <Kpi label="Active" value={String(stats.active)} tone="up" />
        <Kpi label="Drafts" value={String(stats.draft)} tone="neutral" />
        <Kpi label="System" value={String(stats.system)} />
        <Kpi label="Custom / imported" value={String(stats.custom)} />
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
              { label: "Imported", value: "imported" },
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
          <ToolbarMeta>{filtered.length} templates</ToolbarMeta>
        </PageToolbar>

        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No templates match your filters
          </div>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Template name</Th>
                <Th>Type</Th>
                <Th>Category</Th>
                <Th>Source</Th>
                <Th>Usages</Th>
                <Th>Updated</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <Tr key={t.id}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <FileText className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium">{t.name}</span>
                    </div>
                  </Td>
                  <Td>
                    <Pill tone="info">{KIND_LABEL[t.kind]}</Pill>
                  </Td>
                  <Td className="text-sm text-muted-foreground">{categoryLabel(t.categoryId)}</Td>
                  <Td>
                    <Pill tone={t.source === "system" ? "neutral" : "info"}>{t.source}</Pill>
                  </Td>
                  <Td className="text-sm">{t.usageCount}</Td>
                  <Td className="text-xs text-muted-foreground">{t.updatedAt}</Td>
                  <Td>
                    <Pill tone={STATUS_TONE[t.status]}>{t.status}</Pill>
                  </Td>
                  <Td>
                    {writesEnabled ? (
                      <div className="flex flex-wrap gap-1">
                        {t.status === "draft" && t.source === "custom" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              if (onActivateTemplate) {
                                void Promise.resolve(onActivateTemplate(t.id))
                                  .then(() => notify(`Activated "${t.name}"`))
                                  .catch((err) => {
                                    notify(
                                      err instanceof Error
                                        ? err.message
                                        : "Failed to activate template",
                                    );
                                  });
                                return;
                              }
                              activateTemplate(t.id);
                              notify(`Activated "${t.name}"`);
                            }}
                          >
                            <Power className="size-3" /> Activate
                          </Button>
                        )}
                        {t.status === "active" && (
                          <Link to="/templates" search={{ view: "generate", templateId: t.id }}>
                            <Button size="sm" variant="primary">
                              <FileCheck className="size-3" /> Issue
                            </Button>
                          </Link>
                        )}
                        <Link to="/templates" search={{ view: "builder", templateId: t.id }}>
                          <Button size="sm">
                            <Wand2 className="size-3" /> Edit
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>
    </PageStack>
  );
}
