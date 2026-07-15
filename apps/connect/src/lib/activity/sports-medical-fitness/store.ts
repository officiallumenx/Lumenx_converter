import { cloneProfile, fitnessProfilesSeed } from "./mock";
import type {
  ClearanceInput,
  CoachMedicalInput,
  FitnessListFilters,
  FitnessTestInput,
  InjuryInput,
  InjuryStatus,
  MedicalHistoryInput,
  StudentFitnessProfile,
} from "./types";
import { FITNESS_METRIC_UNITS } from "./types";

let profilesStore: StudentFitnessProfile[] = fitnessProfilesSeed.map(cloneProfile);

function findProfile(id: string): StudentFitnessProfile {
  const p = profilesStore.find((x) => x.id === id);
  if (!p) throw new Error("Student fitness profile not found");
  return p;
}

function recomputeLatestMetrics(profile: StudentFitnessProfile): StudentFitnessProfile {
  const keys = ["bmi", "strength", "endurance", "speed", "flexibility"] as const;
  const latest = {} as StudentFitnessProfile["latestMetrics"];
  for (const key of keys) {
    const match = [...profile.fitnessTests]
      .filter((t) => t.metric === key)
      .sort((a, b) => b.testedAt.localeCompare(a.testedAt))[0];
    latest[key] = match
      ? { value: match.value, unit: match.unit, testedAt: match.testedAt }
      : null;
  }
  return { ...profile, latestMetrics: latest };
}

function applyFilters(items: StudentFitnessProfile[], filters?: FitnessListFilters): StudentFitnessProfile[] {
  let result = [...items];
  const f = filters ?? {};

  if (f.clearanceStatus && f.clearanceStatus !== "all") {
    result = result.filter((p) => p.clearanceStatus === f.clearanceStatus);
  }
  if (f.hasActiveInjury === true) {
    result = result.filter((p) =>
      p.injuries.some((i) => i.status === "active" || i.status === "recovering"),
    );
  } else if (f.hasActiveInjury === false) {
    result = result.filter(
      (p) => !p.injuries.some((i) => i.status === "active" || i.status === "recovering"),
    );
  }

  const q = f.query?.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (p) =>
        p.studentName.toLowerCase().includes(q) ||
        p.classLabel.toLowerCase().includes(q) ||
        (p.teamName?.toLowerCase().includes(q) ?? false),
    );
  }

  const sortBy = f.sortBy ?? "student";
  const dir = (f.sortDir ?? "asc") === "asc" ? 1 : -1;
  result.sort((a, b) => {
    if (sortBy === "clearance") return dir * a.clearanceStatus.localeCompare(b.clearanceStatus);
    if (sortBy === "updatedAt") return dir * a.updatedAt.localeCompare(b.updatedAt);
    return dir * a.studentName.localeCompare(b.studentName);
  });

  return result;
}

function saveProfile(id: string, next: StudentFitnessProfile): StudentFitnessProfile {
  const updated = recomputeLatestMetrics({
    ...next,
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  profilesStore = profilesStore.map((p) => (p.id === id ? updated : p));
  return cloneProfile(updated);
}

export function resetSportsMedicalFitnessStore() {
  profilesStore = fitnessProfilesSeed.map(cloneProfile);
}

export function listFitnessProfilesFromStore(filters?: FitnessListFilters): StudentFitnessProfile[] {
  return applyFilters(profilesStore, filters).map(cloneProfile);
}

export function getFitnessProfileByIdFromStore(id: string): StudentFitnessProfile | null {
  const found = profilesStore.find((p) => p.id === id);
  return found ? cloneProfile(found) : null;
}

export function addMedicalHistoryInStore(
  profileId: string,
  input: MedicalHistoryInput,
): StudentFitnessProfile {
  const profile = findProfile(profileId);
  const item = {
    id: `mh-${Date.now()}`,
    condition: input.condition.trim(),
    diagnosedDate: input.diagnosedDate,
    notes: input.notes?.trim(),
    ongoing: input.ongoing,
  };
  return saveProfile(profileId, {
    ...profile,
    medicalHistory: [item, ...profile.medicalHistory],
  });
}

export function addInjuryInStore(profileId: string, input: InjuryInput): StudentFitnessProfile {
  const profile = findProfile(profileId);
  const injury = {
    id: `inj-${Date.now()}`,
    injuryType: input.injuryType.trim(),
    bodyPart: input.bodyPart.trim(),
    severity: input.severity,
    occurredOn: input.occurredOn,
    status: "active" as const,
    recoveryNotes: input.recoveryNotes?.trim(),
    expectedReturnDate: input.expectedReturnDate,
  };
  return saveProfile(profileId, {
    ...profile,
    injuries: [injury, ...profile.injuries],
  });
}

export function updateInjuryStatusInStore(
  profileId: string,
  injuryId: string,
  status: InjuryStatus,
  recoveryNotes?: string,
): StudentFitnessProfile {
  const profile = findProfile(profileId);
  const injuries = profile.injuries.map((i) =>
    i.id === injuryId
      ? {
          ...i,
          status,
          recoveryNotes: recoveryNotes?.trim() ?? i.recoveryNotes,
        }
      : i,
  );
  return saveProfile(profileId, { ...profile, injuries });
}

export function addFitnessTestInStore(
  profileId: string,
  input: FitnessTestInput,
): StudentFitnessProfile {
  const profile = findProfile(profileId);
  const test = {
    id: `ft-${Date.now()}`,
    metric: input.metric,
    value: input.value,
    unit: FITNESS_METRIC_UNITS[input.metric],
    testedAt: input.testedAt,
    notes: input.notes?.trim(),
  };
  return saveProfile(profileId, {
    ...profile,
    fitnessTests: [test, ...profile.fitnessTests],
  });
}

export function updateClearanceInStore(
  profileId: string,
  input: ClearanceInput,
): StudentFitnessProfile {
  const profile = findProfile(profileId);
  return saveProfile(profileId, {
    ...profile,
    clearanceStatus: input.clearanceStatus,
    clearanceDate: input.clearanceDate ?? profile.clearanceDate,
    clearanceNotes: input.clearanceNotes?.trim() ?? profile.clearanceNotes,
  });
}

export function updateCoachMedicalInStore(
  profileId: string,
  input: CoachMedicalInput,
): StudentFitnessProfile {
  const profile = findProfile(profileId);
  const now = new Date().toISOString().slice(0, 10);
  return saveProfile(profileId, {
    ...profile,
    coachView: {
      medicalNotes: input.medicalNotes.trim(),
      restrictions: input.restrictions.map((r) => r.trim()).filter(Boolean),
      recommendations: input.recommendations.map((r) => r.trim()).filter(Boolean),
      lastUpdatedBy: input.lastUpdatedBy.trim(),
      lastUpdatedAt: now,
    },
  });
}
