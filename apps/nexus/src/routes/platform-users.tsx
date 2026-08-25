import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Button,
  Card,
  CardHeader,
  Kpi,
  PageToolbar,
  Pill,
  Select,
  ToolbarGroup,
  ToolbarMeta,
  ToolbarSpacer,
} from "@lumenx/ui-admin";
import {
  Activity,
  GraduationCap,
  KeyRound,
  Shield,
  UserCircle2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { subscribeInstituteDirectory } from "@/lib/institute-directory-store";
import {
  buildPlatformUsersSnapshot,
  formatCount,
  type PlatformUsersFilter,
} from "@/lib/platform-users-metrics";

export const Route = createFileRoute("/platform-users")({
  head: () => ({ meta: [{ title: "Platform Users — LumenX Nexus" }] }),
  component: PlatformUsersPage,
});

function PlatformUsersPage() {
  const [tick, setTick] = useState(0);
  const [filter, setFilter] = useState<PlatformUsersFilter>("all");

  useEffect(() => subscribeInstituteDirectory(() => setTick((t) => t + 1)), []);

  const snap = useMemo(() => buildPlatformUsersSnapshot(filter), [tick, filter]);
  const maxTrend = Math.max(1, ...snap.usageTrend.map((t) => t.activeUsers));

  return (
    <AppShell
      title="Platform Users"
      subtitle="Aggregate counts across the LumenX network · no individual profiles"
      actions={
        <Link to="/access">
          <Button>
            <KeyRound className="size-3.5" /> Nexus operators
          </Button>
        </Link>
      }
    >
      <Card className="mb-6">
        <PageToolbar>
          <ToolbarGroup>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              Institute
            </label>
            <Select
              value={filter}
              onChange={(e) => setFilter(e.target.value as PlatformUsersFilter)}
              className="min-w-[220px]"
            >
              <option value="all">All institutes</option>
              {snap.institutes.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </Select>
          </ToolbarGroup>
          <ToolbarSpacer />
          <ToolbarMeta>
            {snap.filterLabel} · counts only · privacy-safe
          </ToolbarMeta>
        </PageToolbar>
      </Card>

      {/* Role aggregates */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi
          label="Total users"
          value={formatCount(snap.totalUsers)}
          delta={filter === "all" ? "Includes Nexus operators" : "Institute-scoped"}
          icon={<Users className="size-3.5" />}
        />
        <Kpi label="Students" value={formatCount(snap.students)} icon={<Users className="size-3.5" />} />
        <Kpi
          label="Faculty"
          value={formatCount(snap.faculty)}
          icon={<GraduationCap className="size-3.5" />}
        />
        <Kpi
          label="Parents"
          value={formatCount(snap.parents)}
          icon={<UserCircle2 className="size-3.5" />}
        />
        <Kpi
          label="Admin accounts"
          value={formatCount(snap.adminAccounts)}
          delta="Institute Admin"
          icon={<Shield className="size-3.5" />}
        />
        <Kpi
          label="Nexus operators"
          value={formatCount(snap.nexusOperators)}
          delta="Platform-wide"
          tone="up"
          icon={<KeyRound className="size-3.5" />}
        />
      </div>

      {filter !== "all" && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Nexus operators are platform accounts (not scoped to this institute). Total above excludes
          them when an institute filter is applied. Manage operators under{" "}
          <Link to="/access" className="text-primary hover:underline">
            Platform Access
          </Link>
          .
        </p>
      )}

      {/* Activity */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        <Kpi
          label="Active users"
          value={formatCount(snap.activeUsers)}
          delta={`${snap.avgUsagePct}% usage signal`}
          tone="up"
        />
        <Kpi
          label="Recently active"
          value={formatCount(snap.recentlyActiveUsers)}
          delta="Last engagement window"
        />
        <Kpi
          label="Inactive users"
          value={formatCount(snap.inactiveUsers)}
          tone={snap.inactiveUsers ? "down" : "neutral"}
        />
        <Kpi
          label="Avg usage"
          value={`${snap.avgUsagePct}%`}
          icon={<Activity className="size-3.5" />}
        />
      </div>

      <div className="grid grid-cols-12 gap-4 mt-6">
        <Card className="col-span-12 lg:col-span-7">
          <CardHeader
            title="Usage trend"
            hint="Estimated active users over recent months · aggregates only"
            action={<Pill tone="info">{snap.filterLabel}</Pill>}
          />
          <div className="px-5 pb-5">
            <div className="h-44 flex items-end gap-2.5">
              {snap.usageTrend.map((t) => (
                <div key={t.label} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                  <div className="text-[9px] font-mono text-muted-foreground tabular-nums">
                    {formatCount(t.activeUsers)}
                  </div>
                  <div className="w-full flex items-end h-28">
                    <div
                      className="w-full rounded-t-md bg-primary/35 hover:bg-primary/55 transition-colors"
                      style={{ height: `${Math.max(4, (t.activeUsers / maxTrend) * 100)}%` }}
                      title={`${t.label}: ${formatCount(t.activeUsers)} active · ${t.usagePct}%`}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground">{t.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5">
          <CardHeader title="Activity mix" hint="Active · recent · inactive" />
          <div className="px-5 pb-5 space-y-4">
            <ActivityBar
              label="Active"
              value={snap.activeUsers}
              total={Math.max(1, snap.activeUsers + snap.recentlyActiveUsers + snap.inactiveUsers)}
              tone="bg-success"
            />
            <ActivityBar
              label="Recently active"
              value={snap.recentlyActiveUsers}
              total={Math.max(1, snap.activeUsers + snap.recentlyActiveUsers + snap.inactiveUsers)}
              tone="bg-primary"
            />
            <ActivityBar
              label="Inactive"
              value={snap.inactiveUsers}
              total={Math.max(1, snap.activeUsers + snap.recentlyActiveUsers + snap.inactiveUsers)}
              tone="bg-muted-foreground/50"
            />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Derived from institute usage signals applied to role counts. No names, IDs, or profile
              records are shown.
            </p>
          </div>
        </Card>

        <Card className="col-span-12">
          <CardHeader
            title="By institute"
            hint="Contribution to the filtered totals · open Institute for lifecycle, not people"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                  <th className="px-5 py-3 font-semibold">Institute</th>
                  <th className="px-5 py-3 font-semibold text-right">Students</th>
                  <th className="px-5 py-3 font-semibold text-right">Faculty</th>
                  <th className="px-5 py-3 font-semibold text-right">Parents</th>
                  <th className="px-5 py-3 font-semibold text-right">Admins</th>
                  <th className="px-5 py-3 font-semibold text-right">Total</th>
                  <th className="px-5 py-3 font-semibold text-right">Active</th>
                  <th className="px-5 py-3 font-semibold text-right">Usage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {snap.byInstitute.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-xs text-muted-foreground">
                      No institutes in this filter.
                    </td>
                  </tr>
                ) : (
                  snap.byInstitute.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-hover transition-colors">
                      <td className="px-5 py-3">
                        <Link
                          to="/institutes/$id"
                          params={{ id: row.id }}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          {row.name}
                        </Link>
                        <div className="text-[10px] text-muted-foreground">{row.city}</div>
                      </td>
                      <td className="px-5 py-3 text-xs font-mono text-right">{formatCount(row.students)}</td>
                      <td className="px-5 py-3 text-xs font-mono text-right">{formatCount(row.faculty)}</td>
                      <td className="px-5 py-3 text-xs font-mono text-right">{formatCount(row.parents)}</td>
                      <td className="px-5 py-3 text-xs font-mono text-right">{formatCount(row.admins)}</td>
                      <td className="px-5 py-3 text-xs font-mono text-right font-medium">{formatCount(row.total)}</td>
                      <td className="px-5 py-3 text-xs font-mono text-right">{formatCount(row.active)}</td>
                      <td className="px-5 py-3 text-right">
                        <Pill tone={row.usagePct >= 70 ? "success" : row.usagePct >= 40 ? "info" : "warning"}>
                          {row.usagePct}%
                        </Pill>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function ActivityBar({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
}) {
  const pct = Math.round((value / total) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">
          {formatCount(value)} · {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded bg-muted overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
