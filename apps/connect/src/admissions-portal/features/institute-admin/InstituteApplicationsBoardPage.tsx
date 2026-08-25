import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from "@lumenx/ui";
import { DoorOpen, FileCheck, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { AdmissionsPageHeader } from "@/admissions-portal/shared/ui/AdmissionsPageHeader";
import { InstituteApplicationDossier } from "@/admissions-portal/features/institute-admin/InstituteApplicationDossier";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import {
  getApplicationsForInstitute,
  updateApplicationByInstituteAdmin,
} from "@/lib/admissions/institute-admin";
import {
  adminStageToStatus,
  applicationToSyncRow,
  type AdminAdmissionStage,
} from "@/lib/admissions/admin-bridge";
import {
  CORRECTION_FIELD_OPTIONS,
  getAllApplications,
  getCorrectionFieldLabel,
  getWaitlistAgeDays,
  moveApplicationToParentConfirmation,
  requestApplicationCorrectionByInstitute,
  updateApplication,
} from "@/lib/admissions/repositories";
import {
  ensureDemoOpenings,
  getOpeningsForInstitute,
} from "@/lib/admissions/openings-store";
import type { AdmissionApplication, CorrectionFieldPath } from "@/lib/admissions/types";
import { cn } from "@lumenx/ui";

const STAGES: {
  key: AdminAdmissionStage;
  label: string;
  tone: "default" | "secondary" | "destructive" | "outline";
}[] = [
  { key: "submitted", label: "Submitted", tone: "outline" },
  { key: "review", label: "Review", tone: "outline" },
  { key: "verification", label: "Verification", tone: "secondary" },
  { key: "parent_confirmation", label: "Parent Confirmation", tone: "secondary" },
  { key: "waitlisted", label: "Waitlist", tone: "secondary" },
  { key: "approved", label: "Approved", tone: "default" },
  { key: "rejected", label: "Rejected", tone: "destructive" },
  { key: "withdrawn", label: "Withdrawn", tone: "secondary" },
];

type BoardStage = (typeof STAGES)[number]["key"];

function boardStage(app: AdmissionApplication): BoardStage {
  return applicationToSyncRow(app).stage;
}

function docsSummary(app: AdmissionApplication): string {
  if (app.status === "waitlisted") {
    const age = getWaitlistAgeDays(app) ?? 0;
    return `Waitlist · ${age} day(s)`;
  }
  const total = app.documents.length;
  const verified = app.documents.filter((d) => d.status === "verified").length;
  if (total === 0) return "0 docs";
  return `${verified}/${total} docs`;
}

function appMatchesOpening(
  app: AdmissionApplication,
  opening: { id: string; name: string; grades: string[] },
): boolean {
  if (app.programId && app.programId === opening.id) return true;
  const name = opening.name.trim().toLowerCase();
  const program = app.programName.trim().toLowerCase();
  const grade = app.grade.trim().toLowerCase();
  if (program === name || grade === name) return true;
  return opening.grades.some((g) => {
    const gLower = g.trim().toLowerCase();
    return gLower && (grade === gLower || program === gLower);
  });
}

function countAppsForOpening(
  apps: AdmissionApplication[],
  opening: { id: string; name: string; grades: string[] },
): number {
  return apps.filter((a) => appMatchesOpening(a, opening)).length;
}

/**
 * Careers-Admin-style applications workspace:
 * openings strip → stage kanban → dossier modal with stage actions.
 */
export function InstituteApplicationsBoardPage() {
  const { user } = useAdmissionsAuth();
  const instituteId = user?.instituteId ?? "";
  const [tick, setTick] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCorrectionPanel, setShowCorrectionPanel] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionFields, setCorrectionFields] = useState<CorrectionFieldPath[]>([]);
  /** `null` = all applications; otherwise filter by opening id */
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null);

  useEffect(() => {
    if (instituteId) ensureDemoOpenings(instituteId);
  }, [instituteId]);

  const apps = useMemo(() => {
    void tick;
    return getApplicationsForInstitute(instituteId, getAllApplications());
  }, [instituteId, tick]);

  const openings = useMemo(() => {
    void tick;
    return getOpeningsForInstitute(instituteId);
  }, [instituteId, tick]);

  const filteredApps = useMemo(() => {
    if (!selectedOpeningId) return apps;
    const opening = openings.find((o) => o.id === selectedOpeningId);
    if (!opening) return apps;
    return apps.filter((a) => appMatchesOpening(a, opening));
  }, [apps, openings, selectedOpeningId]);

  const selectedOpening = useMemo(
    () =>
      selectedOpeningId
        ? openings.find((o) => o.id === selectedOpeningId) ?? null
        : null,
    [openings, selectedOpeningId],
  );

  const selected = useMemo(
    () => (selectedId ? filteredApps.find((a) => a.id === selectedId) ?? null : null),
    [filteredApps, selectedId],
  );

  const selectedStage = selected ? boardStage(selected) : null;
  const onSubmitted = selectedStage === "submitted";
  const onReview = selectedStage === "review";
  const onVerification = selectedStage === "verification";
  const onParentConfirmation = selectedStage === "parent_confirmation";
  const onWaitlisted = selectedStage === "waitlisted";
  const onRejected = selectedStage === "rejected";
  const canReject =
    Boolean(selected) &&
    selectedStage !== "rejected" &&
    selectedStage !== "approved" &&
    selectedStage !== "withdrawn" &&
    selectedStage !== "parent_confirmation";
  const canWithdraw =
    Boolean(selected) &&
    selectedStage !== "withdrawn" &&
    selectedStage !== "approved" &&
    selectedStage !== "rejected" &&
    selectedStage !== "parent_confirmation";

  const toggleCorrectionField = (field: CorrectionFieldPath) => {
    setCorrectionFields((prev) =>
      prev.includes(field) ? prev.filter((item) => item !== field) : [...prev, field],
    );
  };

  const moveToStage = (id: string, stage: BoardStage, message: string) => {
    const status = adminStageToStatus(stage);
    const updated = updateApplicationByInstituteAdmin(id, getAllApplications(), { status });
    if (!updated) {
      toast.error("Could not update application (invalid transition).");
      return;
    }
    updateApplication(updated);
    setTick((t) => t + 1);
    toast.success(message);
    if (stage === "approved") {
      toast.message("Next step", {
        description: "Open LumenX Admin → Admissions to convert this applicant into a student.",
      });
    }
  };

  const requestCorrection = () => {
    if (!selected) return;
    if (selectedStage !== "verification") {
      toast.error("Correction request is available only in verification stage.");
      return;
    }
    if (!correctionReason.trim()) {
      toast.error("Provide correction reason.");
      return;
    }
    if (correctionFields.length === 0) {
      toast.error("Select at least one requested field.");
      return;
    }
    try {
      const updated = requestApplicationCorrectionByInstitute({
        applicationId: selected.id,
        reason: correctionReason.trim(),
        requestedFields: correctionFields,
        requestedBy: user?.name ?? "Institute admin",
      });
      updateApplication(updated);
      setTick((t) => t + 1);
      setShowCorrectionPanel(false);
      setCorrectionReason("");
      setCorrectionFields([]);
      toast.success("Correction requested and parent notified.");
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "REQUEST_FIELDS_REQUIRED") {
          toast.error("Select at least one requested field.");
          return;
        }
        if (error.message === "APPLICATION_NOT_IN_VERIFICATION") {
          toast.error("Application is no longer in verification stage.");
          return;
        }
      }
      toast.error("Could not request correction.");
    }
  };

  if (!user || user.accountType !== "institute_admin") {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Institute admin access required.
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300 space-y-5">
      <AdmissionsPageHeader
        title="Applications"
        subtitle="Openings · pipeline · review dossier — same flow as Careers"
      />

      {/* Openings strip — click a class to filter applicants */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <DoorOpen className="size-4 text-primary shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">Admission openings</h3>
              <p className="text-xs text-muted-foreground">
                {selectedOpening
                  ? `Showing ${selectedOpening.name} applicants only`
                  : "Click a class to filter · All applications shows every applicant"}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admissions/institute/openings">Manage openings</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => setSelectedOpeningId(null)}
            aria-pressed={selectedOpeningId === null}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-left transition-colors",
              selectedOpeningId === null
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-background/50 hover:bg-muted/40",
            )}
          >
            <p className="truncate text-sm font-medium">All applications</p>
            <p
              className={cn(
                "text-[11px]",
                selectedOpeningId === null
                  ? "text-primary-foreground/80"
                  : "text-muted-foreground",
              )}
            >
              Every class
            </p>
            <div className="mt-2">
              <div
                className={cn(
                  "rounded-lg px-1 py-1.5 text-center",
                  selectedOpeningId === null ? "bg-primary-foreground/15" : "bg-muted/40",
                )}
              >
                <p className="font-mono text-sm font-semibold">{apps.length}</p>
                <p
                  className={cn(
                    "text-[9px] uppercase tracking-wider",
                    selectedOpeningId === null
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground",
                  )}
                >
                  Applications
                </p>
              </div>
            </div>
          </button>

          {openings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center sm:col-span-2 lg:col-span-3">
              No openings yet. Publish a class (e.g. Class 10 · 20 seats) to start receiving
              applications.
            </p>
          ) : (
            openings.map((o) => {
              const applications = countAppsForOpening(apps, o);
              const isSelected = selectedOpeningId === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSelectedOpeningId(o.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background/50 hover:bg-muted/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{o.name}</p>
                      <p
                        className={cn(
                          "text-[11px]",
                          isSelected
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground",
                        )}
                      >
                        {o.academicYear}
                      </p>
                    </div>
                    <Badge
                      variant={
                        isSelected
                          ? "secondary"
                          : o.status === "open"
                            ? "default"
                            : "secondary"
                      }
                      className={
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground border-0"
                          : undefined
                      }
                    >
                      {o.status === "open" ? "Open" : o.status === "closed" ? "Closed" : "Draft"}
                    </Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-center">
                    <div
                      className={cn(
                        "rounded-lg px-1 py-1.5",
                        isSelected ? "bg-primary-foreground/15" : "bg-muted/40",
                      )}
                    >
                      <p className="font-mono text-sm font-semibold">{o.seatsAvailable}</p>
                      <p
                        className={cn(
                          "text-[9px] uppercase tracking-wider",
                          isSelected
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground",
                        )}
                      >
                        Seats
                      </p>
                    </div>
                    <div
                      className={cn(
                        "rounded-lg px-1 py-1.5",
                        isSelected ? "bg-primary-foreground/15" : "bg-muted/40",
                      )}
                    >
                      <p className="font-mono text-sm font-semibold">{applications}</p>
                      <p
                        className={cn(
                          "text-[9px] uppercase tracking-wider",
                          isSelected
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground",
                        )}
                      >
                        Applications
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* Stage kanban — filtered by selected opening */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {STAGES.map((col) => {
          const items = filteredApps.filter((a) => boardStage(a) === col.key);
          return (
            <div
              key={col.key}
              className="w-[200px] shrink-0 rounded-2xl border border-border bg-card p-3 min-h-[320px]"
            >
              <div className="flex items-center gap-2 px-1 pb-3">
                <Badge variant={col.tone}>{col.label}</Badge>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {items.length}
                </span>
              </div>
              <div className="space-y-2">
                {items.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedId(a.id)}
                    aria-pressed={selectedId === a.id}
                    aria-label={`Open ${a.student.name} application`}
                    className={cn(
                      "w-full text-left rounded-xl p-3 border transition-colors",
                      selectedId === a.id
                        ? "bg-primary/5 border-primary/30"
                        : "bg-background/60 border-border hover:bg-muted/40",
                    )}
                  >
                    <p className="text-sm font-medium leading-snug">{a.student.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {a.programName}
                      {a.grade ? ` · ${a.grade}` : ""} · {docsSummary(a)}
                    </p>
                  </button>
                ))}
                {items.length === 0 ? (
                  <p className="px-2 py-8 text-[11px] text-muted-foreground text-center">
                    No applications
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dossier modal */}
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
            setShowCorrectionPanel(false);
            setCorrectionReason("");
            setCorrectionFields([]);
          }
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-hidden rounded-2xl sm:max-w-2xl flex flex-col gap-0 p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
            <DialogTitle>{selected?.student.name ?? "Application"}</DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.id} · ${selected.programName}${selected.grade ? ` · ${selected.grade}` : ""} · full application & documents`
                : undefined}
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
            {selected ? <InstituteApplicationDossier app={selected} /> : null}
          </div>

          {selected && selectedStage ? (
            <DialogFooter className="px-5 py-3 border-t border-border bg-muted/20 flex-wrap gap-2 sm:justify-start shrink-0">
              <Button type="button" variant="outline" onClick={() => setSelectedId(null)}>
                Close
              </Button>

              {onSubmitted && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => moveToStage(selected.id, "review", "Moved to review")}
                >
                  <Undo2 className="size-3.5 mr-1" /> Move to review
                </Button>
              )}

              {onReview && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    moveToStage(selected.id, "verification", "Moved to verification")
                  }
                >
                  <FileCheck className="size-3.5 mr-1" /> Verification
                </Button>
              )}

              {onVerification && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    try {
                      const updated = moveApplicationToParentConfirmation(
                        selected.id,
                        user?.name ?? "Institute admin",
                      );
                      updateApplication(updated);
                      setTick((t) => t + 1);
                      toast.success("Verified and sent to parent confirmation.");
                    } catch (error) {
                      if (
                        error instanceof Error &&
                        error.message === "APPLICATION_NOT_IN_VERIFICATION"
                      ) {
                        toast.error("Application is no longer in verification stage.");
                        return;
                      }
                      toast.error("Could not send to parent confirmation.");
                    }
                  }}
                >
                  <FileCheck className="size-3.5 mr-1" /> Verify
                </Button>
              )}

              {onVerification && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCorrectionPanel((value) => !value)}
                >
                  Request correction
                </Button>
              )}

              {(canReject && !onVerification) || onVerification ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() =>
                    moveToStage(selected.id, "rejected", "Application rejected")
                  }
                >
                  <X className="size-3.5 mr-1" /> Reject
                </Button>
              ) : null}

              {canWithdraw && !onVerification ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    moveToStage(selected.id, "withdrawn", "Application marked withdrawn")
                  }
                >
                  Withdraw
                </Button>
              ) : null}

              {onRejected ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    moveToStage(selected.id, "review", "Reopened · back to review")
                  }
                >
                  <Undo2 className="size-3.5 mr-1" /> Back to review
                </Button>
              ) : null}

              {selectedStage === "withdrawn" ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    moveToStage(selected.id, "review", "Reopened withdrawn application")
                  }
                >
                  <Undo2 className="size-3.5 mr-1" /> Reopen to review
                </Button>
              ) : null}

              {onWaitlisted ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    moveToStage(
                      selected.id,
                      "parent_confirmation",
                      "Moved back to parent confirmation",
                    )
                  }
                >
                  <Undo2 className="size-3.5 mr-1" /> Back to parent confirmation
                </Button>
              ) : null}
            </DialogFooter>
          ) : null}

          {selected && selectedStage === "verification" && showCorrectionPanel ? (
            <div className="px-5 py-3 border-t border-border bg-background space-y-3">
              <h4 className="text-sm font-semibold">Request correction</h4>
              <p className="text-xs text-muted-foreground">
                Documents are reviewed together. Select the fields to be edited, add reason, and
                notify parent.
              </p>
              <div className="space-y-1.5">
                <p className="text-xs font-medium">Reason</p>
                <Textarea
                  value={correctionReason}
                  onChange={(event) => setCorrectionReason(event.target.value)}
                  rows={3}
                  placeholder="Explain what must be corrected"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium">Requested fields</p>
                <div className="grid gap-2 sm:grid-cols-2">
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
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={requestCorrection}>
                  Notify Parent
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCorrectionPanel(false);
                    setCorrectionReason("");
                    setCorrectionFields([]);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {selected && selected.correctionHistory && selected.correctionHistory.length > 0 ? (
            <div className="px-5 py-3 border-t border-border/70 bg-muted/20">
              <h4 className="text-sm font-semibold">Correction history</h4>
              <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                {[...selected.correctionHistory].reverse().map((cycle) => (
                  <li key={cycle.id} className="rounded-lg border border-border px-2 py-1.5">
                    <p className="font-medium text-foreground">{cycle.reason}</p>
                    <p>
                      Requested {new Date(cycle.requestedAt).toLocaleString("en-IN")}
                      {cycle.resubmittedAt
                        ? ` · Resubmitted ${new Date(cycle.resubmittedAt).toLocaleString("en-IN")}`
                        : " · Awaiting parent resubmission"}
                    </p>
                    <p>
                      Fields: {cycle.requestedFields.map((field) => getCorrectionFieldLabel(field)).join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {selected && selectedStage === "approved" ? (
            <p className="px-5 pb-4 text-[11px] text-muted-foreground border-t border-border/60 pt-2">
              Next: open LumenX Admin → Admissions to add this applicant as a student (if your
              school uses Admin).
            </p>
          ) : null}

          {selected && selectedStage === "parent_confirmation" ? (
            <p className="px-5 pb-4 text-[11px] text-muted-foreground border-t border-border/60 pt-2">
              Waiting for parent response. Application auto-expires in 7 days if parent does not
              continue or reject.
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
