import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Kpi, Button, PageStack } from "@lumenx/ui-admin";
import { Archive, Trash2, Minimize2, FolderOpen, HardDrive } from "lucide-react";
import { useMemo, useState } from "react";
import { PLAN_DETAILS, type PlanTier } from "@/lib/admin-plan-config";
import { DocumentsRegistryPanel } from "@/components/DocumentsRegistryPanel";

export const Route = createFileRoute("/storage")({
  head: () => ({ meta: [{ title: "Storage — LumenX Admin" }] }),
  component: StoragePage,
});

type StorageRow = {
  module: string;
  sizeGb: number;
  pct: number;
  color: string;
  protected: boolean;
};

const INITIAL: StorageRow[] = [
  { module: "Students", sizeGb: 312, pct: 26, color: "bg-primary", protected: true },
  { module: "Media", sizeGb: 286, pct: 24, color: "bg-chart-5", protected: false },
  { module: "Exams", sizeGb: 184, pct: 15, color: "bg-success", protected: true },
  { module: "Assignments", sizeGb: 142, pct: 12, color: "bg-warning", protected: false },
  { module: "Documents", sizeGb: 120, pct: 10, color: "bg-chart-2", protected: false },
  { module: "Marks", sizeGb: 86, pct: 7, color: "bg-muted-foreground", protected: true },
  { module: "Temp", sizeGb: 72, pct: 6, color: "bg-destructive/60", protected: false },
];

function StoragePage() {
  const [plan] = useState<PlanTier>("plus");
  const [view, setView] = useState<"quota" | "documents">("quota");
  const [rows, setRows] = useState(INITIAL);
  const quotaGb = PLAN_DETAILS[plan].storageGb;
  const usedGb = useMemo(() => rows.reduce((a, r) => a + r.sizeGb, 0), [rows]);
  const availableGb = Math.max(0, quotaGb - usedGb);
  const tempGb = rows.find((r) => r.module === "Temp")?.sizeGb ?? 0;
  const fileCount = 48294;

  const archive = (module: string) => {
    setRows((p) =>
      p.map((r) =>
        r.module === module && !r.protected
          ? { ...r, sizeGb: Math.round(r.sizeGb * 0.6), pct: Math.round(r.pct * 0.6) }
          : r,
      ),
    );
  };

  const remove = (module: string) => {
    setRows((p) => p.filter((r) => r.module !== module || r.protected));
  };

  const compress = (module: string) => {
    setRows((p) =>
      p.map((r) => (r.module === module ? { ...r, sizeGb: Math.round(r.sizeGb * 0.85) } : r)),
    );
  };

  const fmt = (gb: number) => (gb >= 1024 ? `${(gb / 1024).toFixed(1)} TB` : `${gb} GB`);

  return (
    <AppShell
      title="Cloud Storage"
      subtitle={view === "quota" ? `Plan quota: ${fmt(quotaGb)} · manage by module` : "Document registry · verification & expiry"}
    >
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 p-1 w-fit bg-background rounded-md border border-border">
          <button
            type="button"
            onClick={() => setView("quota")}
            className={`inline-flex items-center gap-1.5 px-3 h-8 rounded text-[11px] font-medium transition-colors ${
              view === "quota" ? "bg-surface text-foreground" : "text-muted-foreground"
            }`}
          >
            <HardDrive className="size-3.5" /> Storage quota
          </button>
          <button
            type="button"
            onClick={() => setView("documents")}
            className={`inline-flex items-center gap-1.5 px-3 h-8 rounded text-[11px] font-medium transition-colors ${
              view === "documents" ? "bg-surface text-foreground" : "text-muted-foreground"
            }`}
          >
            <FolderOpen className="size-3.5" /> Documents
          </button>
        </div>
      </div>

      {view === "documents" ? (
        <DocumentsRegistryPanel />
      ) : (
        <PageStack>
      <div className="lx-kpi-grid">
        <Kpi label="Used" value={fmt(usedGb)} delta={`of ${fmt(quotaGb)}`} />
        <Kpi
          label="Available"
          value={fmt(availableGb)}
          delta={`${Math.round((availableGb / quotaGb) * 100)}% free`}
          tone="up"
        />
        <Kpi label="Files" value={fileCount.toLocaleString()} delta="+312 today" />
        <Kpi label="Temp" value={fmt(tempGb)} delta="Clearable" tone="down" />
      </div>

      <div className="grid grid-cols-12 gap-4 mt-6">
        <Card className="col-span-12 lg:col-span-7">
          <CardHeader title="Storage by module" />
          <div className="px-5 pb-5">
            <div className="flex h-3 rounded-full overflow-hidden bg-muted">
              {rows.map((b) => (
                <div key={b.module} className={b.color} style={{ width: `${b.pct}%` }} />
              ))}
            </div>
            <div className="mt-5 space-y-2">
              {rows.map((b) => (
                <div
                  key={b.module}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border last:border-0 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`size-2.5 rounded-sm ${b.color}`} />
                    <span className="font-medium">{b.module}</span>
                    {b.protected && (
                      <span className="text-[10px] text-muted-foreground">Protected</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-muted-foreground">
                      {b.sizeGb} GB · {b.pct}%
                    </span>
                    {!b.protected && (
                      <>
                        <Button size="sm" onClick={() => archive(b.module)}>
                          <Archive className="size-3" /> Archive
                        </Button>
                        <Button size="sm" onClick={() => compress(b.module)}>
                          <Minimize2 className="size-3" /> Compress
                        </Button>
                        {b.module === "Temp" && (
                          <Button size="sm" variant="danger" onClick={() => remove(b.module)}>
                            <Trash2 className="size-3" /> Delete
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5">
          <CardHeader title="Quick maintenance" hint="Module-scoped actions update totals above" />
          <div className="px-5 pb-5 space-y-3 text-xs">
            <div className="p-4 rounded-lg border border-border bg-background/40">
              <div className="font-medium">Clear Temp folder</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Reclaim {tempGb} GB from uploads cache
              </div>
              <Button className="mt-2" size="sm" variant="danger" onClick={() => remove("Temp")}>
                <Trash2 className="size-3" /> Clear temp
              </Button>
            </div>
            <div className="p-4 rounded-lg border border-warning/20 bg-warning/5">
              <div className="font-medium text-warning">
                At {Math.round((usedGb / quotaGb) * 100)}% capacity
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Archive Assignments or Media to stay within quota.
              </div>
            </div>
          </div>
        </Card>
      </div>
        </PageStack>
      )}
    </AppShell>
  );
}
