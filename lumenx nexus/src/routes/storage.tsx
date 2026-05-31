import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Kpi, Button } from "@/components/ui-kit";
import { Archive, Trash2 } from "lucide-react";

export const Route = createFileRoute("/storage")({
  head: () => ({ meta: [{ title: "Storage — LumenX Nexus" }] }),
  component: StoragePage,
});

const breakdown = [
  { label: "Assignments", size: 412, pct: 34, color: "bg-primary" },
  { label: "Media (photos, video)", size: 286, pct: 24, color: "bg-chart-5" },
  { label: "Documents", size: 184, pct: 15, color: "bg-success" },
  { label: "Exam papers", size: 142, pct: 12, color: "bg-warning" },
  { label: "Profile assets", size: 86, pct: 7, color: "bg-chart-2" },
  { label: "Other", size: 90, pct: 8, color: "bg-muted-foreground" },
];

function StoragePage() {
  return (
    <AppShell title="Cloud Storage" subtitle="Manage assets, archives, and storage health">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Used" value="1.2 TB" delta="of 2 TB" />
        <Kpi label="Available" value="822 GB" delta="40% free" tone="up" />
        <Kpi label="Files" value="48,294" delta="+312 today" />
        <Kpi label="Archived" value="218 GB" delta="Cold tier" />
      </div>

      <div className="grid grid-cols-12 gap-4 mt-6">
        <Card className="col-span-12 lg:col-span-7">
          <CardHeader title="Storage Breakdown" />
          <div className="px-5 pb-5">
            <div className="flex h-3 rounded-full overflow-hidden bg-muted">
              {breakdown.map((b) => <div key={b.label} className={b.color} style={{ width: `${b.pct}%` }} />)}
            </div>
            <div className="mt-5 space-y-3">
              {breakdown.map((b) => (
                <div key={b.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className={`size-2.5 rounded-sm ${b.color}`} />
                    <span>{b.label}</span>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span className="font-mono">{b.size} GB</span>
                    <span className="font-mono w-10 text-right">{b.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5">
          <CardHeader title="Maintenance" hint="Reclaim space and archive old data" />
          <div className="px-5 pb-5 space-y-3">
            <div className="p-4 rounded-lg border border-border bg-background/40 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium">Archive completed term 1 assignments</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Free up ~84 GB</div>
              </div>
              <Button><Archive className="size-3.5" /> Archive</Button>
            </div>
            <div className="p-4 rounded-lg border border-border bg-background/40 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium">Remove duplicate media files</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">142 duplicates · ~38 GB</div>
              </div>
              <Button variant="danger"><Trash2 className="size-3.5" /> Delete</Button>
            </div>
            <div className="p-4 rounded-lg border border-warning/20 bg-warning/5">
              <div className="text-xs font-medium text-warning">Approaching 60% capacity</div>
              <div className="text-[10px] text-muted-foreground mt-1">Consider upgrading branch plan or archiving older terms.</div>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
