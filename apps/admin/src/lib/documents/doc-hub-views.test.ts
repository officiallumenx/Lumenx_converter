import { describe, expect, it } from "vitest";
import { parseHubView } from "@/lib/hub-view-search";
import {
  DOCUMENTS_HUB_TEMPLATE_TYPES,
  DOCUMENTS_VIEW_CONFIG,
  DOC_HUB_PRIMARY_NAV,
  filterDocumentsHubTemplates,
  isDocumentsHubTemplateType,
} from "./doc-hub-views";

describe("documents hub views", () => {
  it("defaults to overview", () => {
    expect(parseHubView(undefined, DOCUMENTS_VIEW_CONFIG)).toBe("overview");
    expect(parseHubView("nope", DOCUMENTS_VIEW_CONFIG)).toBe("overview");
  });

  it("aliases legacy tabs to the simplified IA", () => {
    expect(parseHubView("dashboard", DOCUMENTS_VIEW_CONFIG)).toBe("overview");
    expect(parseHubView("generate", DOCUMENTS_VIEW_CONFIG)).toBe("official");
    expect(parseHubView("published", DOCUMENTS_VIEW_CONFIG)).toBe("official");
    expect(parseHubView("generated", DOCUMENTS_VIEW_CONFIG)).toBe("archive");
  });

  it("keeps primary nav to five clear sections", () => {
    expect(DOC_HUB_PRIMARY_NAV.map((n) => n.view)).toEqual([
      "overview",
      "official",
      "student-docs",
      "templates",
      "archive",
    ]);
  });

  it("allows only document and report kinds in the Documents hub", () => {
    expect([...DOCUMENTS_HUB_TEMPLATE_TYPES]).toEqual(["document", "report"]);
    expect(isDocumentsHubTemplateType("document")).toBe(true);
    expect(isDocumentsHubTemplateType("report")).toBe(true);
    expect(isDocumentsHubTemplateType("certificate")).toBe(false);
    expect(isDocumentsHubTemplateType("id_card")).toBe(false);

    const filtered = filterDocumentsHubTemplates(
      [
        { id: "1", kind: "document", status: "active" },
        { id: "2", kind: "certificate", status: "active" },
        { id: "3", kind: "report", status: "draft" },
        { id: "4", kind: "id_card", status: "active" },
        { id: "5", kind: "document", status: "draft" },
      ],
      { activeOnly: true },
    );
    expect(filtered.map((t) => t.id)).toEqual(["1"]);
  });
});
