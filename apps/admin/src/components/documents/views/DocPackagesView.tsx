import { useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Pill,
  Button,
  SearchInput,
  SegmentedControl,
  PageToolbar,
  ToolbarMeta,
  KpiGrid,
  Kpi,
  PageStack,
  Modal,
  Field,
  TextInput,
} from "@lumenx/ui-admin";
import {
  DOC_PACKAGES,
  type DocPackage,
  type DocPackageStatus,
} from "@/lib/documents-records-data";
import { IconChip } from "@/components/IconChip";
import { Package, Plus, Eye, FileText } from "lucide-react";

const KIND_LABEL: Record<DocPackage["kind"], string> = {
  graduation: "Graduation",
  admission: "Admission",
  exit: "Exit",
  scholarship: "Scholarship",
  competition: "Competition",
  custom: "Custom",
};

const KIND_TONE: Record<DocPackage["kind"], "success" | "warning" | "danger" | "info" | "neutral"> = {
  graduation: "success",
  admission: "info",
  exit: "warning",
  scholarship: "neutral",
  competition: "info",
  custom: "neutral",
};

const STATUS_TONE: Record<DocPackageStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  draft: "warning",
  archived: "neutral",
};

export function DocPackagesView() {
  const [statusFilter, setStatusFilter] = useState<DocPackageStatus | "all">("all");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<DocPackage | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const filtered = useMemo(() => {
    return DOC_PACKAGES.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (q) {
        const lq = q.toLowerCase();
        return `${p.name} ${p.description} ${p.kind}`.toLowerCase().includes(lq);
      }
      return true;
    });
  }, [statusFilter, q]);

  const stats = useMemo(() => ({
    active: DOC_PACKAGES.filter((p) => p.status === "active").length,
    draft: DOC_PACKAGES.filter((p) => p.status === "draft").length,
    totalDocs: DOC_PACKAGES.filter((p) => p.status === "active").reduce((a, p) => a + p.documents.length, 0),
    totalUsages: DOC_PACKAGES.reduce((a, p) => a + p.usageCount, 0),
  }), []);

  return (
    <PageStack>
      <KpiGrid cols={4}>
        <Kpi label="Active packages" value={String(stats.active)} tone="up" />
        <Kpi label="Draft packages" value={String(stats.draft)} />
        <Kpi label="Docs in active packages" value={String(stats.totalDocs)} />
        <Kpi label="Total usages" value={String(stats.totalUsages)} tone="up" />
      </KpiGrid>

      <Card>
        <PageToolbar>
          <SearchInput
            placeholder="Search packages…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 min-w-[200px] max-w-sm"
          />
          <SegmentedControl
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as typeof statusFilter)}
            options={[
              { label: "All", value: "all" },
              { label: "Active", value: "active" },
              { label: "Draft", value: "draft" },
              { label: "Archived", value: "archived" },
            ]}
          />
          <ToolbarMeta count={filtered.length} label="packages" />
          <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-3.5" /> New package
          </Button>
        </PageToolbar>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
          {filtered.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-xl border border-border bg-surface hover:border-border-strong hover:shadow-sm transition-all duration-150 flex flex-col"
            >
              <div className="p-4 flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <IconChip icon={Package} size="sm" />
                  <Pill tone={STATUS_TONE[pkg.status]}>{pkg.status}</Pill>
                </div>
                <h4 className="font-semibold text-sm mb-1 mt-2">{pkg.name}</h4>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{pkg.description}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Pill tone={KIND_TONE[pkg.kind]}>{KIND_LABEL[pkg.kind]}</Pill>
                  <Pill tone="neutral">{pkg.targetGrade}</Pill>
                </div>
                <div className="space-y-1.5">
                  {pkg.documents.map((doc) => (
                    <div key={doc} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="size-3 shrink-0" />
                      <span>{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-4 py-3 border-t border-border/60 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {pkg.usageCount > 0 ? `Used ${pkg.usageCount}×` : "Not used yet"}
                  {pkg.lastUsed ? ` · ${pkg.lastUsed}` : ""}
                </div>
                <Button size="sm" variant="ghost" onClick={() => setDetail(pkg)}>
                  <Eye className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">No packages match your filters.</div>
        )}
      </Card>

      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Package ID</p>
                <p className="font-mono text-xs">{detail.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Kind</p>
                <Pill tone={KIND_TONE[detail.kind]}>{KIND_LABEL[detail.kind]}</Pill>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Pill tone={STATUS_TONE[detail.status]}>{detail.status}</Pill>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Target grade</p>
                <p>{detail.targetGrade}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p>{detail.description}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-2">Included documents</p>
                <ul className="space-y-1.5">
                  {detail.documents.map((doc) => (
                    <li key={doc} className="flex items-center gap-2 text-sm">
                      <FileText className="size-3.5 text-primary shrink-0" />
                      {doc}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-border">
              <Button size="sm" variant="ghost" onClick={() => setDetail(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {addOpen && (
        <Modal title="New package" onClose={() => setAddOpen(false)}>
          <div className="space-y-4">
            <Field label="Package name">
              <TextInput
                placeholder="e.g. Class X Exit Bundle"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </Field>
            <Field label="Description">
              <TextInput
                placeholder="Brief description of this package"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </Field>
            <p className="text-xs text-muted-foreground">Document selection and configuration will be available after creation.</p>
            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <Button size="sm" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                variant="primary"
                disabled={!newName.trim()}
                onClick={() => setAddOpen(false)}
              >
                Create package
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageStack>
  );
}
