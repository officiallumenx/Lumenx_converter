import { describe, expect, it } from "vitest";
import { buildAdminNavContractReport } from "@/lib/admin-navigation-contract";

describe("admin navigation contract", () => {
  it("has no duplicate route definitions", () => {
    const report = buildAdminNavContractReport();
    const duplicateIssues = report.issues.filter((issue) =>
      issue.code === "DUPLICATE_NAV_ROUTE" || issue.code === "DUPLICATE_CATALOG_ROUTE",
    );
    expect(duplicateIssues).toHaveLength(0);
  });

  it("keeps nav routes mapped in module catalog", () => {
    const report = buildAdminNavContractReport();
    const missingCatalog = report.issues.filter(
      (issue) => issue.code === "MISSING_IN_MODULE_CATALOG",
    );
    expect(missingCatalog).toHaveLength(0);
  });
});
