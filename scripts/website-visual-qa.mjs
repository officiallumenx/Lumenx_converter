/**
 * Visual QA screenshots for LumenX marketing site.
 * Usage: node scripts/website-visual-qa.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = (process.argv[2] || "https://lumenxtech.in").replace(/\/$/, "");
const OUT = path.resolve("qa-artifacts/website-visual-qa");

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const PAGES = [
  { slug: "home", path: "/" },
  { slug: "pricing", path: "/pricing" },
  { slug: "platform", path: "/platform" },
  { slug: "platform-admin", path: "/platform/admin" },
  { slug: "platform-connect", path: "/platform/connect" },
  { slug: "login", path: "/login" },
  { slug: "contact", path: "/contact" },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  for (const route of PAGES) {
    const url = `${BASE}${route.path}`;
    const file = path.join(OUT, `${route.slug}__${vp.name}.png`);
    try {
      const res = await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
      await page.waitForTimeout(400);
      await page.screenshot({ path: file, fullPage: true });
      results.push({
        route: route.path,
        viewport: vp.name,
        status: res?.status() ?? 0,
        file: path.relative(process.cwd(), file),
        ok: Boolean(res?.ok()),
      });
      console.log(`OK ${vp.name} ${route.path} → ${file}`);
    } catch (err) {
      results.push({
        route: route.path,
        viewport: vp.name,
        status: 0,
        file: null,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
      console.error(`FAIL ${vp.name} ${route.path}:`, err);
    }
  }
  await context.close();
}

await browser.close();
const summaryPath = path.join(OUT, "summary.json");
await import("node:fs/promises").then((fs) =>
  fs.writeFile(summaryPath, JSON.stringify({ base: BASE, results }, null, 2)),
);
console.log(`Wrote ${summaryPath}`);
const failed = results.filter((r) => !r.ok);
process.exit(failed.length ? 1 : 0);
