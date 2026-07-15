import { cloneCandidate, cloneTrial, candidatesSeed, createTrialFromInput, trialsSeed } from "./mock";
import type {
  CandidateEvaluationInput,
  CandidateListFilters,
  CandidateRegistrationInput,
  CandidateStatus,
  CommitteeMemberInput,
  SelectionCandidate,
  SelectionTrial,
  SelectionTrialInput,
  TrialListFilters,
} from "./types";
import { computeEvaluationScore } from "./types";

let trialsStore: SelectionTrial[] = trialsSeed.map(cloneTrial);
let candidatesStore: SelectionCandidate[] = candidatesSeed.map(cloneCandidate);

function findTrial(id: string): SelectionTrial {
  const t = trialsStore.find((x) => x.id === id);
  if (!t) throw new Error("Selection trial not found");
  if (t.status === "archived") throw new Error("Archived trials cannot be modified.");
  return t;
}

function findCandidate(id: string): SelectionCandidate {
  const c = candidatesStore.find((x) => x.id === id);
  if (!c) throw new Error("Candidate not found");
  return c;
}

function applyTrialFilters(items: SelectionTrial[], filters?: TrialListFilters): SelectionTrial[] {
  let result = [...items];
  const f = filters ?? {};

  if (f.status && f.status !== "all") {
    result = result.filter((t) => t.status === f.status);
  }

  const q = f.query?.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.sport.toLowerCase().includes(q) ||
        t.teamName.toLowerCase().includes(q) ||
        t.venue.toLowerCase().includes(q),
    );
  }

  const sortBy = f.sortBy ?? "date";
  const dir = (f.sortDir ?? "asc") === "asc" ? 1 : -1;
  result.sort((a, b) => {
    if (sortBy === "title") return dir * a.title.localeCompare(b.title);
    if (sortBy === "updatedAt") return dir * a.updatedAt.localeCompare(b.updatedAt);
    return dir * a.trialDate.localeCompare(b.trialDate);
  });

  return result;
}

function applyCandidateFilters(
  items: SelectionCandidate[],
  filters?: CandidateListFilters,
): SelectionCandidate[] {
  let result = [...items];
  const f = filters ?? {};

  if (f.trialId && f.trialId !== "all") {
    result = result.filter((c) => c.trialId === f.trialId);
  }
  if (f.status && f.status !== "all") {
    result = result.filter((c) => c.status === f.status);
  }

  const q = f.query?.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (c) =>
        c.studentName.toLowerCase().includes(q) ||
        c.classLabel.toLowerCase().includes(q),
    );
  }

  const sortBy = f.sortBy ?? "rank";
  const dir = (f.sortDir ?? "asc") === "asc" ? 1 : -1;
  result.sort((a, b) => {
    if (sortBy === "student") return dir * a.studentName.localeCompare(b.studentName);
    if (sortBy === "score") {
      const sa = a.evaluation?.totalScore ?? -1;
      const sb = b.evaluation?.totalScore ?? -1;
      return dir * (sa - sb);
    }
    const ra = a.rank ?? 9999;
    const rb = b.rank ?? 9999;
    return dir * (ra - rb);
  });

  return result;
}

function rankCandidatesForTrial(trialId: string): void {
  const evaluated = candidatesStore
    .filter((c) => c.trialId === trialId && c.evaluation)
    .sort((a, b) => (b.evaluation!.totalScore - a.evaluation!.totalScore));

  let rank = 1;
  candidatesStore = candidatesStore.map((c) => {
    if (c.trialId !== trialId || !c.evaluation) return c;
    const idx = evaluated.findIndex((e) => e.id === c.id);
    if (idx < 0) return c;
    return { ...c, rank: rank + idx };
  });
}

export function resetSportsTeamSelectionStore() {
  trialsStore = trialsSeed.map(cloneTrial);
  candidatesStore = candidatesSeed.map(cloneCandidate);
}

