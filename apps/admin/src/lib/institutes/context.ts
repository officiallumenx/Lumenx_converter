/**
 * Dual-mode institute context facade.
 * Demo: no backend calls; demo tenant/profile remains authoritative elsewhere.
 * API: GET /institutes + membership-validated active institute preference.
 */
import { useCallback, useContext, useEffect, useRef, useState, createContext, createElement, type ReactNode } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { fetchMe } from "@/auth/me-bridge";
import { ApiClientError } from "@/lib/api";
import {
  ACTIVE_INSTITUTE_CHANGED_EVENT,
  accessibleInstituteIds,
  clearStoredActiveInstituteId,
  resolveActiveInstitute,
  selectActiveInstitute,
  type InstituteMembershipRef,
  type ResolveActiveInstituteResult,
} from "@/lib/active-institute";
import { getInstitute, listInstitutes } from "./api";
import type { InstituteDto } from "./types";

export type InstituteContextStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_selection"
  | "empty"
  | "forbidden"
  | "error";

export type InstituteContextState = {
  mode: "demo" | "api";
  status: InstituteContextStatus;
  /** Institutes available for selection (active membership ∩ active institute). */
  institutes: InstituteDto[];
  activeInstitute: InstituteDto | null;
  activeInstituteId: string | null;
  reason: ResolveActiveInstituteResult["reason"] | null;
  memberships: InstituteMembershipRef[];
  errorMessage: string | null;
  /** Sidebar/header label — null in demo (caller uses demo profile). */
  displayLabel: string | null;
};

const DEMO_STATE: InstituteContextState = {
  mode: "demo",
  status: "demo",
  institutes: [],
  activeInstitute: null,
  activeInstituteId: null,
  reason: null,
  memberships: [],
  errorMessage: null,
  displayLabel: null,
};

function displayLabelFor(institute: InstituteDto | null): string | null {
  if (!institute) return null;
  return `${institute.name} · ${institute.code}`;
}

function filterSelectableInstitutes(
  institutes: InstituteDto[],
  memberships: InstituteMembershipRef[],
): InstituteDto[] {
  const accessible = new Set(accessibleInstituteIds(memberships));
  return institutes.filter(
    (inst) => accessible.has(inst.id) && inst.status === "active",
  );
}

function statusFromResolve(
  reason: ResolveActiveInstituteResult["reason"],
  active: InstituteDto | null,
): InstituteContextStatus {
  if (reason === "none") return "empty";
  if (reason === "needs_selection" || reason === "cleared_invalid") {
    return active ? "ready" : "needs_selection";
  }
  return active ? "ready" : "needs_selection";
}

/**
 * Load institute context. Demo mode returns immediately without API calls.
 */
export async function loadInstituteContext(): Promise<InstituteContextState> {
  if (!isApiAuthMode()) {
    return DEMO_STATE;
  }

  try {
    const me = await fetchMe();
    const memberships: InstituteMembershipRef[] = me.institutes.map((m) => ({
      instituteId: m.instituteId,
      status: m.status,
    }));

    let listed: InstituteDto[];
    try {
      listed = await listInstitutes();
    } catch (err) {
      const status =
        err instanceof ApiClientError
          ? err.status
          : err &&
              typeof err === "object" &&
              "status" in err &&
              typeof (err as { status: unknown }).status === "number"
            ? (err as { status: number }).status
            : null;
      const message =
        err instanceof Error ? err.message : "Failed to load institutes";
      if (status === 403) {
        return {
          mode: "api",
          status: "forbidden",
          institutes: [],
          activeInstitute: null,
          activeInstituteId: null,
          reason: null,
          memberships,
          errorMessage: message || "Forbidden",
          displayLabel: null,
        };
      }
      throw err;
    }

    const institutes = filterSelectableInstitutes(listed, memberships);
    const resolved = resolveActiveInstitute(memberships);

    let activeInstitute: InstituteDto | null = null;
    if (resolved.instituteId) {
      activeInstitute =
        institutes.find((i) => i.id === resolved.instituteId) ?? null;

      // Preference valid for membership but missing from filtered list — enrich or clear.
      if (!activeInstitute) {
        try {
          const detail = await getInstitute(resolved.instituteId);
          if (detail.status === "active") {
            activeInstitute = detail;
          } else {
            clearStoredActiveInstituteId();
            const again = resolveActiveInstitute(memberships);
            return {
              mode: "api",
              status: statusFromResolve(again.reason, null),
              institutes,
              activeInstitute: null,
              activeInstituteId: again.instituteId,
              reason: again.reason,
              memberships,
              errorMessage: null,
              displayLabel: null,
            };
          }
        } catch {
          clearStoredActiveInstituteId();
          const again = resolveActiveInstitute(memberships);
          return {
            mode: "api",
            status: statusFromResolve(again.reason, null),
            institutes,
            activeInstitute: null,
            activeInstituteId: again.instituteId,
            reason: again.reason,
            memberships,
            errorMessage: null,
            displayLabel: null,
          };
        }
      }
    }

    return {
      mode: "api",
      status: statusFromResolve(resolved.reason, activeInstitute),
      institutes,
      activeInstitute,
      activeInstituteId: activeInstitute?.id ?? resolved.instituteId,
      reason: resolved.reason,
      memberships,
      errorMessage: null,
      displayLabel: displayLabelFor(activeInstitute),
    };
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 401) {
      // Unauthorized handler clears session; surface error without demo fallback.
      return {
        mode: "api",
        status: "error",
        institutes: [],
        activeInstitute: null,
        activeInstituteId: null,
        reason: null,
        memberships: [],
        errorMessage: err.message || "Authentication required",
        displayLabel: null,
      };
    }
    const message =
      err instanceof Error ? err.message : "Failed to load institutes";
    return {
      mode: "api",
      status: "error",
      institutes: [],
      activeInstitute: null,
      activeInstituteId: null,
      reason: null,
      memberships: [],
      errorMessage: message,
      displayLabel: null,
    };
  }
}

