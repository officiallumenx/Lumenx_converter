/**
 * Idempotent synthetic fixtures for lumenx-staging only.
 * Creates two named institutes + operator membership + outsider auth user.
 * Connect teacher/parent/student rows are left to smoke:login:staging.
 *
 * Usage:
 *   node --env-file=backend/.env.staging qa-artifacts/provision-staging-fixtures.mjs
 * Never prints secrets.
 */
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const backendScripts = resolve(dirname(fileURLToPath(import.meta.url)), "../backend/scripts");
const { assertStagingEnv, extractSupabaseProjectRef } = require(
  resolve(backendScripts, "assert-staging-env.mjs"),
);

assertStagingEnv(process.env);

const EXPECTED_REF = "yveadybpntziyryxsrsu";
const DENIED_REF = "kmpzflsurepjwqnfqyld";
const urlRef = extractSupabaseProjectRef(process.env.SUPABASE_URL);
if (urlRef !== EXPECTED_REF) {
  throw new Error(`Refusing fixtures: SUPABASE_URL ref ${urlRef} !== ${EXPECTED_REF}`);
}
if (urlRef === DENIED_REF) {
  throw new Error("Refusing fixtures against denylisted shared/default project");
}

const PASSWORD =
  process.env.E2E_SMOKE_PASSWORD?.trim() ||
  process.env.NEXUS_BOOTSTRAP_PASSWORD?.trim();
if (!PASSWORD || PASSWORD.length < 8) {
  throw new Error("Set E2E_SMOKE_PASSWORD or NEXUS_BOOTSTRAP_PASSWORD in .env.staging");
}

const OPERATOR_EMAIL = (
  process.env.NEXUS_BOOTSTRAP_EMAIL?.trim() || "lumenx.e2e.operator@lumenx.test"
).toLowerCase();
const OUTSIDER_EMAIL = "lumenx.e2e.outsider@lumenx.test";

const INSTITUTES = [
  { name: "LumenX E2E Test Institute", code: "LX-E2E-TEST" },
  { name: "LumenX E2E Isolation Institute", code: "LX-E2E-ISOL" },
];

const admin = createClient(
  process.env.SUPABASE_URL.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function ensureAuthUser(email, displayName) {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listed.error) throw new Error(listed.error.message);
  const existing = listed.data?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (error) throw new Error(error.message);
    return { id: existing.id, created: false };
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error || !data.user) throw new Error(error?.message ?? `createUser ${email}`);
  return { id: data.user.id, created: true };
}

async function ensureProfile(userId, email, displayName) {
  const { data: existing } = await admin
    .from("user_profile")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (existing?.id) {
    const { error } = await admin
      .from("user_profile")
      .update({
        email,
        display_name: displayName,
        status: "active",
        deleted_at: null,
      })
      .eq("id", userId);
    if (error) throw new Error(`user_profile update: ${error.message}`);
    return;
  }
  const { error } = await admin.from("user_profile").insert({
    id: userId,
    email,
    display_name: displayName,
    status: "active",
  });
  if (error) throw new Error(`user_profile insert: ${error.message}`);
}

async function ensureInstitute({ name, code }) {
  const { data: byName } = await admin
    .from("institute")
    .select("id, name, code")
    .eq("name", name)
    .is("deleted_at", null)
    .maybeSingle();
  if (byName?.id) {
    await admin.from("institute_settings").upsert({
      institute_id: byName.id,
      timezone: "Asia/Kolkata",
      locale: "en-IN",
      settings: {},
    });
    return { id: byName.id, created: false, name, code: byName.code };
  }

  const { data, error } = await admin
    .from("institute")
    .insert({
      code,
      name,
      kind: "school",
      status: "active",
    })
    .select("id, name, code")
    .single();
  if (error || !data?.id) throw new Error(`institute ${name}: ${error?.message}`);
  const settings = await admin.from("institute_settings").upsert({
    institute_id: data.id,
    timezone: "Asia/Kolkata",
    locale: "en-IN",
    settings: {},
  });
  if (settings.error) throw new Error(`institute_settings: ${settings.error.message}`);
  return { id: data.id, created: true, name, code: data.code };
}

