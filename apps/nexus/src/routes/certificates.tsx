import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  EmptyState,
  Field,
  Kpi,
  Modal,
  PageToolbar,
  Pill,
  SegmentedControl,
  Select,
  TextArea,
  TextInput,
  Th,
  ToolbarGroup,
  ToolbarMeta,
  ToolbarSpacer,
} from "@lumenx/ui-admin";
import {
  CERTIFICATE_UPLOAD_ACCEPT,
  CERTIFICATE_UPLOAD_HINT,
  CERTIFICATE_UPLOAD_MAX_BYTES,
  archiveCertificateTemplate,
  createCertificateCategory,
  createCertificateTemplate,
  createCertificateTemplateDraftVersion,
  detectCertificateTemplateTargets,
  listCertificateCategories,
  listCertificateTemplateVersions,
  listCertificateTemplates,
  parseCertificateUpload,
  publishCertificateTemplate,
  readFileAsDataUrl,
  subscribeCertificateCatalog,
  type CertificateCategory,
  type CertificateTemplate,
  type CertificateTemplateStatus,
} from "@lumenx/module-certificates";
import { CertificateFieldMappingPanel } from "@/components/certificates/CertificateFieldMappingPanel";
import { appendAuditEvent } from "@/lib/audit-log-store";
import { Award, FolderPlus, GitBranch, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";

export const Route = createFileRoute("/certificates")({
  head: () => ({ meta: [{ title: "Certificate Template Library — LumenX Nexus" }] }),
  component: CertificateTemplateLibraryPage,
});

type StatusFilter = "all" | CertificateTemplateStatus;

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function statusTone(
  status: CertificateTemplateStatus,
): "success" | "warning" | "neutral" {
  if (status === "published") return "success";
  if (status === "draft") return "warning";
  return "neutral";
}

function statusLabel(status: CertificateTemplateStatus): string {
  if (status === "published") return "Published";
  if (status === "archived") return "Archived";
  return "Draft";
}

function CertificateTemplateLibraryPage() {
  const [categories, setCategories] = useState<CertificateCategory[]>([]);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateCategoryId, setTemplateCategoryId] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [mappingId, setMappingId] = useState<string | null>(null);
  const [versionsFamilyId, setVersionsFamilyId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setCategories(listCertificateCategories());
    setTemplates(listCertificateTemplates());
  }, []);

  useEffect(() => {
    refresh();
    return subscribeCertificateCatalog(refresh);
  }, [refresh]);

  const categoryNameById = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c.name]));
  }, [categories]);

  const mappingTemplate = mappingId
    ? templates.find((template) => template.id === mappingId) ?? null
    : null;

  const versionCountByFamily = useMemo(() => {
    const counts = new Map<string, number>();
    for (const template of templates) {
      counts.set(template.familyId, (counts.get(template.familyId) ?? 0) + 1);
    }
    return counts;
  }, [templates]);

  const stats = useMemo(() => {
    return {
      categories: categories.length,
      templates: templates.length,
      draft: templates.filter((t) => t.status === "draft").length,
      published: templates.filter((t) => t.status === "published").length,
      archived: templates.filter((t) => t.status === "archived").length,
    };
  }, [categories, templates]);

  const sortedTemplates = useMemo(() => {
    const list =
      statusFilter === "all"
        ? templates
        : templates.filter((t) => t.status === statusFilter);
    return [...list].sort((a, b) => {
      const name = a.name.localeCompare(b.name);
      if (name !== 0) return name;
      const family = a.familyId.localeCompare(b.familyId);
      if (family !== 0) return family;
      return b.version - a.version;
    });
  }, [templates, statusFilter]);

  const versionRows = useMemo(() => {
    if (!versionsFamilyId) return [];
    return listCertificateTemplateVersions(versionsFamilyId);
  }, [versionsFamilyId, templates]);

  const flash = (text: string) => {
    setError(null);
    setMessage(text);
  };

  const publishTemplate = (id: string) => {
    try {
      const published = publishCertificateTemplate(id);
      appendAuditEvent({
        action: "platform_setting_changed",
        targetId: published.id,
        targetLabel: `${published.name} · v${published.version}`,
        targetKind: "settings",
        before: "Draft / Archived",
        after: "Published",
        summary: "Certificate template published for Admin",
      });
      flash(
        `Published v${published.version}. Only this version is available to Admin for new issues. Prior issued certificates stay on their original version.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish template");
    }
  };

  const archiveTemplate = (id: string) => {
    try {
      const archived = archiveCertificateTemplate(id);
      appendAuditEvent({
        action: "platform_setting_changed",
        targetId: archived.id,
        targetLabel: `${archived.name} · v${archived.version}`,
        targetKind: "settings",
        before: "Published",
        after: "Archived",
        summary: "Certificate template archived from Admin catalog",
      });
      flash("Archived. Admin can no longer pick this version. Issued certificates are unchanged.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not archive template");
    }
  };

  const newDraftVersion = (id: string) => {
    try {
      const draft = createCertificateTemplateDraftVersion(id);
      appendAuditEvent({
        action: "platform_setting_changed",
        targetId: draft.id,
        targetLabel: `${draft.name} · v${draft.version}`,
        targetKind: "settings",
        before: `Frozen snapshot`,
        after: `Draft v${draft.version}`,
        summary: "New certificate template draft version created",
      });
      setMappingId(draft.id);
      flash(`Draft v${draft.version} created. Previous versions stay frozen.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create draft version");
    }
  };

  const openUpload = () => {
    setTemplateName("");
    setTemplateDescription("");
    setPendingFile(null);
    setTemplateCategoryId(categories[0]?.id ?? "");
    setError(null);
    setUploadOpen(true);
  };

  const onPickFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const parsed = parseCertificateUpload(file);
    if (!parsed) {
      setError(`Only ${CERTIFICATE_UPLOAD_HINT.toLowerCase()}.`);
      setPendingFile(null);
      return;
    }
    if (file.size > CERTIFICATE_UPLOAD_MAX_BYTES) {
      setError("File is too large (max 5 MB).");
      setPendingFile(null);
      return;
    }
    setError(null);
    setPendingFile(file);
    if (!templateName.trim()) {
      setTemplateName(file.name.replace(/\.(ppt|pptx)$/i, ""));
    }
  };

  const saveCategory = () => {
    try {
      const created = createCertificateCategory({
        name: categoryName,
        description: categoryDescription,
      });
      appendAuditEvent({
        action: "platform_setting_changed",
        targetId: created.id,
        targetLabel: created.name,
        targetKind: "settings",
        before: "—",
        after: "Category created",
        summary: "Certificate template category created",
      });
      setCategoryOpen(false);
      setCategoryName("");
      setCategoryDescription("");
      flash("Category created");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create category");
    }
  };

  const saveTemplate = async () => {
    if (!pendingFile) {
      setError("Upload a PPT or PPTX file");
      return;
    }
    const parsed = parseCertificateUpload(pendingFile);
    if (!parsed) {
      setError(`Only ${CERTIFICATE_UPLOAD_HINT.toLowerCase()}.`);
      return;
    }
    setSaving(true);
    try {
      const dataUrl = await readFileAsDataUrl(pendingFile);
      const file = {
        fileName: parsed.name,
        format: parsed.format,
        sizeBytes: parsed.sizeBytes,
        dataUrl,
      };
      const targets = await detectCertificateTemplateTargets(file);
      const created = createCertificateTemplate({
        name: templateName,
        categoryId: templateCategoryId,
        description: templateDescription,
        file,
        targets,
      });
      appendAuditEvent({
        action: "platform_setting_changed",
        targetId: created.id,
        targetLabel: `${created.name} · v${created.version}`,
        targetKind: "settings",
        before: "—",
        after: "Draft uploaded",
        summary: "Certificate PPT/PPTX template uploaded",
      });
      setUploadOpen(false);
      setPendingFile(null);
      setMappingId(created.id);
      flash(
        targets.length
          ? "Template saved as Draft. Map each text box to a LumenX field, then publish."
          : "Template saved as Draft. Add named target areas, map fields, then publish.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="Certificate Template Library"
      subtitle="Nexus owns categories, PPT/PPTX, field mapping, publish & versions · Admin issues certificates"
      actions={
        <>
          <Button
            onClick={() => {
              setError(null);
              setCategoryName("");
              setCategoryDescription("");
              setCategoryOpen(true);
            }}
          >
            <FolderPlus className="size-3.5" /> New category
          </Button>
          <Button variant="primary" onClick={openUpload} disabled={categories.length === 0}>
            <Upload className="size-3.5" /> Upload PPT / PPTX
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Kpi label="Categories" value={String(stats.categories)} />
        <Kpi label="Template versions" value={String(stats.templates)} icon={<Award className="size-3.5" />} />
        <Kpi label="Draft" value={String(stats.draft)} />
        <Kpi label="Published" value={String(stats.published)} tone="up" delta="Admin-visible" />
        <Kpi label="Archived" value={String(stats.archived)} />
      </div>

      {message ? <p className="mb-4 text-xs text-success">{message}</p> : null}
      {error && !categoryOpen && !uploadOpen ? (
        <p className="mb-4 text-xs text-destructive">{error}</p>
      ) : null}

      <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-[11px] text-muted-foreground leading-relaxed mb-6">
        Workflow: <span className="text-foreground font-medium">Draft → Published → Archived</span>.
        Only Published templates appear in Admin. Editing a published version creates a new draft
        version — existing issued certificates never change. Nexus does not select students or issue
        certificates.
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-4">
          <CardHeader title="Categories" hint="Created by Nexus · group templates for institutes" />
          <CardBody>
            {categories.length === 0 ? (
              <EmptyState
                icon={<FolderPlus className="size-5" />}
                title="No categories"
                hint="Create a category before uploading templates."
              />
            ) : (
              <ul className="divide-y divide-border">
                {categories.map((category) => (
                  <li key={category.id} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{category.name}</p>
                        {category.description ? (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {category.description}
                          </p>
                        ) : null}
                      </div>
                      {category.system ? <Pill tone="neutral">Default</Pill> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card className="col-span-12 lg:col-span-8">
          <CardHeader
            title="Templates"
            hint="PPT/PPTX · visual field mapping · required/optional · versioning"
          />
          <Card className="mx-5 mb-3 border-0 shadow-none bg-transparent">
            <PageToolbar>
              <ToolbarGroup>
                <SegmentedControl
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: "all", label: "All" },
                    { value: "draft", label: "Draft" },
                    { value: "published", label: "Published" },
                    { value: "archived", label: "Archived" },
                  ]}
                />
              </ToolbarGroup>
              <ToolbarSpacer />
              <ToolbarMeta>{sortedTemplates.length} shown</ToolbarMeta>
            </PageToolbar>
          </Card>
          {templates.length === 0 ? (
            <CardBody>
              <EmptyState
                icon={<Award className="size-5" />}
                title="No certificate templates yet"
                hint="Upload a PPT or PPTX, map text boxes to fields (Student Name, Class, Sport Name…), then publish."
              />
            </CardBody>
          ) : sortedTemplates.length === 0 ? (
            <CardBody>
              <p className="text-xs text-muted-foreground text-center py-8">
                No templates match this status filter.
              </p>
            </CardBody>
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Category</Th>
                  <Th>Version</Th>
                  <Th>Status</Th>
                  <Th>Mapping</Th>
                  <Th>Updated</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {sortedTemplates.map((template) => {
                  const versionCount = versionCountByFamily.get(template.familyId) ?? 1;
                  const requiredCount = template.mappings.filter((m) => m.required).length;
                  const optionalCount = template.mappings.length - requiredCount;
                  return (
                    <tr key={template.id}>
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium">{template.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">
                          {template.file.fileName} · {template.file.format.toUpperCase()}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-sm">
                        {categoryNameById.get(template.categoryId) ?? template.categoryId}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">
                        v{template.version}
                        {versionCount > 1 ? (
                          <button
                            type="button"
                            className="ml-1 font-sans text-primary hover:underline"
                            onClick={() => setVersionsFamilyId(template.familyId)}
                          >
                            · {versionCount} versions
                          </button>
                        ) : null}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill tone={statusTone(template.status)}>{statusLabel(template.status)}</Pill>
                          {template.status === "published" ? (
                            <span className="text-[10px] text-muted-foreground">Admin</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {template.mappings.length} mapped
                        {template.targets.length ? ` / ${template.targets.length}` : ""}
                        {template.mappings.length > 0 ? (
                          <div className="text-[10px] mt-0.5">
                            {requiredCount} required · {optionalCount} optional
                          </div>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {formatWhen(template.updatedAt)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => setMappingId(template.id)}>
                            Map fields
                          </Button>
                          {template.status !== "draft" ? (
                            <Button size="sm" variant="outline" onClick={() => newDraftVersion(template.id)}>
                              <GitBranch className="size-3" /> New version
                            </Button>
                          ) : null}
                          {template.status !== "published" ? (
                            <Button size="sm" variant="outline" onClick={() => publishTemplate(template.id)}>
                              Publish
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => archiveTemplate(template.id)}>
                              Archive
                            </Button>
                          )}
                          {versionCount > 1 ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setVersionsFamilyId(template.familyId)}
                            >
                              History
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          )}
        </Card>
      </div>

      <Modal
        open={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        title="New category"
        subtitle="Nexus-created categories for the certificate library"
        footer={
          <>
            <Button onClick={() => setCategoryOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={saveCategory} disabled={!categoryName.trim()}>
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && categoryOpen ? <p className="text-xs text-destructive">{error}</p> : null}
          <Field label="Name" required>
            <TextInput
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g. Sports awards"
            />
          </Field>
          <Field label="Description">
            <TextArea
              rows={3}
              value={categoryDescription}
              onChange={(e) => setCategoryDescription(e.target.value)}
              placeholder="Optional"
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(mappingTemplate)}
        onClose={() => setMappingId(null)}
        title="Visual field mapping"
        subtitle="Select a textbox → assign Student Name, Class, Sport Name, Event Name, etc. · Required or Optional"
        size="xl"
      >
        {mappingTemplate ? (
          <CertificateFieldMappingPanel
            template={mappingTemplate}
            onClose={() => setMappingId(null)}
            onTemplateChange={(next) => {
              setMappingId(next.id);
              refresh();
            }}
          />
        ) : null}
      </Modal>

      <Modal
        open={Boolean(versionsFamilyId)}
        onClose={() => setVersionsFamilyId(null)}
        title="Version history"
        subtitle="Each publish creates an Admin-facing snapshot · issued certificates keep their version"
        size="lg"
      >
        <div className="space-y-2">
          {versionRows.map((v) => (
            <div
              key={v.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2.5"
            >
              <div>
                <div className="text-xs font-medium">
                  v{v.version} · {v.name}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  Updated {formatWhen(v.updatedAt)}
                  {v.publishedAt ? ` · Published ${formatWhen(v.publishedAt)}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone={statusTone(v.status)}>{statusLabel(v.status)}</Pill>
                <Button size="sm" variant="outline" onClick={() => setMappingId(v.id)}>
                  Open
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload certificate template"
        subtitle={`${CERTIFICATE_UPLOAD_HINT} · saved as Draft until published`}
        footer={
          <>
            <Button onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => void saveTemplate()}
              disabled={saving || !pendingFile || !templateName.trim() || !templateCategoryId}
            >
              {saving ? "Saving…" : "Save as draft"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && uploadOpen ? <p className="text-xs text-destructive">{error}</p> : null}
          <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 cursor-pointer hover:bg-muted/20">
            <Upload className="size-6 text-muted-foreground" />
            <span className="text-sm font-medium">
              {pendingFile ? pendingFile.name : "Choose PPT or PPTX"}
            </span>
            <span className="text-xs text-muted-foreground">{CERTIFICATE_UPLOAD_HINT} · max 5 MB</span>
            <input
              type="file"
              accept={CERTIFICATE_UPLOAD_ACCEPT}
              className="hidden"
              onChange={onPickFile}
            />
          </label>
          <Field label="Name" required>
            <TextInput
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Study certificate"
            />
          </Field>
          <Field label="Category" required>
            <Select
              value={templateCategoryId}
              onChange={(e) => setTemplateCategoryId(e.target.value)}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Description">
            <TextArea
              rows={3}
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Optional notes for institutes"
            />
          </Field>
        </div>
      </Modal>
    </AppShell>
  );
}
