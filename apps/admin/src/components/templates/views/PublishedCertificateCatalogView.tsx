import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  EmptyState,
  Field,
  Modal,
  PageStack,
  Pill,
  Select,
  Th,
} from "@lumenx/ui-admin";
import {
  listPublishedCertificateCategories,
  listPublishedCertificateTemplates,
  subscribeCertificateCatalog,
  type CertificateCategory,
  type CertificateTemplate,
} from "@lumenx/module-certificates";
import { Award, Eye } from "lucide-react";
import { useDemoProfile } from "@/lib/demo-profile-context";
import { CertificateHistoryPanel } from "@/components/templates/CertificateHistoryPanel";
import { CertificateNumberingConfig } from "@/components/templates/CertificateNumberingConfig";
import { CertificateStudentPopulatePanel } from "@/components/templates/views/CertificateStudentPopulatePanel";
import { categoryLabel } from "@/lib/template-management/categories";
import type { IssuedCertificateHistoryItem } from "@/lib/certificates";
import type { TemplateRecord, TemplateStatus } from "@/lib/template-management/types";

type PublishedCertificateCatalogViewProps = {
  catalogTemplates?: TemplateRecord[];
  catalogBlocked?: boolean;
  catalogHint?: string | null;
  writesEnabled?: boolean;
  issuedRecords?: IssuedCertificateHistoryItem[];
  issuedListBlocked?: boolean;
  issuedListHint?: string | null;
  onRevokeCertificate?: (id: string, reason: string) => void | Promise<void>;
};

const STATUS_TONE: Record<TemplateStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  draft: "warning",
  archived: "neutral",
};

function PublishedTemplatePreview({
  template,
  categoryName,
}: {
  template: CertificateTemplate;
  categoryName: string;
}) {
  const mappingByTarget = new Map(
    template.mappings.map((mapping) => [mapping.targetId, mapping]),
  );

  return (
    <div className="rounded-xl border border-border bg-background px-6 py-8 sm:px-10">
      <p className="text-center text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {categoryName}
      </p>
      <h3 className="mt-2 text-center text-lg font-semibold tracking-tight">{template.name}</h3>
      <p className="mt-1 text-center text-[11px] text-muted-foreground">
        Version {template.version} · Published · {template.file.format.toUpperCase()}
      </p>
      <div className="mx-auto mt-6 max-w-md space-y-2">
        {template.targets.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            This published version has no mapped text boxes.
          </p>
        ) : (
          template.targets.map((target) => {
            const mapping = mappingByTarget.get(target.id);
            return (
              <div
                key={target.id}
                className="rounded-lg border border-dashed border-border px-3 py-2.5 text-center"
              >
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {target.name}
                </p>
                <p className="mt-0.5 text-sm font-medium">
                  {mapping?.displayName ?? (target.previewText || "Empty text box")}
                </p>
              </div>
            );
          })
        )}
      </div>
      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        Read-only preview · Nexus is the source of truth · not an issued certificate
      </p>
    </div>
  );
}

