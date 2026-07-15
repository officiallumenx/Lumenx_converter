import { useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Pill,
  Button,
  KpiGrid,
  Kpi,
  PageStack,
  Modal,
  Field,
  TextInput,
  DataTable,
  Th,
  Td,
  Tr,
} from "@lumenx/ui-admin";
import {
  DOC_CATEGORY_GROUPS,
  type DocCategoryGroup,
  type DocCategoryItem,
  type DocCategoryKind,
} from "@/lib/documents-records-data";
import {
  Plus,
  ChevronLeft,
  FileBarChart,
  IdCard,
  Award,
  Trophy,
  Sparkles,
  CreditCard,
  FileText,
  Clock,
  TrendingUp,
  AlertCircle,
  Users,
  LayoutGrid,
  List,
} from "lucide-react";

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, typeof FileText> = {
  FileBarChart,
  IdCard,
  Award,
  Trophy,
  Sparkles,
  CreditCard,
  FileText,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function groupStats(g: DocCategoryGroup) {
  return {
    itemCount: g.items.length,
    templateCount: g.items.reduce((a, i) => a + i.templateCount, 0),
    issuedCount: g.items.reduce((a, i) => a + i.issuedCount, 0),
    pendingCount: g.items.reduce((a, i) => a + i.pendingRequests, 0),
  };
}

const AUDIENCE_LABEL: Record<DocCategoryItem["targetAudience"], string> = {
  student: "Students",
  staff: "Staff",
  both: "All",
};

// ─── Category card (grid view) ────────────────────────────────────────────────
function CategoryCard({
  group,
  onSelect,
}: {
  group: DocCategoryGroup;
  onSelect: (g: DocCategoryGroup) => void;
}) {
  const stats = groupStats(group);
  const Icon = ICON_MAP[group.iconKey] ?? FileText;

  return (
    <button
      type="button"
      onClick={() => onSelect(group)}
      className="w-full text-left rounded-2xl border border-border bg-surface hover:border-border-strong hover:shadow-md transition-all duration-200 active:scale-[0.98] flex flex-col"
    >
      <div className="p-5 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div
            className="size-12 rounded-xl grid place-items-center shrink-0"
            style={{ backgroundColor: `${group.color}18` }}
          >
            <Icon className="size-6" style={{ color: group.color }} />
          </div>
          {stats.pendingCount > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ backgroundColor: `${group.color}15`, color: group.color }}
            >
              <AlertCircle className="size-3" />
              {stats.pendingCount} pending
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm mb-1">{group.name}</h3>
        <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{group.description}</p>

        {/* Sub-item chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {group.items.slice(0, 4).map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium border"
              style={{ borderColor: `${group.color}30`, color: group.color, backgroundColor: `${group.color}08` }}
            >
              {item.name}
            </span>
          ))}
          {group.items.length > 4 && (
            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium border border-border text-muted-foreground">
              +{group.items.length - 4} more
            </span>
          )}
        </div>
      </div>

      {/* Footer stats */}
      <div className="border-t border-border/60 px-5 py-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-sm font-bold" style={{ color: group.color }}>{stats.itemCount}</p>
          <p className="text-[10px] text-muted-foreground">types</p>
        </div>
        <div>
          <p className="text-sm font-bold">{stats.templateCount}</p>
          <p className="text-[10px] text-muted-foreground">templates</p>
        </div>
        <div>
          <p className="text-sm font-bold">{stats.issuedCount.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">issued</p>
        </div>
      </div>
    </button>
  );
}

// ─── Category detail (drill-down) ─────────────────────────────────────────────
function CategoryDetail({
  group,
  onBack,
}: {
  group: DocCategoryGroup;
  onBack: () => void;
}) {
  const [selectedItem, setSelectedItem] = useState<DocCategoryItem | null>(null);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const stats = groupStats(group);
  const Icon = ICON_MAP[group.iconKey] ?? FileText;

  return (
    <PageStack>
      {/* Back + header */}
      <div className="flex items-start gap-3">
        <Button size="sm" variant="ghost" onClick={onBack} className="mt-0.5">
          <ChevronLeft className="size-4" /> Back
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div
            className="size-14 rounded-2xl grid place-items-center shrink-0"
            style={{ backgroundColor: `${group.color}18` }}
          >
            <Icon className="size-7" style={{ color: group.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <h2 className="font-display font-semibold text-lg">{group.name}</h2>
              {group.isSystem && <Pill tone="neutral">System</Pill>}
            </div>
            <p className="text-sm text-muted-foreground">{group.description}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Document types", value: String(stats.itemCount), icon: FileText },
            { label: "Templates", value: String(stats.templateCount), icon: FileText },
            { label: "Total issued", value: stats.issuedCount.toLocaleString(), icon: TrendingUp },
            { label: "Pending requests", value: String(stats.pendingCount), icon: Clock },
          ].map(({ label, value, icon: Ic }) => (
            <div key={label} className="rounded-xl border border-border/60 bg-background p-3">
              <p className="text-xl font-bold" style={label === "Pending requests" && stats.pendingCount > 0 ? { color: "#f59e0b" } : { color: group.color }}>
                {value}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Item list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">
            Document types
            <span className="ml-2 text-xs font-normal text-muted-foreground">({group.items.length})</span>
          </h3>
          <div className="flex gap-1 p-1 rounded-lg border border-border bg-background">
            <button
              type="button"
              onClick={() => setLayout("grid")}
              className={`p-1.5 rounded-md transition-colors ${layout === "grid" ? "bg-surface shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setLayout("list")}
              className={`p-1.5 rounded-md transition-colors ${layout === "list" ? "bg-surface shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="size-3.5" />
            </button>
          </div>
        </div>

        {layout === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItem(item)}
                className="text-left rounded-xl border border-border bg-surface hover:border-border-strong hover:shadow-sm transition-all duration-150 active:scale-[0.98] p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-sm">{item.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                  </div>
                  {item.pendingRequests > 0 && (
                    <Pill tone="warning">{item.pendingRequests}</Pill>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-background border border-border/60 py-2">
                    <p className="text-sm font-bold">{item.templateCount}</p>
                    <p className="text-[10px] text-muted-foreground">templates</p>
                  </div>
                  <div className="rounded-lg bg-background border border-border/60 py-2">
                    <p className="text-sm font-bold">{item.issuedCount.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">issued</p>
                  </div>
                  <div className="rounded-lg bg-background border border-border/60 py-2">
                    <p className="text-sm font-bold">{item.avgProcessingDays === 0 ? "—" : `${item.avgProcessingDays}d`}</p>
                    <p className="text-[10px] text-muted-foreground">avg days</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/60">
                  <Pill tone="neutral">{AUDIENCE_LABEL[item.targetAudience]}</Pill>
                  <span className="text-[10px] text-muted-foreground">
                    {item.lastIssuedOn ? `Last: ${item.lastIssuedOn}` : "Never issued"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <Card>
            <DataTable
              empty={group.items.length === 0}
              emptyMessage="No document types in this category"
              head={
                <tr>
                  <Th>Name</Th>
                  <Th>Description</Th>
                  <Th>Audience</Th>
                  <Th>Templates</Th>
                  <Th>Issued</Th>
                  <Th>Pending</Th>
                  <Th>Avg days</Th>
                  <Th>Last issued</Th>
                  <Th />
                </tr>
              }
            >
              {group.items.map((item) => (
                <Tr key={item.id}>
                  <Td className="font-medium">{item.name}</Td>
                  <Td className="text-xs text-muted-foreground max-w-[200px] truncate">{item.description}</Td>
                  <Td><Pill tone="neutral">{AUDIENCE_LABEL[item.targetAudience]}</Pill></Td>
                  <Td>{item.templateCount}</Td>
                  <Td>{item.issuedCount.toLocaleString()}</Td>
                  <Td>
                    {item.pendingRequests > 0
                      ? <Pill tone="warning">{item.pendingRequests}</Pill>
                      : <span className="text-xs text-muted-foreground">—</span>
                    }
                  </Td>
                  <Td className="text-sm text-muted-foreground">{item.avgProcessingDays === 0 ? "Instant" : `${item.avgProcessingDays}d`}</Td>
                  <Td className="text-xs text-muted-foreground">{item.lastIssuedOn ?? "Never"}</Td>
                  <Td>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedItem(item)}>
                      Details
                    </Button>
                  </Td>
                </Tr>
              ))}
            </DataTable>
          </Card>
        )}
      </div>

      {/* Item detail modal */}
      {selectedItem && (
        <CategoryItemModal
          item={selectedItem}
          group={group}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </PageStack>
  );
}

// ─── Item detail modal ────────────────────────────────────────────────────────
function CategoryItemModal({
  item,
  group,
  onClose,
}: {
  item: DocCategoryItem;
  group: DocCategoryGroup;
  onClose: () => void;
}) {
  return (
    <Modal title={item.name} onClose={onClose}>
      <div className="space-y-5">
        {/* Meta */}
        <p className="text-sm text-muted-foreground">{item.description}</p>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Templates", value: String(item.templateCount) },
            { label: "Total issued", value: item.issuedCount.toLocaleString() },
            { label: "Pending", value: String(item.pendingRequests) },
            { label: "Avg processing", value: item.avgProcessingDays === 0 ? "Instant" : `${item.avgProcessingDays} day${item.avgProcessingDays !== 1 ? "s" : ""}` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-background p-3 text-center">
              <p className="text-lg font-bold" style={{ color: group.color }}>{value}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Pills */}
        <div className="flex flex-wrap gap-2">
          <Pill tone="neutral">
            <Users className="size-3 mr-1" />
            {AUDIENCE_LABEL[item.targetAudience]}
          </Pill>
          {item.lastIssuedOn && (
            <Pill tone="neutral">
              <Clock className="size-3 mr-1" />
              Last issued {item.lastIssuedOn}
            </Pill>
          )}
        </div>

        {/* Recent issuances */}
        {item.recentIssuances.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Recent issuances
            </h4>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Doc No.</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Class</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Issued on</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {item.recentIssuances.map((r, i) => (
                    <tr key={i} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.docNo}</td>
                      <td className="px-3 py-2 font-medium">{r.student}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.class}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.issuedOn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {item.recentIssuances.length === 0 && (
          <div className="rounded-xl border border-dashed border-border py-8 text-center">
            <p className="text-sm text-muted-foreground">No documents issued yet in this category</p>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-border">
          <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────
export function DocCategoriesView() {
  const [groups, setGroups] = useState(DOC_CATEGORY_GROUPS);
  const [selected, setSelected] = useState<DocCategoryGroup | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const totalItems = groups.reduce((a, g) => a + g.items.length, 0);
  const totalTemplates = groups.reduce((a, g) => a + g.items.reduce((b, i) => b + i.templateCount, 0), 0);
  const totalIssued = groups.reduce((a, g) => a + g.items.reduce((b, i) => b + i.issuedCount, 0), 0);
  const totalPending = groups.reduce((a, g) => a + g.items.reduce((b, i) => b + i.pendingRequests, 0), 0);

  // Detail screen
  if (selected) {
    return (
      <CategoryDetail
        group={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  // Grid screen
  return (
    <PageStack>
      <KpiGrid cols={4}>
        <Kpi label="Categories" value={String(groups.length)} />
        <Kpi label="Document types" value={String(totalItems)} />
        <Kpi label="Total templates" value={String(totalTemplates)} />
        <Kpi label="Total issued" value={totalIssued.toLocaleString()} tone="up" />
      </KpiGrid>

      {totalPending > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 flex items-center gap-3">
          <AlertCircle className="size-4 text-warning shrink-0" />
          <p className="text-sm">
            <span className="font-medium">{totalPending} pending requests</span>
            {" "}across categories — click a category to review.
          </p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            All categories
          </h3>
          <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-3.5" /> New category
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map((g) => (
            <CategoryCard key={g.id} group={g} onSelect={setSelected} />
          ))}
        </div>
      </div>

      {addOpen && (
        <Modal title="New category" onClose={() => setAddOpen(false)}>
          <div className="space-y-4">
            <Field label="Category name">
              <TextInput
                placeholder="e.g. Co-Curricular Activities"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </Field>
            <Field label="Description">
              <TextInput
                placeholder="Short description of this category"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              Document types can be added after the category is created.
            </p>
            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <Button size="sm" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                variant="primary"
                disabled={!newName.trim()}
                onClick={() => {
                  setGroups((prev) => [
                    ...prev,
                    {
                      id: `cat-custom-${Date.now()}`,
                      name: newName.trim(),
                      description: newDesc.trim() || "Custom category",
                      color: "#8b5cf6",
                      accentColor: "bg-violet-500/10 text-violet-600",
                      iconKey: "FileText",
                      isSystem: false,
                      createdOn: new Date().toISOString().split("T")[0],
                      items: [],
                    },
                  ]);
                  setNewName("");
                  setNewDesc("");
                  setAddOpen(false);
                }}
              >
                Create category
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageStack>
  );
}
