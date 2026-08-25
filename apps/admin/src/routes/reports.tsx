import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { IconChip } from "@/components/IconChip";
import { useAdminToast } from "@/components/AdminActionToast";
import { Card, CardHeader, Button, Pill, PageStack } from "@lumenx/ui-admin";
import { REPORT_CATALOG } from "@/lib/admin-module-data";
import {
  downloadReport,
  loadRecentExports,
  pushRecentExport,
  type ExportFormat,
  type RecentExport,
  type ReportId,
} from "@/lib/report-exports";
import { ADMIN_MODULE_LABELS as M, adminPageTitle } from "@/lib/admin-module-labels";
import { Download, FileText, Info } from "lucide-react";
import { useCallback, useState } from "react";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: adminPageTitle("/reports") }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const notify = useAdminToast();
  const [module, setModule] = useState<string>("all");
  const [recent, setRecent] = useState<RecentExport[]>(() => loadRecentExports());
  const [downloading, setDownloading] = useState<string | null>(null);

  const list =
    module === "all" ? REPORT_CATALOG : REPORT_CATALOG.filter((r) => r.module === module);
  const modules = [...new Set(REPORT_CATALOG.map((r) => r.module))];

  const handleExport = useCallback(
    (reportId: ReportId, reportName: string, format: ExportFormat) => {
      const key = `${reportId}-${format}`;
      setDownloading(key);
      try {
        const { filename, rowCount } = downloadReport(reportId, reportName, format);
        const next = pushRecentExport({
          reportId,
          reportName,
          format,
          filename,
          rowCount,
        });
        setRecent(next);
        if (format === "pdf") {
          notify(`Saved to Downloads · ${filename} · open in browser, then Print → Save as PDF`);
        } else {
          notify(
            `Saved to Downloads · ${filename} · ${rowCount} rows · open in Excel or any spreadsheet`,
          );
        }
      } finally {
        setDownloading(null);
      }
    },
    [notify],
  );

  return (
    <AppShell
      title={M.reports}
      subtitle="Download & export only · Excel, PDF, CSV · no charts or live dashboards"
    >
      <PageStack>
        <Card className="p-4 border-primary/20 bg-primary/5">
          <div className="flex gap-3">
            <Info className="size-4 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              Reports are for export only.{" "}
              <span className="text-foreground font-medium">Excel</span> and{" "}
              <span className="text-foreground font-medium">CSV</span> download spreadsheet files
              (open in Excel). <span className="text-foreground font-medium">PDF</span> downloads a
              formatted HTML report — open it and use Print → Save as PDF. For live dashboards and
              charts, use Analytics — not this page.
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
            <div className="lx-segmented-scroll flex-1 min-w-0">
              <div className="flex items-center gap-1 p-1 bg-background rounded-md border border-border w-max max-w-full">
                <button
                  type="button"
                  onClick={() => setModule("all")}
                  className={`px-3 h-7 rounded text-[11px] font-medium transition-colors ${
                    module === "all" ? "bg-surface text-foreground" : "text-muted-foreground"
                  }`}
                >
                  All
                </button>
                {modules.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModule(m)}
                    className={`px-3 h-7 rounded text-[11px] font-medium transition-colors ${
                      module === m ? "bg-surface text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-xs text-muted-foreground sm:ml-auto font-mono shrink-0">
              {list.length} reports
            </div>
          </div>
          <div className="px-5 pb-5 divide-y divide-border">
            {list.map((r) => {
              const excelKey = `${r.id}-excel`;
              const pdfKey = `${r.id}-pdf`;
              const csvKey = `${r.id}-csv`;
              return (
                <div
                  key={r.id}
                  className="py-4 first:pt-2 last:pb-2 flex flex-wrap items-center gap-4"
                >
                  <IconChip icon={FileText} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      <Pill tone="neutral">{r.module}</Pill>
                      <span className="ml-2 font-mono">id: {r.id}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <Button
                      loading={downloading === excelKey}
                      onClick={() => handleExport(r.id, r.name, "excel")}
                    >
                      <Download className="size-3.5" /> Excel
                    </Button>
                    <Button
                      variant="outline"
                      loading={downloading === pdfKey}
                      onClick={() => handleExport(r.id, r.name, "pdf")}
                    >
                      <Download className="size-3.5" /> PDF
                    </Button>
                    <Button
                      variant="outline"
                      loading={downloading === csvKey}
                      onClick={() => handleExport(r.id, r.name, "csv")}
                    >
                      <Download className="size-3.5" /> CSV
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent exports" hint="Stored in this browser only (demo)" />
          {recent.length === 0 ? (
            <div className="px-5 pb-5 text-xs text-muted-foreground">
              No downloads yet. Export a report above to see it here.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((e) => (
                <li
                  key={e.id}
                  className="px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-medium text-foreground">{e.reportName}</span>
                    <span className="text-muted-foreground ml-2">
                      {e.format.toUpperCase()} · {e.rowCount} rows
                    </span>
                  </div>
                  <div className="text-muted-foreground font-mono truncate max-w-[240px]">
                    {e.filename}
                  </div>
                  <div className="text-muted-foreground w-full sm:w-auto">
                    {formatWhen(e.exportedAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </PageStack>
    </AppShell>
  );
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
