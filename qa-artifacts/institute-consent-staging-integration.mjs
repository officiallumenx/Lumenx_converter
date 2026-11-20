/**
 * Staging-only synthetic fixture for institute registration legal-consent RPCs.
 * Creates ephemeral @lumenx.test Auth users + profiles, exercises RPCs, cleans up.
 * Never prints secrets or real PII beyond fixture emails.
 *
 * Usage:
 *   node --env-file=backend/.env.staging qa-artifacts/institute-consent-staging-integration.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import {
  assertStagingEnv,
  extractSupabaseProjectRef,
} from "../backend/scripts/assert-staging-env.mjs";

const EXPECTED = "yveadybpntziyryxsrsu";
const DENIED = "kmpzflsurepjwqnfqyld";
const DOC_VERSION = "2026-09-04";
const FIXTURE_TAG = "lx-consent-probe";

assertStagingEnv(process.env);
const ref = extractSupabaseProjectRef(process.env.SUPABASE_URL);
if (ref !== EXPECTED) {
  console.error(`BLOCKED: SUPABASE_URL ref ${ref} !== ${EXPECTED}`);
  process.exit(2);
}
if (ref === DENIED) {
  console.error("BLOCKED: production denylist");
  process.exit(2);
}

const suffix = randomBytes(4).toString("hex");
const password = `LxConsent!${suffix}Aa1`;
const emailA = `${FIXTURE_TAG}.a.${suffix}@lumenx.test`;
const emailB = `${FIXTURE_TAG}.b.${suffix}@lumenx.test`;

const admin = createClient(
  process.env.SUPABASE_URL.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const anon = createClient(
  process.env.SUPABASE_URL.trim(),
  process.env.SUPABASE_ANON_KEY.trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const results = [];
const cleanupIds = { users: [], registrations: [] };

function pass(id, detail = "") {
  results.push({ id, status: "PASS", detail });
  console.log(`PASS ${id}${detail ? ` — ${detail}` : ""}`);
}
function fail(id, detail = "") {
  results.push({ id, status: "FAIL", detail });
  console.error(`FAIL ${id}${detail ? ` — ${detail}` : ""}`);
}

const requiredDocs = [
  { id: "admin_terms", version: DOC_VERSION },
  { id: "admin_privacy", version: DOC_VERSION },
];

const basePayload = {
  instituteName: `Consent Probe ${suffix}`,
  instituteCode: `LX-CP-${suffix.toUpperCase()}`,
  instituteType: "school",
  educationBoard: "cbse",
  username: `lxcp${suffix}`,
  adminDesignation: "principal",
  country: "IN",
  state: "TG",
  district: "HYD",
  city: "Hyderabad",
  area: "Probe",
  street: "1 Test St",
  landmark: null,
  pincode: "500001",
  website: null,
  schoolEmail: null,
  schoolPhone: null,
};

function rpcCreateArgs(userId, email, docs, action = "registration_accept", overrides = {}) {
  const code = overrides.instituteCode ?? basePayload.instituteCode;
  const username = overrides.username ?? basePayload.username;
  const payload = {
    ...basePayload,
    instituteCode: code,
    username,
    ...(overrides.payload ?? {}),
  };
  return {
    p_applicant_user_id: userId,
    p_applicant_name: "Consent Probe Applicant",
    p_email: email,
    p_phone: null,
    p_payload: payload,
    p_institute_code: code,
    p_institute_type: payload.instituteType,
    p_education_board: payload.educationBoard,
    p_school_email: null,
    p_school_phone: null,
    p_applicant_username: username,
    p_admin_designation: payload.adminDesignation,
    p_country: payload.country,
    p_state: payload.state,
    p_district: payload.district,
    p_city: payload.city,
    p_area: payload.area,
    p_street: payload.street,
    p_landmark: null,
    p_pincode: payload.pincode,
    p_website: null,
    p_consent_documents: docs,
    p_consent_action: action,
    p_accepted_at: new Date().toISOString(),
  };
}

async function ensureProfile(userId, email, displayName) {
  const { error } = await admin.from("user_profile").upsert(
    {
      id: userId,
      display_name: displayName,
      email,
      status: "active",
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(`profile upsert: ${error.message}`);
}

async function createFixtureUser(email, displayName) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, fixture: FIXTURE_TAG },
  });
  if (error || !data.user?.id) {
    throw new Error(`createUser: ${error?.message ?? "no user"}`);
  }
  cleanupIds.users.push(data.user.id);
  await ensureProfile(data.user.id, email, displayName);
  return data.user.id;
}

async function countRegsForUser(userId) {
  const { count, error } = await admin
    .from("institute_registration")
    .select("id", { count: "exact", head: true })
    .eq("applicant_user_id", userId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function listConsent(registrationId) {
  const { data, error } = await admin
    .from("institute_registration_legal_consent")
    .select("document_id, document_version, action")
    .eq("registration_id", registrationId)
    .order("document_id");
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function cleanup() {
  for (const regId of cleanupIds.registrations) {
    await admin.from("institute_registration").delete().eq("id", regId);
  }
  // Cascade deletes consent; also sweep by fixture emails.
  await admin
    .from("institute_registration")
    .delete()
    .like("email", `${FIXTURE_TAG}.%`);
  for (const userId of cleanupIds.users) {
    await admin.from("user_profile").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
}

async function main() {
  console.log(`staging_ref=${ref}`);
  console.log(`fixture_tag=${FIXTURE_TAG} suffix=${suffix}`);

  let userA;
  let userB;
  try {
    userA = await createFixtureUser(emailA, "Consent Probe A");
    userB = await createFixtureUser(emailB, "Consent Probe B");

    // 1) Missing required consent rejected
    {
      const before = await countRegsForUser(userA);
      const { error } = await admin.rpc(
        "create_institute_registration_with_legal_consent",
        rpcCreateArgs(userA, emailA, [{ id: "admin_terms", version: DOC_VERSION }]),
      );
      const after = await countRegsForUser(userA);
      if (error && after === before) {
        pass("missing_consent_rejected", error.message.slice(0, 80));
      } else {
        fail(
          "missing_consent_rejected",
          `error=${Boolean(error)} delta=${after - before}`,
        );
      }
    }

    // 2+3) Valid consent + atomic commit
    let regId;
    {
      const { data, error } = await admin.rpc(
        "create_institute_registration_with_legal_consent",
        rpcCreateArgs(userA, emailA, requiredDocs),
      );
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row?.id) {
        fail("valid_consent_persist", error?.message ?? "no row");
      } else {
        regId = row.id;
        cleanupIds.registrations.push(regId);
        const consent = await listConsent(regId);
        const ids = consent.map((c) => c.document_id).sort().join(",");
        if (ids === "admin_privacy,admin_terms") {
          pass("valid_consent_persist", `docs=${consent.length}`);
          pass("registration_consent_atomic_commit", "both present");
        } else {
          fail("valid_consent_persist", `docs=${ids}`);
          fail("registration_consent_atomic_commit", `docs=${ids}`);
        }
      }
    }

    // 4) Induced consent-write failure rolls back registration
    {
      const before = await countRegsForUser(userB);
      const badDocs = [
        { id: "admin_terms", version: DOC_VERSION },
        { id: "cookie_policy", version: DOC_VERSION },
        // missing admin_privacy → helper raises after registration INSERT
      ];
      const { error } = await admin.rpc(
        "create_institute_registration_with_legal_consent",
        rpcCreateArgs(userB, emailB, badDocs, "registration_accept", {
          instituteCode: `LX-CPB-${suffix.toUpperCase()}`,
          username: `lxcpb${suffix}`,
        }),
      );
      const after = await countRegsForUser(userB);
      const msg = error?.message ?? "";
      const isConsentErr =
        /required legal consent|admin_privacy|admin_terms/i.test(msg);
      if (error && after === before && isConsentErr) {
        pass("consent_failure_rolls_back_registration", msg.slice(0, 80));
      } else {
        fail(
          "consent_failure_rolls_back_registration",
          `error=${msg.slice(0, 120)} delta=${after - before}`,
        );
      }
    }

    // 5) Resubmit uses correct RPC; no duplicate consent rows
    if (regId) {
      await admin
        .from("institute_registration")
        .update({
          status: "rejected",
          rejection_reason: "consent probe reject",
        })
        .eq("id", regId);

      const { data, error } = await admin.rpc(
        "resubmit_institute_registration_with_legal_consent",
        {
          p_registration_id: regId,
          p_applicant_user_id: userA,
          p_applicant_name: "Consent Probe Applicant Resubmit",
          p_phone: null,
          p_payload: { ...basePayload, instituteName: `Consent Probe Resubmit ${suffix}` },
          p_institute_code: basePayload.instituteCode,
          p_institute_type: basePayload.instituteType,
          p_education_board: basePayload.educationBoard,
          p_school_email: null,
          p_school_phone: null,
          p_applicant_username: basePayload.username,
          p_admin_designation: basePayload.adminDesignation,
          p_country: basePayload.country,
          p_state: basePayload.state,
          p_district: basePayload.district,
          p_city: basePayload.city,
          p_area: basePayload.area,
          p_street: basePayload.street,
          p_landmark: null,
          p_pincode: basePayload.pincode,
          p_website: null,
          p_consent_documents: [
            ...requiredDocs,
            { id: "cookie_policy", version: DOC_VERSION },
          ],
          p_accepted_at: new Date().toISOString(),
        },
      );
      const row = Array.isArray(data) ? data[0] : data;
      const consent = regId ? await listConsent(regId) : [];
      const byDoc = new Map(consent.map((c) => [c.document_id, c]));
      if (
        !error &&
        row?.status === "pending" &&
        consent.length === 3 &&
        byDoc.size === 3 &&
        byDoc.get("admin_terms")?.action === "registration_resubmit"
      ) {
        pass("resubmit_no_duplicate_consent", `rows=${consent.length}`);
      } else {
        fail(
          "resubmit_no_duplicate_consent",
          `err=${error?.message ?? "none"} status=${row?.status} rows=${consent.length}`,
        );
      }
    } else {
      fail("resubmit_no_duplicate_consent", "skipped — no registration");
    }

    // 6) Unauthorized (anon) cannot invoke create RPC
    {
      const { error } = await anon.rpc(
        "create_institute_registration_with_legal_consent",
        rpcCreateArgs(userB, emailB, requiredDocs, "registration_accept", {
          instituteCode: `LX-CPA-${suffix.toUpperCase()}`,
          username: `lxcpa${suffix}`,
        }),
      );
      const msg = (error?.message ?? "").toLowerCase();
      if (
        error &&
        (msg.includes("permission") ||
          msg.includes("denied") ||
          msg.includes("not found") ||
          msg.includes("schema cache") ||
          error.code === "42501" ||
          error.code === "PGRST202")
      ) {
        pass("unauthorized_rpc_denied", error.code || "denied");
      } else {
        fail("unauthorized_rpc_denied", error?.message ?? "no error — unexpected");
      }
    }

    // 7) Cross-applicant access denied (RLS on consent table)
    if (regId) {
      const { data: session, error: loginErr } = await anon.auth.signInWithPassword({
        email: emailB,
        password,
      });
      if (loginErr || !session.session) {
        fail("cross_institution_access_denied", `login B: ${loginErr?.message}`);
      } else {
        const userClient = createClient(
          process.env.SUPABASE_URL.trim(),
          process.env.SUPABASE_ANON_KEY.trim(),
          {
            auth: { persistSession: false, autoRefreshToken: false },
            global: {
              headers: { Authorization: `Bearer ${session.session.access_token}` },
            },
          },
        );
        const { data, error } = await userClient
          .from("institute_registration_legal_consent")
          .select("id, registration_id, document_id")
          .eq("registration_id", regId);
        if (error) {
          fail("cross_institution_access_denied", error.message);
        } else if (!data || data.length === 0) {
          pass("cross_institution_access_denied", "empty under RLS");
        } else {
          fail("cross_institution_access_denied", `leaked ${data.length} rows`);
        }
        await anon.auth.signOut();
      }
    } else {
      fail("cross_institution_access_denied", "skipped — no registration");
    }

    // 8) Auth-before-RPC recovery: existing email + correct password resumes
    {
      const { data: again, error: createErr } = await admin.auth.admin.createUser({
        email: emailA,
        password,
        email_confirm: true,
      });
      const msg = (createErr?.message ?? "").toLowerCase();
      const already =
        Boolean(createErr) &&
        (msg.includes("already") || msg.includes("registered") || msg.includes("exists"));
      if (again?.user?.id && !createErr) {
        // Unexpected duplicate create — clean extra
        cleanupIds.users.push(again.user.id);
        fail("auth_retry_identity_exists", "createUser unexpectedly succeeded");
      } else if (already) {
        const { data: signIn, error: signErr } = await anon.auth.signInWithPassword({
          email: emailA,
          password,
        });
        if (!signErr && signIn.user?.id === userA) {
          pass(
            "auth_retry_identity_exists",
            "createUser blocked; password sign-in recovers same user",
          );
        } else {
          fail("auth_retry_identity_exists", signErr?.message ?? "sign-in mismatch");
        }
        await anon.auth.signOut();
      } else {
        fail("auth_retry_identity_exists", createErr?.message ?? "unexpected");
      }
    }
  } catch (err) {
    fail("harness_exception", err instanceof Error ? err.message : String(err));
  } finally {
    try {
      await cleanup();
      pass("fixture_cleanup", `users=${cleanupIds.users.length}`);
    } catch (err) {
      fail(
        "fixture_cleanup",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  const failed = results.filter((r) => r.status === "FAIL");
  const passed = results.filter((r) => r.status === "PASS");
  console.log(
    JSON.stringify({
      staging_ref: ref,
      passed: passed.length,
      failed: failed.length,
      results,
    }),
  );
  process.exit(failed.length ? 1 : 0);
}

main();
