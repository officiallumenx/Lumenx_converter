/**
 * Copy release APKs from Capacitor android outputs into dist/releases/android/{product}.apk
 *
 * Usage: node scripts/collect-android-apks.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "dist", "releases", "android");
const products = ["admin", "nexus", "connect", "transport", "admissions", "careers"];

fs.mkdirSync(outDir, { recursive: true });

const results = [];
for (const product of products) {
  const candidates = [
    path.join(root, "apps", product, "android", "app", "build", "outputs", "apk", "release", "app-release.apk"),
    path.join(root, "apps", product, "android", "app", "build", "outputs", "apk", "release", "app-release-unsigned.apk"),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    results.push({ product, ok: false, reason: "APK not found — run cap:apk for this app first" });
    continue;
  }
  const dest = path.join(outDir, `${product}.apk`);
  fs.copyFileSync(found, dest);
  const stat = fs.statSync(dest);
  results.push({ product, ok: true, path: dest, bytes: stat.size });
}

console.log(JSON.stringify({ outDir, results }, null, 2));
const failed = results.filter((r) => !r.ok);
process.exit(failed.length === products.length ? 1 : 0);
