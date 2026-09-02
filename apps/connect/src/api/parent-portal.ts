import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import { buildParentPortalSnapshot, type ParentPortalSnapshot } from "@/lib/parent-portal-data";
import { loadParentPortalSnapshotFromApi } from "@/lib/dashboard";

/** Align with future TanStack Query usage. */
export const parentPortalQueryKeys = {
  root: ["parent-portal"] as const,
  snapshot: (instituteId: string | null, childId: string) =>
    [...parentPortalQueryKeys.root, instituteId ?? "_", childId] as const,
};

const MOCK_LATENCY_MS = 75;

/**
 * Parent portal snapshot — demo mock or API-composed learner dashboard.
 */
export function fetchParentPortalSnapshot(
  instituteId: string | null,
  childId: string,
  signal?: AbortSignal,
): Promise<ParentPortalSnapshot> {
  if (isApiAuthMode() && instituteId && isInstituteUuid(instituteId) && isInstituteUuid(childId)) {
    const task = loadParentPortalSnapshotFromApi({
      instituteId,
      studentId: childId,
    });
    if (!signal) return task;
    return new Promise((resolve, reject) => {
      const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
      task
        .then((data) => {
          signal.removeEventListener("abort", onAbort);
          resolve(data);
        })
        .catch((err) => {
          signal.removeEventListener("abort", onAbort);
          reject(err);
        });
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
