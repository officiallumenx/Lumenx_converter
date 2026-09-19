import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

describe("fees flowchart contract", () => {
  it("requires category payment and cash-only optional note", () => {
    const service = readFileSync(join(here, "service.ts"), "utf8");
    expect(service).toContain("requirePaymentNoteForMethod");
    expect(service).toContain('method === "cash"');
    expect(service).toContain("feeComponentId");
    expect(service).toContain("balanceAmount");
  });

  it("publish and payment notify parents and students/teachers", () => {
    const notifications = readFileSync(join(here, "notifications.ts"), "utf8");
    expect(notifications).toContain('"parents"');
    expect(notifications).toContain('"students"');
    expect(notifications).toContain('"teachers"');
  });
});
