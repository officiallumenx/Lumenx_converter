import { describe, expect, it } from "vitest";
import { parseHubView } from "@/lib/hub-view-search";
import {
  CERTIFICATES_VIEW_CONFIG,
  CERT_HUB_PRIMARY_NAV,
} from "./cert-hub-views";

describe("certificates hub views", () => {
  it("defaults to templates", () => {
    expect(parseHubView(undefined, CERTIFICATES_VIEW_CONFIG)).toBe("templates");
  });

  it("aliases legacy tabs to Templates or Published", () => {
    expect(parseHubView("catalog", CERTIFICATES_VIEW_CONFIG)).toBe("templates");
    expect(parseHubView("overview", CERTIFICATES_VIEW_CONFIG)).toBe("templates");
    expect(parseHubView("issue", CERTIFICATES_VIEW_CONFIG)).toBe("templates");
    expect(parseHubView("generate", CERTIFICATES_VIEW_CONFIG)).toBe("templates");
    expect(parseHubView("history", CERTIFICATES_VIEW_CONFIG)).toBe("published");
    expect(parseHubView("issued", CERTIFICATES_VIEW_CONFIG)).toBe("published");
    expect(parseHubView("verify", CERTIFICATES_VIEW_CONFIG)).toBe("published");
    expect(parseHubView("published", CERTIFICATES_VIEW_CONFIG)).toBe("published");
  });

  it("primary nav is exactly Templates and Published", () => {
    expect(CERT_HUB_PRIMARY_NAV.map((n) => n.view)).toEqual([
      "templates",
      "published",
    ]);
  });
});
