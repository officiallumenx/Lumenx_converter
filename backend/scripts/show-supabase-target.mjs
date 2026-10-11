/**
 * Print safe Supabase target metadata from the active dotenv (no secrets).
 * Usage: npm run show:supabase-target
 */
import { loadLumenxDotenv } from "./load-lumenx-dotenv.mjs";
import { extractSupabaseProjectRef } from "./assert-staging-env.mjs";
import { looksLikeHostedSupabaseUrl } from "./assert-remote-write-ack.mjs";

const loaded = loadLumenxDotenv();
const url = process.env.SUPABASE_URL?.trim() ?? "";
const ref = extractSupabaseProjectRef(url);
const lumenxEnv = process.env.LUMENX_ENV?.trim() || "(unset)";
const otp = process.env.OTP_DELIVERY_MODE?.trim() || "(default)";
const fcmAllow = process.env.FCM_ALLOW_PROD_OUTBOX?.trim() || "(unset)";
const fcmWorker = process.env.FCM_WORKER_ENABLED?.trim() || "(default)";

console.log("LumenX Supabase target (safe metadata only)");
console.log(`  dotenv_mode:     ${loaded.mode}`);
console.log(`  LUMENX_ENV:      ${lumenxEnv}`);
console.log(`  project_ref:     ${ref ?? "(none / non-standard URL)"}`);
console.log(`  hosted_cloud:    ${looksLikeHostedSupabaseUrl(url) ? "yes" : "no"}`);
console.log(`  OTP_DELIVERY:    ${otp}`);
console.log(`  FCM_WORKER:      ${fcmWorker}`);
console.log(`  FCM_ALLOW_OUTBOX:${fcmAllow}`);
console.log(
  `  service_role:    ${process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ? "present" : "absent"}`,
);
console.log(
  `  anon_key:        ${process.env.SUPABASE_ANON_KEY?.trim() ? "present" : "absent"}`,
);
