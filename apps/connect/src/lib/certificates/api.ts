import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type {
  IssuedCertificateDto,
  ListIssuedCertificatesParams,
  PublicCertificateVerifyDto,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Certificates API is only available in API auth mode");
  }
}

export async function listIssuedCertificates(
  params: ListIssuedCertificatesParams,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<IssuedCertificateDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams({ institute_id: params.instituteId.trim() });
  if (params.studentId) query.set("student_id", params.studentId);
  if (params.status) query.set("status", params.status);
  return client.get<IssuedCertificateDto[]>(`/api/v1/certificates?${query.toString()}`);
}

export async function getIssuedCertificateSignedUrl(
  certificateId: string,
  expiresInSec?: number,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<{ signedUrl: string; expiresAt: string }> {
  assertApiMode();
  if (!isInstituteUuid(certificateId)) {
    throw new Error("certificate_id must be a valid UUID");
  }
  const query = expiresInSec ? `?expires_in=${expiresInSec}` : "";
  return client.get<{ signedUrl: string; expiresAt: string }>(
    `/api/v1/certificates/${certificateId.trim()}/signed-url${query}`,
  );
}

/** Public verify — no auth token required. */
export async function verifyCertificatePublic(
  params: { instituteId: string; certificateNumber: string },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<PublicCertificateVerifyDto> {
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams({
    institute_id: params.instituteId.trim(),
    certificate_number: params.certificateNumber.trim(),
  });
  return client.get<PublicCertificateVerifyDto>(
    `/api/v1/certificates/public/verify?${query.toString()}`,
    { skipAuth: true },
  );
}

export async function createCertificateRecommendation(
  input: {
    instituteId: string;
    achievementId?: string | null;
    achievementTitle: string;
    achievementType: string;
    studentId: string;
    studentName: string;
    studentClassLabel?: string | null;
    recommendedByName?: string;
    note?: string | null;
  },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<void> {
  assertApiMode();
  await client.post("/api/v1/certificates/recommendations", {
    institute_id: input.instituteId,
    achievement_id: input.achievementId,
    achievement_title: input.achievementTitle,
    achievement_type: input.achievementType,
    student_id: input.studentId,
    student_name: input.studentName,
    student_class_label: input.studentClassLabel,
    recommended_by_name: input.recommendedByName,
    note: input.note,
  });
}
