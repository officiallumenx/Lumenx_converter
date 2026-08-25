import { FEES_STORAGE_KEY } from "./seed";

/** Custom event dispatched by `saveFeesSnapshot` for same-tab listeners. */
export const FEES_UPDATED_EVENT = "lumenx-fees-updated";

/**
 * Subscribe to fees catalog changes (cross-tab `storage` + same-tab custom event).
 * Returns an unsubscribe function. No React dependency.
 */
export function subscribeFeesUpdates(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === FEES_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(FEES_UPDATED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(FEES_UPDATED_EVENT, onChange);
  };
}
