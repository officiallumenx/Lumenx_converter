/**
 * Read-only dry-run: institutes missing or inconsistent subscriptions.
 * Calls GET /api/nexus/subscriptions/coverage-audit — never mutates rows.
 */
import { useCallback, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  DataTable,
  Pill,
  Td,
  Th,
  Tr,
} from "@lumenx/ui-admin";
import { ClipboardList } from "lucide-react";
import { getNexusApiClient } from "@/lib/nexus-api";
import { isNexusApiMode } from "@/lib/auth-mode";

type CoverageIssue = {
  instituteId: string;
  instituteCode: string;
  instituteName: string;
  subscriptionId: string | null;
  category: string;
  summary: string;
  recommendedAction: string;
};

type CoverageReport = {
  generatedAt: string;
  scannedInstitutes: number;
  scannedSubscriptions: number;
  issueCount: number;
  issues: CoverageIssue[];
};

export function SubscriptionCoverageAuditPanel() {
  const [report, setReport] = useState<CoverageReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAudit = useCallback(async () => {
    if (!isNexusApiMode()) {
      setError("Coverage audit requires API auth mode.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getNexusApiClient().get<CoverageReport>(
        "/api/nexus/subscriptions/coverage-audit",
      );
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coverage audit failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <Card>
      <CardHeader
        title="Subscription coverage audit"
        hint="Read-only dry-run · no create / repair / backfill"
        action={
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => void runAudit()}
          >
            <ClipboardList className="size-3.5" />
            {loading ? "Scanning…" : "Run dry-run"}
          </Button>
        }
      />
      <div className="px-5 pb-5 space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Lists institutes with missing subscriptions, stale lifecycle status, inconsistent
          grace windows, stale billable counts, or conflicting current periods. Does not
          write commercial data. Run against staging / non-production unless explicitly
          approved.
        </p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {report ? (
          <>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Pill tone="neutral">
                Institutes {report.scannedInstitutes}
              </Pill>
              <Pill tone="neutral">
                Subscriptions {report.scannedSubscriptions}
              </Pill>
              <Pill tone={report.issueCount ? "warning" : "success"}>
                Issues {report.issueCount}
              </Pill>
              <span>Generated {new Date(report.generatedAt).toLocaleString("en-IN")}</span>
            </div>
            {report.issues.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No coverage issues found in this scan.
              </p>
            ) : (
              <DataTable>
                <thead>
                  <tr>
                    <Th>Institute</Th>
                    <Th>Category</Th>
                    <Th>Summary</Th>
                    <Th>Recommended action</Th>
                  </tr>
                </thead>
                <tbody>
                  {report.issues.map((issue, idx) => (
                    <Tr key={`${issue.instituteId}-${issue.category}-${idx}`}>
                      <Td className="font-medium">
                        <div>{issue.instituteName}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {issue.instituteCode} · {issue.instituteId.slice(0, 8)}…
                        </div>
                      </Td>
                      <Td>
                        <Pill tone="warning">
                          {issue.category.replace(/_/g, " ")}
                        </Pill>
                      </Td>
                      <Td className="text-xs max-w-[220px]">{issue.summary}</Td>
                      <Td className="text-xs text-muted-foreground max-w-[260px]">
                        {issue.recommendedAction}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </>
        ) : null}
      </div>
    </Card>
  );
}
