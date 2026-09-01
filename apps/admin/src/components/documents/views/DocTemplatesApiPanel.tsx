import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Button,
  Card,
  Field,
  Modal,
  PageStack,
  PageToolbar,
  Pill,
  SearchInput,
  SegmentedControl,
  Select,
  TextInput,
  TextArea,
  DataTable,
  Th,
  Td,
  Tr,
  ToolbarMeta,
  KpiGrid,
  Kpi,
} from "@lumenx/ui-admin";
import { useAdminToast } from "@/components/AdminActionToast";
import type { TemplateRecord, TemplateStatus } from "@/lib/template-management/types";
import {
  activateDocumentTemplate,
  archiveDocumentTemplate,
  createDocumentTemplate,
  deleteDocumentTemplate,
  updateDocumentTemplate,
} from "@/lib/documents";
import { useInstituteContext } from "@/lib/institutes";
import { FileCheck, FileText, Plus, Power, Trash2, Wand2 } from "lucide-react";

type DocTemplatesApiPanelProps = {
  templates: TemplateRecord[];
  writesEnabled?: boolean;
  listBlocked?: boolean;
  listHint?: string | null;
  onChanged?: () => void;
};

const STATUS_TONE: Record<TemplateStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  draft: "warning",
  archived: "neutral",
};

export function DocTemplatesApiPanel({
  templates,
  writesEnabled = true,
  listBlocked = false,
  listHint = null,
  onChanged,
}: DocTemplatesApiPanelProps) {
  const notify = useAdminToast();
  const instituteCtx = useInstituteContext();
  const [status, setStatus] = useState<TemplateStatus | "all">("all");
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TemplateRecord | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("official");
  const [docType, setDocType] = useState<"document" | "certificate" | "report">("document");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (status === "all" && t.status === "archived") return false;
      if (status !== "all" && t.status !== status) return false;
      if (q) {
        const lq = q.toLowerCase();
        return `${t.name} ${t.kind}`.toLowerCase().includes(lq);
      }
      return true;
    });
  }, [templates, status, q]);

  const stats = useMemo(() => {
    const visible = templates.filter((t) => t.status !== "archived");
    return {
      active: visible.filter((t) => t.status === "active").length,
      draft: visible.filter((t) => t.status === "draft").length,
    };
  }, [templates]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategory("official");
    setDocType("document");
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (t: TemplateRecord) => {
    setEditTarget(t);
    setName(t.name);
    setDescription("");
    setCategory(t.categoryId || "official");
    setDocType(t.kind === "certificate" || t.kind === "report" ? t.kind : "document");
  };

  const instituteId = instituteCtx.activeInstituteId;

  const submitCreate = () => {
    if (!writesEnabled || busy || !instituteId) return;
    if (!name.trim()) {
      notify("Template name is required");
      return;
    }
    setBusy(true);
    void createDocumentTemplate({
      instituteId,
      type: docType,
      name: name.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      activateNow: false,
    })
      .then(() => {
        notify("Template created as draft");
        setCreateOpen(false);
        onChanged?.();
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to create template");
      })
      .finally(() => setBusy(false));
  };

  const submitEdit = () => {
    if (!writesEnabled || busy || !editTarget) return;
    if (!name.trim()) {
      notify("Template name is required");
      return;
    }
    setBusy(true);
    void updateDocumentTemplate(editTarget.id, {
      name: name.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
    })
      .then(() => {
        notify("Template updated");
        setEditTarget(null);
        onChanged?.();
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to update template");
      })
      .finally(() => setBusy(false));
  };

  const runAction = (action: () => Promise<unknown>, success: string) => {
    if (!writesEnabled || busy) return;
    setBusy(true);
    void action()
      .then(() => {
        notify(success);
        onChanged?.();
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Action failed");
      })
      .finally(() => setBusy(false));
  };

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
            <p className="text-sm font-semibold">Documents API templates</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create and manage institute document templates · activate then generate drafts
            </p>
          </div>
          {writesEnabled ? (
            <>
              <Button size="sm" variant="primary" onClick={openCreate}>
                <Plus className="size-3.5" /> New template
              </Button>
              <Link to="/documents" search={{ view: "generate" }}>
                <Button size="sm">
                  <FileCheck className="size-3.5" /> Generate
                </Button>
              </Link>
            </>
          ) : (
            <Pill tone="neutral">Read-only</Pill>
          )}
        </div>
      </Card>

      <KpiGrid cols={2}>
        <Kpi label="Active" value={String(stats.active)} tone="up" />
        <Kpi label="Drafts" value={String(stats.draft)} tone="neutral" />
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
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th>Updated</Th>
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
                    <Pill tone="info">{t.kind}</Pill>
                  </Td>
                  <Td>
                    <Pill tone={STATUS_TONE[t.status]}>{t.status}</Pill>
                  </Td>
                  <Td className="text-xs text-muted-foreground">{t.updatedAt}</Td>
                  <Td>
                    {writesEnabled ? (
                      <div className="flex flex-wrap gap-1">
                        {t.status === "draft" ? (
                          <Button
                            size="sm"
                            onClick={() =>
                              runAction(
                                () => activateDocumentTemplate(t.id),
                                `Activated "${t.name}"`,
                              )
                            }
                          >
                            <Power className="size-3" /> Activate
                          </Button>
                        ) : null}
                        {t.status === "active" ? (
                          <Link to="/documents" search={{ view: "generate" }}>
                            <Button size="sm" variant="primary">
                              <FileCheck className="size-3" /> Generate
                            </Button>
                          </Link>
                        ) : null}
                        {t.status !== "archived" ? (
                          <Button size="sm" onClick={() => openEdit(t)}>
                            <Wand2 className="size-3" /> Edit
                          </Button>
                        ) : null}
                        {t.status === "active" ? (
                          <Button
                            size="sm"
                            onClick={() =>
                              runAction(
                                () => archiveDocumentTemplate(t.id),
                                `Archived "${t.name}"`,
                              )
                            }
                          >
                            Archive
                          </Button>
                        ) : null}
                        {t.status === "draft" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() =>
                              runAction(
                                () => deleteDocumentTemplate(t.id),
                                `Deleted "${t.name}"`,
                              )
                            }
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        ) : null}
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

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New document template"
        subtitle="Creates a draft template via documents API"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={busy} onClick={submitCreate}>
              Create draft
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Name" required>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Type">
            <Select value={docType} onChange={(e) => setDocType(e.target.value as typeof docType)}>
              <option value="document">Document</option>
              <option value="certificate">Certificate</option>
              <option value="report">Report</option>
            </Select>
          </Field>
          <Field label="Category">
            <TextInput value={category} onChange={(e) => setCategory(e.target.value)} />
          </Field>
          <Field label="Description">
            <TextArea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title="Edit template"
        subtitle={editTarget?.name}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={busy} onClick={submitEdit}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Name" required>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Category">
            <TextInput value={category} onChange={(e) => setCategory(e.target.value)} />
          </Field>
          <Field label="Description">
            <TextArea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </div>
      </Modal>
    </PageStack>
  );
}
