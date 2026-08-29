import { describe, expect, it } from "vitest";
import { resolveStorageDocumentsTabMode } from "./documents-tab-view";

describe("resolveStorageDocumentsTabMode", () => {
  it("keeps demo registry in demo mode", () => {
    expect(resolveStorageDocumentsTabMode(false)).toBe("demo_registry");
  });

  it("blocks demo registry in API mode (no demo fallback)", () => {
    expect(resolveStorageDocumentsTabMode(true)).toBe("api_unavailable");
  });
});
