import {
  addCommitteeMemberInStore,
  createTrialInStore,
  evaluateCandidateInStore,
  getCandidateByIdFromStore,
  getTrialByIdFromStore,
  listCandidatesForTrialFromStore,
  listCandidatesFromStore,
  listTrialsFromStore,
  notifyCandidateInStore,
  notifyTrialCandidatesInStore,
  rankCandidatesInStore,
  registerCandidateInStore,
  resetSportsTeamSelectionStore,
  selectCandidatesInStore,
  setCandidateStatusInStore,
  updateTrialInStore,
} from "./store";
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

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));

export const sportsTeamSelectionRepository = {
  async listTrials(filters?: TrialListFilters): Promise<SelectionTrial[]> {
    await delay();
    return listTrialsFromStore(filters);
  },
  getTrialsSnapshot(): SelectionTrial[] {
    return listTrialsFromStore();
  },
  async getTrialById(id: string): Promise<SelectionTrial | null> {
    await delay(120);
    return getTrialByIdFromStore(id);
  },
  async listCandidates(filters?: CandidateListFilters): Promise<SelectionCandidate[]> {
    await delay();
    return listCandidatesFromStore(filters);
  },
  listCandidatesForTrial(trialId: string): SelectionCandidate[] {
    return listCandidatesForTrialFromStore(trialId);
  },
  async getCandidateById(id: string): Promise<SelectionCandidate | null> {
    await delay(120);
    return getCandidateByIdFromStore(id);
  },
  async createTrial(input: SelectionTrialInput): Promise<SelectionTrial> {
    await delay(280);
    return createTrialInStore(input);
  },
  async updateTrial(id: string, patch: Partial<SelectionTrialInput>): Promise<SelectionTrial> {
    await delay(280);
    return updateTrialInStore(id, patch);
  },
  async addCommitteeMember(trialId: string, input: CommitteeMemberInput): Promise<SelectionTrial> {
    await delay(220);
    return addCommitteeMemberInStore(trialId, input);
  },
  async registerCandidate(
    trialId: string,
    input: CandidateRegistrationInput,
  ): Promise<SelectionCandidate> {
    await delay(300);
    return registerCandidateInStore(trialId, input);
  },
  async evaluateCandidate(
    candidateId: string,
    input: CandidateEvaluationInput,
  ): Promise<SelectionCandidate> {
    await delay(300);
    return evaluateCandidateInStore(candidateId, input);
  },
  async rankCandidates(trialId: string): Promise<SelectionCandidate[]> {
    await delay(200);
    return rankCandidatesInStore(trialId);
  },
  async selectCandidates(trialId: string): Promise<SelectionCandidate[]> {
    await delay(300);
    return selectCandidatesInStore(trialId);
  },
  async setCandidateStatus(
    candidateId: string,
    status: CandidateStatus,
  ): Promise<SelectionCandidate> {
    await delay(220);
    return setCandidateStatusInStore(candidateId, status);
  },
  async notifyCandidate(candidateId: string): Promise<SelectionCandidate> {
    await delay(220);
    return notifyCandidateInStore(candidateId);
  },
  async notifyTrialCandidates(trialId: string): Promise<number> {
    await delay(280);
    return notifyTrialCandidatesInStore(trialId);
  },
  reset() {
    resetSportsTeamSelectionStore();
  },
};
