import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { InstituteDirectoryCard } from "@/components/institutes/InstituteDirectoryCard";
import { CreateInstituteDialog } from "@/components/institutes/CreateInstituteDialog";
import {
  Button,
  Card,
  Kpi,
  KpiGrid,
  PageToolbar,
  SearchInput,
  SegmentedControl,
  ToolbarGroup,
  ToolbarMeta,
  ToolbarSpacer,
} from "@lumenx/ui-admin";
import { Building2, AlertTriangle, Archive, ClipboardList, Plus, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  directoryStats,
  listPlatformInstitutes,
  locationLabel,
  subscribeInstituteDirectory,
  type InstituteStatus,
} from "@/lib/institute-directory-store";
import {
  listPendingInstituteRegistrations,
  subscribeInstituteRegistrations,
} from "@lumenx/utils";
import { isNexusApiMode } from "@/lib/auth-mode";
import { countApplications, loadRegistrationsQueue } from "@/lib/registrations/load-queue";

export const Route = createFileRoute("/institutes/")({
  head: () => ({ meta: [{ title: "Institutes — LumenX Nexus" }] }),
  component: InstitutesIndexPage,
});

type StatusFilter = "all" | InstituteStatus;

function InstitutesIndexPage() {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [apiPendingCount, setApiPendingCount] = useState<number | null>(null);
  const apiMode = isNexusApiMode();

  useEffect(() => subscribeInstituteDirectory(() => setTick((t) => t + 1)), []);
  useEffect(() => subscribeInstituteRegistrations(() => setTick((t) => t + 1)), []);

  useEffect(() => {
    if (!apiMode) return;
    void loadRegistrationsQueue().then((queue) => {
      if (queue.status === "ready") {
        setApiPendingCount(countApplications(queue.applications).pending);
      }
    });
  }, [apiMode, tick]);

  const all = useMemo(() => listPlatformInstitutes(), [tick]);
  const stats = useMemo(() => directoryStats(all), [all]);
  const pendingRegistrations = useMemo(() => listPendingInstituteRegistrations(), [tick]);
  const pendingCount = apiMode ? (apiPendingCount ?? 0) : pendingRegistrations.length;

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return all.filter((i) => {
      if (status !== "all" && i.status !== status) return false;
      if (!query) return true;
      const hay = `${i.name} ${locationLabel(i)} ${i.id}`.toLowerCase();
      return hay.includes(query);
    });
  }, [all, q, status]);

  return (
    <AppShell
      title="Institutes"
      subtitle="Platform directory · lifecycle and modules · cost set per institute on Billing"
      actions={
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" /> Create institute
        </Button>
      }
    >
      {pendingCount > 0 ? (
        <div
          role="status"
          className="mb-4 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm"
        >
          <div className="font-semibold text-amber-950 dark:text-amber-100 flex items-center gap-2">
            <ClipboardList className="size-4 shrink-0" />
            {pendingCount} Admin registration
            {pendingCount === 1 ? "" : "s"} waiting
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">
            Self-registered institutes appear under Registrations first. Approve there to add them
            to this directory.
          </p>
          <div className="mt-3">
            <Link to="/registrations">
              <Button size="sm" variant="primary">
                Open Registrations
              </Button>
            </Link>
          </div>
        </div>
      ) : null}

      <KpiGrid cols={5} className="mb-6">
        <Kpi label="Institutes" value={String(stats.total)} icon={<Building2 className="size-3.5" />} />
        <Kpi
          label="Active"
          value={String(stats.active)}
          delta={`${stats.trial} trial`}
          tone="up"
          icon={<Sparkles className="size-3.5" />}
        />
        <Kpi
          label="Suspended"
          value={String(stats.suspended)}
          tone={stats.suspended ? "down" : "neutral"}
        />
        <Kpi label="Archived" value={String(stats.archived)} icon={<Archive className="size-3.5" />} />
        <Kpi
          label="At risk"
          value={String(stats.atRisk)}
          tone={stats.atRisk ? "down" : "up"}
          icon={<AlertTriangle className="size-3.5" />}
        />
      </KpiGrid>

      <Card className="mb-6">
        <div className="px-3 sm:px-4 py-3">
          <PageToolbar className="border-0 bg-transparent px-0 py-0">
            <ToolbarGroup>
              <SearchInput
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by institute name or city…"
                className="w-full sm:w-72"
              />
            </ToolbarGroup>
            <ToolbarSpacer />
            <ToolbarGroup>
              <SegmentedControl
                value={status}
                onChange={setStatus}
                options={[
                  { value: "all", label: "All" },
                  { value: "trial", label: "Trial" },
                  { value: "active", label: "Active" },
                  { value: "suspended", label: "Suspended" },
                  { value: "archived", label: "Archived" },
                ]}
              />
            </ToolbarGroup>
            <ToolbarMeta>{list.length} shown</ToolbarMeta>
          </PageToolbar>
        </div>
      </Card>

      {list.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No institutes match these filters.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((inst) => (
            <InstituteDirectoryCard key={inst.id} institute={inst} />
          ))}
        </div>
      )}

      <p className="mt-6 text-[11px] text-muted-foreground font-mono">
        Lifecycle: create · activate · suspend · archive · restore. Privacy: aggregates only — no
        student, parent, or teacher records are created here.
      </p>

      <CreateInstituteDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(inst) => {
          setTick((t) => t + 1);
          void navigate({ to: "/institutes/$id", params: { id: inst.id } });
        }}
      />
    </AppShell>
  );
}
