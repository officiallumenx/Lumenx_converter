import { Calendar, ChevronRight, FileText } from "lucide-react";
import { Badge, cn } from "@lumenx/ui";
import type { ActivityCertificate } from "@/lib/activity/certificates/types";
import {
  CERTIFICATE_CATEGORY_LABELS,
  CERTIFICATE_STATUS_LABELS,
} from "@/lib/activity/certificates/types";
import { ACHIEVEMENT_SOURCE_MODULE_LABELS } from "@/lib/activity/achievements/types";

const STATUS_TONE: Record<ActivityCertificate["status"], string> = {
  draft: "border-muted-foreground/30 text-muted-foreground",
  issued: "border-success/30 text-success",
  revoked: "border-destructive/30 text-destructive",
};

export function CertificateCard({
  certificate,
  onClick,
}: {
  certificate: ActivityCertificate;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-w-0 w-full items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        certificate.status === "revoked" && "opacity-80",
      )}
    >
      <div
        className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
        aria-hidden
      >
        <FileText className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm">{certificate.achievementRef.achievementTitle}</span>
          <Badge variant="outline" className="text-[10px] font-mono">
            {certificate.certificateNumber}
          </Badge>
          <Badge
            variant="outline"
            className={cn("text-[10px]", STATUS_TONE[certificate.status])}
          >
            {CERTIFICATE_STATUS_LABELS[certificate.status]}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {certificate.studentName} · {certificate.studentClassLabel}
          {certificate.teamName ? ` · ${certificate.teamName}` : ""}
        </p>
        <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
          {certificate.templateName} · {CERTIFICATE_CATEGORY_LABELS[certificate.category]}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="size-3" aria-hidden />
            {certificate.issueDate}
          </span>
          <span>
            {ACHIEVEMENT_SOURCE_MODULE_LABELS[certificate.achievementRef.sourceModule]}
          </span>
          <span className="font-mono">{certificate.verificationId}</span>
        </div>
      </div>
      <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}
