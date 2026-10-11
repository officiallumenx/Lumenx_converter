/** Shared root margin with student / people directory photo gating. */
export const NEAR_VIEWPORT_ROOT_MARGIN = "120px 0px";

/**
 * One-shot IntersectionObserver: calls `onIntersect` once when the element
 * enters (or nears) the viewport, then disconnects.
 * Returns null when IntersectionObserver is unavailable (caller should treat as visible).
 */
export function createOnceIntersectObserver(
  onIntersect: () => void,
  rootMargin: string = NEAR_VIEWPORT_ROOT_MARGIN,
): IntersectionObserver | null {
  if (typeof IntersectionObserver === "undefined") return null;
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        onIntersect();
        observer.disconnect();
      }
    },
    { rootMargin },
  );
  return observer;
}

/** Photo signed-URL fetch may run only when a path exists and the row is near viewport. */
export function personPhotoFetchEnabled(opts: {
  photoAssetPath?: string | null;
  nearViewport: boolean;
}): boolean {
  return Boolean(opts.photoAssetPath?.trim()) && opts.nearViewport;
}
