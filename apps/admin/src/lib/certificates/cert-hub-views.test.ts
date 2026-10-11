import { describe, expect, it } from "vitest";
import { parseHubView } from "@/lib/hub-view-search";
import {
  CERTIFICATES_VIEW_CONFIG,
  CERT_HUB_PRIMARY_NAV,
} from "./cert-hub-views";

describe("certificates hub views", () => {
  it("defaults to overview", () => {
    expect(parseHubView(undefined, CERTIFICATES_VIEW_CONFIG)).toBe("overview");
  });

  it("aliases catalog/history/generate", () => {
    expect(parseHubView("catalog", CERTIFICATES_VIEW_CONFIG)).toBe("templates");
    expect(parseHubView("history", CERTIFICATES_VIEW_CONFIG)).toBe("issued");
    expect(parseHubView("generate", CERTIFICATES_VIEW_CONFIG)).toBe("issue");
  });

  it("primary nav covers issue and verify", () => {
    expect(CERT_HUB_PRIMARY_NAV.map((n) => n.view)).toEqual([
      "overview",
      "templates",
      "issue",
      "issued",
      "verify",
    ]);
  });
});
