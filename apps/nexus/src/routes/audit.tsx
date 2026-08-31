import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Button,
  Card,
  CardHeader,
  Kpi,
  PageToolbar,
  Pill,
  SearchInput,
  SegmentedControl,
  Select,
  ToolbarGroup,
  ToolbarMeta,
  ToolbarSpacer,
} from "@lumenx/ui-admin";
import { AlertCircle, Loader2, RefreshCw, ScrollText } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatAuditDate } from "@/lib/audit-log-store";
import { isNexusApiMode } from "@/lib/auth-mode";
import {
  computeAuditStats,
  labelPlatformAuditAction,
  loadPlatformAuditLog,
  PLATFORM_AUDIT_ACTION_LABEL,
  type PlatformAuditListItem,
  type PlatformAuditLoadState,
} from "@/lib/audit";

export const Route = createFileRoute("/audit")({
  head: () => ({ meta: [{ title: "Audit Log — LumenX Nexus" }] }),
  component: AuditLogPage,
});

type ActionFilter = "all" | string;

function AuditLogPage() {
  const apiMode = isNexusApiMode();
  const [loadState, setLoadState] = useState<PlatformAuditLoadState>(() =>
    apiMode ? { status: "loading" } : { status: "loading" },
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [q, setQ] = useState("");
  const [action, setAction] = useState<ActionFilter>("all");
  const [windowFilter, setWindowFilter] = useState<"all" | "24h" | "7d">("all");

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadState({ status: "loading" });
    void loadPlatformAuditLog().then((next) => {
      if (!cancelled) setLoadState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const records = loadState.status === "ready" ? loadState.items : [];
  const stats = useMemo(() => computeAuditStats(records), [records]);

  const actionOptions = useMemo(() => {
    const known = Object.keys(PLATFORM_AUDIT_ACTION_LABEL);
    const fromData = records.map((r) => r.action);
    return [...new Set([...known, ...fromData])].sort((a, b) =>
      labelPlatformAuditAction(a).localeCompare(labelPlatformAuditAction(b)),
    );
  }, [records]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const now = Date.now();
    const minAt =
      windowFilter === "24h"
        ? now - 24 * 60 * 60 * 1000
        : windowFilter === "7d"
          ? now - 7 * 24 * 60 * 60 * 1000
          : 0;

    return records.filter((r) => {
      if (action !== "all" && r.action !== action) return false;
      if (minAt && new Date(r.at).getTime() < minAt) return false;
      if (!query) return true;
      const hay = `${r.operator} ${labelPlatformAuditAction(r.action)} ${r.targetLabel} ${r.before ?? ""} ${r.after ?? ""} ${r.summary ?? ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [records, q, action, windowFilter]);

  return (
    <AppShell
      title="Audit Log"
      subtitle="Platform governance trail · Nexus operator actions · no personal records"
    >
      {loadState.status === "error" && (
        <Card className="mb-4 border-destructive/30">
          <div className="flex items-start gap-3 p-4 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Unable to load audit log</p>
              <p className="mt-1 text-xs opacity-90">{loadState.message}</p>
              {loadState.unauthorized ? (
                <p className="mt-1 text-xs">Sign in as a platform operator.</p>
              ) : null}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Kpi label="Records" value={String(stats.total)} icon={<ScrollText className="size-3.5" />} />
        <Kpi label="Last 24h" value={String(stats.last24h)} />
        <Kpi label="Institute lifecycle" value={String(stats.institutes)} />
        <Kpi label="Commercial" value={String(stats.commercial)} />
        <Kpi label="Governance" value={String(stats.governance)} />
      </div>

      <Card className="mb-4">
        <PageToolbar>
          <ToolbarGroup>
            <SearchInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search operator, action, institute…"
              className="w-full sm:w-72"
              disabled={loadState.status === "loading"}
            />
          </ToolbarGroup>
          <ToolbarSpacer />
          <ToolbarGroup>
            <Select
              value={action}
              onChange={(e) => setAction(e.target.value as ActionFilter)}
              className="min-w-[200px]"
              disabled={loadState.status === "loading"}
            >
              <option value="all">All actions</option>
              {actionOptions.map((a) => (
                <option key={a} value={a}>
                  {labelPlatformAuditAction(a)}
                </option>
              ))}
            </Select>
            <SegmentedControl
              value={windowFilter}
              onChange={setWindowFilter}
              options={[
                { value: "all", label: "All time" },
                { value: "7d", label: "7d" },
                { value: "24h", label: "24h" },
              ]}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={reload}
              disabled={loadState.status === "loading"}
            >
              {loadState.status === "loading" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Refresh
            </Button>
          </ToolbarGroup>
          <ToolbarMeta>
            {loadState.status === "loading"
              ? "Loading…"
              : `${filtered.length} shown · ${loadState.status === "ready" ? loadState.source : ""}`}
          </ToolbarMeta>
        </PageToolbar>
      </Card>

      <Card>
        <CardHeader
          title="Change history"
          hint={
            apiMode
              ? "Live platform audit from API · read-only"
              : "Demo audit trail · localStorage"
          }
        />
        <div className="overflow-x-auto">
          {loadState.status === "loading" ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading audit records…
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                  <th className="px-5 py-3 font-semibold whitespace-nowrap">Date / time</th>
                  <th className="px-5 py-3 font-semibold">Operator</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                  <th className="px-5 py-3 font-semibold min-w-[180px]">Target</th>
                  <th className="px-5 py-3 font-semibold">Before</th>
                  <th className="px-5 py-3 font-semibold">After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-xs text-muted-foreground">
                      {loadState.status === "empty"
                        ? "No platform audit records yet."
                        : "No audit records match these filters."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => <AuditRow key={r.id} record={r} />)
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </AppShell>
  );
}

function AuditRow({ record: r }: { record: PlatformAuditListItem }) {
  const linkId = r.instituteRouteId;
  return (
    <tr className="hover:bg-surface-hover align-top">
      <td className="px-5 py-3 text-[11px] font-mono text-muted-foreground whitespace-nowrap">
        {formatAuditDate(r.at)}
      </td>
      <td className="px-5 py-3 text-xs font-mono">{r.operator}</td>
      <td className="px-5 py-3">
        <Pill tone="info">{labelPlatformAuditAction(r.action)}</Pill>
        {r.summary ? (
          <div className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">{r.summary}</div>
        ) : null}
      </td>
      <td className="px-5 py-3 text-xs">
        {linkId ? (
          <Link
            to="/institutes/$id"
            params={{ id: linkId }}
            className="text-primary hover:underline font-medium"
          >
            {r.targetLabel}
          </Link>
        ) : (
          <span className="font-medium">{r.targetLabel}</span>
        )}
        <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{r.targetKind}</div>
      </td>
      <td className="px-5 py-3 text-xs text-muted-foreground max-w-[160px]">
        {r.before ?? "—"}
      </td>
      <td className="px-5 py-3 text-xs max-w-[160px]">{r.after ?? "—"}</td>
    </tr>
  );
}
