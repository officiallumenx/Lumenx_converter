import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";

export type RetentionReviewDto = {
  id: string;
  instituteId: string;
  studentId: string;
  graduatedOn: string | null;
  reviewEligibleOn: string | null;
  status: string;
  legalHold: boolean;
  extendedUntil: string | null;
  lastDecision: string | null;
  lastDecisionReason: string | null;
  studentDisplayName?: string;
};

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Retention API is only available in API auth mode");
  }
}

export async function listRetentionReviews(
  instituteId: string,
  status?: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<RetentionReviewDto[]> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", instituteId.trim());
  if (status) query.set("status", status);
  return client.get<RetentionReviewDto[]>(
    `/api/v1/retention/reviews?${query.toString()}`,
  );
}

export async function decideRetentionReview(
  reviewId: string,
  input: {
    decision: string;
    reason: string;
    extendedUntil?: string | null;
    graduatedOn?: string | null;
  },
  client: AdminApiClient = getAdminApiClient(),
): Promise<RetentionReviewDto> {
  assertApiMode();
  return client.post<RetentionReviewDto>(
    `/api/v1/retention/reviews/${reviewId}/decide`,
    {
      decision: input.decision,
      reason: input.reason,
      extended_until: input.extendedUntil ?? null,
      graduated_on: input.graduatedOn ?? null,
    },
  );
}
