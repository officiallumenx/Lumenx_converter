/**
 * Prints staging API / Supabase target presence only — never secret values.
 */
import fs from "node:fs";
import {
  assertStagingEnv,
  extractSupabaseProjectRef,
} from "../backend/scripts/assert-staging-env.mjs";

const EXPECTED = "yveadybpntziyryxsrsu";
const DENIED = "kmpzflsurepjwqnfqyld";

assertStagingEnv(process.env);
const ref = extractSupabaseProjectRef(process.env.SUPABASE_URL);
const api =
  (process.env.E2E_API_BASE_URL || process.env.SMOKE_API_BASE_URL || "").trim() ||
  "(unset → default localhost)";

console.log("LUMENX_ENV=" + (process.env.LUMENX_ENV || ""));
console.log("STAGING_SUPABASE_PROJECT_REF=" + (process.env.STAGING_SUPABASE_PROJECT_REF || ""));
console.log("SUPABASE_URL_REF=" + ref);
console.log("REF_MATCH_EXPECTED=" + (ref === EXPECTED));
console.log("REF_IS_PRODUCTION=" + (ref === DENIED));
console.log("HAS_ANON=" + Boolean(process.env.SUPABASE_ANON_KEY?.trim()));
console.log("HAS_SERVICE_ROLE=" + Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()));
console.log("E2E_API_BASE_URL=" + api);
console.log(
  "API_IS_PRODUCTION_HOST=" +
    /api\.lumenxtech\.in/i.test(api),
);

const pkg = JSON.parse(fs.readFileSync("backend/package.json", "utf8"));
console.log("HAS_start_staging=" + Boolean(pkg.scripts?.["start:staging"]));
console.log("HAS_dev_staging=" + Boolean(pkg.scripts?.["dev:staging"]));
console.log("HAS_deploy_staging_script=" + Boolean(pkg.scripts?.["deploy:staging"]));
