import { CAREERS_STORAGE_KEYS, createBrowserAuthStorage } from "@lumenx/auth";

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

function followedKey(candidateId: string) {
  return `${CAREERS_STORAGE_KEYS.followedInstitutes}_${candidateId}`;
}

function savedInstitutesKey(candidateId: string) {
  return `${CAREERS_STORAGE_KEYS.savedInstitutes}_${candidateId}`;
}

export function getFollowedInstituteIds(candidateId: string): string[] {
  return readJson<string[]>(followedKey(candidateId), []);
}

export function isInstituteFollowed(candidateId: string, instituteId: string): boolean {
  return getFollowedInstituteIds(candidateId).includes(instituteId);
}

export function toggleFollowInstitute(candidateId: string, instituteId: string): boolean {
  const current = getFollowedInstituteIds(candidateId);
  const followed = current.includes(instituteId);
  const next = followed ? current.filter((id) => id !== instituteId) : [...current, instituteId];
  writeJson(followedKey(candidateId), next);
  return !followed;
}

export function getSavedInstituteIds(candidateId: string): string[] {
  return readJson<string[]>(savedInstitutesKey(candidateId), []);
}

export function toggleSavedInstitute(candidateId: string, instituteId: string): boolean {
  const current = getSavedInstituteIds(candidateId);
  const saved = current.includes(instituteId);
  const next = saved ? current.filter((id) => id !== instituteId) : [...current, instituteId];
  writeJson(savedInstitutesKey(candidateId), next);
  return !saved;
}

export function isInstituteSaved(candidateId: string, instituteId: string): boolean {
  return getSavedInstituteIds(candidateId).includes(instituteId);
}
