import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button, Pill, Card, CardHeader, Kpi, KpiGrid } from "@lumenx/ui-admin";
import { CAREER_CANDIDATES } from "@/lib/admin-module-data";
import {
  ensureAdminCareerSyncSeed,
  persistAdminCareerStageChange,
  careerStageLabel,
  careerStageTone,
  type AdminCareerStage,
  type AdminCareerSyncRow,
} from "@/lib/careers-sync";
import {
  applyHireAndMaybeCloseRole,
  findJobForRole,
  loadCareerJobs,
  type CareerJobPosting,
} from "@/lib/careers-jobs-store";
import { ConvertToTeacherDialog } from "@/components/careers/ConvertToTeacherDialog";
import { getAdminCareerDetail } from "@/lib/careers-application-details";
import {
  appendTeacherFromCareer,
  type CareerConvertDraft,
} from "@/lib/career-to-teacher";
import { useAdminToast } from "@/components/AdminActionToast";
import { openCareersFromAdmin } from "@/lib/connect-portal-links";
import {
  UserPlus,
  ExternalLink,
  ArrowRight,
  Users,
  CheckCircle2,
  ListOrdered,
  ClipboardList,
  Briefcase,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  loadCareerJobsList,
  loadCareersList,
  resolveCareerJobsListView,
  resolveCareersListView,
  shouldCommitCareerJobsLoad,
  shouldCommitCareersLoad,
  transitionCareerApplication,
  updateCareerJob,
  type CareerApplicationListItem,
  type CareerJobListItem,
  type CareerJobStatus,
  type CareersJobsListStatus,
  type CareersListStatus,
} from "@/lib/careers";

export const Route = createFileRoute("/careers")({
  head: () => ({ meta: [{ title: "Careers — LumenX Admin" }] }),
  component: CareersPage,
});

const FALLBACK: AdminCareerSyncRow[] = CAREER_CANDIDATES.map((c) => ({
  id: c.id,
  name: c.name,
  role: c.role,
  stage: c.stage as AdminCareerStage,
  applied: c.applied,
  docs: c.docs,
  institute: "LumenX Demo Institute",
}));

function writeAppsSnapshot(next: AdminCareerSyncRow[]) {
  try {
    localStorage.setItem(
      "ues_careers_sync",
      JSON.stringify({
        updatedAt: new Date().toISOString(),
        applications: next,
      }),
    );
  } catch {
    // ignore
  }
}

function jobsListHint(
  status: CareersJobsListStatus,
  errorMessage: string | null,
): string | null {
  if (status === "loading") return "Loading career jobs…";
  if (status === "needs_institute") return "Select an institute to load career jobs.";
  if (status === "forbidden") {
    return errorMessage ?? "You do not have access to career jobs for this institute.";
  }
  if (status === "error") return errorMessage ?? "Failed to load career jobs.";
  if (status === "empty") return "No job postings found for this institute.";
  return null;
}

function jobStatusTone(status: CareerJobStatus): "neutral" | "success" | "warning" {
  if (status === "open") return "success";
  if (status === "closed") return "warning";
  return "neutral";
}

/**
 * Thin Admin bridge for Careers.
 * Job posting and applicant review live in Connect Careers (recruiter).
 * Admin only hires approved candidates into the teachers directory.
 */
