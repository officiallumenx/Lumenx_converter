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
  it("defaults to templates", () => {
    expect(parseHubView(undefined, DOCUMENTS_VIEW_CONFIG)).toBe("templates");
    expect(parseHubView("nope", DOCUMENTS_VIEW_CONFIG)).toBe("templates");
  });

  it("aliases legacy tabs to Templates or Published", () => {
    expect(parseHubView("overview", DOCUMENTS_VIEW_CONFIG)).toBe("templates");
    expect(parseHubView("dashboard", DOCUMENTS_VIEW_CONFIG)).toBe("templates");
    expect(parseHubView("generate", DOCUMENTS_VIEW_CONFIG)).toBe("templates");
    expect(parseHubView("official", DOCUMENTS_VIEW_CONFIG)).toBe("templates");
    expect(parseHubView("published", DOCUMENTS_VIEW_CONFIG)).toBe("published");
    expect(parseHubView("archive", DOCUMENTS_VIEW_CONFIG)).toBe("published");
    expect(parseHubView("generated", DOCUMENTS_VIEW_CONFIG)).toBe("published");
    expect(parseHubView("student-docs", DOCUMENTS_VIEW_CONFIG)).toBe("published");
  });

  it("keeps primary nav to exactly two sections", () => {
    expect(DOC_HUB_PRIMARY_NAV.map((n) => n.view)).toEqual([
      "templates",
      "published",
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
