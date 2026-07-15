import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Pill,
  SearchInput,
  KpiGrid,
  Kpi,
  PageStack,
  Modal,
  PageToolbar,
  ToolbarMeta,
} from "@lumenx/ui-admin";
import type { TemplateKind, TemplateRecord, TemplateSource } from "@/lib/template-management/types";
import {
  getAllTemplates,
  duplicateTemplate,
  toggleTemplateFavorite,
  archiveTemplate,
} from "@/lib/template-management/store";
import { categoryLabel, groupLabelForCategory } from "@/lib/template-management/categories";
import { IconChip } from "@/components/IconChip";
import { useTemplateStore } from "@/components/templates/useTemplateStore";
import { TemplatePreviewFrame } from "@/components/templates/TemplatePreviewFrame";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  LayoutGrid,
  List,
  Star,
  Copy,
  Eye,
  Archive,
  FileText,
  FileCheck,
  Award,
  CreditCard,
  BookOpen,
  ChevronRight,
  Download,
  Layers,
  Globe,
  Lock,
  Package,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type KindFilter = TemplateKind | "all";
type SourceFilter = TemplateSource | "all";
type SortKey = "popular" | "newest" | "az" | "favorites";

type LibraryProps = {
  kindFilter?: TemplateKind;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const KIND_CONFIG: Record<TemplateKind, {
  label: string;
  icon: typeof FileText;
  thumbBg: string;
  thumbAccent: string;
  thumbBorder: string;
  pillTone: "info" | "success" | "warning" | "neutral";
}> = {
  certificate: {
    label: "Certificate",
    icon: Award,
    thumbBg: "from-amber-950/50 to-amber-900/20",
    thumbAccent: "bg-amber-500/20",
    thumbBorder: "border-amber-500/25",
    pillTone: "warning",
  },
  report: {
    label: "Report",
    icon: BookOpen,
    thumbBg: "from-blue-950/50 to-blue-900/20",
    thumbAccent: "bg-blue-500/20",
    thumbBorder: "border-blue-500/25",
    pillTone: "info",
  },
  document: {
    label: "Document",
    icon: FileText,
    thumbBg: "from-slate-800/50 to-slate-700/20",
    thumbAccent: "bg-slate-500/20",
    thumbBorder: "border-slate-500/25",
    pillTone: "neutral",
  },
  id_card: {
    label: "ID Card",
    icon: CreditCard,
    thumbBg: "from-indigo-950/50 to-indigo-900/20",
    thumbAccent: "bg-indigo-500/20",
    thumbBorder: "border-indigo-500/25",
    pillTone: "info",
  },
};

const SOURCE_CONFIG: Record<TemplateSource, {
  label: string;
  icon: typeof Globe;
}> = {
  system: { label: "System", icon: Lock },
  imported: { label: "Imported", icon: Download },
  custom: { label: "Custom", icon: Package },
};

// ─── Mini thumbnail ───────────────────────────────────────────────────────────

function TemplateThumbnail({ template }: { template: TemplateRecord }) {
  const cfg = KIND_CONFIG[template.kind];
  const src = SOURCE_CONFIG[template.source];
  const SrcIcon = src.icon;

  if (template.kind === "id_card") {
    return (
      <div className={`relative w-full aspect-[5/3] rounded-lg bg-gradient-to-br ${cfg.thumbBg} border ${cfg.thumbBorder} overflow-hidden flex items-center justify-center`}>
        <div className="w-[55%] aspect-[1.586/1] rounded-md border border-indigo-500/30 bg-indigo-900/30 p-2 flex flex-col justify-between">
          <div className="flex items-start gap-1.5">
            <div className="size-5 rounded bg-indigo-500/30" />
            <div className="flex flex-col gap-0.5 flex-1">
              <div className="h-1.5 bg-indigo-300/30 rounded w-3/4" />
              <div className="h-1 bg-indigo-300/20 rounded w-1/2" />
            </div>
          </div>
          <div className="flex gap-1 items-end justify-between mt-1">
            <div className="flex flex-col gap-0.5">
              <div className="h-1 bg-indigo-300/20 rounded w-8" />
              <div className="h-1 bg-indigo-300/20 rounded w-6" />
            </div>
            <div className="size-4 bg-indigo-300/15 rounded-sm border border-indigo-300/20 text-[6px] grid place-items-center text-indigo-300/40">QR</div>
          </div>
        </div>
        <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-primary/90 text-primary-foreground">
          <SrcIcon className="size-2" strokeWidth={2.5} />{src.label}
        </span>
        {template.favorite && (
          <span className="absolute top-1.5 left-1.5 size-5 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Star className="size-2.5 text-amber-400 fill-amber-400" />
          </span>
        )}
      </div>
    );
  }

  if (template.kind === "report") {
    return (
      <div className={`relative w-full aspect-[4/3] rounded-lg bg-gradient-to-br ${cfg.thumbBg} border ${cfg.thumbBorder} overflow-hidden p-3`}>
        <div className="h-2 bg-blue-400/30 rounded mb-1.5 w-2/3" />
        <div className="h-1 bg-blue-400/15 rounded mb-2 w-1/2" />
        <div className="space-y-1">
          {[100, 80, 90, 70].map((w, i) => (
            <div key={i} className="flex gap-1 items-center">
              <div className="h-1.5 bg-blue-400/20 rounded" style={{ width: `${w * 0.4}%` }} />
              <div className="h-1.5 bg-blue-400/15 rounded w-6" />
              <div className="h-1.5 bg-blue-400/10 rounded w-4" />
            </div>
          ))}
        </div>
        <div className="absolute bottom-3 right-3 h-0.5 w-12 bg-blue-400/20 rounded" />
        <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-primary/90 text-primary-foreground">
          <SrcIcon className="size-2" strokeWidth={2.5} />{src.label}
        </span>
        {template.favorite && (
          <span className="absolute bottom-1.5 right-1.5 size-5 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Star className="size-2.5 text-amber-400 fill-amber-400" />
          </span>
        )}
      </div>
    );
  }

  if (template.kind === "document") {
    return (
      <div className={`relative w-full aspect-[4/3] rounded-lg bg-gradient-to-br ${cfg.thumbBg} border ${cfg.thumbBorder} overflow-hidden p-3`}>
        <div className="flex items-center gap-1.5 mb-2">
          <div className="size-5 rounded bg-slate-500/20" />
          <div className="h-1.5 bg-slate-400/30 rounded w-1/2" />
        </div>
        <div className="h-2 bg-slate-400/20 rounded mb-1.5 w-3/4 mx-auto" />
        <div className="space-y-1.5 mt-2">
          {[100, 80, 100, 60, 80, 40].map((w, i) => (
            <div key={i} className="h-1 bg-slate-400/15 rounded" style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex justify-between">
          <div className="h-0.5 w-10 bg-slate-400/20 rounded" />
          <div className="h-0.5 w-10 bg-slate-400/20 rounded" />
        </div>
        <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-primary/90 text-primary-foreground">
          <SrcIcon className="size-2" strokeWidth={2.5} />{src.label}
        </span>
        {template.favorite && (
          <span className="absolute top-1.5 left-1.5 size-5 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Star className="size-2.5 text-amber-400 fill-amber-400" />
          </span>
        )}
      </div>
    );
  }

  // Certificate (default)
  return (
    <div className={`relative w-full aspect-[4/3] rounded-lg bg-gradient-to-br ${cfg.thumbBg} border ${cfg.thumbBorder} overflow-hidden`}>
      <div className="absolute inset-2 border border-dashed border-amber-500/15 rounded" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-4">
        <div className="size-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-0.5">
          <Award className="size-3.5 text-amber-400/70" />
        </div>
        <div className="h-1.5 bg-amber-400/30 rounded w-16" />
        <div className="h-1 bg-amber-400/20 rounded w-10" />
        <div className="space-y-0.5 mt-1 w-full px-4">
          {[100, 80, 100, 80].map((w, i) => (
            <div key={i} className="h-0.5 bg-amber-400/15 rounded mx-auto" style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="flex gap-6 mt-2">
          <div className="h-0.5 w-8 bg-amber-400/20 rounded" />
          <div className="h-0.5 w-8 bg-amber-400/20 rounded" />
        </div>
      </div>
      <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-primary/90 text-primary-foreground">
        <SrcIcon className="size-2" strokeWidth={2.5} />{src.label}
      </span>
      {template.favorite && (
        <span className="absolute top-1.5 left-1.5 size-5 rounded-full bg-amber-500/20 flex items-center justify-center">
          <Star className="size-2.5 text-amber-400 fill-amber-400" />
        </span>
      )}
    </div>
  );
}

// ─── Template card (grid) ─────────────────────────────────────────────────────

function TemplateCard({
  template: t,
  onPreview,
  onDuplicate,
  onFavorite,
  onArchive,
}: {
  template: TemplateRecord;
  onPreview: () => void;
  onDuplicate: () => void;
  onFavorite: () => void;
  onArchive: () => void;
}) {
  const cfg = KIND_CONFIG[t.kind];
  const KindIcon = cfg.icon;

  return (
    <div className="group rounded-xl border border-border bg-surface hover:border-primary/40 hover:shadow-elevated transition-all duration-200 overflow-hidden flex flex-col">
      {/* Thumbnail */}
      <div className="p-3 pb-0">
        <TemplateThumbnail template={t} />
      </div>

      {/* Body */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">{t.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {groupLabelForCategory(t.categoryId)} · {categoryLabel(t.categoryId)}
            </p>
          </div>
          <button
            type="button"
            onClick={onFavorite}
            aria-label="Toggle favourite"
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Star className={`size-3.5 ${t.favorite ? "text-amber-400 fill-amber-400 opacity-100" : "text-muted-foreground"}`} />
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground line-clamp-2 flex-1">
          {t.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          <Pill tone={cfg.pillTone}>
            <KindIcon className="size-2.5 mr-0.5" />
            {cfg.label}
          </Pill>
          {t.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground font-medium">
              {tag}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1 border-t border-border/60">
          <span>Used {t.usageCount.toLocaleString()}×</span>
          <span>v{t.version}</span>
          <span className="ml-auto">{t.updatedAt}</span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-1.5">
          <Link to="/templates" search={{ view: "generate", templateId: t.id }}>
            <Button size="sm" variant="primary" className="gap-1">
              <FileCheck className="size-3" /> Issue
            </Button>
          </Link>
          <Button size="sm" onClick={onPreview}>
            <Eye className="size-3" /> Preview
          </Button>
          <Button size="sm" onClick={onDuplicate}>
            <Copy className="size-3" /> Duplicate
          </Button>
          {t.source === "custom" && (
            <Button size="sm" variant="ghost" onClick={onArchive} className="text-destructive hover:text-destructive">
              <Archive className="size-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── List row ─────────────────────────────────────────────────────────────────

function TemplateListRow({
  template: t,
  onPreview,
  onDuplicate,
  onFavorite,
  onArchive,
}: {
  template: TemplateRecord;
  onPreview: () => void;
  onDuplicate: () => void;
  onFavorite: () => void;
  onArchive: () => void;
}) {
  const cfg = KIND_CONFIG[t.kind];
  const srcCfg = SOURCE_CONFIG[t.source];
  const SrcIcon = srcCfg.icon;
  const KindIcon = cfg.icon;

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 sm:px-5 py-3 hover:bg-surface-hover/60 transition-colors border-b border-border/40 last:border-0">
      {/* Kind icon */}
      <IconChip icon={KindIcon} size="sm" variant="soft" />

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold truncate">{t.name}</span>
          {t.favorite && <Star className="size-3 text-amber-400 fill-amber-400 shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground">
          {groupLabelForCategory(t.categoryId)} · {categoryLabel(t.categoryId)} · Used {t.usageCount.toLocaleString()}× · v{t.version} · {t.updatedAt}
        </p>
      </div>

      {/* Kind + source */}
      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        <Pill tone={cfg.pillTone}>{cfg.label}</Pill>
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-primary/10 text-foreground">
          <IconChip icon={SrcIcon} size="xs" variant="soft" />
          {srcCfg.label}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button size="sm" onClick={onPreview}>
          <Eye className="size-3" /> Preview
        </Button>
        <Button size="sm" onClick={onDuplicate}>
          <Copy className="size-3" />
        </Button>
        <button
          type="button"
          onClick={onFavorite}
          aria-label="Toggle favourite"
          className="size-8 rounded flex items-center justify-center hover:bg-surface-hover text-muted-foreground"
        >
          <Star className={`size-3.5 ${t.favorite ? "text-amber-400 fill-amber-400" : ""}`} />
        </button>
        {t.source === "custom" && (
          <button
            type="button"
            onClick={onArchive}
            aria-label="Archive"
            className="size-8 rounded flex items-center justify-center hover:bg-surface-hover text-muted-foreground hover:text-destructive"
          >
            <Archive className="size-3.5" />
          </button>
        )}
        <Link to="/templates" search={{ view: "generate", templateId: t.id }}>
          <Button size="sm" variant="primary">
            <FileCheck className="size-3" /> Issue
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Section group ────────────────────────────────────────────────────────────

function SectionGroup({
  kind,
  templates,
  layout,
  onPreview,
  onDuplicate,
  onFavorite,
  onArchive,
}: {
  kind: TemplateKind;
  templates: TemplateRecord[];
  layout: "grid" | "list";
  onPreview: (t: TemplateRecord) => void;
  onDuplicate: (t: TemplateRecord) => void;
  onFavorite: (id: string) => void;
  onArchive: (t: TemplateRecord) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const cfg = KIND_CONFIG[kind];
  const KindIcon = cfg.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-border/40 hover:bg-surface-hover/30 transition-colors"
      >
        <div className={`size-7 rounded-md ${cfg.thumbAccent} flex items-center justify-center shrink-0`}>
          <KindIcon className="size-4 text-muted-foreground" />
        </div>
        <span className="font-semibold text-sm flex-1 text-left">
          {cfg.label}s
          <span className="text-muted-foreground font-normal ml-2">({templates.length})</span>
        </span>
        <ChevronRight className={`size-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>

      {expanded && (
        layout === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4 sm:p-5">
            {templates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onPreview={() => onPreview(t)}
                onDuplicate={() => onDuplicate(t)}
                onFavorite={() => onFavorite(t.id)}
                onArchive={() => onArchive(t)}
              />
            ))}
          </div>
        ) : (
          <div>
            {templates.map((t) => (
              <TemplateListRow
                key={t.id}
                template={t}
                onPreview={() => onPreview(t)}
                onDuplicate={() => onDuplicate(t)}
                onFavorite={() => onFavorite(t.id)}
                onArchive={() => onArchive(t)}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ─── Archive confirm ──────────────────────────────────────────────────────────

function ArchiveConfirm({
  template,
  onConfirm,
  onCancel,
}: {
  template: TemplateRecord;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open
      onClose={onCancel}
      title="Archive template?"
      subtitle={template.name}
      size="sm"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>
            <Archive className="size-3.5" /> Archive
          </Button>
        </div>
      }
    >
      <p className="text-sm text-muted-foreground">
        This will archive <strong>{template.name}</strong>. Archived templates won't appear in the library but can be restored from Settings.
      </p>
    </Modal>
  );
}

// ─── Preview modal ────────────────────────────────────────────────────────────

function PreviewModal({
  template,
  onClose,
  onDuplicate,
}: {
  template: TemplateRecord;
  onClose: () => void;
  onDuplicate: () => void;
}) {
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile" | "print">("desktop");
  const cfg = KIND_CONFIG[template.kind];
  const srcCfg = SOURCE_CONFIG[template.source];
  const SrcIcon = srcCfg.icon;

  return (
    <Modal
      open
      onClose={onClose}
      title={template.name}
      subtitle={`${cfg.label} · ${categoryLabel(template.categoryId)}`}
      size="xl"
      footer={
        <div className="flex flex-wrap items-center gap-2 w-full">
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold bg-primary/10 text-foreground">
            <IconChip icon={SrcIcon} size="xs" variant="soft" />
            {srcCfg.label}
          </span>
          <span className="text-xs text-muted-foreground">Used {template.usageCount.toLocaleString()}× · v{template.version} · Updated {template.updatedAt}</span>
          <div className="flex-1" />
          <Button onClick={onDuplicate}>
            <Copy className="size-3.5" /> Duplicate & customize
          </Button>
          <Link to="/templates" search={{ view: "builder", templateId: template.id }}>
            <Button>
              <Layers className="size-3.5" /> Open in builder
            </Button>
          </Link>
          <Link to="/templates" search={{ view: "generate", templateId: template.id }}>
            <Button variant="primary">
              <FileCheck className="size-3.5" /> Issue to students
            </Button>
          </Link>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Preview frame */}
        <div className="lg:col-span-3">
          <TemplatePreviewFrame
            template={template}
            device={device}
            showDeviceToggle
            onDeviceChange={setDevice}
          />
        </div>

        {/* Meta panel */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Description</p>
            <p className="text-sm leading-relaxed">{template.description}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">Details</p>
            <div className="space-y-2 text-sm">
              {[
                { label: "Kind", value: cfg.label },
                { label: "Category", value: categoryLabel(template.categoryId) },
                { label: "Source", value: srcCfg.label },
                { label: "Version", value: `v${template.version}` },
                { label: "Usage count", value: template.usageCount.toLocaleString() },
                { label: "Last updated", value: template.updatedAt },
                { label: "Created", value: template.createdAt },
              ].map((item) => (
                <div key={item.label} className="flex items-baseline justify-between gap-2">
                  <span className="text-muted-foreground text-xs">{item.label}</span>
                  <span className="font-medium text-xs">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">Tags</p>
            <div className="flex flex-wrap gap-1">
              {template.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-full bg-muted text-[11px] text-muted-foreground font-medium border border-border">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">Blocks ({template.blocks.length})</p>
            <div className="space-y-1">
              {template.blocks.map((block) => (
                <div key={block.id} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-primary/40 shrink-0" />
                  <span className="text-muted-foreground capitalize">{block.type}</span>
                  <span className="truncate text-foreground/70">{block.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function TemplateLibraryView({ kindFilter: routeKindFilter }: LibraryProps) {
  const revision = useTemplateStore();
  const notify = useAdminToast();

  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>(routeKindFilter ?? "all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [sort, setSort] = useState<SortKey>("popular");
  const [preview, setPreview] = useState<TemplateRecord | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<TemplateRecord | null>(null);

  const allTemplates = useMemo(() => getAllTemplates().filter((t) => t.status !== "archived"), [revision]);

  const kpiCounts = useMemo(() => ({
    total: allTemplates.length,
    certificates: allTemplates.filter((t) => t.kind === "certificate").length,
    reports: allTemplates.filter((t) => t.kind === "report").length,
    documents: allTemplates.filter((t) => t.kind === "document").length,
    id_cards: allTemplates.filter((t) => t.kind === "id_card").length,
    system: allTemplates.filter((t) => t.source === "system").length,
    imported: allTemplates.filter((t) => t.source === "imported").length,
    custom: allTemplates.filter((t) => t.source === "custom").length,
    favorites: allTemplates.filter((t) => t.favorite).length,
  }), [allTemplates]);

  const filtered = useMemo(() => {
    let list = allTemplates;

    if (routeKindFilter) list = list.filter((t) => t.kind === routeKindFilter);
    else if (kindFilter !== "all") list = list.filter((t) => t.kind === kindFilter);

    if (sourceFilter !== "all") list = list.filter((t) => t.source === sourceFilter);

    if (q.trim()) {
      const lq = q.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(lq) ||
          t.description.toLowerCase().includes(lq) ||
          t.tags.some((tag) => tag.toLowerCase().includes(lq)) ||
          categoryLabel(t.categoryId).toLowerCase().includes(lq),
      );
    }

    return [...list].sort((a, b) => {
      if (sort === "popular") return b.usageCount - a.usageCount;
      if (sort === "newest") return b.updatedAt.localeCompare(a.updatedAt);
      if (sort === "az") return a.name.localeCompare(b.name);
      if (sort === "favorites") return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
      return 0;
    });
  }, [allTemplates, routeKindFilter, kindFilter, sourceFilter, q, sort]);

  const handleDuplicate = (t: TemplateRecord) => {
    const copy = duplicateTemplate(t);
    notify(`Duplicated as "${copy.name}"`);
  };

  const handleArchive = (t: TemplateRecord) => {
    if (t.source !== "custom") return;
    setArchiveTarget(t);
  };

  const confirmArchive = () => {
    if (!archiveTarget) return;
    archiveTemplate(archiveTarget.id);
    notify(`Archived "${archiveTarget.name}"`);
    setArchiveTarget(null);
  };

  // Group by kind when showing all
  const showGroups = (routeKindFilter == null) && kindFilter === "all" && !q && sourceFilter === "all";
  const kindOrder: TemplateKind[] = ["certificate", "report", "document", "id_card"];

  const groupedFiltered = useMemo(() => {
    if (!showGroups) return {} as Record<TemplateKind, TemplateRecord[]>;
    const out: Record<TemplateKind, TemplateRecord[]> = { certificate: [], report: [], document: [], id_card: [] };
    for (const t of filtered) out[t.kind].push(t);
    return out;
  }, [filtered, showGroups]);

  return (
    <>
      <PageStack>
        {/* KPIs */}
        {!routeKindFilter && (
          <KpiGrid cols={5}>
            <Kpi label="Total templates" value={String(kpiCounts.total)} tone="neutral" />
            <Kpi label="Certificates" value={String(kpiCounts.certificates)} tone="neutral" delta={`${kpiCounts.system} system`} />
            <Kpi label="Reports" value={String(kpiCounts.reports)} tone="neutral" />
            <Kpi label="Documents" value={String(kpiCounts.documents)} tone="neutral" />
            <Kpi label="ID Cards" value={String(kpiCounts.id_cards)} tone="neutral" />
          </KpiGrid>
        )}

        {/* Source summary strip */}
        {!routeKindFilter && (
          <div className="flex flex-wrap gap-3">
            {(["system", "imported", "custom"] as TemplateSource[]).map((src) => {
              const cfg = SOURCE_CONFIG[src];
              const SrcIcon = cfg.icon;
              const count = kpiCounts[src];
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => setSourceFilter(sourceFilter === src ? "all" : src)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    sourceFilter === src
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-surface hover:bg-surface-hover text-muted-foreground"
                  }`}
                >
                  <IconChip icon={SrcIcon} size="xs" variant="soft" active={sourceFilter === src} />
                  <span className="capitalize">{src}</span>
                  <span className={`ml-0.5 text-xs font-mono ${sourceFilter === src ? "" : "opacity-60"}`}>({count})</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setSourceFilter("all")}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                sourceFilter === "all"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-surface hover:bg-surface-hover text-muted-foreground"
              }`}
            >
              <Layers className="size-3.5" /> All sources
              <span className="ml-0.5 text-xs font-mono opacity-60">({kpiCounts.total})</span>
            </button>
          </div>
        )}

        <Card>
          <PageToolbar>
            <SearchInput
              placeholder="Search templates, tags, categories…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="flex-1 min-w-[200px] max-w-sm"
            />

            {/* Kind tabs */}
            {!routeKindFilter && (
              <div className="flex gap-1 p-1 bg-background rounded-md border border-border flex-wrap">
                {([
                  { v: "all", label: "All" },
                  { v: "certificate", label: `Certificates (${kpiCounts.certificates})` },
                  { v: "report", label: `Reports (${kpiCounts.reports})` },
                  { v: "document", label: `Documents (${kpiCounts.documents})` },
                  { v: "id_card", label: `ID Cards (${kpiCounts.id_cards})` },
                ] as { v: KindFilter; label: string }[]).map(({ v, label }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setKindFilter(v)}
                    className={`px-3 h-8 shrink-0 rounded text-[11px] font-medium tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap ${
                      kindFilter === v
                        ? "bg-surface text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface-hover/80"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-9 px-2.5 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none focus:border-primary/60"
            >
              <option value="popular">Most popular</option>
              <option value="newest">Most recent</option>
              <option value="az">A → Z</option>
              <option value="favorites">Favorites first</option>
            </select>

            {/* Grid/List toggle */}
            <div className="flex gap-1 p-1 bg-background rounded-md border border-border">
              <button
                type="button"
                onClick={() => setLayout("grid")}
                className={`size-8 rounded flex items-center justify-center transition-colors ${layout === "grid" ? "bg-surface text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                aria-label="Grid view"
              >
                <LayoutGrid className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setLayout("list")}
                className={`size-8 rounded flex items-center justify-center transition-colors ${layout === "list" ? "bg-surface text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                aria-label="List view"
              >
                <List className="size-3.5" />
              </button>
            </div>

            <ToolbarMeta>{filtered.length} template{filtered.length !== 1 ? "s" : ""}</ToolbarMeta>
          </PageToolbar>

          <CardBody noPadding>
            {filtered.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <FileText className="size-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-foreground">No templates found</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Try adjusting filters, or{" "}
                  <Link to="/templates" search={{ view: "imports" }} className="text-primary hover:underline">
                    import a custom template
                  </Link>
                  .
                </p>
              </div>
            ) : showGroups ? (
              /* Grouped by kind */
              <div>
                {kindOrder
                  .filter((k) => groupedFiltered[k].length > 0)
                  .map((k) => (
                    <SectionGroup
                      key={k}
                      kind={k}
                      templates={groupedFiltered[k]}
                      layout={layout}
                      onPreview={setPreview}
                      onDuplicate={handleDuplicate}
                      onFavorite={toggleTemplateFavorite}
                      onArchive={handleArchive}
                    />
                  ))}
              </div>
            ) : layout === "grid" ? (
              /* Flat grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4 sm:p-5">
                {filtered.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    onPreview={() => setPreview(t)}
                    onDuplicate={() => handleDuplicate(t)}
                    onFavorite={() => toggleTemplateFavorite(t.id)}
                    onArchive={() => handleArchive(t)}
                  />
                ))}
              </div>
            ) : (
              /* Flat list */
              <div>
                {filtered.map((t) => (
                  <TemplateListRow
                    key={t.id}
                    template={t}
                    onPreview={() => setPreview(t)}
                    onDuplicate={() => handleDuplicate(t)}
                    onFavorite={() => toggleTemplateFavorite(t.id)}
                    onArchive={() => handleArchive(t)}
                  />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </PageStack>

      {/* Preview modal */}
      {preview && (
        <PreviewModal
          template={preview}
          onClose={() => setPreview(null)}
          onDuplicate={() => { handleDuplicate(preview); setPreview(null); }}
        />
      )}

      {/* Archive confirm */}
      {archiveTarget && (
        <ArchiveConfirm
          template={archiveTarget}
          onConfirm={confirmArchive}
          onCancel={() => setArchiveTarget(null)}
        />
      )}
    </>
  );
}
