import { useMemo, useState } from "react";
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
  cn,
} from "@lumenx/ui";
import {
  Briefcase,
  Calendar,
  Check,
  FileCheck,
  ListOrdered,
  Undo2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { isApiAuthMode } from "@/auth/auth-mode";
import { CareersPageHeader } from "@/careers-portal/shared/ui/CareersPageHeader";
import { RecruiterApplicationDossier } from "@/careers-portal/features/recruiter/RecruiterApplicationDossier";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import {
  STAGE_TO_STATUS,
  applicationToSyncRow,
  type AdminCareerStage,
} from "@/lib/careers/admin-bridge";
import {
  getApplicationsForOrganization,
  updateApplicationStatusByRecruiter,
} from "@/lib/careers/repositories";
import { transitionCareerApplication } from "@/lib/careers/api";
import { getRecruiterJobsForOrg } from "@/lib/careers/recruiter-jobs-store";
import { useCareersApplications } from "@/hooks/use-careers-applications";
import { useCareersJobs } from "@/hooks/use-careers-jobs";
import type { JobApplication, JobPosting } from "@/lib/careers/types";

/** Careers pipeline — includes Interview (Admissions does not). */
const STAGES: {
  key: AdminCareerStage;
  label: string;
  tone: "default" | "secondary" | "destructive" | "outline";
}[] = [
  { key: "review", label: "Review", tone: "outline" },
  { key: "verification", label: "Verification", tone: "secondary" },
  { key: "interview", label: "Interview", tone: "secondary" },
  { key: "approved", label: "Approved", tone: "default" },
  { key: "waitlist", label: "Waitlist", tone: "secondary" },
  { key: "rejected", label: "Rejected", tone: "destructive" },
];

type BoardStage = AdminCareerStage;

function boardStage(app: JobApplication): BoardStage {
  return applicationToSyncRow(app).stage;
}

function docsSummary(app: JobApplication): string {
  const total = app.documents.length;
  const verified = app.documents.filter((d) => d.status === "verified").length;
  if (total === 0) return "0 docs";
  return `${verified}/${total} docs`;
}

function jobStatusLabel(job: JobPosting): string {
  const s = job.recruiterJobStatus;
  if (s === "closed") return "Closed";
  if (s === "draft") return "Draft";
  return "Open";
}

function jobIsOpen(job: JobPosting): boolean {
  return !job.recruiterJobStatus || job.recruiterJobStatus === "open";
}

function countAppsForJob(apps: JobApplication[], jobId: string): number {
  return apps.filter((a) => a.jobId === jobId).length;
}

/**
 * Admissions-style applications workspace for Careers:
 * roles strip → stage kanban (with Interview) → dossier modal with stage actions.
 */
export function RecruiterApplicantsPage() {
  const { user } = useCareersAuth();
  const orgId = user?.organizationId ?? "";
  const apiMode = isApiAuthMode();
  const [tick, setTick] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const {
    applications: apiApps,
    loading,
    reload: reloadApps,
  } = useCareersApplications({ scope: "recruiter" });
  const { jobs: apiRoles } = useCareersJobs({
    recruiterScope: true,
    openOnly: false,
  });

  const apps = useMemo(() => {
    if (apiMode) {
      const myJobIds = new Set(apiRoles.map((j) => j.id));
      return apiApps.filter((a) => myJobIds.has(a.jobId));
    }
    void tick;
    if (!orgId) return [];
    const myJobIds = new Set(getRecruiterJobsForOrg(orgId).map((j) => j.id));
    return getApplicationsForOrganization(orgId).filter((a) => myJobIds.has(a.jobId));
  }, [apiMode, apiApps, apiRoles, orgId, tick]);

  const roles = useMemo(() => {
    if (apiMode) return [...apiRoles].sort((a, b) => a.title.localeCompare(b.title));
    void tick;
    return orgId
      ? getRecruiterJobsForOrg(orgId).sort((a, b) => a.title.localeCompare(b.title))
      : [];
  }, [apiMode, apiRoles, orgId, tick]);

  const filteredApps = useMemo(() => {
    if (!selectedJobId) return apps;
    return apps.filter((a) => a.jobId === selectedJobId);
  }, [apps, selectedJobId]);

  const selectedJob = useMemo(
    () => (selectedJobId ? roles.find((j) => j.id === selectedJobId) ?? null : null),
    [roles, selectedJobId],
  );

  const selected = useMemo(
    () => (selectedId ? filteredApps.find((a) => a.id === selectedId) ?? null : null),
    [filteredApps, selectedId],
  );

  const selectedStage = selected ? boardStage(selected) : null;
  const onWaitlist = selectedStage === "waitlist";
  const onRejected = selectedStage === "rejected";
  const canAddToWaitlist =
    Boolean(selected) &&
    selectedStage !== "waitlist" &&
    selectedStage !== "approved" &&
    selectedStage !== "rejected";
  const canReject =
    Boolean(selected) && selectedStage !== "rejected" && selectedStage !== "approved";

  const moveToStage = async (id: string, stage: BoardStage, message: string) => {
    if (apiMode) {
      try {
        await transitionCareerApplication(id, {
          status: STAGE_TO_STATUS[stage],
          decisionNote: message,
        });
        reloadApps();
        toast.success(message);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update application");
      }
      return;
    }
    updateApplicationStatusByRecruiter(id, STAGE_TO_STATUS[stage], message);
    setTick((t) => t + 1);
    toast.success(message);
  };

  if (!user || user.accountType !== "recruiter" || !orgId) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Recruiter access required.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">Loading applications…</div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300 space-y-5">
      <CareersPageHeader
        title="Applications"
        subtitle="Roles · pipeline · review dossier — same flow as Admissions"
        backTo="/recruiter"
      />

      {/* Roles strip — click a job to filter applicants */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Briefcase className="size-4 text-primary shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">Open roles</h3>
              <p className="text-xs text-muted-foreground">
                {selectedJob
                  ? `Showing ${selectedJob.title} applicants only`
                  : "Click a role to filter · All applications shows every applicant"}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/recruiter/jobs">Manage jobs</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => setSelectedJobId(null)}
            aria-pressed={selectedJobId === null}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-left transition-colors",
              selectedJobId === null
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-background/50 hover:bg-muted/40",
            )}
          >
            <p className="truncate text-sm font-medium">All applications</p>
            <p
              className={cn(
                "text-[11px]",
                selectedJobId === null
                  ? "text-primary-foreground/80"
                  : "text-muted-foreground",
              )}
            >
              Every role
            </p>
            <div className="mt-2">
              <div
                className={cn(
                  "rounded-lg px-1 py-1.5 text-center",
                  selectedJobId === null ? "bg-primary-foreground/15" : "bg-muted/40",
                )}
              >
                <p className="font-mono text-sm font-semibold">{apps.length}</p>
                <p
                  className={cn(
                    "text-[9px] uppercase tracking-wider",
                    selectedJobId === null
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground",
                  )}
                >
                  Applications
                </p>
              </div>
            </div>
          </button>

          {roles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center sm:col-span-2 lg:col-span-3">
              No roles yet. Post a job to start receiving applications.
            </p>
          ) : (
            roles.map((job) => {
              const applications = countAppsForJob(apps, job.id);
              const isSelected = selectedJobId === job.id;
              const open = jobIsOpen(job);
              return (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => setSelectedJobId(job.id)}
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
                      <p className="truncate text-sm font-medium">{job.title}</p>
                      <p
                        className={cn(
                          "text-[11px] truncate",
                          isSelected
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground",
                        )}
                      >
                        {job.department}
                      </p>
                    </div>
                    <Badge
                      variant={
                        isSelected ? "secondary" : open ? "default" : "secondary"
                      }
                      className={
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground border-0"
                          : undefined
                      }
                    >
                      {jobStatusLabel(job)}
                    </Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-center">
                    <div
                      className={cn(
                        "rounded-lg px-1 py-1.5",
                        isSelected ? "bg-primary-foreground/15" : "bg-muted/40",
                      )}
                    >
                      <p className="font-mono text-[11px] font-semibold truncate px-0.5">
                        {job.deadline
                          ? new Date(job.deadline).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })
                          : "—"}
                      </p>
                      <p
                        className={cn(
                          "text-[9px] uppercase tracking-wider",
                          isSelected
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground",
                        )}
                      >
                        Deadline
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

      {/* Stage kanban — includes Interview */}
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
                    className={cn(
                      "w-full text-left rounded-xl p-3 border transition-colors",
                      selectedId === a.id
                        ? "bg-primary/5 border-primary/30"
                        : "bg-background/60 border-border hover:bg-muted/40",
                    )}
                  >
                    <p className="text-sm font-medium leading-snug">{a.personal.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {a.jobTitle} · {docsSummary(a)}
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
          if (!open) setSelectedId(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-hidden rounded-2xl sm:max-w-2xl flex flex-col gap-0 p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
            <DialogTitle>{selected?.personal.name ?? "Application"}</DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.id} · ${selected.jobTitle} · full application & documents`
                : undefined}
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
            {selected ? <RecruiterApplicationDossier app={selected} /> : null}
          </div>

          {selected && selectedStage ? (
            <DialogFooter className="px-5 py-3 border-t border-border bg-muted/20 flex-wrap gap-2 sm:justify-start shrink-0">
              <Button type="button" variant="outline" onClick={() => setSelectedId(null)}>
                Close
              </Button>

              {!onWaitlist && !onRejected && selectedStage === "review" && (
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

              {!onWaitlist &&
                !onRejected &&
                (selectedStage === "review" || selectedStage === "verification") && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      moveToStage(selected.id, "interview", "Moved to interview")
                    }
                  >
                    <Calendar className="size-3.5 mr-1" /> Interview
                  </Button>
                )}

              {!onWaitlist && !onRejected && selectedStage !== "approved" && (
                <Button
                  type="button"
                  onClick={() =>
                    moveToStage(selected.id, "approved", "Application approved")
                  }
                >
                  <Check className="size-3.5 mr-1" /> Approve
                </Button>
              )}

              {canAddToWaitlist ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    moveToStage(
                      selected.id,
                      "waitlist",
                      "Moved to waiting list — can be taken out later",
                    )
                  }
                >
                  <ListOrdered className="size-3.5 mr-1" /> Move to waitlist
                </Button>
              ) : null}

              {canReject ? (
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

              {onWaitlist ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      moveToStage(
                        selected.id,
                        "review",
                        "Removed from waitlist · back to review",
                      )
                    }
                  >
                    <Undo2 className="size-3.5 mr-1" /> Back to review
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      moveToStage(
                        selected.id,
                        "verification",
                        "Removed from waitlist · verification",
                      )
                    }
                  >
                    <FileCheck className="size-3.5 mr-1" /> To verification
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      moveToStage(
                        selected.id,
                        "interview",
                        "Removed from waitlist · interview",
                      )
                    }
                  >
                    <Calendar className="size-3.5 mr-1" /> To interview
                  </Button>
                  <Button
                    type="button"
                    onClick={() =>
                      moveToStage(
                        selected.id,
                        "approved",
                        "Removed from waitlist · approved",
                      )
                    }
                  >
                    <Check className="size-3.5 mr-1" /> Approve
                  </Button>
                </>
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
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
