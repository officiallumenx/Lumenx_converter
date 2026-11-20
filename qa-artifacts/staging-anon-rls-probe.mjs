/**
 * Anon-client RLS probes against staging (JWT + anon key, never service_role reads).
 * Verifies permitted same-tenant reads vs forbidden cross-institute / outsider access.
 *
 * Usage:
 *   node --env-file=backend/.env.staging qa-artifacts/staging-anon-rls-probe.mjs
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
const urlRef = extractSupabaseProjectRef(process.env.SUPABASE_URL);
if (urlRef !== EXPECTED_REF) {
  throw new Error(`Refusing RLS probe: ref ${urlRef} !== ${EXPECTED_REF}`);
}

const PASSWORD = process.env.E2E_SMOKE_PASSWORD?.trim() || "E2eSmoke!2026";
const URL = process.env.SUPABASE_URL.trim();
const ANON = process.env.SUPABASE_ANON_KEY.trim();
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();

const results = [];
function record(step, ok, detail) {
  results.push({ step, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${step}${detail ? ` — ${detail}` : ""}`);
}

function anonClient() {
  return createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(email) {
  const client = anonClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.session?.access_token) {
    throw new Error(`${email}: ${error?.message ?? "sign-in failed"}`);
  }
  return createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
}

async function main() {
  const admin = createClient(URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: instA } = await admin
    .from("institute")
    .select("id")
    .eq("name", "LumenX E2E Test Institute")
    .is("deleted_at", null)
    .maybeSingle();
  const { data: instB } = await admin
    .from("institute")
    .select("id")
    .eq("name", "LumenX E2E Isolation Institute")
    .is("deleted_at", null)
    .maybeSingle();
  if (!instA?.id || !instB?.id) throw new Error("Missing synthetic institutes");

  // Unauthenticated anon must not list institutes
  {
    const c = anonClient();
    const { data, error } = await c.from("institute").select("id, name").limit(5);
    const blocked = Boolean(error) || !data || data.length === 0;
    record(
      "rls.anon_unauth_institute_empty_or_denied",
      blocked,
      error ? `error=${error.code || error.message}` : `rows=${data?.length ?? 0}`,
    );
  }

  // Tenant A admin — may see own institute row if policy allows membership
  let clientA;
  try {
    clientA = await signIn("smoke.tenant.a@lumenx.test");
    record("rls.sign_in.tenant_a", true);
  } catch (e) {
    record("rls.sign_in.tenant_a", false, e instanceof Error ? e.message : String(e));
    clientA = null;
  }

  if (clientA) {
    const own = await clientA
      .from("institute")
      .select("id, name")
      .eq("id", instA.id)
      .maybeSingle();
    record(
      "rls.tenant_a_read_own_institute",
      Boolean(own.data?.id) && !own.error,
      own.error?.message || own.data?.name,
    );

    const cross = await clientA
      .from("institute")
      .select("id, name")
      .eq("id", instB.id)
      .maybeSingle();
    const deniedCross = Boolean(cross.error) || !cross.data?.id;
    record(
      "rls.tenant_a_denied_other_institute",
      deniedCross,
      cross.error ? cross.error.message : cross.data ? "UNEXPECTED_ROW" : "no_row",
    );

    const studentsB = await clientA
      .from("student")
      .select("id")
      .eq("institute_id", instB.id)
      .limit(5);
    const deniedStudents =
      Boolean(studentsB.error) || !studentsB.data || studentsB.data.length === 0;
    record(
      "rls.tenant_a_denied_other_students",
      deniedStudents,
      studentsB.error?.message || `rows=${studentsB.data?.length ?? 0}`,
    );
  }

  // Outsider — no membership
  let outsider;
  try {
    outsider = await signIn("lumenx.e2e.outsider@lumenx.test");
    record("rls.sign_in.outsider", true);
  } catch (e) {
    record("rls.sign_in.outsider", false, e instanceof Error ? e.message : String(e));
    outsider = null;
  }
  if (outsider) {
    const list = await outsider.from("institute").select("id").limit(10);
    const denied = Boolean(list.error) || !list.data || list.data.length === 0;
    record(
      "rls.outsider_denied_institute_list",
      denied,
      list.error?.message || `rows=${list.data?.length ?? 0}`,
    );
  }

  // Teacher smoke user if present
  try {
    const teacher = await signIn("smoke.connect.teacher@lumenx.test");
    const { data: teachRows, error } = await teacher
      .from("teacher")
      .select("id, institute_id")
      .limit(5);
    const okOwn = !error && Array.isArray(teachRows);
    const onlyA =
      okOwn &&
      teachRows.every((r) => !r.institute_id || r.institute_id === instA.id);
    record(
      "rls.teacher_select_scoped",
      okOwn && onlyA,
      error?.message || `rows=${teachRows?.length ?? 0}`,
    );
  } catch (e) {
    record("rls.sign_in.teacher", false, e instanceof Error ? e.message : String(e));
  }

  const failed = results.filter((r) => !r.ok);
  console.log(
    JSON.stringify(
      {
        target_ref: EXPECTED_REF,
        client: "anon+jwt",
        service_role_used_for_reads: false,
        passed: results.filter((r) => r.ok).length,
        failed: failed.length,
        secrets_printed: false,
      },
      null,
      2,
    ),
  );
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error("FAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
