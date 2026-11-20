import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { adminNav } from "@/lib/admin-nav";
import {
  MODULE_HELP_REGISTRY,
  MODULE_HELP_REQUIRED_IDS,
  getModuleHelp,
  normalizeModuleHelpKey,
} from "./registry";

const NAV_HELP_EXEMPT = new Set(["/", "/analytics"]);

function walkTsx(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkTsx(p, out);
    else if (name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

describe("module-help registry coverage", () => {
  it("has complete content for every required id", () => {
    for (const id of MODULE_HELP_REQUIRED_IDS) {
      const row = MODULE_HELP_REGISTRY[id];
      expect(row, id).toBeTruthy();
      expect(row.whatIs.trim().length).toBeGreaterThan(20);
      expect(row.whatYouCanDo.length).toBeGreaterThan(0);
      expect(row.howToUse.length).toBeGreaterThan(0);
      expect(getModuleHelp(id)?.id).toBe(id);
    }
  });

  it("covers every adminNav module that should have help", () => {
    const missing: string[] = [];
    for (const group of adminNav) {
      for (const item of group.items) {
        if (NAV_HELP_EXEMPT.has(item.to)) continue;
        if (!getModuleHelp(item.to)) missing.push(item.to);
      }
    }
    expect(missing).toEqual([]);
  });

  it("integrates helpKey on ModuleHero for required nav modules", () => {
    const srcDir = join(process.cwd(), "src");
    const files = [
      ...walkTsx(join(srcDir, "routes")),
      ...walkTsx(join(srcDir, "components")),
    ];
    const blob = files.map((f) => readFileSync(f, "utf8")).join("\n");
    const missingIntegration: string[] = [];
    for (const group of adminNav) {
      for (const item of group.items) {
        if (NAV_HELP_EXEMPT.has(item.to)) continue;
        const bare = normalizeModuleHelpKey(item.to);
        const re = new RegExp(`helpKey\\s*=\\s*['"]${bare}['"]`);
        if (!re.test(blob)) missingIntegration.push(bare);
      }
    }
    expect(missingIntegration).toEqual([]);
  });
});
