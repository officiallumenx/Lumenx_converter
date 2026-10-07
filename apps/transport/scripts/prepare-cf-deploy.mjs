import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const transportRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverDir = path.join(transportRoot, "dist", "server");
const indexPath = path.join(serverDir, "index.mjs");
const serverJsPath = path.join(serverDir, "server.js");
const wranglerPath = path.join(serverDir, "wrangler.json");

if (!fs.existsSync(indexPath)) {
  console.error("[prepare-cf-deploy] Missing dist/server/index.mjs — build first.");
  process.exit(1);
}

// Cloudflare Workers Builds historically deploys dist/server/server.js.
fs.copyFileSync(indexPath, serverJsPath);

// Nitro on Windows emits `..\\client`; CF Linux + wrangler need `../client`.
if (fs.existsSync(wranglerPath)) {
  const raw = fs.readFileSync(wranglerPath, "utf8");
  const config = JSON.parse(raw);
  if (config?.assets?.directory) {
    config.assets.directory = "../client";
  }
  // Prefer the real Nitro entry; server.js is only a compatibility copy.
  config.main = "index.mjs";
  fs.writeFileSync(wranglerPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

// Nitro's redirected deploy config conflicts when Wrangler is invoked from the
// monorepo root with a path into dist/server.
fs.rmSync(path.join(transportRoot, ".wrangler", "deploy"), { recursive: true, force: true });

console.log(
  "[prepare-cf-deploy] Wrote dist/server/server.js, normalized wrangler.json, cleared .wrangler/deploy",
);
