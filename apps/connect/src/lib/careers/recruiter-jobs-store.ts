import { createBrowserAuthStorage } from "@lumenx/auth";
import type {
  EmploymentType,
  JobApplicationExtras,
  JobCategory,
  JobPosting,
  RecruiterJobStatus,
  WorkMode,
} from "./types";
import { JOB_CATEGORY_LABEL } from "./jobs-data";

const storage = createBrowserAuthStorage();
const STORE_KEY = "ues_careers_recruiter_jobs";

const CATEGORY_TO_FACULTY = {
  academic_faculty: "academic",
  sports_faculty: "sports",
  lab_faculty: "lab",
  administrator: "administrative",
  accountant: "administrative",
  admissions_officer: "administrative",
  transport_staff: "administrative",
  support_staff: "administrative",
  it_software: "administrative",
  sales_marketing: "administrative",
  finance: "administrative",
  human_resources: "administrative",
  operations: "administrative",
  healthcare: "administrative",
} as const satisfies Record<JobCategory, "academic" | "sports" | "lab" | "administrative">;

export interface RecruiterJobInput {
  title: string;
  department: string;
  category: JobCategory;
  employmentType: EmploymentType;
  workMode: WorkMode;
  experienceRequired: string;
  city: string;
  state: string;
  overview: string;
  description?: string;
  responsibilities: string[];
  qualifications: string[];
  skills: string[];
  benefits: string[];
  deadline: string;
  salaryDisplay?: string;
  location?: string;
  applicationExtras?: JobApplicationExtras;
  jobStatus?: RecruiterJobStatus;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  storage.setItem(key, JSON.stringify(value));
}

function readStore(): JobPosting[] {
  return readJson<JobPosting[]>(STORE_KEY, []);
}

function writeStore(jobs: JobPosting[]) {
  writeJson(STORE_KEY, jobs);
}

export { JOB_CATEGORY_LABEL };

export function getRecruiterPostedJobs(): JobPosting[] {
  return readStore();
}

export function getOpenRecruiterJobs(): JobPosting[] {
  return readStore().filter((j) => j.recruiterJobStatus === "open");
}

export function getRecruiterJobsForOrg(organizationId: string): JobPosting[] {
  return readStore().filter((j) => j.instituteId === organizationId);
}

export function getRecruiterJobById(jobId: string): JobPosting | undefined {
  return readStore().find((j) => j.id === jobId);
}

export function createRecruiterJob(
  recruiterId: string,
  organizationId: string,
  organizationName: string,
  input: RecruiterJobInput,
): JobPosting {
  const id = `rec-job-${Date.now()}`;
  const postedAt = new Date().toISOString().slice(0, 10);
  const job: JobPosting = {
    id,
    instituteId: organizationId,
    instituteName: organizationName,
    city: input.city,
    state: input.state,
    title: input.title.trim(),
    department: input.department.trim(),
    category: input.category,
    facultyType: CATEGORY_TO_FACULTY[input.category],
    employmentType: input.employmentType,
    workMode: input.workMode,
    experienceRequired: input.experienceRequired.trim(),
    postedAt,
    deadline: input.deadline,
    overview: input.overview.trim(),
    description: input.description?.trim() || undefined,
    responsibilities: input.responsibilities.filter(Boolean),
    qualifications: input.qualifications.filter(Boolean),
    skills: input.skills.filter(Boolean),
    benefits:
      input.benefits.length > 0 ? input.benefits.filter(Boolean) : ["As per company policy"],
    location: input.location?.trim() || `${input.city}, ${input.state}`,
    imageGradient: "from-primary/15 to-muted",
    salaryDisplay: input.salaryDisplay?.trim() || "Competitive",
    postedByRecruiterId: recruiterId,
    recruiterJobStatus: input.jobStatus ?? "open",
    applicationExtras: input.applicationExtras,
  };
  writeStore([job, ...readStore()]);
  return job;
}

export function updateRecruiterJob(
  jobId: string,
  organizationId: string,
  input: RecruiterJobInput,
): JobPosting | undefined {
  const jobs = readStore();
  const idx = jobs.findIndex((j) => j.id === jobId && j.instituteId === organizationId);
  if (idx < 0) return undefined;

  const existing = jobs[idx]!;
  const updated: JobPosting = {
    ...existing,
    city: input.city,
    state: input.state,
    title: input.title.trim(),
    department: input.department.trim(),
    category: input.category,
    facultyType: CATEGORY_TO_FACULTY[input.category],
    employmentType: input.employmentType,
    workMode: input.workMode,
    experienceRequired: input.experienceRequired.trim(),
    deadline: input.deadline,
    overview: input.overview.trim(),
    description: input.description?.trim() || undefined,
    responsibilities: input.responsibilities.filter(Boolean),
    qualifications: input.qualifications.filter(Boolean),
    skills: input.skills.filter(Boolean),
    benefits:
      input.benefits.length > 0 ? input.benefits.filter(Boolean) : ["As per company policy"],
    location: input.location?.trim() || `${input.city}, ${input.state}`,
    salaryDisplay: input.salaryDisplay?.trim() || "Competitive",
    recruiterJobStatus: input.jobStatus ?? existing.recruiterJobStatus ?? "draft",
    applicationExtras: input.applicationExtras ?? existing.applicationExtras,
  };

  const next = [...jobs];
  next[idx] = updated;
  writeStore(next);
  return updated;
}

export function canRecruiterEditJob(jobId: string, organizationId: string): boolean {
  const job = getRecruiterJobById(jobId);
  return !!job && job.instituteId === organizationId && !!job.postedByRecruiterId;
}

export function updateRecruiterJobStatus(
  jobId: string,
  status: RecruiterJobStatus,
): JobPosting | undefined {
  const jobs = readStore();
  const idx = jobs.findIndex((j) => j.id === jobId);
  if (idx < 0) return undefined;
  const updated = { ...jobs[idx]!, recruiterJobStatus: status };
  const next = [...jobs];
  next[idx] = updated;
  writeStore(next);
  return updated;
}

export function countApplicantsForJob(jobId: string, applications: { jobId: string }[]): number {
  return applications.filter((a) => a.jobId === jobId).length;
}

export function seedRecruiterDemoJobs() {
  const existing = readStore();
  if (existing.some((j) => j.id === "rec-job-demo-hr-intern")) return;
  const demo: JobPosting = {
    id: "rec-job-demo-hr-intern",
    instituteId: "ins-lumenx-academy",
    instituteName: "LumenX Academy",
    city: "Hyderabad",
    state: "Telangana",
    title: "HR Intern (Draft)",
    department: "Human Resources",
    category: "human_resources",
    facultyType: "administrative",
    employmentType: "part_time",
    workMode: "onsite",
    experienceRequired: "Fresher",
    postedAt: "2026-05-10",
    deadline: "2026-06-30",
    overview: "Support campus hiring drives and employee onboarding.",
    responsibilities: ["Schedule interviews", "Maintain applicant tracker"],
    qualifications: ["Pursuing HR / MBA"],
    skills: ["Communication", "MS Office"],
    benefits: ["Stipend", "Certificate"],
    location: "Green Park Campus",
    imageGradient: "from-muted to-primary/10",
    salaryDisplay: "₹15k/month stipend",
    postedByRecruiterId: "CAR-DEMO-REC-001",
    recruiterJobStatus: "draft",
  };
  writeStore([demo, ...existing]);
}
