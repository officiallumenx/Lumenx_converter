import { CAREERS_STORAGE_KEYS, createBrowserAuthStorage } from "@lumenx/auth";
import { getJobById as getStaticJobById, JOB_POSTINGS } from "./jobs-data";
import { getOpenRecruiterJobs } from "./recruiter-jobs-store";

function allJobs() {
  return [...JOB_POSTINGS, ...getOpenRecruiterJobs()];
}

const storage = createBrowserAuthStorage();

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

function savedJobsKey(candidateId: string) {
  return `${CAREERS_STORAGE_KEYS.savedJobs}_${candidateId}`;
}

export function getSavedJobIds(candidateId: string): string[] {
  return readJson<string[]>(savedJobsKey(candidateId), []);
}

export function isJobSaved(candidateId: string, jobId: string): boolean {
  return getSavedJobIds(candidateId).includes(jobId);
}

export function toggleSavedJob(candidateId: string, jobId: string): boolean {
  const current = getSavedJobIds(candidateId);
  const saved = current.includes(jobId);
  const next = saved ? current.filter((id) => id !== jobId) : [...current, jobId];
  writeJson(savedJobsKey(candidateId), next);
  return !saved;
}

export function getSavedJobs(candidateId: string) {
  const ids = getSavedJobIds(candidateId);
  return allJobs().filter((j) => ids.includes(j.id));
}

export function addSavedJob(candidateId: string, jobId: string) {
  const current = getSavedJobIds(candidateId);
  if (!current.includes(jobId)) {
    writeJson(savedJobsKey(candidateId), [...current, jobId]);
  }
}

export function removeSavedJob(candidateId: string, jobId: string) {
  writeJson(
    savedJobsKey(candidateId),
    getSavedJobIds(candidateId).filter((id) => id !== jobId),
  );
}

export function getJobById(id: string) {
  return allJobs().find((j) => j.id === id) ?? getStaticJobById(id);
}
