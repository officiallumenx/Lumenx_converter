/**
 * Verify staging Transport APK exists and embeds staging API target (no secrets).
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join } from "node:path";

const apk =
  "apps/transport/android/app/build/outputs/apk/release/app-release.apk";
const assetsRoot =
  "apps/transport/android/app/src/main/assets/public";
const gradle = "apps/transport/android/app/build.gradle";

const out = {
  apk_present: existsSync(apk),
  apk_path: apk,
  apk_sha256: null,
  apk_bytes: null,
  application_id: null,
  version_name: null,
  version_code: null,
  bundle_has_staging_api: false,
  bundle_has_staging_supabase: false,
  bundle_has_prod_api_fallback_string: false,
};

if (out.apk_present) {
  const buf = readFileSync(apk);
  out.apk_bytes = buf.length;
  out.apk_sha256 = createHash("sha256").update(buf).digest("hex");
}

if (existsSync(gradle)) {
  const g = readFileSync(gradle, "utf8");
  const id = g.match(/applicationId\s+"([^"]+)"/);
  const vn = g.match(/versionName\s+"([^"]+)"/);
  const vc = g.match(/versionCode\s+(\d+)/);
  out.application_id = id?.[1] ?? null;
  out.version_name = vn?.[1] ?? null;
  out.version_code = vc?.[1] ?? null;
}

function walkJs(dir, hits) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      walkJs(p, hits);
      continue;
    }
    if (!name.endsWith(".js")) continue;
    const t = readFileSync(p, "utf8");
    if (t.includes("127.0.0.1:8787")) hits.stagingApi = true;
    if (t.includes("yveadybpntziyryxsrsu")) hits.stagingSb = true;
    if (t.includes("api.lumenxtech.in")) hits.prodFallback = true;
  }
}

const hits = { stagingApi: false, stagingSb: false, prodFallback: false };
walkJs(join(assetsRoot, "assets"), hits);
out.bundle_has_staging_api = hits.stagingApi;
out.bundle_has_staging_supabase = hits.stagingSb;
out.bundle_has_prod_api_fallback_string = hits.prodFallback;

console.log(JSON.stringify(out, null, 2));
const ok =
  out.apk_present &&
  out.bundle_has_staging_api &&
  out.bundle_has_staging_supabase;
process.exit(ok ? 0 : 1);
