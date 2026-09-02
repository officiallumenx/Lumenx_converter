import { useCallback, useEffect, useMemo, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { resolveAdmissionsInstituteId } from "@/lib/admissions/institute-context";
import { getInquiriesForUser } from "@/lib/admissions/inquiries-store";
import {
  loadAdmissionsInquiries,
  type AdmissionsInquiriesLoadState,
  type AdmissionsLoadStatus,
} from "@/lib/admissions/api";
import type { AdmissionInquiry } from "@/lib/admissions/types";

export function useAdmissionsInquiries() {
  const { user } = useAdmissionsAuth();
  const apiMode = isApiAuthMode();
  const instituteId = resolveAdmissionsInstituteId(user);

  const [state, setState] = useState<AdmissionsInquiriesLoadState>({
    status: apiMode ? "loading" : "demo",
    items: [],
    errorMessage: null,
  });
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!apiMode) {
      setState({ status: "demo", items: [], errorMessage: null });
      return;
    }
    if (!user) {
      setState({ status: "empty", items: [], errorMessage: null });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, status: "loading", errorMessage: null }));

    void loadAdmissionsInquiries(instituteId, user.id)
      .then((result) => {
        if (cancelled) return;
        setState(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            status: "error",
            items: [],
            errorMessage: err instanceof Error ? err.message : "Failed to load inquiries",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiMode, instituteId, reloadKey, user]);

  const demoInquiries = useMemo((): AdmissionInquiry[] => {
    void reloadKey;
    return user ? getInquiriesForUser(user.id) : [];
  }, [reloadKey, user]);

  const inquiries = apiMode && state.status !== "demo" ? state.items : demoInquiries;
  const loading = apiMode && state.status === "loading";
  const status: AdmissionsLoadStatus = apiMode ? state.status : "demo";

  return {
    inquiries,
    loading,
    status,
    errorMessage: state.errorMessage,
    reload,
    apiMode,
    instituteId,
  };
}
