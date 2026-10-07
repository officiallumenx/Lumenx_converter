import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverDir = path.join(websiteRoot, "dist", "server");
const indexPath = path.join(serverDir, "index.mjs");
const serverJsPath = path.join(serverDir, "server.js");

if (!fs.existsSync(indexPath)) {
  console.error("[prepare-cf-deploy] Missing dist/server/index.mjs — build first.");
  process.exit(1);
}

// Cloudflare Workers Builds historically deploys dist/server/server.js.
fs.copyFileSync(indexPath, serverJsPath);

// Nitro's redirected deploy config conflicts when Wrangler is invoked from the
// monorepo root with a path into dist/server. Remove it so CI can deploy the
// generated dist/server/wrangler.json (or CLI flags) unambiguously.
fs.rmSync(path.join(websiteRoot, ".wrangler", "deploy"), { recursive: true, force: true });

console.log("[prepare-cf-deploy] Wrote dist/server/server.js and cleared .wrangler/deploy");
