/**
 * Bootstrap a real Nexus platform operator (cold-start unblocker).
 *
 * Creates / updates:
 *   auth.users → user_profile → platform_operator (nexus_root)
 *
 * Does NOT create institutes, students, or demo business data.
 *
 * Usage (from backend/):
 *   node scripts/bootstrap-nexus-operator.mjs
 *
 * Env (backend/.env):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXUS_BOOTSTRAP_EMAIL     (default: nexus.root@lumenx.local)
 *   NEXUS_BOOTSTRAP_PASSWORD  (required — min 8 chars)
 *   NEXUS_BOOTSTRAP_HANDLE    (default: nexus-root)
 *   NEXUS_BOOTSTRAP_NAME      (default: Nexus Root)
 *
 * Never prints secrets.
 */
import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { randomBytes, scryptSync } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

loadDotenv({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env") });

function requireEnv(name) {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SUPABASE_SERVICE = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const EMAIL = (
  process.env.NEXUS_BOOTSTRAP_EMAIL?.trim() || "nexus.root@lumenx.local"
).toLowerCase();
const PASSWORD = process.env.NEXUS_BOOTSTRAP_PASSWORD?.trim();
const HANDLE = process.env.NEXUS_BOOTSTRAP_HANDLE?.trim() || "nexus-root";
const DISPLAY_NAME = process.env.NEXUS_BOOTSTRAP_NAME?.trim() || "Nexus Root";
const MOBILE = process.env.NEXUS_BOOTSTRAP_MOBILE?.replace(/\D/g, "").slice(-10) || null;
const USERNAME = process.env.NEXUS_BOOTSTRAP_USERNAME?.trim().toLowerCase() || null;
const PIN = process.env.NEXUS_BOOTSTRAP_PIN?.trim() || null;
const ROLE_CODE = "nexus_root";

if (!PASSWORD || PASSWORD.length < 8) {
  console.error(
    "Set NEXUS_BOOTSTRAP_PASSWORD (min 8 characters) in backend/.env before running.",
  );
  process.exit(1);
}
if (MOBILE && !/^\d{10}$/.test(MOBILE)) {
  console.error("NEXUS_BOOTSTRAP_MOBILE must contain a valid 10-digit mobile number.");
  process.exit(1);
}
if ((USERNAME && !PIN) || (!USERNAME && PIN)) {
  console.error("Set both NEXUS_BOOTSTRAP_USERNAME and NEXUS_BOOTSTRAP_PIN, or neither.");
  process.exit(1);
}
if (USERNAME && !/^[a-z0-9._-]{3,64}$/.test(USERNAME)) {
  console.error(
    "NEXUS_BOOTSTRAP_USERNAME must be 3–64 characters using letters, numbers, ., _, or -.",
  );
  process.exit(1);
}
if (PIN && !/^\d{4,8}$/.test(PIN)) {
  console.error("NEXUS_BOOTSTRAP_PIN must contain 4–8 digits.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureAuthUser() {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listed.error) throw new Error(listed.error.message);
  const existing = listed.data?.users?.find(
    (u) => u.email?.toLowerCase() === EMAIL,
  );
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: DISPLAY_NAME },
    });
    if (error) throw new Error(error.message);
    return { userId: existing.id, created: false };
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: DISPLAY_NAME },
  });
  if (error || !data.user) throw new Error(error?.message ?? "createUser failed");
  return { userId: data.user.id, created: true };
}

async function ensureProfile(userId) {
  const { data: existing } = await admin
    .from("user_profile")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (existing?.id) {
    const { error } = await admin
      .from("user_profile")
      .update({
        email: EMAIL,
        phone: MOBILE,
        display_name: DISPLAY_NAME,
        status: "active",
        deleted_at: null,
      })
      .eq("id", userId);
    if (error) throw new Error(`user_profile update: ${error.message}`);
    return;
  }
  const { error } = await admin.from("user_profile").insert({
    id: userId,
    email: EMAIL,
    phone: MOBILE,
    display_name: DISPLAY_NAME,
    status: "active",
  });
  if (error) throw new Error(`user_profile insert: ${error.message}`);
}

async function ensureOperator(userId) {
  const { data: byUser } = await admin
    .from("platform_operator")
    .select("id, role_code, handle, status, deleted_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (byUser?.id) {
    const { error } = await admin
      .from("platform_operator")
      .update({
        role_code: ROLE_CODE,
        handle: HANDLE,
        display_name: DISPLAY_NAME,
        status: "active",
        deleted_at: null,
      })
      .eq("id", byUser.id);
    if (error) throw new Error(`platform_operator update: ${error.message}`);
    return { operatorId: byUser.id, created: false };
  }

  const { data: byHandle } = await admin
    .from("platform_operator")
    .select("id, user_id")
    .eq("handle", HANDLE)
    .maybeSingle();
  if (byHandle?.id && byHandle.user_id !== userId) {
    throw new Error(
      `Handle "${HANDLE}" is already used by another operator. Set NEXUS_BOOTSTRAP_HANDLE.`,
    );
  }

  const { data, error } = await admin
    .from("platform_operator")
    .insert({
      user_id: userId,
      role_code: ROLE_CODE,
      handle: HANDLE,
      display_name: DISPLAY_NAME,
      status: "active",
    })
    .select("id")
    .single();
  if (error) throw new Error(`platform_operator insert: ${error.message}`);
  return { operatorId: data.id, created: true };
}

async function ensureCredentials(userId) {
  if (!USERNAME || !PIN) return;
  const { data: taken, error: takenError } = await admin
    .from("user_profile")
    .select("id")
    .ilike("username", USERNAME)
    .neq("id", userId)
    .maybeSingle();
  if (takenError) throw new Error(`username lookup: ${takenError.message}`);
  if (taken?.id) throw new Error(`Username "${USERNAME}" is already in use.`);

  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(PIN, salt, 64).toString("hex");
  const now = new Date().toISOString();
  const { error } = await admin
    .from("user_profile")
    .update({
      username: USERNAME,
      pin_hash: hash,
      pin_salt: salt,
      pin_set_at: now,
      first_login_completed_at: now,
    })
    .eq("id", userId);
  if (error) throw new Error(`Nexus credentials update: ${error.message}`);
}

async function main() {
  console.log("Bootstrapping Nexus platform operator…");
  console.log(`  email:  ${EMAIL}`);
  console.log(`  handle: ${HANDLE}`);
  console.log(`  role:   ${ROLE_CODE}`);

  const { userId, created: userCreated } = await ensureAuthUser();
  await ensureProfile(userId);
  const { operatorId, created: opCreated } = await ensureOperator(userId);
  await ensureCredentials(userId);

  console.log("OK");
  console.log(`  user_id:     ${userId} (${userCreated ? "created" : "updated"})`);
  console.log(`  operator_id: ${operatorId} (${opCreated ? "created" : "updated"})`);
  console.log(
    USERNAME
      ? "Sign in to Nexus with NEXUS_BOOTSTRAP_USERNAME + PIN + password."
      : "Sign in to Nexus with this email + NEXUS_BOOTSTRAP_PASSWORD.",
  );
}

main().catch((err) => {
  console.error("FAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
