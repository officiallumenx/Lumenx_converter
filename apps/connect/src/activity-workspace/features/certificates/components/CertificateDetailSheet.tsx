import type { ReactNode } from "react";
import {
  Download,
  Eye,
  Printer,
  RefreshCw,
  Share2,
  ShieldX,
} from "lucide-react";
import {
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@lumenx/ui";
import type { ActivityCertificate } from "@/lib/activity/certificates/types";
import {
  CERTIFICATE_CATEGORY_LABELS,
  CERTIFICATE_STATUS_LABELS,
} from "@/lib/activity/certificates/types";
import { ACHIEVEMENT_SOURCE_MODULE_LABELS } from "@/lib/activity/achievements/types";
import { CertificatePreviewFrame } from "./CertificatePreviewFrame";

export function CertificateDetailSheet({
  certificate,
  open,
  onOpenChange,
  onPreview,
  onReissue,
  onRevoke,
  onDownload,
  onShare,
  onPrint,
}: {
  certificate: ActivityCertificate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPreview: (certificate: ActivityCertificate) => void;
  onReissue: (certificate: ActivityCertificate) => void;
  onRevoke: (certificate: ActivityCertificate) => void;
  onDownload: (certificate: ActivityCertificate) => void;
  onShare: (certificate: ActivityCertificate) => void;
  onPrint: (certificate: ActivityCertificate) => void;
}) {
  if (!certificate) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-left">Certificate Details</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6 pb-8">
          <div>
            <h3 className="font-display text-xl font-semibold">
              {certificate.achievementRef.achievementTitle}
            </h3>
            <p className="font-mono text-sm text-muted-foreground">{certificate.certificateNumber}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">{CERTIFICATE_STATUS_LABELS[certificate.status]}</Badge>
              <Badge variant="outline">{CERTIFICATE_CATEGORY_LABELS[certificate.category]}</Badge>
              {certificate.reissueCount > 0 ? (
                <Badge variant="outline">Reissued ×{certificate.reissueCount}</Badge>
              ) : null}
            </div>
          </div>

          <CertificatePreviewFrame certificate={certificate} className="scale-[0.98]" />

          <Section title="Student">
            <InfoRow label="Student" value={certificate.studentName} />
            <InfoRow label="Class" value={certificate.studentClassLabel} />
            {certificate.teamName ? <InfoRow label="Team" value={certificate.teamName} /> : null}
          </Section>

          <Section title="Achievement reference">
            <InfoRow label="Achievement" value={certificate.achievementRef.achievementTitle} />
            <InfoRow
              label="Source module"
              value={ACHIEVEMENT_SOURCE_MODULE_LABELS[certificate.achievementRef.sourceModule]}
            />
            <InfoRow label="Achievement ID" value={certificate.achievementRef.achievementId} />
          </Section>

          <Section title="Certificate metadata">
            <InfoRow label="Template" value={certificate.templateName} />
            <InfoRow label="Issue date" value={certificate.issueDate} />
            <InfoRow label="Verification ID" value={certificate.verificationId} />
            <InfoRow label="QR verification URL" value={certificate.qrVerificationUrl} />
            {certificate.reissuedFromId ? (
              <InfoRow label="Reissued from" value={certificate.reissuedFromId} />
            ) : null}
            {certificate.revokedAt ? (
              <>
                <InfoRow label="Revoked on" value={certificate.revokedAt} />
                <InfoRow label="Reason" value={certificate.revokeReason ?? "—"} />
              </>
            ) : null}
          </Section>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => onPreview(certificate)}
            >
              <Eye className="size-4" />
              Preview
            </Button>
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => onDownload(certificate)}
              disabled={certificate.status === "revoked"}
            >
              <Download className="size-4" />
              Download
            </Button>
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => onShare(certificate)}
              disabled={certificate.status === "revoked"}
            >
              <Share2 className="size-4" />
              Share
            </Button>
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => onPrint(certificate)}
              disabled={certificate.status === "revoked"}
            >
              <Printer className="size-4" />
              Print
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {certificate.status === "issued" ? (
              <Button
                variant="outline"
                className="rounded-xl gap-2"
                onClick={() => onReissue(certificate)}
              >
                <RefreshCw className="size-4" />
                Reissue Certificate
              </Button>
            ) : null}
            {certificate.status !== "revoked" ? (
              <Button
                variant="outline"
                className="rounded-xl gap-2 text-destructive hover:text-destructive"
                onClick={() => onRevoke(certificate)}
              >
                <ShieldX className="size-4" />
                Revoke Certificate
              </Button>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <div className="space-y-2 rounded-2xl border border-border bg-muted/5 p-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
      <p className="break-all text-sm">{value}</p>
    </div>
  );
}
