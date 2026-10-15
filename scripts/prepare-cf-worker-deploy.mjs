/**
 * Post-build helper for TanStack Start + Nitro Cloudflare Workers.
 *
 * Run from an app root after `vite build` (cwd = apps/<name>):
 *   node ../../scripts/prepare-cf-worker-deploy.mjs
 *
 * Ensures:
 * - dist/server/index.mjs exists (Nitro cloudflare-module output)
 * - a single-file dist/server/server.js bundle for Workers Builds
 * - dist/server/wrangler.json points at server.js + ../client assets
 * - app-root wrangler.json (gitignored) is written so the default
 *   Cloudflare Workers Builds command `npx wrangler versions upload`
 *   resolves a real entry point without requiring a dashboard --config flag
 * - stale .wrangler/deploy redirects are cleared
 *
 * Does not publish. Safe for CI/local validation.
 */
import fs from "node:fs";
import path from "node:path";
import { build as esbuild } from "esbuild";

const appRoot = process.cwd();
const serverDir = path.join(appRoot, "dist", "server");
const indexPath = path.join(serverDir, "index.mjs");
const serverJsPath = path.join(serverDir, "server.js");
const wranglerPath = path.join(serverDir, "wrangler.json");
const rootWranglerPath = path.join(appRoot, "wrangler.json");

if (!fs.existsSync(indexPath)) {
  console.error(
    `[prepare-cf-worker-deploy] Missing ${path.relative(appRoot, indexPath)} — run vite build with nitro: true first.`,
  );
  process.exit(1);
}

/**
 * Cloudflare Workers Builds historically uploads a single server.js entry.
 * Nitro emits a multi-file graph (index.mjs + _libs + _ssr); bundling avoids
 * unresolved relative imports when Wrangler runs outside the Vite plugin.
 */
await esbuild({
  entryPoints: [indexPath],
  outfile: serverJsPath,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "es2022",
  logLevel: "warning",
  external: ["cloudflare:*", "node:*"],
  banner: {
    js: "globalThis.__nitro_main__ = import.meta.url;",
  },
});

if (!fs.existsSync(wranglerPath)) {
  console.error(
    `[prepare-cf-worker-deploy] Missing ${path.relative(appRoot, wranglerPath)} — Nitro did not emit a Worker config.`,
  );
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(wranglerPath, "utf8"));
if (config?.assets?.directory) {
  // Normalize Windows backslashes from Nitro so Linux Workers Builds resolve assets.
  config.assets.directory = "../client";
}
config.main = "server.js";
config.no_bundle = true;
// Bundled server.js is self-contained; drop Nitro multi-file module globs so
// Workers Builds does not upload the entire _libs/_ssr tree again.
delete config.rules;
config.compatibility_flags = Array.from(
  new Set([...(config.compatibility_flags ?? []), "nodejs_compat"]),
);
fs.writeFileSync(wranglerPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

// Default Workers Builds deploy/preview commands run bare
// `npx wrangler versions upload`, which discovers config in the app root.
// wrangler.jsonc keeps the Vite/Nitro source entry (src/server.ts). Writing a
// sibling wrangler.json with dist paths makes the default upload command work
// after build without a dashboard --config change (Wrangler prefers .json).
const rootConfig = {
  ...config,
  main: "dist/server/server.js",
};
if (rootConfig.assets && typeof rootConfig.assets === "object") {
  rootConfig.assets = {
    ...rootConfig.assets,
    directory: "dist/client",
  };
}
fs.writeFileSync(
  rootWranglerPath,
  `${JSON.stringify(rootConfig, null, 2)}\n`,
  "utf8",
);

fs.rmSync(path.join(appRoot, ".wrangler", "deploy"), {
  recursive: true,
  force: true,
});

const sizeKb = Math.round(fs.statSync(serverJsPath).size / 1024);
const workerName = typeof config.name === "string" ? config.name : "(unnamed)";
console.log(
  `[prepare-cf-worker-deploy] ${workerName}: bundled server.js (${sizeKb} KiB), normalized dist + root wrangler.json, cleared .wrangler/deploy`,
);
