import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Kpi, PageStack, Pill } from "@lumenx/ui-admin";
import {
  FolderOpen,
  HardDrive,
  ClipboardCheck,
  FileBarChart,
  ClipboardList,
  KeyRound,
  Users,
  GraduationCap,
  CalendarDays,
  Megaphone,
  Bus,
  Image,
  LayoutDashboard,
  Trash2,
} from "lucide-react";
import { ADMIN_MODULE_LABELS as M, adminPageTitle } from "@/lib/admin-module-labels";
import { isApiAuthMode } from "@/auth/auth-mode";
import { StorageApiUsagePanel } from "@/components/storage/StorageApiUsagePanel";
import { StorageDocumentsHubPanel } from "@/components/storage/StorageDocumentsHubPanel";
import { useMemo, useState } from "react";
import { DocumentsRegistryPanel } from "@/components/DocumentsRegistryPanel";
import { RecycleBinPanel } from "@/components/RecycleBinPanel";
import { OfflineSyncStatusBar } from "@/components/OfflineSyncStatusBar";
import { resolveStorageDocumentsTabMode } from "@/lib/storage/documents-tab-view";

export const Route = createFileRoute("/storage")({
  head: () => ({ meta: [{ title: adminPageTitle("/storage") }] }),
  component: StoragePage,
});

type StorageCategory = {
  id: string;
  label: string;
  description: string;
  sizeGb: number;
  records: number;
  color: string;
  icon: typeof HardDrive;
};

const STORAGE_KEY = "lumenx.admin.storageUsage.v1";

const SEED: StorageCategory[] = [
  {
    id: "attendance",
    label: "Attendance",
    description: "Daily student & teacher attendance logs",
    sizeGb: 148,
    records: 1_284_500,
    color: "bg-primary",
    icon: ClipboardCheck,
  },
  {
    id: "report-cards",
    label: "Report cards",
    description: "Generated report cards and PDF archives",
    sizeGb: 226,
    records: 42_180,
    color: "bg-chart-5",
    icon: FileBarChart,
  },
  {
    id: "marks",
    label: "Marks",
    description: "Exam scores, grade books, and result sheets",
    sizeGb: 96,
    records: 890_220,
    color: "bg-success",
    icon: ClipboardList,
  },
  {
    id: "accounts",
    label: "Accounts",
    description: "Portal account profiles and auth artifacts",
    sizeGb: 38,
    records: 12_640,
    color: "bg-warning",
    icon: KeyRound,
  },
  {
    id: "students",
    label: "Students",
    description: "Student directory, photos, and profiles",
    sizeGb: 312,
    records: 18_420,
    color: "bg-chart-2",
    icon: Users,
  },
  {
    id: "teachers",
    label: "Teachers",
    description: "Faculty records and documents",
    sizeGb: 54,
    records: 1_280,
    color: "bg-muted-foreground",
    icon: GraduationCap,
  },
  {
    id: "events",
    label: "Events & calendar",
    description: "Event media and calendar attachments",
    sizeGb: 72,
    records: 4_560,
    color: "bg-primary/70",
    icon: CalendarDays,
  },
  {
    id: "announcements",
    label: "Announcements",
    description: "Notices, banners, and pinned content",
    sizeGb: 28,
    records: 3_100,
    color: "bg-chart-5/80",
    icon: Megaphone,
  },
  {
    id: "transport",
    label: "Transport",
    description: "Route maps, GPS logs, and fleet files",
    sizeGb: 64,
    records: 210_400,
    color: "bg-success/80",
    icon: Bus,
  },
  {
    id: "media",
    label: "Media",
    description: "Photos, videos, and shared uploads",
    sizeGb: 286,
    records: 58_900,
    color: "bg-destructive/60",
    icon: Image,
  },
];

function loadCategories(): StorageCategory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Array<Omit<StorageCategory, "icon">>;
      return parsed.map((row) => {
        const seed = SEED.find((s) => s.id === row.id);
        return {
          id: row.id ?? seed?.id ?? "unknown",
          label: row.label ?? seed?.label ?? "Unknown",
          description: row.description ?? seed?.description ?? "",
          sizeGb: typeof row.sizeGb === "number" ? row.sizeGb : (seed?.sizeGb ?? 0),
          records: typeof row.records === "number" ? row.records : (seed?.records ?? 0),
          color: row.color ?? seed?.color ?? "bg-muted",
          icon: seed?.icon ?? HardDrive,
        };
      });
    }
  } catch {
    // fall through
  }
  return SEED.map((s) => ({ ...s }));
}

