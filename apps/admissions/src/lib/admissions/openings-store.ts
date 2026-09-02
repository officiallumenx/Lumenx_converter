import { ADMISSIONS_STORAGE_KEYS, createBrowserAuthStorage } from "@lumenx/auth";
import type { AdmissionOpening, AdmissionOpeningStatus, AdmissionProgram } from "./types";

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

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function readStore(): AdmissionOpening[] {
  return readJson<AdmissionOpening[]>(ADMISSIONS_STORAGE_KEYS.admissionOpenings, []);
}

function writeStore(items: AdmissionOpening[]) {
  writeJson(ADMISSIONS_STORAGE_KEYS.admissionOpenings, items);
}

export type AdmissionOpeningInput = {
  name: string;
  description?: string;
  grades: string[];
  seatsAvailable: number;
  academicYear: string;
  applicationDeadline: string;
  eligibility?: string;
  ageCriteria?: string;
  duration?: string;
  status?: AdmissionOpeningStatus;
};

export function getOpeningsForInstitute(instituteId: string): AdmissionOpening[] {
  return readStore()
    .filter((o) => o.instituteId === instituteId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getOpeningById(id: string): AdmissionOpening | undefined {
  return readStore().find((o) => o.id === id);
}

export function getOpenPublishedOpenings(instituteId?: string): AdmissionOpening[] {
  return readStore().filter(
    (o) => o.status === "open" && (!instituteId || o.instituteId === instituteId),
  );
}

export function openingToProgram(opening: AdmissionOpening): AdmissionProgram {
  return {
    id: opening.id,
    instituteId: opening.instituteId,
    name: opening.name,
    slug: opening.slug,
    description: opening.description,
    duration: opening.duration || "1 academic year",
    eligibility: opening.eligibility || "As per institute criteria",
    ageCriteria: opening.ageCriteria,
    seatsAvailable: opening.seatsAvailable,
    grades: opening.grades,
    academicYear: opening.academicYear,
    applicationDeadline: opening.applicationDeadline,
  };
}

export function createOpening(instituteId: string, input: AdmissionOpeningInput): AdmissionOpening {
  const now = new Date().toISOString();
  const name = input.name.trim();
  const slug = slugify(name) || `opening-${Date.now().toString(36)}`;
  const singleClass =
    input.grades.map((g) => g.trim()).filter(Boolean)[0] || name;
  const opening: AdmissionOpening = {
    id: `open-${instituteId.replace("ins-", "")}-${Date.now().toString(36)}`,
    instituteId,
    name,
    slug,
    description: (input.description ?? "").trim() || `${name} admissions for ${input.academicYear}`,
    duration: (input.duration ?? "1 academic year").trim(),
    eligibility: (input.eligibility ?? "As per institute criteria").trim(),
    ageCriteria: input.ageCriteria?.trim() || undefined,
    seatsAvailable: Math.max(0, Math.floor(input.seatsAvailable)),
    grades: [singleClass],
    academicYear: input.academicYear.trim() || "2026–27",
    applicationDeadline: input.applicationDeadline.trim() || "TBA",
    status: input.status ?? "draft",
    createdAt: now,
    updatedAt: now,
  };
  writeStore([...readStore(), opening]);
  return opening;
}

export function updateOpening(
  openingId: string,
  patch: Partial<AdmissionOpeningInput>,
): AdmissionOpening | null {
  const all = readStore();
  const idx = all.findIndex((o) => o.id === openingId);
  if (idx < 0) return null;
  const current = all[idx]!;
  const name = patch.name?.trim() ?? current.name;
  const next: AdmissionOpening = {
    ...current,
    name,
    slug: patch.name ? slugify(name) || current.slug : current.slug,
    description:
      patch.description !== undefined
        ? patch.description.trim() || current.description
        : current.description,
    duration: patch.duration?.trim() || current.duration,
    eligibility: patch.eligibility?.trim() || current.eligibility,
    ageCriteria:
      patch.ageCriteria !== undefined
        ? patch.ageCriteria.trim() || undefined
        : current.ageCriteria,
    seatsAvailable:
      patch.seatsAvailable !== undefined
        ? Math.max(0, Math.floor(patch.seatsAvailable))
        : current.seatsAvailable,
    grades: patch.grades
      ? [patch.grades.map((g) => g.trim()).filter(Boolean)[0] || current.name]
      : current.grades.slice(0, 1),
    academicYear: patch.academicYear?.trim() || current.academicYear,
    applicationDeadline: patch.applicationDeadline?.trim() || current.applicationDeadline,
    status: patch.status ?? current.status,
    updatedAt: new Date().toISOString(),
  };
  all[idx] = next;
  writeStore(all);
  return next;
}

export function setOpeningStatus(
  openingId: string,
  status: AdmissionOpeningStatus,
): AdmissionOpening | null {
  return updateOpening(openingId, { status });
}

export function deleteOpening(openingId: string): boolean {
  const all = readStore();
  const next = all.filter((o) => o.id !== openingId);
  if (next.length === all.length) return false;
  writeStore(next);
  return true;
}

const SEED_FLAG_PREFIX = "ues_admissions_openings_seeded_";

/** Seed demo openings once per institute — never recreate after the user deletes them. */
export function ensureDemoOpenings(instituteId: string): void {
  if (!instituteId) return;
  const flagKey = `${SEED_FLAG_PREFIX}${instituteId}`;
  if (storage.getItem(flagKey)) return;

  const existing = getOpeningsForInstitute(instituteId);
  if (existing.length > 0) {
    storage.setItem(flagKey, "1");
    return;
  }

  // Seed for demo LumenX institute ids only
  if (instituteId === "ins-lumenx-academy" || instituteId === "LX-INST-001") {
  createOpening(instituteId, {
    name: "Class 10",
    description: "CBSE Class 10 admissions — limited seats for academic year 2026–27.",
    grades: ["Class 10"],
    seatsAvailable: 20,
    academicYear: "2026–27",
    applicationDeadline: "2026-06-30",
    eligibility: "Class 9 pass with 60%+ aggregate",
    ageCriteria: "14–16 years",
    duration: "1 year",
    status: "open",
  });
  createOpening(instituteId, {
    name: "Class 8",
    description: "Middle school intake for Class 8.",
    grades: ["Class 8"],
    seatsAvailable: 30,
    academicYear: "2026–27",
    applicationDeadline: "2026-05-31",
    eligibility: "Class 7 pass certificate",
    status: "draft",
  });
  }

  storage.setItem(flagKey, "1");
}
