import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

describe("analytics route code-splitting", () => {
  it("keeps the route shell free of static recharts / excel imports", () => {
    const source = readFileSync(join(here, "analytics.tsx"), "utf8");
    expect(source).toMatch(/lazy\(/);
    expect(source).toMatch(/AnalyticsApiSummaryPanel/);
    expect(source).toMatch(/AnalyticsDemoPage/);
    expect(source).toMatch(/pendingComponent/);
    expect(source).not.toMatch(/from ["']recharts["']/);
    expect(source).not.toMatch(/from ["']xlsx["']/);
    expect(source).not.toMatch(/from ["']exceljs["']/);
  });
});
