import { ADMISSIONS_STORAGE_KEYS, createBrowserAuthStorage } from "@lumenx/auth";

const storage = createBrowserAuthStorage();

function readIds(key: string): string[] {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]) {
  storage.setItem(key, JSON.stringify(ids));
}

export function getSavedInstituteIds(userId: string) {
  return readIds(`${ADMISSIONS_STORAGE_KEYS.savedInstitutes}_${userId}`);
}

export function toggleSavedInstitute(userId: string, instituteId: string): boolean {
  const key = `${ADMISSIONS_STORAGE_KEYS.savedInstitutes}_${userId}`;
  const ids = readIds(key);
  const exists = ids.includes(instituteId);
  const next = exists ? ids.filter((id) => id !== instituteId) : [...ids, instituteId];
  writeIds(key, next);
  return !exists;
}

export function isInstituteSaved(userId: string, instituteId: string) {
  return getSavedInstituteIds(userId).includes(instituteId);
}

export function getSavedProgramIds(userId: string) {
  return readIds(`${ADMISSIONS_STORAGE_KEYS.savedPrograms}_${userId}`);
}

export function toggleSavedProgram(userId: string, programId: string): boolean {
  const key = `${ADMISSIONS_STORAGE_KEYS.savedPrograms}_${userId}`;
  const ids = readIds(key);
  const exists = ids.includes(programId);
  const next = exists ? ids.filter((id) => id !== programId) : [...ids, programId];
  writeIds(key, next);
  return !exists;
}

export function isProgramSaved(userId: string, programId: string) {
  return getSavedProgramIds(userId).includes(programId);
}
