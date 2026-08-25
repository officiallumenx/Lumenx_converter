import {
  getCertificateByIdFromStore,
  listCertificatesFromStore,
} from "./store";
import type { ActivityCertificate, CertificateListFilters } from "./types";

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));

/** Read-only projection of certificates issued by Admin for Activity reporting. */
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
};
