/**
 * Storage → Documents tab: demo registry vs API redirect panel.
 */
export type StorageDocumentsTabMode = "demo_registry" | "api_documents_hub";

export function resolveStorageDocumentsTabMode(
  apiMode: boolean,
): StorageDocumentsTabMode {
  return apiMode ? "api_documents_hub" : "demo_registry";
}
