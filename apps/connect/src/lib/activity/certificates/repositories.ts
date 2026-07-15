import {
  createCertificateInStore,
  getCertificateByIdFromStore,
  issueCertificateInStore,
  listCertificatesFromStore,
  listCertificateTemplates,
  listEligibleAchievementOptions,
  listStudentFilterOptions,
  listTeamFilterOptions,
  reissueCertificateInStore,
  resetCertificatesStore,
  revokeCertificateInStore,
} from "./store";
import type {
  ActivityCertificate,
  ActivityCertificateInput,
  CertificateListFilters,
} from "./types";

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));

export const certificatesRepository = {
  async listCertificates(filters?: CertificateListFilters): Promise<ActivityCertificate[]> {
    await delay();
    return listCertificatesFromStore(filters);
  },
  getCertificatesSnapshot(): ActivityCertificate[] {
    return listCertificatesFromStore();
  },
  async getCertificateById(id: string): Promise<ActivityCertificate | null> {
    await delay(120);
    return getCertificateByIdFromStore(id);
  },
  async generateCertificate(input: ActivityCertificateInput): Promise<ActivityCertificate> {
    await delay(300);
    const draft = createCertificateInStore(input);
    return issueCertificateInStore(draft.id);
  },
  async issueCertificate(id: string): Promise<ActivityCertificate> {
    await delay(220);
    return issueCertificateInStore(id);
  },
  async revokeCertificate(id: string, reason?: string): Promise<ActivityCertificate> {
    await delay(220);
    return revokeCertificateInStore(id, reason);
  },
  async reissueCertificate(id: string): Promise<ActivityCertificate> {
    await delay(280);
    return reissueCertificateInStore(id);
  },
  listEligibleAchievementOptions() {
    return listEligibleAchievementOptions();
  },
  listCertificateTemplates() {
    return listCertificateTemplates();
  },
  listStudentFilterOptions() {
    return listStudentFilterOptions();
  },
  listTeamFilterOptions() {
    return listTeamFilterOptions();
  },
  reset() {
    resetCertificatesStore();
  },
};
