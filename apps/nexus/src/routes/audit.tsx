import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
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
import { ScrollText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  AUDIT_ACTION_LABEL,
  auditStats,
  formatAuditDate,
  labelAuditAction,
  listAuditRecords,
  subscribeAuditLog,
  type AuditAction,
  type AuditRecord,
} from "@/lib/audit-log-store";

export const Route = createFileRoute("/audit")({
  head: () => ({ meta: [{ title: "Audit Log — LumenX Nexus" }] }),
  component: AuditLogPage,
});

type ActionFilter = "all" | AuditAction;

function AuditLogPage() {
  const [tick, setTick] = useState(0);
  const [q, setQ] = useState("");
  const [action, setAction] = useState<ActionFilter>("all");
  const [windowFilter, setWindowFilter] = useState<"all" | "24h" | "7d">("all");

  useEffect(() => subscribeAuditLog(() => setTick((t) => t + 1)), []);

  const records = useMemo(() => listAuditRecords(), [tick]);
  const stats = useMemo(() => auditStats(records), [records]);

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
      const hay = `${r.operator} ${labelAuditAction(r.action)} ${r.targetLabel} ${r.before ?? ""} ${r.after ?? ""} ${r.summary ?? ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [records, q, action, windowFilter]);

  return (
    <AppShell
      title="Audit Log"
      subtitle="Platform governance trail · Nexus actions only · no personal records"
    >
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
            />
          </ToolbarGroup>
          <ToolbarSpacer />
          <ToolbarGroup>
            <Select
              value={action}
              onChange={(e) => setAction(e.target.value as ActionFilter)}
              className="min-w-[200px]"
            >
              <option value="all">All actions</option>
              {(Object.keys(AUDIT_ACTION_LABEL) as AuditAction[]).map((a) => (
                <option key={a} value={a}>
                  {AUDIT_ACTION_LABEL[a]}
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
          </ToolbarGroup>
          <ToolbarMeta>{filtered.length} shown</ToolbarMeta>
        </PageToolbar>
      </Card>

      <Card>
        <CardHeader
          title="Change history"
          hint="Date · Operator · Action · Target · Before / After"
        />
        <div className="overflow-x-auto">
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
                    No audit records match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => <AuditRow key={r.id} record={r} />)
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}

function AuditRow({ record: r }: { record: AuditRecord }) {
  return (
    <tr className="hover:bg-surface-hover align-top">
      <td className="px-5 py-3 text-[11px] font-mono text-muted-foreground whitespace-nowrap">
        {formatAuditDate(r.at)}
      </td>
      <td className="px-5 py-3 text-xs font-mono">{r.operator}</td>
      <td className="px-5 py-3">
        <Pill tone="info">{labelAuditAction(r.action)}</Pill>
        {r.summary ? (
          <div className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">{r.summary}</div>
        ) : null}
      </td>
      <td className="px-5 py-3 text-xs">
        {r.targetId.startsWith("ins-") ? (
          <Link
            to="/institutes/$id"
            params={{ id: r.targetId }}
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
