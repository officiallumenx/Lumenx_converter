import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import { buildParentPortalSnapshot, type ParentPortalSnapshot } from "@/lib/parent-portal-data";
import { loadParentPortalSnapshotFromApi } from "@/lib/dashboard";
import type { AppNotification } from "@lumenx/types";

/** Align with future TanStack Query usage. */
export const parentPortalQueryKeys = {
  root: ["parent-portal"] as const,
  snapshot: (instituteId: string | null, childId: string) =>
    [...parentPortalQueryKeys.root, instituteId ?? "_", childId] as const,
};

const MOCK_LATENCY_MS = 75;

/**
 * Parent portal snapshot — API-composed learner dashboard, or demo mock only
 * when auth mode is explicitly demo. API mode never falls back to mock data.
 */
export function fetchParentPortalSnapshot(
  instituteId: string | null,
  childId: string,
  signal?: AbortSignal,
  options?: { inbox?: AppNotification[] | Promise<AppNotification[]> },
): Promise<ParentPortalSnapshot> {
  if (isApiAuthMode()) {
    if (!instituteId || !isInstituteUuid(instituteId) || !isInstituteUuid(childId)) {
      return Promise.reject(
        new Error(
          "Parent portal requires a linked institute and child. Sign in again or select a child.",
        ),
      );
    }
    return loadParentPortalSnapshotFromApi({
      instituteId,
      studentId: childId,
      signal,
      inbox: options?.inbox,
    });
  }

  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => {
      if (signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      resolve(buildParentPortalSnapshot(instituteId, childId));
    }, MOCK_LATENCY_MS);

    const onAbort = () => {
      window.clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export type { ParentPortalSnapshot };
