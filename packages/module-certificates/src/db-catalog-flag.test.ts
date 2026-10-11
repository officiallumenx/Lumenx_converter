import { afterEach, describe, expect, it, vi } from "vitest";
import { isDbCertificateCatalogEnabled } from "./db-catalog-flag";

describe("isDbCertificateCatalogEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to false", () => {
    vi.stubEnv("VITE_NEXUS_TEMPLATE_DB_CATALOG", "");
    expect(isDbCertificateCatalogEnabled()).toBe(false);
  });

  it("enables only for explicit true-like values", () => {
    vi.stubEnv("VITE_NEXUS_TEMPLATE_DB_CATALOG", "true");
    expect(isDbCertificateCatalogEnabled()).toBe(true);
    vi.stubEnv("VITE_NEXUS_TEMPLATE_DB_CATALOG", "1");
    expect(isDbCertificateCatalogEnabled()).toBe(true);
    vi.stubEnv("VITE_NEXUS_TEMPLATE_DB_CATALOG", "false");
    expect(isDbCertificateCatalogEnabled()).toBe(false);
  });
});
