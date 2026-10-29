import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CANONICAL_PATHS, SITEMAP_EXCLUDED, SITE_ORIGIN } from "../src/data/site-urls.js";

const root = process.cwd();
const dist = join(root, "dist");

function test(name, fn) {
  try {
    fn();
    console.log("  ok ", name);
  } catch (error) {
    console.error("  FAIL", name, error.message);
    process.exitCode = 1;
  }
}

function distPathFor(urlPath) {
  if (urlPath === "/") return join(dist, "index.html");
  return join(dist, urlPath.replace(/^\//, ""), "index.html");
}

console.log("Routes, redirects, sitemap");

test("dist exists (run npm run build first)", () => {
  assert.equal(existsSync(dist), true, "dist/ missing — build before route tests");
});

test("every canonical path has built HTML", () => {
  for (const path of CANONICAL_PATHS) {
    // /resources/downloads is redirect-only — not required as index.html
    if (path === "/resources/downloads") continue;
    assert.equal(existsSync(distPathFor(path)), true, `missing ${path}`);
  }
});

test("excluded stubs are not required in sitemap list", () => {
  assert.ok(SITEMAP_EXCLUDED.includes("/blog"));
  assert.ok(SITEMAP_EXCLUDED.includes("/signin"));
  assert.ok(SITEMAP_EXCLUDED.includes("/signup"));
});

test("sitemap.xml lists only canonical URLs", () => {
  const sitemap = readFileSync(join(dist, "sitemap.xml"), "utf8");
  for (const path of CANONICAL_PATHS) {
    const loc = path === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;
    assert.ok(sitemap.includes(`<loc>${loc}</loc>`), `sitemap missing ${loc}`);
  }
  for (const path of SITEMAP_EXCLUDED) {
    assert.equal(sitemap.includes(`${SITE_ORIGIN}${path}`), false, `sitemap must exclude ${path}`);
  }
});

test("robots.txt references sitemap", () => {
  const robots = readFileSync(join(dist, "robots.txt"), "utf8");
  assert.ok(robots.includes("Sitemap: https://lumenxtech.in/sitemap.xml"));
  assert.ok(robots.includes("Disallow: /blog"));
});

test("_redirects contains verified legacy map", () => {
  const redirects = readFileSync(join(dist, "_redirects"), "utf8");
  const required = [
    "/products              /platform              301",
    "/products/nexus        /about                 301",
    "/download              /downloads             301",
    "/resources/downloads   /downloads             301",
    "/features              /modules               301",
    "/modules/:category     /modules/              301",
    "/how-it-works          /platform              301",
    "/demo                  /contact?intent=demo   301",
  ];
  for (const line of required) {
    assert.ok(redirects.includes(line.trim()) || redirects.replace(/\s+/g, " ").includes(line.replace(/\s+/g, " ")), `missing redirect: ${line}`);
  }
  const hasCatchAllHome = redirects
    .split(/\r?\n/)
    .some((line) => /^\s*\/\*\s+\/\s+/.test(line) || /^\s*\/\*\s+\/index/.test(line));
  assert.equal(hasCatchAllHome, false, "must not catch-all redirect to home");
});

test("legal pages mention last updated date", () => {
  for (const path of ["/privacy", "/terms", "/cookies"]) {
    const html = readFileSync(distPathFor(path), "utf8");
    assert.ok(html.includes("4 September 2026"), `${path} missing last-updated`);
    assert.ok(html.includes("lumenxtech.official@gmail.com"), `${path} missing privacy email`);
  }
});

test("data-request page distinguishes account deletion", () => {
  const html = readFileSync(distPathFor("/data-request"), "utf8");
  assert.ok(html.includes("Account deletion"));
  assert.ok(html.includes("does not remove a live login") || html.includes("does not delete"));
});

if (!process.exitCode) {
  console.log("\nResults: routes/sitemap/redirect tests passed");
}
