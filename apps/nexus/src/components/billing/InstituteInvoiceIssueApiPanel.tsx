/**
 * Nexus — issue subscription invoices (PDF) for an institute · API mode.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  Field,
  FormGrid,
  Pill,
  Select,
} from "@lumenx/ui-admin";
import { Download, FileText } from "lucide-react";
import {
  getRenewalInvoicePdf,
  issueInvoiceFromSubscription,
  listRenewals,
} from "@/lib/billing/api";
import type { RenewalRecordDto } from "@/lib/billing/api-types";

function formatInr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function openPdf(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function InstituteInvoiceIssueApiPanel({
  instituteId,
  instituteName,
}: {
  instituteId: string;
  instituteName?: string;
}) {
  const [renewals, setRenewals] = useState<RenewalRecordDto[]>([]);
  const [duration, setDuration] = useState<1 | 6 | 12>(12);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listRenewals(instituteId);
      setRenewals(rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [instituteId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onIssue = async () => {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const result = await issueInvoiceFromSubscription({
        instituteId,
        durationMonths: duration,
      });
      setFlash(`Issued ${result.renewal.invoiceNumber}`);
      openPdf(result.pdf.signedUrl);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Issue failed");
    } finally {
      setBusy(false);
    }
  };

  const onDownload = async (renewalId: string) => {
    setError(null);
    try {
      const pdf = await getRenewalInvoicePdf(renewalId);
      openPdf(pdf.signedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF download failed");
    }
  };

  const issued = renewals.filter((r) => r.status !== "draft");

  return (
    <Card className="mb-4">
      <CardHeader
        title="Issue invoice (PDF)"
        hint={
          instituteName
            ? `${instituteName} · offline payment · no online gateway`
            : "POST /api/nexus/billing/renewals/issue-invoice"
        }
        action={<FileText className="size-4 text-muted-foreground" />}
      />
      <div className="px-5 pb-5 space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {flash ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{flash}</p> : null}

        <FormGrid>
          <Field label="Duration">
            <Select
              value={String(duration)}
              onChange={(e) => setDuration(Number(e.target.value) as 1 | 6 | 12)}
            >
              <option value="1">1 month</option>
              <option value="6">6 months</option>
              <option value="12">12 months</option>
            </Select>
          </Field>
        </FormGrid>

        <Button disabled={busy} onClick={() => void onIssue()}>
          <FileText className="size-3.5" /> {busy ? "Issuing…" : "Issue invoice PDF"}
        </Button>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading invoices…</p>
        ) : issued.length === 0 ? (
          <p className="text-sm text-muted-foreground">No issued invoices yet.</p>
        ) : (
          <div className="space-y-2">
            {issued.map((row) => (
              <div
                key={row.id}
                className="rounded-lg border border-border px-3 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <div className="font-medium">{row.invoiceNumber}</div>
                  <div className="text-muted-foreground">
                    {row.periodStartsAt.slice(0, 10)} → {row.periodEndsAt.slice(0, 10)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="font-mono font-semibold">{formatInr(row.payableAmountInr)}</div>
                    <Pill tone={row.status === "paid" ? "success" : "neutral"}>{row.status}</Pill>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void onDownload(row.id)}
                  >
                    <Download className="size-3.5" /> PDF
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
