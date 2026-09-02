import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  SimpleFileUpload,
  type SimpleUploadValue,
} from "@lumenx/ui";
import { Badge } from "@lumenx/ui";
import { FilePlus } from "lucide-react";
import { toast } from "sonner";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { ApplicationTimelineV2 } from "@/admissions-portal/shared/ui/v2/AdmissionsV2Widgets";
import { EmptyState } from "@/admissions-portal/shared/ui/PageSkeleton";
import { AdmissionsPageHeader } from "@/admissions-portal/shared/ui/AdmissionsPageHeader";
import {
  CORRECTION_FIELD_OPTIONS,
  getApplicationById,
  getCorrectionFieldCurrentValue,
  getCorrectionFieldLabel,
  getWaitlistAgeDays,
  getWaitlistRemainingDays,
  getParentConfirmationRemainingDays,
  joinWaitlist,
  remindInstituteFromWaitlist,
  removeFromWaitlist,
  respondToParentConfirmation,
  resubmitRequestedCorrections,
} from "@/lib/admissions/repositories";
import { useAdmissionsApplication, useAdmissionsApplications } from "@/hooks/use-admissions-applications";
import { statusLabel } from "@/lib/admissions/mock-data";
import { statusTone } from "@/lib/admissions/status-utils";
import type { CorrectionFieldPath, DocumentType } from "@/lib/admissions/types";