/**
 * Select active institute after membership + selectable-list validation.
 * Persistence happens only after the institute is confirmed active and authorized.
 */
export function chooseActiveInstitute(
  instituteId: string,
  memberships: InstituteMembershipRef[],
  institutes: InstituteDto[],
): InstituteDto {
  const chosen = institutes.find((i) => i.id === instituteId);
  if (!chosen) {
    throw new Error("Selected institute is not available for this account");
  }
  if (chosen.status !== "active") {
    throw new Error("Selected institute is not available for this account");
  }
  // Membership authorization + UUID persist (throws if not accessible).
  selectActiveInstitute(instituteId, memberships);
  return chosen;
}

export type InstituteContextValue = InstituteContextState & {
  reload: () => Promise<void>;
  selectInstitute: (instituteId: string) => Promise<InstituteDto>;
  isApiMode: boolean;
};

const InstituteReactContext = createContext<InstituteContextValue | null>(null);

function useInstituteContextController(): InstituteContextValue {
  const isApiMode = isApiAuthMode();
  const skipNextStorageReload = useRef(false);
  const [state, setState] = useState<InstituteContextState>(() =>
    isApiMode
      ? {
          ...DEMO_STATE,
          mode: "api",
          status: "loading",
        }
      : DEMO_STATE,
  );

  const reload = useCallback(async () => {
    if (!isApiAuthMode()) {
      setState(DEMO_STATE);
      return;
    }
    setState((prev) => ({
      ...prev,
      mode: "api",
      status: "loading",
      errorMessage: null,
      displayLabel: prev.mode === "api" ? prev.displayLabel : null,
    }));
    const next = await loadInstituteContext();
    setState(next);
  }, []);

  const selectInstitute = useCallback(
    async (instituteId: string): Promise<InstituteDto> => {
      if (!isApiAuthMode()) {
        throw new Error("Institute selection is only available in API mode");
      }
      skipNextStorageReload.current = true;
      const chosen = chooseActiveInstitute(
        instituteId,
        state.memberships,
        state.institutes,
      );
      setState((prev) => ({
        ...prev,
        status: "ready",
        activeInstitute: chosen,
        activeInstituteId: chosen.id,
        reason: "stored",
        displayLabel: displayLabelFor(chosen),
        errorMessage: null,
      }));
      return chosen;
    },
    [state.memberships, state.institutes],
  );

  useEffect(() => {
    if (!isApiMode) {
      setState(DEMO_STATE);
      return;
    }
    void reload();
    const onChanged = () => {
      if (skipNextStorageReload.current) {
        skipNextStorageReload.current = false;
        return;
      }
      void reload();
    };
    window.addEventListener(ACTIVE_INSTITUTE_CHANGED_EVENT, onChanged);
    return () => {
      window.removeEventListener(ACTIVE_INSTITUTE_CHANGED_EVENT, onChanged);
    };
  }, [isApiMode, reload]);

  return {
    ...state,
    reload,
    selectInstitute,
    isApiMode,
  };
}

export function InstituteContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const value = useInstituteContextController();
  return createElement(
    InstituteReactContext.Provider,
    { value },
    children,
  );
}

export function useInstituteContext(): InstituteContextValue {
  const ctx = useContext(InstituteReactContext);
  if (!ctx) {
    throw new Error("useInstituteContext must be used within InstituteContextProvider");
  }
  return ctx;
}