function fmtSize(gb: number): string {
  if (gb <= 0) return "0 GB";
  if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`;
  if (gb < 1) return `${Math.round(gb * 1024)} MB`;
  return `${gb.toLocaleString("en-IN")} GB`;
}

function StoragePage() {
  const apiMode = isApiAuthMode();
  const [view, setView] = useState<"overview" | "documents" | "recycle">("overview");
  const [rows] = useState(loadCategories);

  const usedGb = useMemo(() => rows.reduce((a, r) => a + r.sizeGb, 0), [rows]);
  const totalRecords = useMemo(() => rows.reduce((a, r) => a + r.records, 0), [rows]);
  const largest = useMemo(
    () => [...rows].sort((a, b) => b.sizeGb - a.sizeGb)[0] ?? null,
    [rows],
  );

  const withPercents = useMemo(() => {
    const total = usedGb || 1;
    return rows.map((r) => ({
      ...r,
      pct: Math.max(0.5, Math.round((r.sizeGb / total) * 1000) / 10),
    }));
  }, [rows, usedGb]);

  return (
    <AppShell
      title={M.storage}
      subtitle={
        view === "overview"
          ? "Unlimited storage · usage by data type"
          : view === "documents"
            ? "Document registry · verification & expiry"
            : "Soft delete · Recycle Bin · 90-day retention"
      }
    >
      <div className="mb-4">
        <OfflineSyncStatusBar />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 p-1 w-fit bg-background rounded-md border border-border">
          <button
            type="button"
            onClick={() => setView("overview")}
            className={`inline-flex items-center gap-1.5 px-3 h-8 rounded text-[11px] font-medium transition-colors ${
              view === "overview" ? "bg-surface text-foreground" : "text-muted-foreground"
            }`}
          >
            <LayoutDashboard className="size-3.5" /> Overview
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
          <button
            type="button"
            onClick={() => setView("recycle")}
            className={`inline-flex items-center gap-1.5 px-3 h-8 rounded text-[11px] font-medium transition-colors ${
              view === "recycle" ? "bg-surface text-foreground" : "text-muted-foreground"
            }`}
          >
            <Trash2 className="size-3.5" /> Recycle Bin
          </button>
        </div>
        <Pill tone="info">No storage limit</Pill>
      </div>

      {view === "documents" ? (
        resolveStorageDocumentsTabMode(apiMode) === "api_documents_hub" ? (
          <StorageDocumentsHubPanel />
        ) : (
          <DocumentsRegistryPanel />
        )
      ) : view === "recycle" ? (
        <RecycleBinPanel />
      ) : apiMode ? (
        <StorageApiUsagePanel />
      ) : (
        <PageStack>
          <div className="lx-kpi-grid">
            <Kpi label="Total used" value={fmtSize(usedGb)} delta="Unlimited plan" />
            <Kpi
              label="Data types"
              value={String(rows.length)}
              delta="Separate occupancy"
            />
            <Kpi
              label="Records"
              value={totalRecords.toLocaleString("en-IN")}
              delta="Across all types"
            />
            <Kpi
              label="Largest"
              value={largest ? largest.label : "—"}
              delta={largest ? fmtSize(largest.sizeGb) : undefined}
            />
          </div>

          <div className="grid grid-cols-12 gap-4 mt-6">
            <Card className="col-span-12 lg:col-span-7">
              <CardHeader
                title="Storage overview"
                hint="Share of total used · unlimited capacity"
              />
              <div className="px-5 pb-5">
                {rows.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">
                    No stored data. Categories appear as your institute generates records.
                  </p>
                ) : (
                  <>
                    <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                      {withPercents.map((b) => (
                        <div
                          key={b.id}
                          className={b.color}
                          style={{ width: `${b.pct}%` }}
                          title={`${b.label}: ${fmtSize(b.sizeGb)}`}
                        />
                      ))}
                    </div>
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {withPercents.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2.5 py-2 text-[11px]"
                        >
                          <span className={`size-2.5 shrink-0 rounded-sm ${b.color}`} />
                          <span className="min-w-0 flex-1 truncate font-medium">{b.label}</span>
                          <span className="font-mono text-muted-foreground">{b.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </Card>

            <Card className="col-span-12 lg:col-span-5">
              <CardHeader title="Unlimited storage" hint="No quota · view occupancy by type" />
              <div className="px-5 pb-5 space-y-3 text-xs text-muted-foreground">
                <p>
                  Storage is unlimited for this institute. Usage is split by data type so you can
                  see what occupies space.
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Attendance, report cards, marks, and accounts are tracked separately</li>
                  <li>There is no capacity warning or plan limit</li>
                </ul>
              </div>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader
              title="Storage by data type"
              hint={`${rows.length} categories`}
            />
            <div className="px-5 pb-5 divide-y divide-border">
              {withPercents.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">Nothing stored</p>
              ) : (
                withPercents.map((b) => {
                  const Icon = b.icon;
                  return (
                    <div
                      key={b.id}
                      className="flex flex-wrap items-center gap-3 py-3.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="size-9 rounded-md border border-border bg-accent flex items-center justify-center text-muted-foreground shrink-0">
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold">{b.label}</span>
                            <span className={`size-2 rounded-sm ${b.color}`} />
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {b.description}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground mt-1">
                            {fmtSize(b.sizeGb)} · {b.records.toLocaleString("en-IN")} records ·{" "}
                            {b.pct}% of used
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </PageStack>
      )}
    </AppShell>
  );
}