export function MyApplicationsPage() {
  const { user } = useAdmissionsAuth();
  const { applications: apps, loading, apiMode, errorMessage } = useAdmissionsApplications();

  if (apiMode && loading) {
    return (
      <EmptyState
        icon={<FilePlus className="size-6" />}
        title="Loading applications"
        hint="Fetching your applications…"
      />
    );
  }

  if (apiMode && errorMessage) {
    return (
      <EmptyState
        icon={<FilePlus className="size-6" />}
        title="Could not load applications"
        hint={errorMessage}
      />
    );
  }

  if (!user || apps.length === 0) {
    return (
      <EmptyState
        icon={<FilePlus className="size-6" />}
        title="No applications yet"
        hint="Start your admission journey with a new application."
        action={
          <Button asChild>
            <Link to="/apply">Apply now</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <AdmissionsPageHeader
        title="My applications"
        subtitle={`${apps.length} application${apps.length !== 1 ? "s" : ""}`}
      />
      <div className="space-y-3">
        {apps.map((app) => (
          <Link
            key={app.id}
            to="/applications/$applicationId"
            params={{ applicationId: app.id }}
            className="block rounded-2xl border border-border bg-card p-4 shadow-soft transition-all motion-safe:hover:border-primary/30"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs text-muted-foreground">{app.id}</p>
                <p className="font-semibold">{app.student.name}</p>
                <p className="text-sm text-muted-foreground">
                  {app.programName} · {app.grade}
                </p>
              </div>
              <Badge variant={statusTone(app.status)}>{statusLabel(app.status)}</Badge>
            </div>
            {app.submittedAt && (
              <p className="mt-2 text-xs text-muted-foreground">
                Submitted {new Date(app.submittedAt).toLocaleDateString("en-IN")}
              </p>
            )}
            {app.status === "parent_confirmation" ? (
              <p className="mt-1 text-xs text-primary">
                {Math.max(getParentConfirmationRemainingDays(app) ?? 0, 0)} day(s) remaining for
                parent confirmation
              </p>
            ) : null}
            {app.status === "waitlisted" ? (
              <p className="mt-1 text-xs text-primary">
                Waitlist age {getWaitlistAgeDays(app) ?? 0} day(s) · {getWaitlistRemainingDays(app) ?? 0} day(s) remaining
              </p>
            ) : null}
          </Link>
        ))}
      </div>
      <Button className="mt-6 w-full" asChild>
        <Link to="/apply">
          <FilePlus className="size-4 mr-2" /> New application
        </Link>
      </Button>
    </div>
  );
}

export function ApplicationStatusPage({ applicationId }: { applicationId: string }) {
  const { user } = useAdmissionsAuth();
  const { application: apiApp, apiMode, status: loadStatus } = useAdmissionsApplication(applicationId);
  const [refreshTick, setRefreshTick] = useState(0);
  const app = useMemo(() => {
    void refreshTick;
    if (apiMode && loadStatus !== "demo") return apiApp ?? null;
    return getApplicationById(applicationId) ?? null;
  }, [apiApp, apiMode, applicationId, loadStatus, refreshTick]);
  const [fieldValues, setFieldValues] = useState<Partial<Record<CorrectionFieldPath, string>>>({});
  const [documentValues, setDocumentValues] = useState<
    Partial<Record<DocumentType, { fileName: string; dataUrl?: string }>>
  >({});
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [showJoinWaitlist, setShowJoinWaitlist] = useState(false);

  useEffect(() => {
    if (!app?.pendingCorrection) {
      setFieldValues({});
      setDocumentValues({});
    } else {
      const nextFields: Partial<Record<CorrectionFieldPath, string>> = {};
      const nextDocs: Partial<Record<DocumentType, { fileName: string; dataUrl?: string }>> = {};
      for (const field of app.pendingCorrection.requestedFields) {
        if (field.startsWith("documents.")) {
          const docType = field.replace("documents.", "") as DocumentType;
          const doc = app.documents.find((item) => item.type === docType);
          if (doc?.fileName) {
            nextDocs[docType] = { fileName: doc.fileName, dataUrl: doc.previewDataUrl };
          }
        } else {
          nextFields[field] = getCorrectionFieldCurrentValue(app, field);
        }
      }
      setFieldValues(nextFields);
      setDocumentValues(nextDocs);
    }
    if (app?.status !== "parent_confirmation") {
      setShowJoinWaitlist(false);
    }
  }, [app]);

  const updateFieldValue = (field: CorrectionFieldPath, value: string) => {
    setFieldValues((prev) => ({ ...prev, [field]: value }));
  };

  const updateDocumentValue = (docType: DocumentType, value: SimpleUploadValue | null) => {
    if (!value) {
      setDocumentValues((prev) => {
        const next = { ...prev };
        delete next[docType];
        return next;
      });
      return;
    }
    setDocumentValues((prev) => ({
      ...prev,
      [docType]: { fileName: value.fileName, dataUrl: value.dataUrl },
    }));
  };

  const resubmitCorrections = () => {
    if (!app || !user) return;
    if (!app.pendingCorrection) return;
    try {
      resubmitRequestedCorrections({
        applicationId: app.id,
        applicantId: user.id,
        fieldValues,
        documentValues,
      });
      toast.success("Corrections submitted. Application moved back to review.");
      setRefreshTick((tick) => tick + 1);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "FIELD_NOT_REQUESTED") {
          toast.error("Only requested fields can be edited.");
          return;
        }
        if (error.message === "NO_PENDING_CORRECTION") {
          toast.error("No active correction request for this application.");
          return;
        }
      }
      toast.error("Could not submit corrections.");
    }
  };

  const remainingDays = app ? getParentConfirmationRemainingDays(app) : null;

  const continueApplication = () => {
    if (!app || !user) return;
    try {
      respondToParentConfirmation({
        applicationId: app.id,
        applicantId: user.id,
        response: "continue",
      });
      toast.success("Application confirmed and approved.");
      setShowJoinWaitlist(false);
      setRefreshTick((tick) => tick + 1);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "PARENT_CONFIRMATION_EXPIRED"
      ) {
        toast.error("Confirmation window expired.");
        setRefreshTick((tick) => tick + 1);
        return;
      }
      if (error instanceof Error && error.message === "SEATS_UNAVAILABLE") {
        toast.error("Seats are currently unavailable. You can join waitlist.");
        setShowJoinWaitlist(true);
        return;
      }
      toast.error("Could not confirm application.");
    }
  };

  const rejectApplication = () => {
    if (!app || !user) return;
    try {
      respondToParentConfirmation({
        applicationId: app.id,
        applicantId: user.id,
        response: "reject",
      });
      toast.success("Application closed.");
      setRejectDialogOpen(false);
      setShowJoinWaitlist(false);
      setRefreshTick((tick) => tick + 1);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "PARENT_CONFIRMATION_EXPIRED"
      ) {
        toast.error("Confirmation window expired.");
        setRejectDialogOpen(false);
        setRefreshTick((tick) => tick + 1);
        return;
      }
      toast.error("Could not close application.");
    }
  };

  const handleJoinWaitlist = () => {
    if (!app || !user) return;
    try {
      joinWaitlist({ applicationId: app.id, applicantId: user.id });
      toast.success("Joined waitlist for 90 days.");
      setShowJoinWaitlist(false);
      setRefreshTick((tick) => tick + 1);
    } catch (error) {
      if (error instanceof Error && error.message === "SEATS_AVAILABLE") {
        toast.info("Seats became available. You can continue directly.");
        setShowJoinWaitlist(false);
        setRefreshTick((tick) => tick + 1);
        return;
      }
      toast.error("Could not join waitlist.");
    }
  };

  const waitlistAge = app ? getWaitlistAgeDays(app) : null;
  const waitlistRemaining = app ? getWaitlistRemainingDays(app) : null;

  const remindInstitute = () => {
    if (!app || !user) return;
    try {
      remindInstituteFromWaitlist({ applicationId: app.id, applicantId: user.id });
      toast.success("Institute reminded. Application moved to top of active waitlist.");
      setRefreshTick((tick) => tick + 1);
    } catch {
      toast.error("Could not remind institute.");
    }
  };

  const removeWaitlist = () => {
    if (!app || !user) return;
    try {
      removeFromWaitlist({ applicationId: app.id, applicantId: user.id });
      toast.success("Removed from waitlist.");
      setRefreshTick((tick) => tick + 1);
    } catch {
      toast.error("Could not remove from waitlist.");
    }
  };

  if (!app) {
    return (
      <EmptyState
        title="Application not found"
        hint="Check the ID or return to your list."
        action={
          <Button asChild>
            <Link to="/applications">My applications</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <AdmissionsPageHeader
        title={app.student.name}
        subtitle={`${app.id} · ${app.programName}`}
        backTo="/applications"
      />

      <div className="mb-6 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Current status</span>
          <Badge
            variant={statusTone(app.status) as "default" | "secondary" | "destructive" | "outline"}
          >
            {statusLabel(app.status)}
          </Badge>
        </div>
        {app.status === "parent_confirmation" && remainingDays !== null ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Remaining time: {remainingDays} day{remainingDays === 1 ? "" : "s"} (7-day window)
          </p>
        ) : null}
      </div>

      {app.status === "parent_confirmation" && remainingDays !== null ? (
        <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <h2 className="text-sm font-semibold">Parent confirmation</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Please respond within 7 days. No response will auto-close this application.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {remainingDays === 0
              ? "Last day to respond."
              : `${remainingDays} day${remainingDays === 1 ? "" : "s"} remaining.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={continueApplication}>Continue</Button>
            <Button variant="destructive" onClick={() => setRejectDialogOpen(true)}>
              Reject
            </Button>
            {showJoinWaitlist ? (
              <Button variant="outline" onClick={handleJoinWaitlist}>
                Join Waitlist
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {app.status === "waitlisted" && waitlistAge !== null && waitlistRemaining !== null ? (
        <div className="mb-6 rounded-2xl border border-warning/30 bg-warning/5 p-4">
          <h2 className="text-sm font-semibold">Waitlist</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Waitlist age: {waitlistAge} day{waitlistAge === 1 ? "" : "s"} · Remaining:{" "}
            {waitlistRemaining} day{waitlistRemaining === 1 ? "" : "s"} (fixed 90 days)
          </p>
          {app.waitlist?.seatAvailableNotifiedAt ? (
            <p className="mt-1 text-xs text-primary">
              Seats became available. Check institute response and continue admission when prompted.
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" onClick={remindInstitute}>
              Remind Institute
            </Button>
            <Button variant="destructive" onClick={removeWaitlist}>
              Remove From Waitlist
            </Button>
          </div>
        </div>
      ) : null}

      {app.requiredActions && app.requiredActions.length > 0 && (
        <div className="mb-6 rounded-2xl border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm font-medium">Required actions</p>
          <ul className="mt-2 list-disc pl-4 text-sm text-muted-foreground">
            {app.requiredActions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          {app.pendingCorrection ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Edit only requested fields below and resubmit. Unlimited correction cycles are
              supported.
            </p>
          ) : (
            <Button className="mt-3" size="sm" variant="outline" asChild>
              <Link to="/documents">Document center</Link>
            </Button>
          )}
        </div>
      )}

      {app.pendingCorrection ? (
        <div className="mb-6 rounded-2xl border border-primary/20 bg-card p-4">
          <h2 className="text-sm font-semibold">Correction request</h2>
          <p className="mt-1 text-xs text-muted-foreground">{app.pendingCorrection.reason}</p>
          <p className="text-xs text-muted-foreground">
            Requested on {new Date(app.pendingCorrection.requestedAt).toLocaleString("en-IN")}
          </p>

          <div className="mt-4 space-y-3">
            {app.pendingCorrection.requestedFields.map((field) => {
              const fieldMeta = CORRECTION_FIELD_OPTIONS.find((item) => item.key === field);
              if (field.startsWith("documents.")) {
                const docType = field.replace("documents.", "") as DocumentType;
                const uploaded = documentValues[docType];
                const uploadValue: SimpleUploadValue | null = uploaded?.fileName
                  ? {
                      fileName: uploaded.fileName,
                      mimeType: uploaded.fileName.toLowerCase().endsWith(".pdf")
                        ? "application/pdf"
                        : "image/jpeg",
                      size: 0,
                      dataUrl: uploaded.dataUrl ?? "",
                    }
                  : null;
                return (
                  <div key={field} className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">{getCorrectionFieldLabel(field)}</p>
                    <SimpleFileUpload
                      kind="document"
                      value={uploadValue}
                      onChange={(next) => updateDocumentValue(docType, next)}
                    />
                  </div>
                );
              }
              const inputType = fieldMeta?.type ?? "text";
              return (
                <div key={field} className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">{getCorrectionFieldLabel(field)}</p>
                  <Input
                    type={inputType}
                    value={fieldValues[field] ?? ""}
                    onChange={(event) => updateFieldValue(field, event.target.value)}
                  />
                </div>
              );
            })}
          </div>

          <Button className="mt-4" onClick={resubmitCorrections}>
            Resubmit to Review
          </Button>
        </div>
      ) : null}

      <h2 className="mb-4 text-sm font-semibold">Application timeline</h2>
      <ApplicationTimelineV2 events={app.timeline} currentStatus={app.status} />

      {app.adminNotes && app.adminNotes.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-4">
          <h2 className="text-sm font-semibold">Notes from admissions</h2>
          {app.adminNotes.map((n, i) => (
            <p key={i} className="mt-2 text-sm text-muted-foreground">
              {n}
            </p>
          ))}
        </div>
      )}

      {app.correctionHistory && app.correctionHistory.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Correction history</h2>
          <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
            {[...app.correctionHistory].reverse().map((cycle) => (
              <li key={cycle.id} className="rounded-lg border border-border px-3 py-2">
                <p className="font-medium text-foreground">{cycle.reason}</p>
                <p>
                  Requested {new Date(cycle.requestedAt).toLocaleString("en-IN")}
                  {cycle.resubmittedAt
                    ? ` · Resubmitted ${new Date(cycle.resubmittedAt).toLocaleString("en-IN")}`
                    : " · Awaiting resubmission"}
                </p>
                <p>
                  Fields: {cycle.requestedFields.map((field) => getCorrectionFieldLabel(field)).join(", ")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this application?</DialogTitle>
            <DialogDescription>
              This will close the application. You can continue without dialog, but reject requires
              explicit confirmation.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={rejectApplication}>
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