export function listTrialsFromStore(filters?: TrialListFilters): SelectionTrial[] {
  return applyTrialFilters(trialsStore, filters).map(cloneTrial);
}

export function getTrialByIdFromStore(id: string): SelectionTrial | null {
  const found = trialsStore.find((t) => t.id === id);
  return found ? cloneTrial(found) : null;
}

export function listCandidatesFromStore(filters?: CandidateListFilters): SelectionCandidate[] {
  return applyCandidateFilters(candidatesStore, filters).map(cloneCandidate);
}

export function listCandidatesForTrialFromStore(trialId: string): SelectionCandidate[] {
  return candidatesStore.filter((c) => c.trialId === trialId).map(cloneCandidate);
}

export function getCandidateByIdFromStore(id: string): SelectionCandidate | null {
  const found = candidatesStore.find((c) => c.id === id);
  return found ? cloneCandidate(found) : null;
}

export function createTrialInStore(input: SelectionTrialInput): SelectionTrial {
  const record = createTrialFromInput(input);
  trialsStore = [record, ...trialsStore];
  return cloneTrial(record);
}

export function updateTrialInStore(id: string, patch: Partial<SelectionTrialInput>): SelectionTrial {
  const idx = trialsStore.findIndex((t) => t.id === id);
  if (idx < 0) throw new Error("Selection trial not found");
  const prev = trialsStore[idx];
  if (prev.status === "archived") throw new Error("Archived trials cannot be edited.");

  const updated = cloneTrial({
    ...prev,
    title: patch.title?.trim() ?? prev.title,
    sport: patch.sport?.trim() ?? prev.sport,
    teamId: patch.teamId ?? prev.teamId,
    teamName: patch.teamName?.trim() ?? prev.teamName,
    trialDate: patch.trialDate ?? prev.trialDate,
    venue: patch.venue?.trim() ?? prev.venue,
    maxSlots: patch.maxSlots ?? prev.maxSlots,
    waitingListSlots: patch.waitingListSlots ?? prev.waitingListSlots,
    description: patch.description?.trim() ?? prev.description,
    updatedAt: new Date().toISOString().slice(0, 10),
  });

  trialsStore = trialsStore.map((t) => (t.id === id ? updated : t));
  return cloneTrial(updated);
}

