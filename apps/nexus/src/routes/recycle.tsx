import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  CardHeader,
  Field,
  Kpi,
  PageToolbar,
  Pill,
  Select,
  ToolbarGroup,
  ToolbarMeta,
  ToolbarSpacer,
} from "@lumenx/ui-admin";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { isNexusApiMode } from "@/lib/auth-mode";
import { listPlatformInstitutes } from "@/lib/institute-directory-store";
import {
  countExpiringSoon,
  daysLeftFromDeletedAt,
  filterRecycleByModule,
  listRecycleModules,
  loadPlatformRecycleList,
  type RecycleListItem,
  type RecycleListStatus,
} from "@/lib/recycle";
import { RECYCLE_BIN_RETENTION_DAYS } from "@lumenx/utils";

export const Route = createFileRoute("/recycle")({
  head: () => ({ meta: [{ title: "Recycle Bin — LumenX Nexus" }] }),
  component: NexusRecyclePage,
});

function NexusRecyclePage() {
  const apiMode = isNexusApiMode();
  const institutes = useMemo(() => listPlatformInstitutes(), []);
  const [instituteFilter, setInstituteFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [items, setItems] = useState<RecycleListItem[]>([]);
  const [status, setStatus] = useState<RecycleListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const instituteNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const inst of institutes) {
      map.set(inst.id, inst.name);
    }
    return map;
  }, [institutes]);

  useEffect(() => {
    if (!apiMode) {
      setItems([]);
      setStatus("demo");
      setErrorMessage(null);
      return;
    }

    let cancelled = false;
    setStatus("loading");
    const instituteId = instituteFilter === "all" ? undefined : instituteFilter;
    void loadPlatformRecycleList(instituteId).then((next) => {
      if (cancelled) return;
      setItems(next.items);
      setStatus(next.status);
      setErrorMessage(next.errorMessage);
    });
    return () => {
      cancelled = true;
    };
  }, [apiMode, instituteFilter, reloadKey]);

  const modules = useMemo(() => listRecycleModules(items), [items]);
  const filteredItems = useMemo(
    () => filterRecycleByModule(items, moduleFilter),
    [items, moduleFilter],
  );
  const expiringSoon = useMemo(() => countExpiringSoon(items), [items]);

  return (
    <AppShell>
      <Card>
        <CardHeader
          title="Recycle Bin"
          subtitle={`Cross-institute soft-deleted items · ${RECYCLE_BIN_RETENTION_DAYS}-day retention · restore/purge in Admin`}
          icon={Trash2}
        />
      </Card>

      {apiMode && (status === "ready" || status === "empty") ? (
        <div className="lx-kpi-grid">
          <Kpi label="Items in bin" value={String(items.length)} />
          <Kpi label="Expiring ≤7d" value={String(expiringSoon)} tone={expiringSoon > 0 ? "down" : undefined} />
          <Kpi label="Institutes" value={String(new Set(items.map((row) => row.instituteId)).size)} />
        </div>
      ) : null}

      <PageToolbar>
        <ToolbarGroup>
          <Field label="Institute">
            <Select
              value={instituteFilter}
              onChange={(e) => setInstituteFilter(e.target.value)}
            >
              <option value="all">All institutes</option>
              {institutes.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </Select>
          </Field>
          {apiMode && modules.length > 0 ? (
            <Field label="Module">
              <Select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
              >
                <option value="all">All modules</option>
                {modules.map((moduleName) => (
                  <option key={moduleName} value={moduleName}>
                    {moduleName}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
        </ToolbarGroup>
        <ToolbarSpacer />
        <ToolbarMeta>
          {status === "ready" || status === "empty"
            ? `${filteredItems.length} item${filteredItems.length === 1 ? "" : "s"}`
            : null}
        </ToolbarMeta>
        <ToolbarGroup>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            <RefreshCw className="size-3.5" /> Refresh
          </button>
        </ToolbarGroup>
      </PageToolbar>

      {status === "demo" && (
        <Card>
          <p className="p-5 text-sm text-muted-foreground">
            Platform recycle oversight is available in API auth mode. Deleted items remain
            institute-scoped; operators can monitor retention here while restore and purge stay
            in each institute&apos;s Admin app.
          </p>
        </Card>
      )}

      {status === "loading" && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading recycle bin…
        </div>
      )}

      {(status === "error" || status === "forbidden") && (
        <Card>
          <p className="p-5 text-sm text-destructive">
            {errorMessage ?? "Unable to load recycle bin"}
          </p>
        </Card>
      )}

      {status === "empty" && (
        <Card>
          <p className="p-5 text-center text-sm text-muted-foreground">
            No items in the recycle bin for this filter.
          </p>
        </Card>
      )}

      {status === "ready" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Institute</th>
                  <th className="px-4 py-2 font-medium">Module</th>
                  <th className="px-4 py-2 font-medium">Title</th>
                  <th className="px-4 py-2 font-medium">Deleted</th>
                  <th className="px-4 py-2 font-medium">Retention</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((row) => {
                  const daysLeft = daysLeftFromDeletedAt(row.deletedAt);
                  return (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="px-4 py-3 text-xs">
                        {instituteNameById.get(row.instituteId) ??
                          row.instituteId.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3">
                        <Pill tone="neutral">{row.module}</Pill>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.title}</div>
                        {row.subtitle ? (
                          <div className="text-xs text-muted-foreground">{row.subtitle}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(row.deletedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <Pill tone={daysLeft <= 7 ? "warning" : "neutral"}>
                          {daysLeft}d left
                        </Pill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AppShell>
  );
}
