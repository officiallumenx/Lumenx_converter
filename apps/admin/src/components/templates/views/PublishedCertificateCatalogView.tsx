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

export function PublishedCertificateCatalogView() {
  const { instituteProfile, profile } = useDemoProfile();
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [categories, setCategories] = useState<CertificateCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setTemplates(listPublishedCertificateTemplates());
      setCategories(listPublishedCertificateCategories());
    };
    refresh();
    return subscribeCertificateCatalog(refresh);
  }, []);

  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const filteredTemplates = useMemo(() => {
    const rows = categoryId
      ? templates.filter((template) => template.categoryId === categoryId)
      : templates;
    return [...rows].sort((a, b) => a.name.localeCompare(b.name));
  }, [templates, categoryId]);

  useEffect(() => {
    if (filteredTemplates.some((template) => template.id === templateId)) return;
    setTemplateId(filteredTemplates[0]?.id ?? "");
  }, [filteredTemplates, templateId]);

  const selected = templates.find((template) => template.id === templateId);
  const selectedCategoryName = selected
    ? categoryNameById.get(selected.categoryId) ?? selected.categoryId
    : "";

  return (
    <PageStack>
      <Card>
        <CardHeader
          title="Published templates"
          hint="Nexus publishes these versions · Admin cannot edit templates or mappings"
        />
        <CardBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category">
              <Select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((category) => (
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
                disabled={filteredTemplates.length === 0}
              >
                {filteredTemplates.length === 0 ? (
                  <option value="">No published templates</option>
                ) : (
                  filteredTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))
                )}
              </Select>
            </Field>
          </div>
          <Button
            variant="primary"
            onClick={() => setPreviewOpen(true)}
            disabled={!selected}
          >
            <Eye className="size-3.5" /> View preview
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Catalog"
          hint={`${filteredTemplates.length} published`}
        />
        {filteredTemplates.length === 0 ? (
          <CardBody>
            <EmptyState
              icon={<Award className="size-5" />}
              title="No published certificate templates"
              hint="Nexus must publish a template before it appears here."
            />
          </CardBody>
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
              {filteredTemplates.map((template) => {
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

      <CertificateNumberingConfig />

      {selected ? (
        <CertificateStudentPopulatePanel
          template={selected}
          institute={instituteProfile}
          principalName={profile.admin.principalName}
        />
      ) : null}

      {selected ? (
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

      <CertificateHistoryPanel />

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
    </PageStack>
  );
}
