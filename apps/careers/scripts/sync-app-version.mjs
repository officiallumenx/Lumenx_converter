/**
 * Sync apps/connect/app-version.json → package.json + Android build.gradle
 * Run before Capacitor/Android builds: npm run version:sync
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const manifestPath = path.join(appRoot, "app-version.json");
const packagePath = path.join(appRoot, "package.json");
const gradlePath = path.join(appRoot, "android", "app", "build.gradle");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const { version, androidVersionCode } = manifest;

if (!version || typeof androidVersionCode !== "number") {
  console.error("app-version.json must include version (string) and androidVersionCode (number)");
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
pkg.version = version;
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

let gradle = fs.readFileSync(gradlePath, "utf8");
const nextGradle = gradle
  .replace(/versionCode\s+\d+/, `versionCode ${androidVersionCode}`)
  .replace(/versionName\s+"[^"]+"/, `versionName "${version}"`);

if (nextGradle === gradle) {
  console.warn("Warning: build.gradle version fields were not updated — check file format.");
} else {
  fs.writeFileSync(gradlePath, nextGradle);
}

console.log(`Synced Careers app version: ${version} (Android versionCode ${androidVersionCode})`);
