import { useEffect, useState } from "react";
import { Button, Modal, Pill } from "@lumenx/ui-admin";
import {
  getAdmissionDocumentSignedUrl,
  listAdmissionDocuments,
  updateAdmissionDocument,
} from "@/lib/admissions";
import type { AdmissionDocumentDto } from "@/lib/admissions/types";
import { useAdminToast } from "@/components/AdminActionToast";

type AdmissionDocumentsApiPanelProps = {
  applicationId: string;
  applicationName: string;
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
};

const STATUS_TONE: Record<
  AdmissionDocumentDto["status"],
  "success" | "warning" | "neutral" | "danger"
> = {
  not_uploaded: "neutral",
  uploaded: "warning",
  under_review: "warning",
  verified: "success",
  rejected: "danger",
  resubmission_required: "warning",
};

export function AdmissionDocumentsApiPanel({
  applicationId,
  applicationName,
  open,
  onClose,
  onChanged,
}: AdmissionDocumentsApiPanelProps) {
  const notify = useAdminToast();
  const [docs, setDocs] = useState<AdmissionDocumentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void listAdmissionDocuments(applicationId)
      .then((rows) => {
        if (!cancelled) setDocs(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setDocs([]);
          notify(err instanceof Error ? err.message : "Failed to load documents");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applicationId, open, notify]);

  const runStatus = (
    doc: AdmissionDocumentDto,
    status: AdmissionDocumentDto["status"],
    note?: string,
  ) => {
    setBusyId(doc.id);
    void updateAdmissionDocument(doc.id, { status, note })
      .then(() => {
        notify(`${doc.label} · ${status.replace(/_/g, " ")}`);
        onChanged?.();
        return listAdmissionDocuments(applicationId);
      })
      .then(setDocs)
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to update document");
      })
      .finally(() => setBusyId(null));
  };

  const preview = (doc: AdmissionDocumentDto) => {
    void getAdmissionDocumentSignedUrl(doc.id)
      .then(({ signedUrl }) => {
        window.open(signedUrl, "_blank", "noopener,noreferrer");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Preview unavailable");
      });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Admission documents"
      subtitle={`${applicationName} · ${applicationId}`}
      size="lg"
      footer={<Button onClick={onClose}>Close</Button>}
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading documents…</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{doc.label}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {doc.fileName ?? "No file"}
                </p>
                {doc.note ? (
                  <p className="text-xs text-destructive mt-0.5">{doc.note}</p>
                ) : null}
              </div>
              <Pill tone={STATUS_TONE[doc.status]}>{doc.status.replace(/_/g, " ")}</Pill>
              <Button size="sm" variant="outline" onClick={() => preview(doc)}>
                Preview
              </Button>
              <Button
                size="sm"
                disabled={busyId === doc.id}
                onClick={() => runStatus(doc, "verified")}
              >
                Verify
              </Button>
              <Button
                size="sm"
                disabled={busyId === doc.id}
                onClick={() =>
                  runStatus(doc, "resubmission_required", "Please re-upload.")
                }
              >
                Resubmit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                disabled={busyId === doc.id}
                onClick={() => runStatus(doc, "rejected", "Rejected by admin.")}
              >
                Reject
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
