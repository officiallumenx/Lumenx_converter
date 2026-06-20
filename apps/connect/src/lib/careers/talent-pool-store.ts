import { CAREERS_STORAGE_KEYS, createBrowserAuthStorage } from "@lumenx/auth";
import type { FacultyType, TalentPoolEntry } from "./types";

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

function poolKey(candidateId: string) {
  return `${CAREERS_STORAGE_KEYS.talentPool}_${candidateId}`;
}

export function getTalentPoolEntries(candidateId: string): TalentPoolEntry[] {
  return readJson<TalentPoolEntry[]>(poolKey(candidateId), []);
}

export function addToTalentPool(entry: Omit<TalentPoolEntry, "addedAt">) {
  const existing = getTalentPoolEntries(entry.candidateId);
  if (existing.some((e) => e.instituteId === entry.instituteId)) return;
  const next: TalentPoolEntry = { ...entry, addedAt: new Date().toISOString() };
  writeJson(poolKey(entry.candidateId), [...existing, next]);
}

export function isInTalentPool(candidateId: string, instituteId?: string): boolean {
  const entries = getTalentPoolEntries(candidateId);
  if (!instituteId) return entries.length > 0;
  return entries.some((e) => e.instituteId === instituteId);
}

export function enrollRejectedCandidate(
  candidateId: string,
  instituteId: string,
  instituteName: string,
  facultyType: FacultyType = "academic",
) {
  addToTalentPool({
    candidateId,
    instituteId,
    instituteName,
    facultyType,
    reason: "rejected",
    note: "Profile retained for future openings matching your skills.",
  });
}
