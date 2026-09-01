import { useEffect, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { getConnectApiClient } from "@/lib/connect-api";
import type { MeResponse } from "@/lib/api/me-types";
import { isInstituteUuid } from "@/lib/institute-id";
import { useApp } from "@/lib/app-state";
import { listIssuedCertificates } from "./api";
import { issuedCertificateDtosToLearnerRecords } from "./map";
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
  const [state, setState] = useState<LearnerCertificatesState>({
    apiMode,
    loading: apiMode,
    records: [],
    error: null,
  });

  useEffect(() => {
    if (!apiMode || !activeInstituteId || !isInstituteUuid(activeInstituteId)) {
      setState({ apiMode, loading: false, records: [], error: null });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    void (async () => {
      try {
        let studentFilter = opts?.studentId ?? null;
        if (studentFilter && !isInstituteUuid(studentFilter)) {
          const me = await getConnectApiClient().get<MeResponse>("/api/v1/me");
          studentFilter =
            me.identities.students.find((s) => s.instituteId === activeInstituteId)
              ?.studentId ?? null;
        }

        const rows = await listIssuedCertificates({
          instituteId: activeInstituteId,
          studentId: studentFilter && isInstituteUuid(studentFilter) ? studentFilter : undefined,
          status: "issued",
        });

        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const records = issuedCertificateDtosToLearnerRecords(rows, origin);
        if (!cancelled) {
          setState({ apiMode, loading: false, records, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            apiMode,
            loading: false,
            records: [],
            error: err instanceof Error ? err.message : "Failed to load certificates",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiMode, activeInstituteId, opts?.studentId]);

  return state;
}
