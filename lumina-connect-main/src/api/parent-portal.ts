import { buildParentPortalSnapshot, type ParentPortalSnapshot } from "@/lib/parent-portal-data";

/** Align with future TanStack Query usage. */
export const parentPortalQueryKeys = {
  root: ["parent-portal"] as const,
  snapshot: (instituteId: string | null, childId: string) =>
    [...parentPortalQueryKeys.root, instituteId ?? "_", childId] as const,
};

const MOCK_LATENCY_MS = 75;

/**
 * Simulates a scoped parent API. Swap implementation for `GET /parents/me/children/:id/snapshot`.
 */
export function fetchParentPortalSnapshot(
  instituteId: string | null,
  childId: string,
  signal?: AbortSignal,
): Promise<ParentPortalSnapshot> {
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
