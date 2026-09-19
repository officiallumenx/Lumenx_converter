import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import { useApp } from "@/lib/app-state";
import { useLearnerCertificatesQuery } from "@/lib/connect-queries/hooks";
import type { LearnerCertificateRecord } from "./types";

export type LearnerCertificatesState = {
  apiMode: boolean;
  loading: boolean;
  records: LearnerCertificateRecord[];
  error: string | null;
};

export function useLearnerCertificates(opts?: {
  studentId?: string | null;
}): LearnerCertificatesState {
  const { activeInstituteId } = useApp();
  const apiMode = isApiAuthMode();
  const enabled =
    apiMode &&
    Boolean(activeInstituteId) &&
    isInstituteUuid(activeInstituteId ?? "");

  const query = useLearnerCertificatesQuery(
    activeInstituteId,
    opts?.studentId ?? null,
    enabled,
  );

  if (!enabled) {
    return { apiMode, loading: false, records: [], error: null };
  }

  return {
    apiMode,
    loading: query.isLoading && !query.data,
    records: query.data ?? [],
    error:
      query.isError
        ? query.error instanceof Error
          ? query.error.message
          : "Failed to load certificates"
        : null,
  };
}
