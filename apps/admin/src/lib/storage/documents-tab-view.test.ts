import { describe, expect, it } from "vitest";
import { resolveStorageDocumentsTabMode } from "./documents-tab-view";

describe("resolveStorageDocumentsTabMode", () => {
  it("uses demo registry in demo mode", () => {
    expect(resolveStorageDocumentsTabMode(false)).toBe("demo_registry");
  });

  it("directs to documents hub in api mode", () => {
    expect(resolveStorageDocumentsTabMode(true)).toBe("api_documents_hub");
  });
});
