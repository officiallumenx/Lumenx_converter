import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Award, CheckCircle2, QrCode, ScanLine, XCircle } from "lucide-react";
import { Button, Input, cn } from "@lumenx/ui";
import { LumenXLogo } from "@/components/app/LumenXLogo";
import {
  parseCertificateVerifyUrl,
  verifyCertificatePublic,
  type PublicCertificateVerifyDto,
} from "@/lib/certificates";
import { SafeQrCode } from "@/components/app/id-card/SafeQrCode";

const searchSchema = z.object({
  institute_id: z.string().optional(),
  number: z.string().optional(),
});

export const Route = createFileRoute("/verify-certificate")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Verify Certificate — LumenX Connect" },
      { name: "description", content: "Verify an issued school certificate by number or QR scan." },
    ],
  }),
  component: VerifyCertificatePage,
});

function VerifyCertificatePage() {
  const search = Route.useSearch();
  const [instituteId, setInstituteId] = useState(search.institute_id ?? "");
  const [certificateNumber, setCertificateNumber] = useState(search.number ?? "");
  const [scanInput, setScanInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PublicCertificateVerifyDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (search.institute_id && search.number) {
      void runVerify(search.institute_id, search.number);
    }
  }, [search.institute_id, search.number]);

  const runVerify = async (institute: string, number: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await verifyCertificatePublic({
        instituteId: institute.trim(),
        certificateNumber: number.trim(),
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const applyScan = () => {
    const parsed = parseCertificateVerifyUrl(scanInput.trim());
    if (!parsed) {
      setError("Paste a valid certificate verify link or scan QR from the certificate.");
      return;
    }
    setInstituteId(parsed.instituteId);
    setCertificateNumber(parsed.certificateNumber);
    void runVerify(parsed.instituteId, parsed.certificateNumber);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <LumenXLogo className="h-8" />
          <h1 className="font-display text-xl font-semibold tracking-tight">Verify certificate</h1>
          <p className="text-sm text-muted-foreground">
            Scan the QR on a certificate or enter the certificate number — no login required.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <QrCode className="size-3.5" /> Back to Connect login
          </Link>
        </div>

        <section className="rounded-2xl border bg-card p-5 shadow-soft space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ScanLine className="size-4 text-primary" />
            Scan or paste verify link
          </div>
          <Input
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            placeholder="Paste QR link from certificate…"
            className="rounded-xl font-mono text-xs"
          />
          <Button type="button" variant="outline" className="w-full rounded-xl" onClick={applyScan}>
            Parse link
          </Button>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-soft space-y-4">
          <p className="text-sm font-medium">Or enter details manually</p>
          <Input
            value={instituteId}
            onChange={(e) => setInstituteId(e.target.value)}
            placeholder="Institute ID (UUID)"
            className="rounded-xl font-mono text-xs"
          />
          <Input
            value={certificateNumber}
            onChange={(e) => setCertificateNumber(e.target.value)}
            placeholder="Certificate number e.g. CERT/2026/0001"
            className="rounded-xl font-mono text-xs"
          />
          <Button
            type="button"
            className="w-full rounded-xl"
            disabled={loading || !instituteId.trim() || !certificateNumber.trim()}
            onClick={() => void runVerify(instituteId, certificateNumber)}
          >
            {loading ? "Verifying…" : "Verify"}
          </Button>
        </section>

        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-center text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {result ? (
          <article
            className={cn(
              "rounded-2xl border p-6 text-center shadow-soft",
              result.valid
                ? "border-success/30 bg-success/5"
                : "border-destructive/30 bg-destructive/5",
            )}
          >
            <div className="flex justify-center">
              {result.valid ? (
                <CheckCircle2 className="size-10 text-success" />
              ) : (
                <XCircle className="size-10 text-destructive" />
              )}
            </div>
            <p className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
              {result.instituteName}
            </p>
            <h2 className="mt-1 font-display text-lg font-semibold">{result.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{result.recipientName}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{result.certificateNumber}</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
              <Award className="size-3.5" />
              {result.valid ? "Valid · Issued" : `Invalid · ${result.status}`}
            </div>
            {result.issuedAt ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Issued {new Date(result.issuedAt).toLocaleDateString("en-IN")}
              </p>
            ) : null}
            {result.revokeReason ? (
              <p className="mt-2 text-xs text-destructive">{result.revokeReason}</p>
            ) : null}
            <div className="mt-5 flex justify-center">
              <SafeQrCode
                value={typeof window !== "undefined" ? window.location.href : ""}
                size={96}
              />
            </div>
          </article>
        ) : null}
      </div>
    </div>
  );
}
