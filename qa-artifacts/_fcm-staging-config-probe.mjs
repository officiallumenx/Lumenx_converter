/**
 * Staging FCM config presence probe — never prints secrets or full tokens.
 * Usage: node --env-file=backend/.env.staging qa-artifacts/_fcm-staging-config-probe.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import {
  assertStagingEnv,
  extractSupabaseProjectRef,
} from "../backend/scripts/assert-staging-env.mjs";

assertStagingEnv(process.env);
const ref = extractSupabaseProjectRef(process.env.SUPABASE_URL);
if (ref !== "yveadybpntziyryxsrsu") {
  console.error("BLOCKED: not staging");
  process.exit(2);
}

function present(v) {
  return Boolean(v && String(v).trim());
}

const gsPath = "apps/transport/android/app/google-services.json";
let gsProjectIdSet = false;
let gsPackageOk = false;
if (existsSync(gsPath)) {
  try {
    const gs = JSON.parse(readFileSync(gsPath, "utf8"));
    const pid = gs?.project_info?.project_id;
    gsProjectIdSet = present(pid);
    const clients = gs?.client ?? [];
    gsPackageOk = clients.some(
      (c) =>
        c?.client_info?.android_client_info?.package_name ===
        "com.lumenx.app.transport",
    );
  } catch {
    gsProjectIdSet = false;
  }
}

let viteFirebaseProjectSet = false;
const envPath = "apps/transport/.env";
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (line.startsWith("VITE_FIREBASE_PROJECT_ID=")) {
      viteFirebaseProjectSet = present(line.slice("VITE_FIREBASE_PROJECT_ID=".length));
    }
  }
}

const out = {
  staging_ref: ref,
  backend: {
    FCM_WORKER_ENABLED: process.env.FCM_WORKER_ENABLED ?? "(unset)",
    FCM_ALLOW_PROD_OUTBOX: process.env.FCM_ALLOW_PROD_OUTBOX ?? "(unset)",
    FIREBASE_PROJECT_ID: present(process.env.FIREBASE_PROJECT_ID) ? "SET" : "EMPTY",
    FIREBASE_CLIENT_EMAIL: present(process.env.FIREBASE_CLIENT_EMAIL)
      ? "SET"
      : "EMPTY",
    FIREBASE_PRIVATE_KEY: present(process.env.FIREBASE_PRIVATE_KEY)
      ? "SET"
      : "EMPTY",
    firebase_admin_credentials_complete:
      present(process.env.FIREBASE_PROJECT_ID) &&
      present(process.env.FIREBASE_CLIENT_EMAIL) &&
      present(process.env.FIREBASE_PRIVATE_KEY),
  },
  transport_android: {
    google_services_json_present: existsSync(gsPath),
    google_services_project_id_set: gsProjectIdSet,
    package_com_lumenx_app_transport: gsPackageOk,
  },
  transport_vite: {
    VITE_FIREBASE_PROJECT_ID: viteFirebaseProjectSet ? "SET" : "EMPTY",
  },
  real_fcm_send_authorized: false,
  blocker:
    "Staging backend Firebase Admin credentials empty and FCM_WORKER_ENABLED=false; no adb device for controlled send.",
};

console.log(JSON.stringify(out, null, 2));
process.exit(out.backend.firebase_admin_credentials_complete ? 0 : 3);