export function PublishedCertificateCatalogView({
  catalogTemplates,
  catalogBlocked = false,
  catalogHint = null,
  writesEnabled = true,
  issuedRecords,
  issuedListBlocked = false,
  issuedListHint = null,
  onRevokeCertificate,
}: PublishedCertificateCatalogViewProps) {
  const { instituteProfile, profile } = useDemoProfile();
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [categories, setCategories] = useState<CertificateCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const apiCatalogMode = catalogTemplates != null;

  useEffect(() => {
    if (apiCatalogMode) return;
    const refresh = () => {
      setTemplates(listPublishedCertificateTemplates());
      setCategories(listPublishedCertificateCategories());
    };
    refresh();
    return subscribeCertificateCatalog(refresh);
  }, [apiCatalogMode]);

  const apiCategories = useMemo(() => {
    if (!catalogTemplates) return [];
    const ids = new Set(catalogTemplates.map((t) => t.categoryId));
    return [...ids].map((id) => ({ id, name: categoryLabel(id) }));
  }, [catalogTemplates]);

  const apiFilteredTemplates = useMemo(() => {
    if (!catalogTemplates) return [];
    const rows = categoryId
      ? catalogTemplates.filter((template) => template.categoryId === categoryId)
      : catalogTemplates;
    return [...rows].sort((a, b) => a.name.localeCompare(b.name));
  }, [catalogTemplates, categoryId]);

  const categoryNameById = useMemo(
    () =>
      apiCatalogMode
        ? new Map(apiCategories.map((category) => [category.id, category.name]))
        : new Map(categories.map((category) => [category.id, category.name])),
    [apiCatalogMode, apiCategories, categories],
  );

  const filteredDemoTemplates = useMemo(() => {
    const rows = categoryId
      ? templates.filter((template) => template.categoryId === categoryId)
      : templates;
    return [...rows].sort((a, b) => a.name.localeCompare(b.name));
  }, [templates, categoryId]);

  const categoryOptions = apiCatalogMode ? apiCategories : categories;
  const visibleCatalogCount = apiCatalogMode
    ? apiFilteredTemplates.length
    : filteredDemoTemplates.length;

  useEffect(() => {
    const ids = apiCatalogMode
      ? apiFilteredTemplates.map((template) => template.id)
      : filteredDemoTemplates.map((template) => template.id);
    if (ids.includes(templateId)) return;
    setTemplateId(ids[0] ?? "");
  }, [apiCatalogMode, apiFilteredTemplates, filteredDemoTemplates, templateId]);

  const selected = templates.find((template) => template.id === templateId);
  const selectedApiTemplate = catalogTemplates?.find((template) => template.id === templateId);
  const selectedCategoryName = apiCatalogMode
    ? selectedApiTemplate
      ? categoryNameById.get(selectedApiTemplate.categoryId) ?? selectedApiTemplate.categoryId
      : ""
    : selected
      ? categoryNameById.get(selected.categoryId) ?? selected.categoryId
      : "";

  if (catalogBlocked) {
    return (
      <PageStack>
        <Card>
          <CardHeader title="Published templates" hint="Certificate template library" />
          <CardBody>
            <div className="py-8 text-center text-sm text-muted-foreground">
              {catalogHint ?? "Loading certificate templates…"}
            </div>
          </CardBody>
        </Card>
        <CertificateHistoryPanel
          records={issuedRecords}
          listBlocked={issuedListBlocked}
          listHint={issuedListHint}
          writesEnabled={writesEnabled}
          onRevokeCertificate={onRevokeCertificate}
        />
      </PageStack>
    );
  }

  return (
    <PageStack>
      <Card>
        <CardHeader
          title="Published templates"
          hint={
            apiCatalogMode
              ? "Active certificate templates from the institute library · read-only in API mode"
              : "Nexus publishes these versions · Admin cannot edit templates or mappings"
          }
        />
        <CardBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category">
              <Select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">All categories</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Template">
              <Select
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
                disabled={visibleCatalogCount === 0}
              >
                {visibleCatalogCount === 0 ? (
                  <option value="">No published templates</option>
                ) : apiCatalogMode ? (
                  apiFilteredTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))
                ) : (
                  filteredDemoTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))
                )}
              </Select>
            </Field>
          </div>
          {!apiCatalogMode && writesEnabled ? (
            <Button
              variant="primary"
              onClick={() => setPreviewOpen(true)}
              disabled={!selected}
            >
              <Eye className="size-3.5" /> View preview
            </Button>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Catalog"
          hint={`${visibleCatalogCount} ${apiCatalogMode ? "active" : "published"}`}
        />
        {visibleCatalogCount === 0 ? (
          <CardBody>
            <EmptyState
              icon={<Award className="size-5" />}
              title="No published certificate templates"
              hint={
                apiCatalogMode
                  ? "No active certificate templates found for this institute."
                  : "Nexus must publish a template before it appears here."
              }
            />
          </CardBody>
        ) : apiCatalogMode ? (
          <DataTable>
            <thead>
              <tr>
                <Th>Category</Th>
                <Th>Template Name</Th>
                <Th>Version</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {apiFilteredTemplates.map((template) => {
                const active = template.id === templateId;
                return (
                  <tr
                    key={template.id}
                    className={`cursor-pointer ${active ? "bg-primary/5" : "hover:bg-muted/30"}`}
                    onClick={() => setTemplateId(template.id)}
                  >
                    <td className="px-5 py-3 text-sm">
                      {categoryNameById.get(template.categoryId) ?? template.categoryId}
                    </td>
                    <td className="px-5 py-3 text-sm font-medium">{template.name}</td>
                    <td className="px-5 py-3 font-mono text-xs">v{template.version}</td>
                    <td className="px-5 py-3">
                      <Pill tone={STATUS_TONE[template.status]}>{template.status}</Pill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Category</Th>
                <Th>Template Name</Th>
                <Th>Version</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {filteredDemoTemplates.map((template) => {
                const active = template.id === templateId;
                return (
                  <tr
                    key={template.id}
                    className={`cursor-pointer ${active ? "bg-primary/5" : "hover:bg-muted/30"}`}
                    onClick={() => setTemplateId(template.id)}
                  >
                    <td className="px-5 py-3 text-sm">
                      {categoryNameById.get(template.categoryId) ?? template.categoryId}
                    </td>
                    <td className="px-5 py-3 text-sm font-medium">{template.name}</td>
                    <td className="px-5 py-3 font-mono text-xs">v{template.version}</td>
                    <td className="px-5 py-3">
                      <Pill tone="success">Published</Pill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        )}
      </Card>

      {!apiCatalogMode && writesEnabled ? <CertificateNumberingConfig /> : null}

      {!apiCatalogMode && writesEnabled && selected ? (
        <CertificateStudentPopulatePanel
          template={selected}
          institute={instituteProfile}
          principalName={profile.admin.principalName}
        />
      ) : null}

      {!apiCatalogMode && selected ? (
        <Card>
          <CardHeader
            title="Template preview"
            hint={`${selected.file.fileName} · read-only`}
          />
          <CardBody>
            <PublishedTemplatePreview
              template={selected}
              categoryName={selectedCategoryName}
            />
          </CardBody>
        </Card>
      ) : null}

      <CertificateHistoryPanel
        records={issuedRecords}
        listBlocked={issuedListBlocked}
        listHint={issuedListHint}
        writesEnabled={writesEnabled}
        onRevokeCertificate={onRevokeCertificate}
      />

      {!apiCatalogMode ? (
      <Modal
        open={previewOpen && Boolean(selected)}
        onClose={() => setPreviewOpen(false)}
        title={selected?.name ?? "Template preview"}
        subtitle={selected ? `${selectedCategoryName} · v${selected.version} · Published` : undefined}
        size="lg"
      >
        {selected ? (
          <PublishedTemplatePreview
            template={selected}
            categoryName={selectedCategoryName}
          />
        ) : null}
      </Modal>
      ) : null}
    </PageStack>
  );
}
