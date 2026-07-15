/**
 * Bump patch version + Android versionCode in app-version.json, then sync.
 * Usage: npm run version:bump
 * Optional: npm run version:bump -- minor|major
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const manifestPath = path.join(appRoot, "app-version.json");
const level = process.argv[2] ?? "patch";

if (!["patch", "minor", "major"].includes(level)) {
  console.error("Usage: npm run version:bump -- [patch|minor|major]");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const parts = String(manifest.version).split(".").map(Number);
if (parts.length !== 3 || parts.some(Number.isNaN)) {
  console.error(`Invalid semver in app-version.json: ${manifest.version}`);
  process.exit(1);
}

let [major, minor, patch] = parts;
if (level === "major") {
  major += 1;
  minor = 0;
  patch = 0;
} else if (level === "minor") {
  minor += 1;
  patch = 0;
} else {
  patch += 1;
}

manifest.version = `${major}.${minor}.${patch}`;
manifest.androidVersionCode = Number(manifest.androidVersionCode ?? 0) + 1;

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Bumped to ${manifest.version} (Android versionCode ${manifest.androidVersionCode})`);

const sync = spawnSync(process.execPath, [path.join(__dirname, "sync-app-version.mjs")], {
  stdio: "inherit",
  cwd: appRoot,
});
process.exit(sync.status ?? 1);
