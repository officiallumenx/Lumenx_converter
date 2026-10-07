#!/usr/bin/env node
/**
 * Verifies FCM-enabled Android app/build.gradle files fail closed on release
 * when google-services.json is missing (no silent skip).
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apps = ["connect", "admin", "transport", "careers"];
const requiredSnippets = [
  "isReleaseTask",
  "GradleException",
  "google-services.json",
  "apply plugin: 'com.google.gms.google-services'",
];
const forbidden = [
  'logger.info("google-services.json not found, google-services plugin not applied',
];

let failed = 0;
for (const app of apps) {
  const path = join(root, `apps/${app}/android/app/build.gradle`);
  const text = readFileSync(path, "utf8");
  for (const snip of requiredSnippets) {
    if (!text.includes(snip)) {
      console.error(`FAIL ${path}: missing ${JSON.stringify(snip)}`);
      failed += 1;
    }
  }
  for (const bad of forbidden) {
    if (text.includes(bad)) {
      console.error(`FAIL ${path}: still has silent-skip pattern`);
      failed += 1;
    }
  }
  if (failed === 0 || !text.includes("GradleException")) {
    // ok path logged below
  }
  console.info(`OK ${app}: release FCM gate present`);
}
if (failed > 0) process.exit(1);
console.info("verify-android-fcm-build-gate: all apps OK");
