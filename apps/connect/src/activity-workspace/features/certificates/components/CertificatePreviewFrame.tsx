import { QrCode } from "lucide-react";
import { Badge, cn } from "@lumenx/ui";
import type { ActivityCertificate } from "@/lib/activity/certificates/types";
import {
  CERTIFICATE_CATEGORY_LABELS,
  CERTIFICATE_TEMPLATE_LAYOUT_LABELS,
} from "@/lib/activity/certificates/types";
import { getCertificateTemplate } from "@/lib/activity/certificates/templates";

export function CertificatePreviewFrame({
  certificate,
  className,
}: {
  certificate: ActivityCertificate;
  className?: string;
}) {
  const template = getCertificateTemplate(certificate.templateId);
  const layout = template?.layout ?? "classic";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 bg-gradient-to-br p-6 text-center print:shadow-none",
        layout === "classic" && "border-primary/30 from-primary/5 to-primary/10",
        layout === "modern" && "border-slate-300 from-slate-50 to-white",
        layout === "formal" && "border-amber-600/40 from-amber-50/80 to-white",
        className,
      )}
      id="certificate-preview-print"
    >
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Certificate of Achievement
      </div>
      <div className="mt-1 font-mono text-[10px] text-muted-foreground">
        {certificate.certificateNumber}
      </div>

      <div className="mt-4 font-display text-xl font-semibold leading-tight">
        {certificate.achievementRef.achievementTitle}
      </div>

      <p className="mt-3 text-sm text-muted-foreground">This is to certify that</p>
      <div className="mt-1 font-display text-2xl font-bold text-foreground">
        {certificate.studentName}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Class {certificate.studentClassLabel}
        {certificate.teamName ? ` · ${certificate.teamName}` : ""}
      </p>

      <p className="mx-auto mt-4 max-w-sm text-xs leading-relaxed text-muted-foreground">
        Has been recognized for outstanding achievement in{" "}
        {CERTIFICATE_CATEGORY_LABELS[certificate.category].toLowerCase()} activities.
      </p>

      <div className="mt-5 flex items-end justify-between gap-4 px-2">
        <div className="text-left text-[10px] text-muted-foreground">
          <p>Issued: {certificate.issueDate}</p>
          <p className="mt-1 font-mono">{certificate.verificationId}</p>
          <Badge variant="outline" className="mt-2 text-[10px]">
            {certificate.templateName}
          </Badge>
        </div>

        <div
          className="grid size-16 shrink-0 place-items-center rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30"
          aria-label="QR verification placeholder"
        >
          <QrCode className="size-8 text-muted-foreground/60" aria-hidden />
        </div>
      </div>

      <p className="mt-3 text-[9px] text-muted-foreground/80">
        {CERTIFICATE_TEMPLATE_LAYOUT_LABELS[layout]} layout · Scan QR to verify (mock)
      </p>
      <p className="mt-1 truncate font-mono text-[9px] text-muted-foreground/60">
        {certificate.qrVerificationUrl}
      </p>
    </div>
  );
}
