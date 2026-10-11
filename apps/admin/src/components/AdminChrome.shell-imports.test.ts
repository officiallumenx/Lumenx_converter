import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

describe("AdminChrome shell imports", () => {
  it("does not import the admin-queries barrel (avoids full hooks graph)", () => {
    const chrome = readFileSync(join(here, "AdminChrome.tsx"), "utf8");
    const inbox = readFileSync(join(here, "AdminInboxRefreshSync.tsx"), "utf8");
    expect(chrome).not.toMatch(/from ["']@\/lib\/admin-queries["']/);
    expect(chrome).toMatch(/hooks-shell/);
    expect(inbox).not.toMatch(/from ["']@\/lib\/admin-queries["']/);
    expect(inbox).toMatch(/admin-queries\/invalidate|admin-queries\/keys/);
  });
});
