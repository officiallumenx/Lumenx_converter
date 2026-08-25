import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Button,
  Card,
  CardHeader,
  Kpi,
  PageToolbar,
  Pill,
  SearchInput,
  Select,
  ToolbarGroup,
  ToolbarMeta,
  ToolbarSpacer,
} from "@lumenx/ui-admin";
import { Archive, LayoutTemplate, LifeBuoy, MessageSquare, Send } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { createSupportThread } from "@/lib/support-center-store";
import { listPlatformInstitutes } from "@/lib/institute-directory-store";
import {
  TEMPLATE_CATEGORIES,
  archiveCatalogTemplate,
  catalogStats,
  draftCatalogTemplate,
  formatTemplateDate,
  labelAudience,
  labelCategory,
  labelStatus,
  listCatalogTemplates,
  publishCatalogTemplate,
  statusTone,
  templateChangeRequestDraft,
  type CatalogTemplateStatus,
  type NotificationTemplateCategory,
  type PlatformNotificationTemplate,
} from "@/lib/notification-template-catalog-store";

export const Route = createFileRoute("/notification-templates")({
  head: () => ({ meta: [{ title: "Notification Templates — LumenX Nexus" }] }),
  component: NotificationTemplateCatalogPage,
});

type CategoryFilter = "all" | NotificationTemplateCategory;
type StatusFilter = "all" | CatalogTemplateStatus;

function NotificationTemplateCatalogPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [requestFlash, setRequestFlash] = useState<string | null>(null);
  const [catalogTick, setCatalogTick] = useState(0);

  const refreshCatalog = useCallback(() => {
    setCatalogTick((n) => n + 1);
  }, []);

  const all = useMemo(() => listCatalogTemplates(), [catalogTick]);
  const stats = useMemo(() => catalogStats(all), [all]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return all.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (status !== "all" && t.status !== status) return false;
      if (!query) return true;
      const hay =
        `${t.name} ${t.id} ${t.purpose} ${t.audience} ${t.whereUsed.join(" ")}`.toLowerCase();
      return hay.includes(query);
    });
  }, [all, q, category, status]);

  const selected =
    filtered.find((t) => t.id === selectedId) ??
    all.find((t) => t.id === selectedId) ??
    filtered[0] ??
    null;

  function requestChange(t: PlatformNotificationTemplate) {
    const institutes = listPlatformInstitutes().filter((i) => i.status !== "archived");
    const instituteId = institutes[0]?.id;
    if (!instituteId) {
      setRequestFlash("No institute available to attach the support request.");
      return;
    }
    const draft = templateChangeRequestDraft(t);
    const thread = createSupportThread({
      instituteId,
      subject: draft.subject,
      category: draft.category,
      priority: "medium",
      body: draft.body,
    });
    if (thread) {
      setRequestFlash(`Change request opened in Support Center (${thread.id}).`);
      void navigate({ to: "/support" });
    }
  }

  function setLifecycle(t: PlatformNotificationTemplate, next: CatalogTemplateStatus) {
    if (next === "published") publishCatalogTemplate(t.id);
    else if (next === "archived") archiveCatalogTemplate(t.id);
    else draftCatalogTemplate(t.id);
    setRequestFlash(`Template ${t.id} → ${labelStatus(next)} (registry in-memory).`);
    refreshCatalog();
  }

  return (
    <AppShell
      title="Notification Templates"
      subtitle="Platform catalog · shared registry · preview & lifecycle only · Admin owns sending"
      actions={
        <Link to="/support">
          <Button>
            <LifeBuoy className="size-3.5" /> Support Center
          </Button>
        </Link>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Kpi label="Templates" value={String(stats.total)} icon={<LayoutTemplate className="size-3.5" />} />
        <Kpi label="Published" value={String(stats.published)} tone="up" />
        <Kpi label="Draft" value={String(stats.draft)} />
        <Kpi label="Archived" value={String(stats.archived)} />
        <Kpi label="Categories" value={String(stats.categories)} />
      </div>

      {requestFlash && (
        <p className="mb-4 text-xs text-success">{requestFlash}</p>
      )}

      <Card className="mb-4">
        <PageToolbar>
          <ToolbarGroup>
            <SearchInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, id, purpose, audience…"
              className="w-full sm:w-72"
            />
          </ToolbarGroup>
          <ToolbarSpacer />
          <ToolbarGroup>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryFilter)}
              className="min-w-[160px]"
            >
              <option value="all">All categories</option>
              {TEMPLATE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="min-w-[140px]"
            >
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </Select>
          </ToolbarGroup>
          <ToolbarMeta>{filtered.length} shown</ToolbarMeta>
        </PageToolbar>
      </Card>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-5 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border text-xs font-medium">Catalog</div>
          <div className="overflow-y-auto max-h-[70vh] divide-y divide-border">
            {filtered.length === 0 ? (
              <p className="p-6 text-xs text-muted-foreground text-center">No templates match.</p>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    selected?.id === t.id
                      ? "bg-primary/8 border-l-2 border-l-primary"
                      : "hover:bg-surface-hover border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{t.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">
                        {t.id}
                      </div>
                    </div>
                    <Pill tone={statusTone(t.status)}>{labelStatus(t.status)}</Pill>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[9px] uppercase tracking-wider font-mono text-muted-foreground">
                      {labelCategory(t.category)}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {labelAudience(t.audience)}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">v{t.version}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-7">
          {!selected ? (
            <div className="p-10 text-center text-xs text-muted-foreground">
              Select a template to view details and preview.
            </div>
          ) : (
            <>
              <CardHeader
                title={selected.name}
                hint={selected.id}
                action={<Pill tone={statusTone(selected.status)}>{labelStatus(selected.status)}</Pill>}
              />
              <div className="px-5 pb-5 space-y-5">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <Meta label="Category" value={labelCategory(selected.category)} />
                  <Meta label="Audience" value={labelAudience(selected.audience)} />
                  <Meta label="Priority" value={selected.priority} />
                  <Meta label="Version" value={`v${selected.version}`} />
                  <Meta label="Status" value={labelStatus(selected.status)} />
                  <Meta label="Last updated" value={formatTemplateDate(selected.updatedAt)} />
                  <Meta label="Deep link" value={selected.deepLink ?? "—"} />
                </dl>

                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">
                    Purpose
                  </div>
                  <p className="text-xs leading-relaxed">{selected.purpose}</p>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">
                    Available variables
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.allowedVariables.length === 0 ? (
                      <span className="text-xs text-muted-foreground">None</span>
                    ) : (
                      selected.allowedVariables.map((v) => (
                        <Pill key={v} tone="neutral">
                          {`{{${v}}}`}
                        </Pill>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">
                    Where used
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.whereUsed.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      selected.whereUsed.map((w) => (
                        <Pill key={w} tone="neutral">
                          {w}
                        </Pill>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-2">
                    Preview (read-only copy)
                  </div>
                  <div className="rounded-lg border border-border bg-background/50 p-4 space-y-2">
                    <div className="text-sm font-medium">{selected.previewTitle}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {selected.previewBody}
                    </p>
                    <p className="text-[10px] text-muted-foreground pt-1">
                      Tokens like {"{{studentName}}"} are filled at send time by Admin / Connect — not
                      edited here.
                    </p>
                  </div>
                </div>

                <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-[11px] text-muted-foreground leading-relaxed">
                  Nexus manages the shared template registry lifecycle. Only one published version is
                  active per template id. Nexus is not a notification sender — institute delivery
                  stays in Admin / Connect.
                </div>

                <div className="flex flex-wrap gap-2">
                  {selected.status !== "published" ? (
                    <Button variant="primary" onClick={() => setLifecycle(selected, "published")}>
                      <Send className="size-3.5" /> Publish
                    </Button>
                  ) : null}
                  {selected.status !== "draft" ? (
                    <Button onClick={() => setLifecycle(selected, "draft")}>Set draft</Button>
                  ) : null}
                  {selected.status !== "archived" ? (
                    <Button onClick={() => setLifecycle(selected, "archived")}>
                      <Archive className="size-3.5" /> Archive
                    </Button>
                  ) : null}
                  <Button variant="primary" onClick={() => requestChange(selected)}>
                    <MessageSquare className="size-3.5" /> Request template change
                  </Button>
                  <Link to="/support">
                    <Button>Open Support Center</Button>
                  </Link>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>
      <div className="mt-1 font-medium break-all">{value}</div>
    </div>
  );
}
