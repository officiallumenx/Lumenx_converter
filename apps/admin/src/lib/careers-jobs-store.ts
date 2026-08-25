import { CAREER_JOBS } from "@/lib/admin-module-data";
import type { AdminCareerSyncRow } from "@/lib/careers-sync";

const JOBS_KEY = "lumenx.admin.careers.jobs.v1";

export type CareerJobStatus = "open" | "closed";

export type CareerJobPosting = {
  id: string;
  title: string;
  dept: string;
  /** Number of positions that can be hired successfully for this role. */
  vacancies: number;
  /** Successful hires (Convert to teacher) counted toward vacancies. */
  hired: number;
  status: CareerJobStatus;
};

function seedJobs(): CareerJobPosting[] {
  return CAREER_JOBS.map((job) => ({
    id: job.id,
    title: job.title,
    dept: job.dept,
    // Demo: Physics has 2 seats so you can hire once and still leave one open.
    vacancies: job.title === "Physics Teacher" ? 2 : 1,
    hired: 0,
    status: "open" as const,
  }));
}

export function loadCareerJobs(): CareerJobPosting[] {
  try {
    const raw = localStorage.getItem(JOBS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CareerJobPosting[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((job) => ({
          ...job,
          vacancies: Math.max(1, Number(job.vacancies) || 1),
          hired: Math.max(0, Number(job.hired) || 0),
          status: job.status === "closed" ? "closed" : "open",
        }));
      }
    }
  } catch {
    // fall through
  }
  const seeded = seedJobs();
  saveCareerJobs(seeded);
  return seeded;
}

export function saveCareerJobs(jobs: CareerJobPosting[]): void {
  try {
    localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
  } catch {
    // ignore
  }
}

export function countApplicationsForRole(
  apps: AdminCareerSyncRow[],
  roleTitle: string,
): number {
  const needle = roleTitle.trim().toLowerCase();
  return apps.filter((a) => a.role.trim().toLowerCase() === needle).length;
}

export function findJobForRole(
  jobs: CareerJobPosting[],
  roleTitle: string,
): CareerJobPosting | null {
  const needle = roleTitle.trim().toLowerCase();
  return jobs.find((j) => j.title.trim().toLowerCase() === needle) ?? null;
}

export function createCareerJob(input: {
  title: string;
  dept: string;
  vacancies: number;
}): CareerJobPosting {
  return {
    id: `JOB-${Date.now()}`,
    title: input.title.trim(),
    dept: input.dept.trim() || "General",
    vacancies: Math.max(1, Math.floor(input.vacancies) || 1),
    hired: 0,
    status: "open",
  };
}

/**
 * After a successful hire: bump hired count; if vacancies filled, close the job
 * and move remaining active pipeline applicants for that role onto waitlist.
 */
export function applyHireAndMaybeCloseRole(
  jobs: CareerJobPosting[],
  apps: AdminCareerSyncRow[],
  roleTitle: string,
  hiredAppId: string,
): {
  jobs: CareerJobPosting[];
  apps: AdminCareerSyncRow[];
  closed: boolean;
  waitlistedIds: string[];
} {
  const needle = roleTitle.trim().toLowerCase();
  let closed = false;
  const waitlistedIds: string[] = [];

  const nextJobs = jobs.map((job) => {
    if (job.title.trim().toLowerCase() !== needle) return job;
    const hired = job.hired + 1;
    const filled = hired >= job.vacancies;
    if (filled) closed = true;
    return {
      ...job,
      hired,
      status: filled ? ("closed" as const) : job.status,
    };
  });

  // Remove the hired applicant from the board.
  let nextApps = apps.filter((a) => a.id !== hiredAppId);

  if (closed) {
    nextApps = nextApps.map((app) => {
      if (app.role.trim().toLowerCase() !== needle) return app;
      if (
        app.stage === "rejected" ||
        app.stage === "waitlist"
      ) {
        return app;
      }
      // Active pipeline → waitlist automatically
      waitlistedIds.push(app.id);
      return { ...app, stage: "waitlist" as const };
    });
  }

  saveCareerJobs(nextJobs);
  return { jobs: nextJobs, apps: nextApps, closed, waitlistedIds };
}

export function updateJobVacancies(
  jobs: CareerJobPosting[],
  jobId: string,
  vacancies: number,
): CareerJobPosting[] {
  const next = jobs.map((job) => {
    if (job.id !== jobId) return job;
    const v = Math.max(1, Math.floor(vacancies) || 1);
    const filled = job.hired >= v;
    return {
      ...job,
      vacancies: v,
      status: filled ? ("closed" as const) : ("open" as const),
    };
  });
  saveCareerJobs(next);
  return next;
}
