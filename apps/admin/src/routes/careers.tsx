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
import { useEffect, useMemo, useState } from "react";

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

/**
 * Thin Admin bridge for Careers.
 * Job posting and applicant review live in Connect Careers (recruiter).
 * Admin only hires approved candidates into the teachers directory.
 */
function CareersPage() {
  const notify = useAdminToast();
  const [apps, setApps] = useState<AdminCareerSyncRow[]>(() =>
    ensureAdminCareerSyncSeed(FALLBACK),
  );
  const [jobs, setJobs] = useState<CareerJobPosting[]>(() => loadCareerJobs());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);

  const approved = useMemo(
    () => apps.filter((a) => a.stage === "approved"),
    [apps],
  );
  const counts = useMemo(() => {
    const by = (stage: AdminCareerSyncRow["stage"]) =>
      apps.filter((a) => a.stage === stage).length;
    return {
      total: apps.length,
      review: by("review") + by("verification") + by("interview"),
      approved: by("approved"),
      waitlist: by("waitlist"),
      rejected: by("rejected"),
    };
  }, [apps]);

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
    const seeded = ensureAdminCareerSyncSeed(FALLBACK);
    setApps(seeded);
    setJobs(loadCareerJobs());
  }, []);

  const convertToTeacher = (draft: CareerConvertDraft) => {
    if (!selected || !canConvert) return;
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
    setSelectedId(id);
    setConvertOpen(true);
  };

  return (
    <AppShell
      title="Careers"
      subtitle="Review applicants in Connect · hire approved teachers here"
      actions={
        <>
          <Button onClick={() => openCareersFromAdmin("applicants")}>
            <ClipboardList className="size-3.5" /> Review applicants
            <ExternalLink className="size-3.5 opacity-70" />
          </Button>
          <Button variant="primary" onClick={() => openCareersFromAdmin("recruiter")}>
            Open Careers portal
            <ExternalLink className="size-3.5 opacity-70" />
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Card className="overflow-hidden border-primary/20 bg-primary/[0.03]">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <div className="text-xs font-semibold text-foreground">
                Post roles and decide on applicants in the Careers portal
              </div>
              <p className="max-w-xl text-[12px] leading-relaxed text-muted-foreground">
                Create vacancies, review documents, schedule interviews, waitlist or reject
                candidates in Connect. Come back to Admin only to hire an approved applicant as
                a teacher.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="primary" onClick={() => openCareersFromAdmin("recruiter")}>
                Go to Careers portal <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </Card>

        <KpiGrid cols={4}>
          <Kpi
            label="Not decided yet"
            value={String(counts.review)}
            delta="Still reviewing applicants"
            icon={<Users className="size-3.5" />}
          />
          <Kpi
            label="Approved — hire as teacher"
            value={String(counts.approved)}
            delta="Ready in Admin"
            tone="up"
            icon={<CheckCircle2 className="size-3.5" />}
          />
          <Kpi
            label="On waiting list"
            value={String(counts.waitlist)}
            delta="Update in portal"
            icon={<ListOrdered className="size-3.5" />}
          />
          <Kpi
            label="All applications"
            value={String(counts.total)}
            delta={`${counts.rejected} not selected`}
            icon={<ClipboardList className="size-3.5" />}
          />
        </KpiGrid>

        <Card>
          <CardHeader
            title="Hire approved applicants as teachers"
            hint="Creates the teacher record · optional Connect login"
            action={
              <Button size="sm" onClick={() => openCareersFromAdmin("applicants")}>
                Review applicants <ExternalLink className="size-3 opacity-70" />
              </Button>
            }
          />
          {approved.length === 0 ? (
            <div className="px-5 pb-6 text-center">
              <p className="text-sm text-muted-foreground">
                No approved applicants waiting to be hired as teachers.
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Approve an application in the Careers portal, then return here to create their
                teacher record.
              </p>
              <Button
                className="mt-4"
                variant="primary"
                onClick={() => openCareersFromAdmin("applicants")}
              >
                Review applicants <ExternalLink className="size-3.5 opacity-70" />
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border px-2 pb-2 sm:px-3">
              {approved.map((app) => {
                const job = findJobForRole(jobs, app.role);
                const closed = job?.status === "closed";
                const full = job ? job.hired >= job.vacancies : false;
                const hireDisabled = closed || full;
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
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={hireDisabled}
                      onClick={() => openConvert(app.id)}
                    >
                      <UserPlus className="size-3.5" /> Convert to teacher
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <p className="text-[11px] text-muted-foreground px-1">
          After you hire them, manage the record under{" "}
          <Link to="/teachers" className="text-primary font-medium hover:underline">
            Teachers
          </Link>
          {" · "}
          post roles and review applicants in{" "}
          <button
            type="button"
            className="text-primary font-medium hover:underline inline-flex items-center gap-1"
            onClick={() => openCareersFromAdmin("jobs")}
          >
            Careers <Briefcase className="size-3" />
          </button>
          .
        </p>
      </div>

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
    </AppShell>
  );
}
