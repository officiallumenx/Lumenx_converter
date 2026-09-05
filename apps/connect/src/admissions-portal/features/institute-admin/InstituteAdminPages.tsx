import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Badge,
  cn,
} from "@lumenx/ui";
import {
  Building2,
  Calendar,
  ClipboardList,
  FileText,
  Pencil,
  Plus,
  Save,
  Trash2,
  Users,
  CheckCircle2,
  Clock,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { DemoInstituteProfile } from "@lumenx/types";
import { applyInstituteProfileSyncMessage, normalizeInstituteProfile } from "@lumenx/utils";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { AdmissionsPageHeader } from "@/admissions-portal/shared/ui/AdmissionsPageHeader";
import { StatCard } from "@/components/app/StatCard";
import { AdminInstituteProfileEditor } from "@/admissions-portal/features/institutes/AdminInstituteProfileEditor";
import { AdminInstituteProfileView } from "@/admissions-portal/features/institutes/AdminInstituteProfileView";
import { InstituteApplicationDossier } from "@/admissions-portal/features/institute-admin/InstituteApplicationDossier";
import {
  FORM_FIELD_TYPES,
  formFieldTypeLabel,
  getAdmissionForm,
  getApplicationsForInstitute,
  getInstituteApplicationStats,
  getInstituteProfileForAdmin,
  newFormFieldId,
  saveAdmissionForm,
  updateApplicationByInstituteAdmin,
} from "@/lib/admissions/institute-admin";
import { getInstituteById } from "@/lib/admissions/institutes-data";
import {
  getAdmissionsInstituteProfile,
  saveAdmissionsInstituteProfile,
  subscribeSharedInstituteProfile,
} from "@/lib/admissions/shared-institute-profile";
import {
  bulkDeleteInstituteWaitlist,
  CORRECTION_FIELD_OPTIONS,
  getAllApplications,
  getInstituteWaitlist,
  getWaitlistAgeDays,
  getCorrectionFieldLabel,
  moveApplicationToParentConfirmation,
  requestApplicationCorrectionByInstitute,
  updateApplication,
} from "@/lib/admissions/repositories";
import { statusLabel } from "@/lib/admissions/mock-data";
import { statusTone } from "@/lib/admissions/status-utils";
import {
  adminStageToStatus,
  applicationToSyncRow,
  type AdminAdmissionStage,
} from "@/lib/admissions/admin-bridge";
import type { AdmissionFormField, ApplicationDocument, CorrectionFieldPath } from "@/lib/admissions/types";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import {
  demoProfileToSettingsPatch,
  loadInstituteProfileForAdmin,
  updateInstituteSettings,
} from "@/lib/institute-profile";
import {
  loadApplicationDocuments,
  verifyApplicationDocument,
  openAdmissionDocumentPreview,
} from "@/lib/admissions/documents-service";
import { ensureDemoOpenings, getOpeningsForInstitute } from "@/lib/admissions/openings-store";

const BOARD_STAGES: { id: AdminAdmissionStage; label: string }[] = [
  { id: "submitted", label: "Submitted" },
  { id: "review", label: "Review" },
  { id: "verification", label: "Verification" },
  { id: "parent_confirmation", label: "Parent Confirmation" },
  { id: "waitlisted", label: "Waitlist" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "withdrawn", label: "Withdrawn" },
];

type AdmissionBoardStage = (typeof BOARD_STAGES)[number]["id"];

function toBoardStage(stage: AdminAdmissionStage): AdmissionBoardStage {
  return stage;
}

function useInstituteContext() {
  const { user } = useAdmissionsAuth();
  const instituteId = user?.instituteId ?? "";
  const profile = instituteId
    ? getInstituteProfileForAdmin(instituteId, user?.instituteName)
    : undefined;
  return { user, instituteId, profile };
}

export function InstituteAdminDashboardPage() {
  const { user, instituteId, profile } = useInstituteContext();
  const [refreshTick, setRefreshTick] = useState(0);
  const apps = getAllApplications();
  const stats = useMemo(() => getInstituteApplicationStats(instituteId, apps), [instituteId, apps]);
  const recent = useMemo(
    () => getApplicationsForInstitute(instituteId, apps).slice(0, 5),
    [instituteId, apps],
  );
  const waitlist = useMemo(() => {
    void refreshTick;
    return getInstituteWaitlist(instituteId);
  }, [instituteId, refreshTick]);
  const waitlistOldestAge = useMemo(() => {
    if (waitlist.length === 0) return 0;
    return Math.max(...waitlist.map((app) => getWaitlistAgeDays(app) ?? 0));
  }, [waitlist]);

  useEffect(() => {
    if (instituteId) ensureDemoOpenings(instituteId);
  }, [instituteId]);

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <AdmissionsPageHeader
        title={profile?.name ?? user?.instituteName ?? "Institute dashboard"}
        subtitle="Manage openings, forms, and applications"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total applications" value={String(stats.total)} icon={Users} />
        <StatCard label="Pending review" value={String(stats.pending)} icon={Clock} />
        <StatCard
          label="Approved"
          value={String(stats.approved)}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard label="Rejected" value={String(stats.rejected)} icon={XCircle} tone="warning" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Waitlist age</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {waitlist.length} active · oldest {waitlistOldestAge} day(s)
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            disabled={waitlist.length === 0}
            onClick={() => {
              const deleted = bulkDeleteInstituteWaitlist(instituteId);
              if (deleted === 0) {
                toast.info("No waitlist applications to delete.");
                return;
              }
              setRefreshTick((tick) => tick + 1);
              toast.success(`Deleted ${deleted} waitlist application(s).`);
            }}
          >
            Bulk Delete Waitlist
          </Button>
        </div>
      </div>

      {getOpeningsForInstitute(instituteId).filter((o) => o.status === "open").length === 0 ? (
        <div className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-4 sm:p-5">
          <h2 className="text-sm font-semibold">Get started</h2>
          <p className="mt-1 text-xs text-muted-foreground max-w-xl">
            Publish a class opening so parents can apply. Then review applications here and
            enroll approved students in LumenX Admin when you use that product.
          </p>
          <ol className="mt-3 space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
            <li>Publish an opening with seats and a deadline</li>
            <li>Adjust your application form if needed</li>
            <li>Share your institute profile with parents</li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link to="/admissions/institute/openings">Publish opening</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/admissions/institute/form">Application form</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/admissions/institute/profile">Institute profile</Link>
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Calendar className="size-4 text-primary" /> Institute profile
          </h2>
          <p className="text-sm text-muted-foreground">
            Keep vision, contact, and achievements up to date for parents.
          </p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link to="/admissions/institute/profile">Edit profile</Link>
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <FileText className="size-4 text-primary" /> Form & openings
          </h2>
          <p className="text-sm text-muted-foreground">
            {getAdmissionForm(instituteId).fields.length} form fields ·{" "}
            {getOpeningsForInstitute(instituteId).filter((o) => o.status === "open").length}{" "}
            published openings
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admissions/institute/form">Application form</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admissions/institute/openings">Openings</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Users className="size-4 text-primary" /> Applications
          </h2>
          <p className="text-sm text-muted-foreground">
            Admissions pipeline: submitted → review → verification → parent confirmation.
          </p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link to="/admissions/institute/applications">Open applications</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Recent applications</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admissions/institute/applications">View all</Link>
          </Button>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No applications yet.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((a) => (
              <Link
                key={a.id}
                to="/admissions/institute/applications/$applicationId"
                params={{ applicationId: a.id }}
                className="flex items-center justify-between rounded-xl border border-border p-3 text-sm hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-medium">{a.student.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.programName} · {a.grade}
                  </p>
                </div>
                <Badge variant={statusTone(a.status)}>{statusLabel(a.status)}</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function InstituteApplicationsPage() {
  const { instituteId } = useInstituteContext();
  const apps = getAllApplications();
  const list = useMemo(
    () => getApplicationsForInstitute(instituteId, apps),
    [instituteId, apps],
  );
  const [stageFilter, setStageFilter] = useState<AdmissionBoardStage | "all">("all");

  const counts = useMemo(() => {
    const map: Record<AdmissionBoardStage, number> = {
      submitted: 0,
      review: 0,
      verification: 0,
      parent_confirmation: 0,
      waitlisted: 0,
      approved: 0,
      rejected: 0,
      withdrawn: 0,
    };
    for (const app of list) {
      map[toBoardStage(applicationToSyncRow(app).stage)] += 1;
    }
    return map;
  }, [list]);

  const filtered = useMemo(() => {
    if (stageFilter === "all") return list;
    return list.filter((a) => toBoardStage(applicationToSyncRow(a).stage) === stageFilter);
  }, [list, stageFilter]);

  return (
    <div className="animate-in fade-in duration-300 space-y-5">
      <AdmissionsPageHeader
        title="Applications"
        subtitle={`${list.length} application${list.length !== 1 ? "s" : ""} received`}
      />

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          type="button"
          onClick={() => setStageFilter("all")}
          aria-pressed={stageFilter === "all"}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            stageFilter === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          All · {list.length}
        </button>
        {BOARD_STAGES.map((s) => (
          <button
            type="button"
            key={s.id}
            onClick={() => setStageFilter(s.id)}
            aria-pressed={stageFilter === s.id}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              stageFilter === s.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label} · {counts[s.id]}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((a) => {
          const stage = toBoardStage(applicationToSyncRow(a).stage);
          const stageLabel = BOARD_STAGES.find((s) => s.id === stage)?.label ?? stage;
          return (
            <Link
              key={a.id}
              to="/admissions/institute/applications/$applicationId"
              params={{ applicationId: a.id }}
              className="block rounded-2xl border border-border bg-card p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{a.student.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {a.programName}
                    {a.grade ? ` · ${a.grade}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {a.id} · Submitted{" "}
                    {a.submittedAt
                      ? new Date(a.submittedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
                <Badge variant={statusTone(a.status)}>{stageLabel}</Badge>
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {list.length === 0
              ? "No applications received yet."
              : "No applications in this stage."}
          </p>
        )}
      </div>
    </div>
  );
}

export function InstituteApplicationReviewPage({ applicationId }: { applicationId: string }) {
  const { instituteId } = useInstituteContext();
  const apiMode = isApiAuthMode();
  const [refreshTick, setRefreshTick] = useState(0);
  const [apiDocs, setApiDocs] = useState<ApplicationDocument[]>([]);
  const apps = useMemo(() => {
    void refreshTick;
    return getAllApplications();
  }, [refreshTick]);
  const app = apps.find((a) => a.id === applicationId);
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionFields, setCorrectionFields] = useState<CorrectionFieldPath[]>([]);

  useEffect(() => {
    if (!apiMode || !/^[0-9a-f-]{36}$/i.test(applicationId)) {
      setApiDocs([]);
      return;
    }
    let cancelled = false;
    void loadApplicationDocuments(applicationId)
      .then((rows) => {
        if (!cancelled) setApiDocs(rows);
      })
      .catch(() => {
        if (!cancelled) setApiDocs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [apiMode, applicationId, refreshTick]);

  const displayDocs =
    apiMode && /^[0-9a-f-]{36}$/i.test(applicationId) ? apiDocs : app?.documents ?? [];

  if (!app || (app.instituteId ?? "ins-test1school") !== instituteId) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Application not found.</p>
        <Button className="mt-4" asChild>
          <Link to="/admissions/institute/applications">Back to list</Link>
        </Button>
      </div>
    );
  }

  const currentStage = toBoardStage(applicationToSyncRow(app).stage);
  const canMoveToVerification = currentStage === "review";
  const isVerificationStage = currentStage === "verification";
  const canRejectFromVerification =
    currentStage === "verification" ||
    currentStage === "review" ||
    currentStage === "submitted";

  const moveToVerification = () => {
    if (!canMoveToVerification) {
      toast.error("This application is not in review stage.");
      return;
    }
    const updated = updateApplicationByInstituteAdmin(applicationId, apps, {
      status: adminStageToStatus("verification"),
      adminNotes: app.adminNotes ?? [],
    });
    if (!updated) {
      toast.error("Could not move to verification (invalid transition).");
      return;
    }
    updateApplication(updated);
    setRefreshTick((tick) => tick + 1);
    toast.success("Moved to verification");
  };

  const moveToParentConfirmation = () => {
    if (!isVerificationStage) {
      toast.error("Verify action is available only in verification stage.");
      return;
    }
    try {
      const updated = moveApplicationToParentConfirmation(applicationId, "Institute admin");
      updateApplication(updated);
      setRefreshTick((tick) => tick + 1);
      toast.success("Verified and sent for parent confirmation");
    } catch (error) {
      if (error instanceof Error && error.message === "APPLICATION_NOT_IN_VERIFICATION") {
        toast.error("Application is no longer in verification stage.");
        return;
      }
      toast.error("Could not send parent confirmation.");
    }
  };

  const rejectApplication = () => {
    if (!canRejectFromVerification) {
      toast.error("Cannot reject from current stage.");
      return;
    }
    const updated = updateApplicationByInstituteAdmin(applicationId, apps, {
      status: adminStageToStatus("rejected"),
      adminNotes: app.adminNotes ?? [],
    });
    if (!updated) {
      toast.error("Could not reject from current stage.");
      return;
    }
    updateApplication(updated);
    setRefreshTick((tick) => tick + 1);
    toast.success("Application rejected");
  };

  const toggleCorrectionField = (field: CorrectionFieldPath) => {
    setCorrectionFields((prev) =>
      prev.includes(field) ? prev.filter((item) => item !== field) : [...prev, field],
    );
  };

  const requestCorrection = () => {
    if (!isVerificationStage) {
      toast.error("Request correction is available only in verification stage.");
      return;
    }
    if (!correctionReason.trim()) {
      toast.error("Provide correction reason.");
      return;
    }
    if (correctionFields.length === 0) {
      toast.error("Select requested fields.");
      return;
    }
    try {
      const updated = requestApplicationCorrectionByInstitute({
        applicationId,
        reason: correctionReason.trim(),
        requestedFields: correctionFields,
        requestedBy: "Institute admin",
      });
      updateApplication(updated);
      setCorrectionReason("");
      setCorrectionFields([]);
      setRefreshTick((tick) => tick + 1);
      toast.success("Correction requested and parent notified.");
    } catch (error) {
      if (error instanceof Error && error.message === "APPLICATION_NOT_IN_VERIFICATION") {
        toast.error("Application is no longer in verification stage.");
        return;
      }
      toast.error("Could not request correction.");
    }
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <AdmissionsPageHeader
        title={app.student.name}
        subtitle={`${app.id} · ${app.programName} · ${app.grade} · Review`}
        backTo="/admissions/institute/applications"
      />

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-3">
          <h3 className="font-semibold text-sm">Complete application</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Review all details below before moving this application to verification.
          </p>
        </div>
        <InstituteApplicationDossier app={app} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h3 className="font-semibold text-sm">Review action</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Available actions depend on current stage.
        </p>
        <div className="mt-3">
          <Row
            label="Current stage"
            value={BOARD_STAGES.find((s) => s.id === currentStage)?.label ?? currentStage}
          />
        </div>
        <Button
          className="mt-4 w-full sm:w-auto"
          disabled={!canMoveToVerification}
          onClick={moveToVerification}
        >
          Move to Verification
        </Button>
        {isVerificationStage ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={moveToParentConfirmation}>
              Verify
            </Button>
            <Button type="button" variant="destructive" onClick={rejectApplication}>
              Reject
            </Button>
          </div>
        ) : null}
        {!canMoveToVerification ? (
          <p className="text-xs text-muted-foreground mt-2">
            This screen is locked because the application is already outside review stage.
          </p>
        ) : null}
        {isVerificationStage ? (
          <div className="mt-4 rounded-xl border border-border p-3">
            <h4 className="text-sm font-semibold">Request correction</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Documents are reviewed together. Parent can edit only requested fields and resubmit.
            </p>
            <div className="mt-3 space-y-1.5">
              <Label className="text-xs">Reason</Label>
              <Textarea
                rows={3}
                value={correctionReason}
                onChange={(event) => setCorrectionReason(event.target.value)}
                placeholder="Explain what needs correction"
              />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {CORRECTION_FIELD_OPTIONS.map((field) => (
                <label
                  key={field.key}
                  className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={correctionFields.includes(field.key)}
                    onChange={() => toggleCorrectionField(field.key)}
                  />
                  <span>{field.label}</span>
                </label>
              ))}
            </div>
            <Button className="mt-3" type="button" onClick={requestCorrection}>
              Request Correction
            </Button>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h3 className="font-semibold text-sm">Documents</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Documents stay at the bottom and support preview when available.
        </p>
        <div className="mt-3 space-y-2">
          {displayDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded.</p>
          ) : (
            displayDocs.map((doc) => (
              <div
                key={doc.id}
                className="rounded-xl border border-border px-3 py-2 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{doc.label}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {doc.fileName || "No file"} · {doc.status.replace(/_/g, " ")}
                  </p>
                  {doc.note ? (
                    <p className="text-xs text-destructive mt-0.5">{doc.note}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (apiMode && /^[0-9a-f-]{36}$/i.test(doc.id)) {
                        void openAdmissionDocumentPreview({ documentId: doc.id })
                          .then((url) => {
                            if (!url) {
                              toast.error("Preview unavailable for this file.");
                              return;
                            }
                            window.open(url, "_blank", "noopener,noreferrer");
                          })
                          .catch(() => toast.error("Preview unavailable."));
                        return;
                      }
                      if (!doc.previewDataUrl) {
                        toast.error("Preview unavailable for this file.");
                        return;
                      }
                      window.open(doc.previewDataUrl, "_blank", "noopener,noreferrer");
                    }}
                  >
                    Preview
                  </Button>
                  {apiMode && isVerificationStage && /^[0-9a-f-]{36}$/i.test(doc.id) ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          void verifyApplicationDocument({
                            documentId: doc.id,
                            status: "verified",
                          })
                            .then(() => {
                              toast.success(`${doc.label} verified`);
                              setRefreshTick((t) => t + 1);
                            })
                            .catch(() => toast.error("Could not verify document"));
                        }}
                      >
                        Verify
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void verifyApplicationDocument({
                            documentId: doc.id,
                            status: "resubmission_required",
                            note: "Please re-upload a clearer copy.",
                          })
                            .then(() => {
                              toast.success("Resubmission requested");
                              setRefreshTick((t) => t + 1);
                            })
                            .catch(() => toast.error("Could not update document"));
                        }}
                      >
                        Resubmit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          void verifyApplicationDocument({
                            documentId: doc.id,
                            status: "rejected",
                            note: "Document rejected by institute.",
                          })
                            .then(() => {
                              toast.success(`${doc.label} rejected`);
                              setRefreshTick((t) => t + 1);
                            })
                            .catch(() => toast.error("Could not reject document"));
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {app.correctionHistory && app.correctionHistory.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h3 className="font-semibold text-sm">Correction history</h3>
          <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
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
    </div>
  );
}

function emptyInstituteDraft(
  profile: ReturnType<typeof useInstituteContext>["profile"],
  instituteName?: string,
): DemoInstituteProfile {
  return {
    name: profile?.name ?? instituteName ?? "Your institute",
    founded: "",
    founder: "",
    principal: "",
    vision: profile?.about ?? "",
    mission: profile?.tagline ?? "",
    ranking: "",
    logo: "",
    profilePhoto: "",
    phone: profile?.contact.phone ?? "",
    email: profile?.contact.email ?? "",
    address: profile?.contact.address ?? "",
    history: [],
    awards: [],
    achievements: [],
    customFields: [],
  };
}

export function InstituteSettingsPage() {
  if (isApiAuthMode()) return <ApiInstituteSettingsPage />;
  return <DemoInstituteSettingsPage />;
}

function ApiInstituteSettingsPage() {
  const { user, instituteId } = useInstituteContext();
  const [loadStatus, setLoadStatus] = useState<
    "loading" | "ready" | "needs_institute" | "forbidden" | "error"
  >("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [settingsRecord, setSettingsRecord] = useState<Record<string, unknown>>({});
  const [draft, setDraft] = useState<DemoInstituteProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!instituteId || !isInstituteUuid(instituteId)) {
      setLoadStatus("needs_institute");
      setDraft(null);
      return;
    }
    let cancelled = false;
    setLoadStatus("loading");
    void loadInstituteProfileForAdmin({ instituteId }).then((result) => {
      if (cancelled) return;
      if (result.status === "ready" && result.profile && result.settings) {
        setDraft(result.profile);
        setSettingsRecord(result.settings.settings);
        setLoadStatus("ready");
        setLoadError(null);
        return;
      }
      setDraft(null);
      setLoadStatus(
        result.status === "forbidden"
          ? "forbidden"
          : result.status === "needs_institute"
            ? "needs_institute"
            : "error",
      );
      setLoadError(result.errorMessage);
    });
    return () => {
      cancelled = true;
    };
  }, [instituteId]);

  if (!user || user.accountType !== "institute_admin") {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Institute admin access required.
      </div>
    );
  }

  if (loadStatus === "loading") {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">Loading institute profile…</div>
    );
  }

  if (loadStatus !== "ready" || !draft) {
    return (
      <div className="py-12 text-center space-y-2 text-sm text-muted-foreground">
        <p>
          {loadStatus === "needs_institute"
            ? "Link a live LumenX institute (UUID) to edit the API-backed profile."
            : loadError ?? "Profile unavailable."}
        </p>
      </div>
    );
  }

  const save = () => {
    if (!instituteId || !isInstituteUuid(instituteId)) return;
    setSaving(true);
    void updateInstituteSettings(instituteId, {
      settings: demoProfileToSettingsPatch(settingsRecord, draft),
    })
      .then((next) => {
        setSettingsRecord(next.settings);
        setDraft(normalizeInstituteProfile(draft));
        setEditing(false);
        toast.success("Institute profile saved");
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to save profile");
      })
      .finally(() => setSaving(false));
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <AdmissionsPageHeader
        title="Institute profile"
        subtitle="Synced with LumenX Admin institute settings (API mode)"
        backTo="/admissions/institute"
      />
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold truncate">{draft.name}</p>
          <p className="text-xs text-muted-foreground">PATCH /institutes/:id/settings</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save profile"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>
              <Pencil className="size-4 mr-1" /> Edit profile
            </Button>
          )}
        </div>
      </div>
      {editing ? (
        <AdminInstituteProfileEditor value={draft} onChange={setDraft} />
      ) : (
        <AdminInstituteProfileView profile={draft} />
      )}
    </div>
  );
}

function DemoInstituteSettingsPage() {
  const { user, instituteId, profile } = useInstituteContext();
  const catalogInstitute = instituteId ? getInstituteById(instituteId) : undefined;
  const isStandaloneInstitute = instituteId.startsWith("ins-custom-");
  const isLumenxInstitute = !isStandaloneInstitute;
  const [savedProfile, setSavedProfile] = useState<DemoInstituteProfile | null>(null);
  const [draft, setDraft] = useState<DemoInstituteProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const editingRef = useRef(false);
  editingRef.current = editing;

  useEffect(() => {
    if (!instituteId) return;
    if (isStandaloneInstitute) {
      const existing = getAdmissionsInstituteProfile(instituteId);
      setSavedProfile(existing);
      setDraft(existing ?? emptyInstituteDraft(profile, user?.instituteName));
      setEditing(false);
      return subscribeSharedInstituteProfile(instituteId, (next) => {
        setSavedProfile(next);
        if (!editingRef.current) setDraft(next);
      });
    }

    const autoProfile = normalizeInstituteProfile({
      ...emptyInstituteDraft(profile, user?.instituteName),
      name: profile?.name ?? catalogInstitute?.name ?? user?.instituteName ?? "Test1School",
      founded: catalogInstitute?.established ?? "",
      vision: profile?.about ?? catalogInstitute?.about ?? "",
      mission: profile?.tagline ?? catalogInstitute?.tagline ?? "",
      phone: profile?.contact.phone ?? catalogInstitute?.contact.phone ?? "",
      email: profile?.contact.email ?? catalogInstitute?.contact.email ?? "",
      address: profile?.contact.address ?? catalogInstitute?.contact.address ?? "",
    });
    const synced = saveAdmissionsInstituteProfile(instituteId, autoProfile);
    setSavedProfile(synced);
    setDraft(synced);
    setEditing(false);
    return subscribeSharedInstituteProfile(instituteId, (next) => {
      setSavedProfile(next);
      if (!editingRef.current) setDraft(next);
    });
    // Only re-seed when institute changes — `profile` is a new object each render
    // for custom institutes and would cancel Edit mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
    // Re-seed only when institute context changes; avoids rerender loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instituteId, isStandaloneInstitute, user?.instituteName]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const applied = applyInstituteProfileSyncMessage(event.data);
      if (applied && instituteId) {
        setSavedProfile(applied);
        if (!editingRef.current) setDraft(applied);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [instituteId]);

  if (!user || user.accountType !== "institute_admin") {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Institute admin access required.
      </div>
    );
  }

  if (!instituteId) {
    return (
      <div className="py-12 text-center space-y-3">
        <p className="text-muted-foreground">No institute linked to this account.</p>
        <Button asChild>
          <Link to="/admissions/institute">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">Loading profile…</div>
    );
  }

  const startEdit = () => {
    if (isLumenxInstitute) return;
    if (!savedProfile) return;
    setDraft(normalizeInstituteProfile(savedProfile));
    setEditing(true);
  };

  const cancelEdit = () => {
    if (savedProfile) {
      setDraft(normalizeInstituteProfile(savedProfile));
    }
    setEditing(false);
  };

  const save = () => {
    if (isLumenxInstitute) {
      toast.info("LumenX institute profiles are auto-populated.");
      return;
    }
    const cleaned = normalizeInstituteProfile({
      ...draft,
      achievements: draft.achievements.map((a) => a.trim()).filter(Boolean),
      history: draft.history.filter((h) => h.year.trim() || h.event.trim()),
      awards: draft.awards.filter((a) => a.title.trim() || a.year.trim() || a.body.trim()),
      customFields: (draft.customFields ?? [])
        .map((section) => ({
          ...section,
          title: section.title.trim(),
          entries: section.entries
            .map((entry) => ({
              ...entry,
              heading: entry.heading.trim(),
              year: (entry.year ?? "").trim(),
              subheading: "",
              fields: entry.fields
                .map((field) => ({
                  ...field,
                  label: "",
                  value: field.value.trim(),
                }))
                .filter((field) => field.value.length > 0),
            }))
            .filter(
              (entry) =>
                entry.heading.length > 0 ||
                entry.year.length > 0 ||
                entry.fields.length > 0,
            ),
        }))
        .filter((section) => section.title.length > 0),
    });
    saveAdmissionsInstituteProfile(instituteId, cleaned);
    setSavedProfile(cleaned);
    setDraft(cleaned);
    setEditing(false);
    toast.success("Institute profile saved");
  };

  const display = (editing ? draft : savedProfile) ?? draft;

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <AdmissionsPageHeader
        title="Institute profile"
        subtitle={
          isLumenxInstitute
            ? "LumenX institute profile is auto-populated"
            : "Standalone institute profile is manually managed"
        }
        backTo="/admissions/institute"
      />

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="size-6 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-bold truncate">{display.name || profile?.name || "Your institute"}</p>
            <p className="text-xs text-muted-foreground">
              {isLumenxInstitute
                ? "Auto-populated from LumenX institute profile"
                : "Manually managed standalone institute profile"}
              {profile?.code ? ` · ${profile.code}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isLumenxInstitute ? (
            <>
              <Button variant="outline" asChild>
                <Link to="/admissions/institutes/$instituteId" params={{ instituteId }}>
                  Preview public page
                </Link>
              </Button>
              <Button variant="outline" disabled>
                Auto-populated
              </Button>
            </>
          ) : editing ? (
            <>
              <Button variant="outline" onClick={cancelEdit}>
                <X className="size-4 mr-1" /> Cancel
              </Button>
              <Button onClick={save}>
                <Save className="size-4 mr-1" /> Save profile
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" asChild>
                <Link to="/admissions/institutes/$instituteId" params={{ instituteId }}>
                  Preview public page
                </Link>
              </Button>
              {savedProfile ? (
                <Button onClick={startEdit}>
                  <Pencil className="size-4 mr-1" /> Edit profile
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setDraft(emptyInstituteDraft(profile, user?.instituteName));
                    setEditing(true);
                  }}
                >
                  <Pencil className="size-4 mr-1" /> Create profile
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {!savedProfile && !isLumenxInstitute ? (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <p className="text-sm text-muted-foreground">
            No profile yet. Create your standalone institute profile manually.
          </p>
          <Button
            onClick={() => {
              setDraft(emptyInstituteDraft(profile, user?.instituteName));
              setEditing(true);
            }}
          >
            Create profile
          </Button>
        </div>
      ) : editing ? (
        <AdminInstituteProfileEditor value={draft} onChange={setDraft} />
      ) : (
        savedProfile && <AdminInstituteProfileView profile={savedProfile} />
      )}
    </div>
  );
}

export function AdmissionFormBuilderPage() {
  const { instituteId } = useInstituteContext();
  const [fields, setFields] = useState<AdmissionFormField[]>(() =>
    instituteId ? getAdmissionForm(instituteId).fields : [],
  );
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<AdmissionFormField["type"]>("text");
  const [newRequired, setNewRequired] = useState(false);
  const [newOptions, setNewOptions] = useState("");
  const [newPlaceholder, setNewPlaceholder] = useState("");

  const selectedTypeMeta = FORM_FIELD_TYPES.find((t) => t.value === newType);

  const addField = () => {
    if (!newLabel.trim()) return toast.error("Enter a field name");
    if (newType === "select" && !newOptions.trim()) {
      return toast.error("Add dropdown options (comma-separated)");
    }
    const field: AdmissionFormField = {
      id: newFormFieldId(),
      label: newLabel.trim(),
      type: newType,
      required: newRequired,
      ...(newPlaceholder.trim() ? { placeholder: newPlaceholder.trim() } : {}),
      ...(newType === "select" && newOptions.trim()
        ? {
            options: newOptions
              .split(",")
              .map((o) => o.trim())
              .filter(Boolean),
          }
        : {}),
    };
    setFields((f) => [...f, field]);
    setNewLabel("");
    setNewOptions("");
    setNewPlaceholder("");
    setNewRequired(false);
    toast.success("Field added — save form to persist");
  };

  const removeField = (id: string) => setFields((f) => f.filter((x) => x.id !== id));

  const toggleRequired = (id: string) => {
    setFields((f) => f.map((x) => (x.id === id ? { ...x, required: !x.required } : x)));
  };

  const save = () => {
    saveAdmissionForm(instituteId, fields);
    toast.success("Admission form saved");
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <AdmissionsPageHeader
        title="Application form"
        subtitle="Choose what parents fill in when they apply · mark required or optional"
        backTo="/admissions/institute"
      />

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <ClipboardList className="size-4 text-primary" /> Add new field
        </h3>
        <Field label="Field name / label">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Previous school TC number"
          />
        </Field>
        <Field label="Field type">
          <Select
            value={newType}
            onValueChange={(v) => setNewType(v as AdmissionFormField["type"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORM_FIELD_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTypeMeta?.hint && (
            <p className="text-xs text-muted-foreground mt-1">{selectedTypeMeta.hint}</p>
          )}
        </Field>
        {(newType === "text" ||
          newType === "textarea" ||
          newType === "number" ||
          newType === "phone" ||
          newType === "email") && (
          <Field label="Placeholder (optional)">
            <Input
              value={newPlaceholder}
              onChange={(e) => setNewPlaceholder(e.target.value)}
              placeholder={
                newType === "phone"
                  ? "e.g. 9876543210"
                  : newType === "email"
                    ? "you@email.com"
                    : "Hint text for applicant"
              }
            />
          </Field>
        )}
        {newType === "select" && (
          <Field label="Options (comma-separated)">
            <Input
              value={newOptions}
              onChange={(e) => setNewOptions(e.target.value)}
              placeholder="Yes, No, Maybe"
            />
          </Field>
        )}
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={newRequired}
            onChange={(e) => setNewRequired(e.target.checked)}
            className="rounded border-border"
          />
          Mandatory field
        </label>
        <Button type="button" variant="outline" onClick={addField}>
          <Plus className="size-4 mr-1" /> Add field
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h3 className="font-semibold text-sm mb-4">Form fields ({fields.length})</h3>
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No fields yet. Add your first field above.
          </p>
        ) : (
          <div className="space-y-2">
            {fields.map((f) => (
              <div
                key={f.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3"
              >
                <div className="flex-1 min-w-[140px]">
                  <p className="font-medium text-sm">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{formFieldTypeLabel(f.type)}</p>
                  {f.placeholder && (
                    <p className="text-[10px] text-muted-foreground">
                      Placeholder: {f.placeholder}
                    </p>
                  )}
                </div>
                <button type="button" onClick={() => toggleRequired(f.id)} className="text-xs">
                  <Badge variant={f.required ? "default" : "secondary"}>
                    {f.required ? "Mandatory" : "Optional"}
                  </Badge>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeField(f.id)}
                  aria-label="Remove field"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <Button className="mt-4 w-full sm:w-auto" onClick={save}>
          Save form
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value || "—"}</span>
    </div>
  );
}

