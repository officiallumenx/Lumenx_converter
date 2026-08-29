/**
 * Storage → Documents tab: demo registry vs API unavailable gate.
 * No institute-scoped storage documents-registry read API exists yet.
 */
export type StorageDocumentsTabMode = "demo_registry" | "api_unavailable";

export function resolveStorageDocumentsTabMode(
  apiMode: boolean,
): StorageDocumentsTabMode {
  return apiMode ? "api_unavailable" : "demo_registry";
}