async function ensureWritableSubscription(instituteId) {
  const now = Date.now();
  const trialStart = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const trialEnd = new Date(now + 60 * 24 * 60 * 60 * 1000).toISOString();

  const { data: existing } = await admin
    .from("subscription")
    .select("id, lifecycle_status, trial_start_at, trial_end_at")
    .eq("institute_id", instituteId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await admin
      .from("subscription")
      .update({
        lifecycle_status: "trial_active",
        trial_start_at: trialStart,
        trial_end_at: trialEnd,
        grace_ends_at: null,
        assigned_rate_inr: 0,
        deleted_at: null,
      })
      .eq("id", existing.id);
    if (error) throw new Error(`subscription update: ${error.message}`);
    return { id: existing.id, created: false };
  }

  const { data, error } = await admin
    .from("subscription")
    .insert({
      institute_id: instituteId,
      lifecycle_status: "trial_active",
      assigned_rate_inr: 0,
      active_student_count: 0,
      trial_start_at: trialStart,
      trial_end_at: trialEnd,
    })
    .select("id")
    .single();
  if (error || !data?.id) throw new Error(`subscription insert: ${error?.message}`);
  return { id: data.id, created: true };
}

async function ensureMembership(userId, instituteId, roleCode) {
  let { data: mem } = await admin
    .from("membership")
    .select("id, status, deleted_at")
    .eq("user_id", userId)
    .eq("institute_id", instituteId)
    .maybeSingle();

  if (!mem) {
    const ins = await admin
      .from("membership")
      .insert({ user_id: userId, institute_id: instituteId, status: "active" })
      .select("id")
      .single();
    if (ins.error) throw new Error(`membership: ${ins.error.message}`);
    mem = ins.data;
  } else if (mem.status !== "active" || mem.deleted_at) {
    await admin
      .from("membership")
      .update({ status: "active", deleted_at: null })
      .eq("id", mem.id);
  }

  const { data: role } = await admin
    .from("membership_role")
    .select("membership_id")
    .eq("membership_id", mem.id)
    .eq("role_code", roleCode)
    .maybeSingle();
  if (!role) {
    const { error } = await admin
      .from("membership_role")
      .insert({ membership_id: mem.id, role_code: roleCode });
    if (error) throw new Error(`membership_role: ${error.message}`);
  }
}

async function main() {
  // Schema sanity (service_role; no secrets logged)
  const tables = ["institute", "membership", "role", "student", "teacher", "parent"];
  for (const t of tables) {
    const { error } = await admin.from(t).select("id", { head: true, count: "exact" }).limit(1);
    // role uses code PK — tolerate either shape
    if (error && t === "role") {
      const r2 = await admin.from("role").select("code", { head: true, count: "exact" }).limit(1);
      if (r2.error) throw new Error(`schema missing ${t}: ${r2.error.message}`);
    } else if (error) {
      throw new Error(`schema missing ${t}: ${error.message}`);
    }
  }

  const { count: roleCount, error: roleErr } = await admin
    .from("role")
    .select("code", { count: "exact", head: true });
  if (roleErr) throw new Error(roleErr.message);
  if (!roleCount || roleCount < 5) {
    throw new Error(`Unexpected role catalog count: ${roleCount}`);
  }

  const institutes = [];
  for (const spec of INSTITUTES) {
    const inst = await ensureInstitute(spec);
    const sub = await ensureWritableSubscription(inst.id);
    institutes.push({ ...inst, subscriptionCreated: sub.created });
  }

  const op = await ensureAuthUser(OPERATOR_EMAIL, "Staging E2E Operator");
  await ensureProfile(op.id, OPERATOR_EMAIL, "Staging E2E Operator");

  // Operator must already exist as platform_operator (bootstrap-nexus-operator).
  const { data: po } = await admin
    .from("platform_operator")
    .select("id, user_id")
    .eq("user_id", op.id)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  if (!po?.id) {
    throw new Error(
      "platform_operator missing — run: cd backend && node --env-file=.env.staging scripts/bootstrap-nexus-operator.mjs --staging",
    );
  }

  // Membership on Test Institute so smoke:login can attach Connect users.
  await ensureMembership(op.id, institutes[0].id, "institute_admin");

  const outsider = await ensureAuthUser(OUTSIDER_EMAIL, "Staging E2E Outsider");
  await ensureProfile(outsider.id, OUTSIDER_EMAIL, "Staging E2E Outsider");
  await admin
    .from("membership")
    .update({ status: "ended", deleted_at: new Date().toISOString() })
    .eq("user_id", outsider.id)
    .is("deleted_at", null);

  console.log(
    JSON.stringify(
      {
        target_ref: EXPECTED_REF,
        institutes: institutes.map((i) => ({
          name: i.name,
          code: i.code,
          id_prefix: i.id.slice(0, 8),
          created: i.created,
          subscription_created: i.subscriptionCreated,
        })),
        operator_email: OPERATOR_EMAIL,
        operator_created: op.created,
        outsider_email: OUTSIDER_EMAIL,
        outsider_created: outsider.created,
        role_catalog_count: roleCount,
        secrets_printed: false,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("FAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