export function addCommitteeMemberInStore(
  trialId: string,
  input: CommitteeMemberInput,
): SelectionTrial {
  const trial = findTrial(trialId);
  const member = {
    id: `cm-${Date.now()}`,
    name: input.name.trim(),
    role: input.role.trim(),
  };
  const updated = cloneTrial({
    ...trial,
    committee: [...trial.committee, member],
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  trialsStore = trialsStore.map((t) => (t.id === trialId ? updated : t));
  return cloneTrial(updated);
}

export function registerCandidateInStore(
  trialId: string,
  input: CandidateRegistrationInput,
): SelectionCandidate {
  const trial = findTrial(trialId);
  if (trial.status !== "open" && trial.status !== "evaluating") {
    throw new Error("This trial is not accepting registrations.");
  }

  const duplicate = candidatesStore.find(
    (c) => c.trialId === trialId && c.studentId === input.studentId,
  );
  if (duplicate) throw new Error("Student is already registered for this trial.");

  const now = new Date().toISOString().slice(0, 10);
  const candidate: SelectionCandidate = {
    id: `cand-${Date.now()}`,
    trialId,
    studentId: input.studentId,
    studentName: input.studentName.trim(),
    classLabel: input.classLabel.trim(),
    registeredAt: now,
    status: "registered",
    notified: false,
  };
  candidatesStore = [candidate, ...candidatesStore];

  if (trial.status === "open") {
    trialsStore = trialsStore.map((t) =>
      t.id === trialId ? { ...t, status: "evaluating" as const, updatedAt: now } : t,
    );
  }

  return cloneCandidate(candidate);
}

export function evaluateCandidateInStore(
  candidateId: string,
  input: CandidateEvaluationInput,
): SelectionCandidate {
  const candidate = findCandidate(candidateId);
  if (candidate.status === "selected" || candidate.status === "rejected") {
    throw new Error("Cannot re-evaluate a finalized candidate.");
  }

  const now = new Date().toISOString().slice(0, 10);
  const totalScore = computeEvaluationScore(input);
  const evaluation = {
    technique: input.technique,
    speed: input.speed,
    strength: input.strength,
    discipline: input.discipline,
    attendance: input.attendance,
    coachRating: input.coachRating,
    totalScore,
    evaluatedBy: input.evaluatedBy.trim(),
    evaluatedAt: now,
    notes: input.notes?.trim(),
  };

  const updated: SelectionCandidate = {
    ...candidate,
    status: "evaluated",
    evaluation,
  };
  candidatesStore = candidatesStore.map((c) => (c.id === candidateId ? updated : c));
  rankCandidatesForTrial(candidate.trialId);
  return cloneCandidate(candidatesStore.find((c) => c.id === candidateId)!);
}

export function rankCandidatesInStore(trialId: string): SelectionCandidate[] {
  findTrial(trialId);
  rankCandidatesForTrial(trialId);
  return listCandidatesForTrialFromStore(trialId);
}

export function selectCandidatesInStore(trialId: string): SelectionCandidate[] {
  const trial = findTrial(trialId);
  rankCandidatesForTrial(trialId);

  const evaluated = candidatesStore
    .filter((c) => c.trialId === trialId && c.evaluation)
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

  if (evaluated.length === 0) {
    throw new Error("No evaluated candidates to select.");
  }

  const now = new Date().toISOString().slice(0, 10);
  candidatesStore = candidatesStore.map((c) => {
    if (c.trialId !== trialId || !c.evaluation) {
      if (c.trialId === trialId && c.status === "registered") {
        return { ...c, status: "rejected" as CandidateStatus };
      }
      return c;
    }
    const idx = evaluated.findIndex((e) => e.id === c.id);
    if (idx < 0) return c;

    let status: CandidateStatus;
    if (idx < trial.maxSlots) status = "selected";
    else if (idx < trial.maxSlots + trial.waitingListSlots) status = "waiting";
    else status = "rejected";

    return { ...c, status };
  });

  trialsStore = trialsStore.map((t) =>
    t.id === trialId ? { ...t, status: "completed" as const, updatedAt: now } : t,
  );

  return listCandidatesForTrialFromStore(trialId);
}

export function setCandidateStatusInStore(
  candidateId: string,
  status: CandidateStatus,
): SelectionCandidate {
  const candidate = findCandidate(candidateId);
  const updated = { ...candidate, status };
  candidatesStore = candidatesStore.map((c) => (c.id === candidateId ? updated : c));
  return cloneCandidate(updated);
}

export function notifyCandidateInStore(candidateId: string): SelectionCandidate {
  const candidate = findCandidate(candidateId);
  if (!["selected", "waiting", "rejected"].includes(candidate.status)) {
    throw new Error("Only finalized candidates can be notified.");
  }
  const now = new Date().toISOString().slice(0, 10);
  const updated: SelectionCandidate = {
    ...candidate,
    notified: true,
    notifiedAt: now,
  };
  candidatesStore = candidatesStore.map((c) => (c.id === candidateId ? updated : c));
  return cloneCandidate(updated);
}

export function notifyTrialCandidatesInStore(trialId: string): number {
  findTrial(trialId);
  const now = new Date().toISOString().slice(0, 10);
  let count = 0;
  candidatesStore = candidatesStore.map((c) => {
    if (
      c.trialId !== trialId ||
      c.notified ||
      !["selected", "waiting", "rejected"].includes(c.status)
    ) {
      return c;
    }
    count += 1;
    return { ...c, notified: true, notifiedAt: now };
  });
  return count;
}
