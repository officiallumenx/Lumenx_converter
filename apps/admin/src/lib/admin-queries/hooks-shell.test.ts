import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

describe("admin-queries shell split", () => {
  it("keeps shell hooks free of transport/admissions/careers/fees loaders", () => {
    const source = readFileSync(join(here, "hooks-shell.ts"), "utf8");
    expect(source).toMatch(/useHomeSummaryQuery/);
    expect(source).toMatch(/useNotificationsListQuery/);
    expect(source).not.toMatch(/@\/lib\/transport/);
    expect(source).not.toMatch(/@\/lib\/admissions/);
    expect(source).not.toMatch(/@\/lib\/careers/);
    expect(source).not.toMatch(/@\/lib\/fees/);
    expect(source).not.toMatch(/@\/lib\/documents/);
    expect(source).not.toMatch(/exceljs|xlsx|recharts/);
  });

  it("does not pull demo pending-review stores into pending-reviews.ts", () => {
    const source = readFileSync(
      join(here, "..", "pending-reviews.ts"),
      "utf8",
    );
    expect(source).toMatch(/pending-reviews-api-store/);
    expect(source).not.toMatch(/getMarkEntriesSnapshot|subscribeMarkEntries/);
    expect(source).not.toMatch(/admissions-sync|careers-sync/);
    expect(source).not.toMatch(/transport-approval-store|admin-module-data/);
    expect(source).not.toMatch(/getInitialTeacherLeave|loadPendingStops/);
  });
});
