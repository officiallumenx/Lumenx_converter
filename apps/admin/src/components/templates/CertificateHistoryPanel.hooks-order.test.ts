import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Regression: listBlocked early-return used to sit above useMemo, so flipping
 * listBlocked false added a hook and crashed ("Rendered more hooks…").
 */
describe("CertificateHistoryPanel hooks order", () => {
  it("declares useMemo before any listBlocked early return", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "CertificateHistoryPanel.tsx"), "utf8");

    const exportIdx = src.indexOf("export function CertificateHistoryPanel");
    expect(exportIdx).toBeGreaterThanOrEqual(0);
    const body = src.slice(exportIdx);

    const useMemoIdx = body.indexOf("const visible = useMemo(");
    const blockedIdx = body.indexOf("if (listBlocked)");

    expect(useMemoIdx).toBeGreaterThanOrEqual(0);
    expect(blockedIdx).toBeGreaterThanOrEqual(0);
    expect(useMemoIdx).toBeLessThan(blockedIdx);

    // No second useMemo after the blocked return (guards against reintroducing
    // the conditional-hook pattern elsewhere in the component body).
    const afterBlocked = body.slice(blockedIdx);
    expect(afterBlocked).not.toMatch(/\buse(?:Memo|Effect|State|Ref|Callback)\s*\(/);
  });
});
