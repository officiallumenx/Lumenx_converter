/**
 * Certificate recommendations API — Activity → Admin queue (API mode).
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";

export type CertificateRecommendationStatus = "pending" | "issued" | "dismissed";

export type CertificateRecommendationDto = {
  id: string;
  instituteId: string;
  achievementId: string | null;
  achievementTitle: string;
  achievementType: string;
  studentId: string;
  studentName: string;
  studentClassLabel: string | null;
  recommendedByUserId: string | null;
  recommendedByName: string;
  note: string | null;
  status: CertificateRecommendationStatus;
  issuedCertificateId: string | null;
  issuedAt: string | null;
  dismissedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Certificate recommendations API requires API auth mode");
  }
}

export async function listCertificateRecommendations(
  params: { instituteId: string; status?: CertificateRecommendationStatus },
  client: AdminApiClient = getAdminApiClient(),
): Promise<CertificateRecommendationDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams({ institute_id: params.instituteId.trim() });
  if (params.status) query.set("status", params.status);
  return client.get<CertificateRecommendationDto[]>(
    `/api/v1/certificates/recommendations?${query.toString()}`,
  );
}

export async function updateCertificateRecommendation(
  id: string,
  input: { status: "issued" | "dismissed"; issuedCertificateId?: string | null },
  client: AdminApiClient = getAdminApiClient(),
): Promise<CertificateRecommendationDto> {
  assertApiMode();
  if (!isInstituteUuid(id)) {
    throw new Error("recommendation id must be a valid UUID");
  }
  return client.patch<CertificateRecommendationDto>(
    `/api/v1/certificates/recommendations/${id.trim()}`,
    {
      status: input.status,
      issued_certificate_id: input.issuedCertificateId ?? null,
    },
  );
}
