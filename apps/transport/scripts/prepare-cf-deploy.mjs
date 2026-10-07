import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

const transportRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverDir = path.join(transportRoot, "dist", "server");
const indexPath = path.join(serverDir, "index.mjs");
const serverJsPath = path.join(serverDir, "server.js");
const wranglerPath = path.join(serverDir, "wrangler.json");

if (!fs.existsSync(indexPath)) {
  console.error("[prepare-cf-deploy] Missing dist/server/index.mjs — build first.");
  process.exit(1);
}

/**
 * Cloudflare Workers Builds historically runs:
 *   wrangler deploy apps/transport/dist/server/server.js --assets ...
 * Nitro emits a multi-file graph (index.mjs + _libs + _ssr). Copying index.mjs
 * to server.js leaves relative imports unresolved in that deploy mode and the
 * Worker returns ErrorComponent HTML / 500s. Bundle to a single ESM entry.
 */
await esbuild({
  entryPoints: [indexPath],
  outfile: serverJsPath,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "es2022",
  logLevel: "warning",
  // CF nodejs_compat provides node:*; ASSETS comes from the Worker runtime.
  external: ["cloudflare:*", "node:*"],
  banner: {
    js: "globalThis.__nitro_main__ = import.meta.url;",
  },
});

if (fs.existsSync(wranglerPath)) {
  const config = JSON.parse(fs.readFileSync(wranglerPath, "utf8"));
  if (config?.assets?.directory) {
    config.assets.directory = "../client";
  }
  // Prefer the bundled single-file entry for both CLI and Workers Builds.
  config.main = "server.js";
  config.no_bundle = true;
  config.compatibility_flags = Array.from(
    new Set([...(config.compatibility_flags ?? []), "nodejs_compat"]),
  );
  fs.writeFileSync(wranglerPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

// Nitro's redirected deploy config conflicts when Wrangler is invoked from the
// monorepo root with a path into dist/server.
fs.rmSync(path.join(transportRoot, ".wrangler", "deploy"), { recursive: true, force: true });

const sizeKb = Math.round(fs.statSync(serverJsPath).size / 1024);
console.log(
  `[prepare-cf-deploy] Bundled dist/server/server.js (${sizeKb} KiB), normalized wrangler.json, cleared .wrangler/deploy`,
);
