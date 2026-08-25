/**
 * Bump apps/transport/app-version.json patch version + androidVersionCode, then sync.
 * Usage: npm run version:bump
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const manifestPath = path.join(appRoot, "app-version.json");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const [major, minor, patch] = String(manifest.version)
  .split(".")
  .map((part) => Number.parseInt(part, 10));

if ([major, minor, patch].some((n) => Number.isNaN(n))) {
  console.error("Invalid version in app-version.json");
  process.exit(1);
}

manifest.version = `${major}.${minor}.${patch + 1}`;
manifest.androidVersionCode = Number(manifest.androidVersionCode ?? 0) + 1;
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const sync = spawnSync(process.execPath, [path.join(__dirname, "sync-app-version.mjs")], {
  stdio: "inherit",
});
process.exit(sync.status ?? 1);
