import {
  addFitnessTestInStore,
  addInjuryInStore,
  addMedicalHistoryInStore,
  getFitnessProfileByIdFromStore,
  listFitnessProfilesFromStore,
  resetSportsMedicalFitnessStore,
  updateClearanceInStore,
  updateCoachMedicalInStore,
  updateInjuryStatusInStore,
} from "./store";
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

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));

export const sportsMedicalFitnessRepository = {
  async listProfiles(filters?: FitnessListFilters): Promise<StudentFitnessProfile[]> {
    await delay();
    return listFitnessProfilesFromStore(filters);
  },
  getProfilesSnapshot(): StudentFitnessProfile[] {
    return listFitnessProfilesFromStore();
  },
  async getProfileById(id: string): Promise<StudentFitnessProfile | null> {
    await delay(120);
    return getFitnessProfileByIdFromStore(id);
  },
  async addMedicalHistory(profileId: string, input: MedicalHistoryInput): Promise<StudentFitnessProfile> {
    await delay(280);
    return addMedicalHistoryInStore(profileId, input);
  },
  async addInjury(profileId: string, input: InjuryInput): Promise<StudentFitnessProfile> {
    await delay(280);
    return addInjuryInStore(profileId, input);
  },
  async updateInjuryStatus(
    profileId: string,
    injuryId: string,
    status: InjuryStatus,
    recoveryNotes?: string,
  ): Promise<StudentFitnessProfile> {
    await delay(220);
    return updateInjuryStatusInStore(profileId, injuryId, status, recoveryNotes);
  },
  async addFitnessTest(profileId: string, input: FitnessTestInput): Promise<StudentFitnessProfile> {
    await delay(280);
    return addFitnessTestInStore(profileId, input);
  },
  async updateClearance(profileId: string, input: ClearanceInput): Promise<StudentFitnessProfile> {
    await delay(220);
    return updateClearanceInStore(profileId, input);
  },
  async updateCoachMedical(profileId: string, input: CoachMedicalInput): Promise<StudentFitnessProfile> {
    await delay(280);
    return updateCoachMedicalInStore(profileId, input);
  },
  reset() {
    resetSportsMedicalFitnessStore();
  },
};
