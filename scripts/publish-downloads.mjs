/**
 * Upload dist/releases artifacts to Cloudflare R2 via Wrangler and write manifest.json.
 *
 * Requires:
 *   - wrangler authenticated (CLOUDFLARE_API_TOKEN)
 *   - R2 bucket lumenx-downloads
 *   - Built files under dist/releases/android/*.apk and dist/releases/windows/*-setup.exe
 *
 * Usage: node scripts/publish-downloads.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releases = path.join(root, "dist", "releases");
const bucket = process.env.LUMENX_DOWNLOADS_BUCKET || "lumenx-downloads";

function sha256(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function upload(localPath, key) {
  const result = spawnSync(
    "npx",
    ["wrangler", "r2", "object", "put", `${bucket}/${key}`, "--file", localPath, "--remote"],
    { cwd: root, stdio: "inherit", shell: true },
  );
  if (result.status !== 0) {
    throw new Error(`Failed to upload ${key}`);
  }
}

const androidDir = path.join(releases, "android");
const windowsDir = path.join(releases, "windows");
const files = [];

if (fs.existsSync(androidDir)) {
  for (const name of fs.readdirSync(androidDir).filter((f) => f.endsWith(".apk"))) {
    const localPath = path.join(androidDir, name);
    const key = `android/${name}`;
    const digest = sha256(localPath);
    upload(localPath, key);
    files.push({
      platform: "android",
      key,
      url: `https://downloads.lumenxtech.in/${key}`,
      sha256: digest,
      bytes: fs.statSync(localPath).size,
    });
  }
}

if (fs.existsSync(windowsDir)) {
  for (const name of fs.readdirSync(windowsDir).filter((f) => f.endsWith(".exe"))) {
    const localPath = path.join(windowsDir, name);
    const key = `windows/${name}`;
    const digest = sha256(localPath);
    upload(localPath, key);
    files.push({
      platform: "windows",
      key,
      url: `https://downloads.lumenxtech.in/${key}`,
      sha256: digest,
      bytes: fs.statSync(localPath).size,
    });
  }
}

if (files.length === 0) {
  console.error("No artifacts under dist/releases — build APKs/EXEs first.");
  process.exit(1);
}

const manifest = {
  generatedAt: new Date().toISOString(),
  baseUrl: "https://downloads.lumenxtech.in",
  files,
};
const manifestPath = path.join(releases, "manifest.json");
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
upload(manifestPath, "manifest.json");
console.log("Published manifest:", JSON.stringify(manifest, null, 2));
