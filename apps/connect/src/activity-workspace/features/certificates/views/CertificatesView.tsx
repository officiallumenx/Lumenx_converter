import { useState } from "react";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@lumenx/ui";
import { EmptyState } from "@/teacher-portal/shared/ui/EmptyState";
import { PageSkeleton } from "@/activity-workspace/shared/ui/PageSkeleton";
import { certificatesRepository } from "@/lib/activity/certificates/repositories";
import type {
  ActivityCertificate,
  ActivityCertificateInput,
} from "@/lib/activity/certificates/types";
import { useCertificates } from "../hooks/useCertificates";
import { CertificatesToolbar } from "../components/CertificatesToolbar";
import { CertificateCard } from "../components/CertificateCard";
import { CertificateDetailSheet } from "../components/CertificateDetailSheet";
import { CertificateGenerateDialog } from "../components/CertificateGenerateDialog";
import { CertificatePreviewFrame } from "../components/CertificatePreviewFrame";

type ConfirmAction = "reissue" | "revoke" | null;

export function CertificatesView() {
  const {
    certificates,
    templates,
    studentOptions,
    teamOptions,
    achievementOptions,
    filters,
    isLoading,
    refresh,
    updateFilters,
  } = useCertificates();

  const [selected, setSelected] = useState<ActivityCertificate | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<ActivityCertificate | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [confirmTarget, setConfirmTarget] = useState<ActivityCertificate | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const availableAchievements = achievementOptions.filter((a) => !a.hasCertificate);

  const openGenerate = () => {
    if (availableAchievements.length === 0) {
      toast.error("No achievement available", {
        description: "Award achievements first, or all awarded achievements already have certificates.",
      });
      return;
    }
    setGenerateOpen(true);
  };

  const openDetail = (certificate: ActivityCertificate) => {
    setSelected(certificate);
    setDetailOpen(true);
  };

  const handleGenerate = async (input: ActivityCertificateInput) => {
    try {
      const created = await certificatesRepository.generateCertificate(input);
      toast.success("Certificate generated & issued", {
        description: `${created.certificateNumber} — ${created.studentName}`,
      });
      refresh();
    } catch (err) {
      toast.error("Could not generate certificate", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const runConfirm = async () => {
    if (!confirmTarget || !confirmAction) return;
    try {
      if (confirmAction === "reissue") {
        const reissued = await certificatesRepository.reissueCertificate(confirmTarget.id);
        toast.success("Certificate reissued", {
          description: `${reissued.certificateNumber} (from ${confirmTarget.certificateNumber})`,
        });
        setSelected(reissued);
      } else if (confirmAction === "revoke") {
        const revoked = await certificatesRepository.revokeCertificate(
          confirmTarget.id,
          revokeReason,
        );
        toast.success("Certificate revoked", { description: revoked.certificateNumber });
        setSelected(revoked);
      }
      refresh();
    } catch (err) {
      toast.error("Action failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setConfirmAction(null);
      setConfirmTarget(null);
      setRevokeReason("");
    }
  };

  const handlePreview = (certificate: ActivityCertificate) => {
    setPreviewTarget(certificate);
    setPreviewOpen(true);
  };

  const handleDownload = (certificate: ActivityCertificate) => {
    toast.success("Certificate downloaded (mock)", {
      description: `${certificate.certificateNumber}.pdf — ready for PDF generation backend.`,
    });
  };

  const handleShare = (certificate: ActivityCertificate) => {
    toast.success("Share link copied (mock)", {
      description: certificate.qrVerificationUrl,
    });
  };

  const handlePrint = (certificate: ActivityCertificate) => {
    setPreviewTarget(certificate);
    setPreviewOpen(true);
    requestAnimationFrame(() => window.print());
  };

  if (isLoading) {
    return <PageSkeleton rows={5} />;
  }

  const hasFilters =
    (filters.query?.trim().length ?? 0) > 0 ||
    filters.templateId !== "all" ||
    filters.category !== "all" ||
    filters.studentId !== "all" ||
    filters.teamId !== "all" ||
    filters.status !== "all" ||
    filters.date !== "all";

  return (
    <div className="min-w-0 space-y-4">
      <CertificatesToolbar
        filters={filters}
        onFiltersChange={updateFilters}
        onGenerate={openGenerate}
        totalCount={certificates.length}
        templates={templates}
        studentOptions={studentOptions}
        teamOptions={teamOptions}
      />

      {certificates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={hasFilters ? "No certificates match your filters" : "No certificates yet"}
          description={
            hasFilters
              ? "Try adjusting search or filters."
              : availableAchievements.length === 0
                ? "Award achievements first, then generate certificates from them."
                : "Generate certificates from awarded achievements for student profiles."
          }
          action={
            !hasFilters && availableAchievements.length > 0 ? (
              <button
                type="button"
                onClick={openGenerate}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Generate Certificate
              </button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {certificates.map((certificate) => (
            <li key={certificate.id}>
              <CertificateCard certificate={certificate} onClick={() => openDetail(certificate)} />
            </li>
          ))}
        </ul>
      )}

      <CertificateDetailSheet
        certificate={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onPreview={handlePreview}
        onReissue={(c) => {
          setConfirmAction("reissue");
          setConfirmTarget(c);
          setDetailOpen(false);
        }}
        onRevoke={(c) => {
          setConfirmAction("revoke");
          setConfirmTarget(c);
          setDetailOpen(false);
        }}
        onDownload={handleDownload}
        onShare={handleShare}
        onPrint={handlePrint}
      />

      <CertificateGenerateDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        achievementOptions={achievementOptions}
        templates={templates}
        onSubmit={handleGenerate}
      />

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg rounded-2xl print:max-w-none print:border-0 print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>Certificate Preview</DialogTitle>
          </DialogHeader>
          {previewTarget ? <CertificatePreviewFrame certificate={previewTarget} /> : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(o) => {
          if (!o) {
            setConfirmAction(null);
            setConfirmTarget(null);
            setRevokeReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "reissue" ? "Reissue certificate?" : "Revoke certificate?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget && confirmAction === "reissue"
                ? `Issue a new certificate for ${confirmTarget.studentName}? A new certificate number and verification ID will be generated.`
                : confirmTarget
                  ? `Revoke ${confirmTarget.certificateNumber}? This cannot be undone and the verification link will be invalidated.`
                  : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmAction === "revoke" ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Revocation reason</Label>
              <Input
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Optional reason for audit trail"
                className="rounded-xl"
              />
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void runConfirm()}>
              {confirmAction === "reissue" ? "Reissue" : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