function CareersPage() {
  const notify = useAdminToast();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, { status: instituteCtx.status, activeInstituteId: instituteCtx.activeInstituteId });
  const [apps, setApps] = useState<AdminCareerSyncRow[]>(() =>
    apiMode ? [] : ensureAdminCareerSyncSeed(FALLBACK),
  );
  const [apiItems, setApiItems] = useState<CareerApplicationListItem[]>([]);
  const [listStatus, setListStatus] = useState<CareersListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [apiJobs, setApiJobs] = useState<CareerJobListItem[]>([]);
  const [jobsStatus, setJobsStatus] = useState<CareersJobsListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [jobsResolvedForInstituteId, setJobsResolvedForInstituteId] = useState<
    string | null
  >(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<
    string | null
  >(null);
  const [reloadKey, setReloadKey] = useState(0);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const listView = resolveCareersListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: apiItems,
    storedStatus: listStatus,
    storedErrorMessage: listError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });
  const jobsListView = resolveCareerJobsListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: jobsResolvedForInstituteId,
    storedItems: apiJobs,
    storedStatus: jobsStatus,
    storedErrorMessage: jobsError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });
  type AppRow = AdminCareerSyncRow | CareerApplicationListItem;
  const displayApps: AppRow[] = apiMode ? listView.items : apps;
  const activeApps = listView.rowsValid ? displayApps : [];
  const [jobs, setJobs] = useState<CareerJobPosting[]>(() =>
    apiMode ? [] : loadCareerJobs(),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);

  useEffect(() => {
    if (!apiMode) return;

    if (instituteCtx.status === "loading") {
      setApiItems([]);
      setListStatus("loading");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiItems([]);
      setListStatus(
        instituteCtx.status === "forbidden" ? "forbidden" : "error",
      );
      setListError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiItems([]);
      setListStatus("needs_institute");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setListStatus("loading");
    setListError(null);
    void loadCareersList(requestInstituteId).then((next) => {
      if (
        !shouldCommitCareersLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setApiItems(next.items);
      setListStatus(next.status);
      setListError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
  ]);

  useEffect(() => {
    if (!apiMode) return;

    if (instituteCtx.status === "loading") {
      setApiJobs([]);
      setJobsStatus("loading");
      setJobsError(null);
      setJobsResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiJobs([]);
      setJobsStatus(
        instituteCtx.status === "forbidden" ? "forbidden" : "error",
      );
      setJobsError(instituteCtx.errorMessage);
      setJobsResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiJobs([]);
      setJobsStatus("needs_institute");
      setJobsError(null);
      setJobsResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setJobsStatus("loading");
    setJobsError(null);
    void loadCareerJobsList(requestInstituteId).then((next) => {
      if (
        !shouldCommitCareerJobsLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setApiJobs(next.items);
      setJobsStatus(next.status);
      setJobsError(next.errorMessage);
      setJobsResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
  ]);

  useEffect(() => {
    setSelectedId(null);
    setConvertOpen(false);
  }, [instituteCtx.activeInstituteId]);

  const listHint =
    listView.status === "loading"
      ? "Loading career applications…"
      : listView.status === "needs_institute"
        ? "Select an institute to load career applications."
        : listView.status === "forbidden"
          ? listView.errorMessage ??
            "You do not have access to careers for this institute."
          : listView.status === "error"
            ? listView.errorMessage ?? "Failed to load career applications."
            : listView.status === "empty"
              ? "No career applications found for this institute."
              : null;

  const countLabel = (count: number) =>
    apiMode && !listView.rowsValid ? "…" : String(count);

  const approved = useMemo(
    () => activeApps.filter((a) => a.stage === "approved"),
    [activeApps],
  );
  const counts = useMemo(() => {
    const by = (stage: AdminCareerSyncRow["stage"]) =>
      activeApps.filter((a) => a.stage === stage).length;
    return {
      total: activeApps.length,
      review: by("review") + by("verification") + by("interview"),
      approved: by("approved"),
      waitlist: by("waitlist"),
      rejected: by("rejected"),
    };
  }, [activeApps]);

  const selected = useMemo(
    () => (selectedId ? apps.find((a) => a.id === selectedId) ?? null : null),
    [apps, selectedId],
  );
  const selectedDetail = useMemo(
    () => (selectedId ? getAdminCareerDetail(selectedId) : null),
    [selectedId],
  );
  const selectedJob = selected ? findJobForRole(jobs, selected.role) : null;
  const jobClosed = selectedJob?.status === "closed";
  const canConvert =
    selected?.stage === "approved" &&
    !jobClosed &&
    (selectedJob ? selectedJob.hired < selectedJob.vacancies : true);

  useEffect(() => {
    if (apiMode) return;
    const seeded = ensureAdminCareerSyncSeed(FALLBACK);
    setApps(seeded);
    setJobs(loadCareerJobs());
  }, [apiMode]);

  const convertToTeacher = (draft: CareerConvertDraft) => {
    if (!writesEnabled || !selected || !canConvert) return;
    if (apiMode) {
      notify(
        "Hire as teacher is not available via Careers API yet — use Teachers create after selecting in portal",
      );
      return;
    }
    const roleTitle = selected.role;
    const hiredId = selected.id;
    const record = appendTeacherFromCareer(draft);

    const result = applyHireAndMaybeCloseRole(jobs, apps, roleTitle, hiredId);
    setJobs(result.jobs);
    setApps(result.apps);
    writeAppsSnapshot(result.apps);

    for (const id of result.waitlistedIds) {
      persistAdminCareerStageChange(id, "waitlist", result.apps);
    }

    setSelectedId(null);
    setConvertOpen(false);

    if (result.closed) {
      notify(
        `${record.name} hired · ${roleTitle} filled — job closed · ${result.waitlistedIds.length} moved to waitlist`,
      );
    } else {
      const job = findJobForRole(result.jobs, roleTitle);
      const remaining = job ? Math.max(0, job.vacancies - job.hired) : null;
      notify(
        `${record.name} hired as teacher${
          draft.createConnectAccount ? " · Connect account ready" : ""
        }${remaining !== null ? ` · ${remaining} vacancy${remaining === 1 ? "" : "ies"} left` : ""}`,
      );
    }
  };

  const openConvert = (id: string) => {
    if (apiMode) {
      notify(
        "Hire as teacher is not available via Careers API yet — select in portal, then create the teacher in Teachers",
      );
      return;
    }
    if (!writesEnabled) {
      notify("Convert to teacher is not enabled in API read-only mode");
      return;
    }
    setSelectedId(id);
    setConvertOpen(true);
  };

  return (
    <AppShell
      title="Careers"
      subtitle={
        apiMode
          ? `API mode · ${countLabel(activeApps.length)} applications · ${jobsListView.rowsValid ? jobsListView.items.length : "…"} jobs`
          : "Review applicants in Connect · hire approved teachers here"
      }
      actions={
        writesEnabled ? (
          <>
            <Button onClick={() => void openCareersFromAdmin("applicants")}>
              <ClipboardList className="size-3.5" /> Review applicants
              <ExternalLink className="size-3.5 opacity-70" />
            </Button>
            <Button variant="primary" onClick={() => void openCareersFromAdmin("recruiter")}>
              Open Careers portal
              <ExternalLink className="size-3.5 opacity-70" />
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <Card className="overflow-hidden border-primary/20 bg-primary/[0.03]">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <div className="text-xs font-semibold text-foreground">
                {apiMode
                  ? "Career applications"
                  : "Post roles and decide on applicants in the Careers portal"}
              </div>
              <p className="max-w-xl text-[12px] leading-relaxed text-muted-foreground">
                {apiMode
                  ? "Job postings and application pipeline from the API. Job status and application transitions are writable; hire-as-teacher remains Teachers-side."
                  : "Create vacancies, review documents, schedule interviews, waitlist or reject candidates in Connect. Come back to Admin only to hire an approved applicant as a teacher."}
              </p>
            </div>
            {writesEnabled ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="primary" onClick={() => void openCareersFromAdmin("recruiter")}>
                Go to Careers portal <ArrowRight className="size-3.5" />
              </Button>
            </div>
            ) : null}
          </div>
        </Card>

        {apiMode ? (
          <Card>
            <CardHeader
              title="Job postings"
              hint="Vacancies from the API"
              action={
                <Pill tone="neutral">
                  {jobsListView.rowsValid
                    ? `${jobsListView.items.length} job(s)`
                    : "…"}
                </Pill>
              }
            />
            {!jobsListView.rowsValid ? (
              <div className="px-5 pb-6 text-center text-sm text-muted-foreground">
                {jobsListHint(jobsListView.status, jobsListView.errorMessage) ??
                  "Loading career jobs…"}
              </div>
            ) : jobsListView.items.length === 0 ? (
              <div className="px-5 pb-6 text-center text-sm text-muted-foreground">
                {jobsListHint(jobsListView.status, jobsListView.errorMessage)}
              </div>
            ) : (
              <div className="space-y-2 px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
                {jobsListView.items.map((job) => (
                  <div
                    key={job.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background/40 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium">{job.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {job.category} · {job.employmentTypeLabel} · {job.workModeLabel} ·{" "}
                        {job.locationLabel}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="rounded-md border border-border bg-background/60 px-2 py-1">
                        <span className="text-muted-foreground">Openings </span>
                        <span className="font-medium tabular-nums">{job.openingsCount}</span>
                      </span>
                      <Pill tone={jobStatusTone(job.status)}>{job.status}</Pill>
                      {writesEnabled && job.status === "open" ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            void updateCareerJob(job.id, { status: "closed" })
                              .then(() => {
                                setReloadKey((k) => k + 1);
                                notify(`Closed ${job.title}`);
                              })
                              .catch((err) => {
                                notify(
                                  err instanceof Error
                                    ? err.message
                                    : "Failed to close job",
                                );
                              });
                          }}
                        >
                          Close
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : null}

        {!listView.rowsValid ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {listHint ?? "Loading career applications…"}
          </div>
        ) : (
        <>
        <KpiGrid cols={4}>
          <Kpi
            label="Not decided yet"
            value={countLabel(counts.review)}
            delta="Still reviewing applicants"
            icon={<Users className="size-3.5" />}
          />
          <Kpi
            label="Approved — hire as teacher"
            value={countLabel(counts.approved)}
            delta="Ready in Admin"
            tone="up"
            icon={<CheckCircle2 className="size-3.5" />}
          />
          <Kpi
            label="On waiting list"
            value={countLabel(counts.waitlist)}
            delta="Update in portal"
            icon={<ListOrdered className="size-3.5" />}
          />
          <Kpi
            label="All applications"
            value={countLabel(counts.total)}
            delta={`${counts.rejected} not selected`}
            icon={<ClipboardList className="size-3.5" />}
          />
        </KpiGrid>

        <Card>
          <CardHeader
            title="Hire approved applicants as teachers"
            hint={
              apiMode
                ? "Approved applicants from API · hire remains Teachers-side"
                : "Creates the teacher record · optional Connect login"
            }
            action={
              writesEnabled ? (
              <Button size="sm" onClick={() => void openCareersFromAdmin("applicants")}>
                Review applicants <ExternalLink className="size-3 opacity-70" />
              </Button>
              ) : undefined
            }
          />
          {approved.length === 0 ? (
            <div className="px-5 pb-6 text-center">
              <p className="text-sm text-muted-foreground">
                {listHint ?? "No approved applicants waiting to be hired as teachers."}
              </p>
              {writesEnabled ? (
              <>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Approve an application in the Careers portal, then return here to create their
                teacher record.
              </p>
              <Button
                className="mt-4"
                variant="primary"
                onClick={() => void openCareersFromAdmin("applicants")}
              >
                Review applicants <ExternalLink className="size-3.5 opacity-70" />
              </Button>
              </>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-border px-2 pb-2 sm:px-3">
              {approved.map((app) => {
                const job = writesEnabled ? findJobForRole(jobs, app.role) : null;
                const closed = job?.status === "closed";
                const full = job ? job.hired >= job.vacancies : false;
                const hireDisabled = !writesEnabled || closed || full;
                return (
                  <li
                    key={app.id}
                    className="flex flex-wrap items-center gap-3 px-2 py-3 sm:px-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium">{app.name}</div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        <span className="font-mono">{app.id}</span>
                        {" · "}
                        {app.role}
                        {" · Applied "}
                        {app.applied}
                        {" · Docs "}
                        {app.docs}
                        {job
                          ? ` · ${job.hired}/${job.vacancies} hired`
                          : ""}
                      </div>
                    </div>
                    <Pill tone={careerStageTone(app.stage)}>
                      {careerStageLabel(app.stage)}
                    </Pill>
                    {!apiMode && writesEnabled ? (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={hireDisabled}
                      onClick={() => openConvert(app.id)}
                    >
                      <UserPlus className="size-3.5" /> Convert to teacher
                    </Button>
                    ) : null}
                    {apiMode && writesEnabled ? (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          void transitionCareerApplication(app.id, {
                            status: "selected",
                          })
                            .then(() => {
                              setReloadKey((k) => k + 1);
                              notify(`${app.name} marked selected`);
                            })
                            .catch((err) => {
                              notify(
                                err instanceof Error
                                  ? err.message
                                  : "Failed to transition application",
                              );
                            });
                        }}
                      >
                        Mark selected
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <p className="text-[11px] text-muted-foreground px-1">
          {writesEnabled ? (
            <>
          After you hire them, manage the record under{" "}
          <Link to="/teachers" className="text-primary font-medium hover:underline">
            Teachers
          </Link>
          {" · "}
          post roles and review applicants in{" "}
          <button
            type="button"
            className="text-primary font-medium hover:underline inline-flex items-center gap-1"
            onClick={() => void openCareersFromAdmin("jobs")}
          >
            Careers <Briefcase className="size-3" />
          </button>
          .
            </>
          ) : (
            "Teacher hiring and Connect portal workflows are not enabled in API read-only mode."
          )}
        </p>
        </>
        )}
      </div>

      {writesEnabled ? (
      <ConvertToTeacherDialog
        open={convertOpen}
        row={selected}
        detail={selectedDetail}
        onClose={() => {
          setConvertOpen(false);
          setSelectedId(null);
        }}
        onConvert={convertToTeacher}
      />
      ) : null}
    </AppShell>
  );
}
