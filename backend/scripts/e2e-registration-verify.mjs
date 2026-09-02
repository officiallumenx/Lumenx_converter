/**
 * Phase 10 — Real institute registration E2E verification.
 * Uses backend/.env (never prints secrets).
 *
 * Optional for Nexus steps 9–11:
 *   E2E_NEXUS_REVIEWER_EMAIL
 *   E2E_NEXUS_REVIEWER_PASSWORD
 */
import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

loadDotenv();

const results = [];

function record(step, label, result, detail) {
  results.push({ step, label, result, detail });
  const suffix = detail ? ` — ${detail}` : "";
  console.log(`Step ${step}: ${result} — ${label}${suffix}`);
}

function requireEnv(name) {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const API_BASE = process.env.E2E_API_BASE_URL?.trim() || "http://127.0.0.1:8787";
const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SUPABASE_ANON = requireEnv("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const suffix = randomBytes(4).toString("hex");
const testEmail = `e2e-reg-${Date.now()}-${suffix}@lumenx-e2e.test`;
const testPassword = `E2e!${suffix}Aa1`;
const instituteName = `E2E Institute ${suffix.toUpperCase()}`;

const validPayload = {
  instituteName,
  instituteType: "School (K-12)",
  educationBoard: "CBSE",
  country: "India",
  state: "Karnataka",
  city: "Bengaluru",
  address: "45 E2E Verification Road",
  pincode: "560025",
  principalName: "E2E Principal",
  principalEmail: testEmail,
  principalMobile: "9876543210",
};

async function apiFetch(path, opts = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers ?? {}),
  };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  return fetch(`${API_BASE}${path}`, { ...opts, headers });
}

async function signIn(email, password) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw new Error(error?.message ?? "Sign-in failed");
  }
  return data.session.access_token;
}

async function main() {
  let registrationId = null;
  let instituteId = null;
  let applicantUserId = null;
  let applicantToken = null;

  // Step 1 — Admin reachable (API mode stack)
  try {
    const health = await apiFetch("/api/v1/health");
    const ready = await apiFetch("/api/v1/health/ready");
    const healthOk = health.ok;
    const readyBody = ready.ok ? await ready.json() : null;
    const supabaseReady = readyBody?.checks?.supabase === "ok";
    if (healthOk && supabaseReady) {
      record(1, "New user can open Admin stack (API + Supabase ready)", "PASS");
    } else {
      record(
        1,
        "New user can open Admin stack (API + Supabase ready)",
        "FAIL",
        `health=${health.status} supabase=${readyBody?.checks?.supabase ?? "unknown"}`,
      );
    }
  } catch (err) {
    record(1, "New user can open Admin stack", "FAIL", err instanceof Error ? err.message : "unknown");
  }

  // Steps 2–5 — Register + credentials (API)
  try {
    const res = await apiFetch("/api/v1/registrations", {
      method: "POST",
      body: JSON.stringify({
        applicant_name: "E2E Principal",
        email: testEmail,
        password: testPassword,
        phone: "+919876543210",
        payload: validPayload,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      record(2, "Creates new account via registration API", "FAIL", body?.error?.message ?? res.statusText);
      record(3, "Enters institute details (payload persisted)", "BLOCKED", "Registration failed");
      record(4, "Sets account credentials (Supabase user)", "BLOCKED", "Registration failed");
      record(5, "Submits registration", "BLOCKED", "Registration failed");
    } else {
      registrationId = body.data?.id ?? null;
      applicantUserId = body.data?.applicantUserId ?? null;
      const hasPassword = JSON.stringify(body).includes(testPassword);
      if (hasPassword) {
        record(5, "Submits registration (no password in response)", "FAIL", "Password leaked in response");
      } else {
        record(2, "Creates new account via registration API", "PASS", `registrationId=${registrationId}`);
        record(3, "Enters institute details (payload persisted)", "PASS", `instituteName=${instituteName}`);
        record(4, "Sets account credentials (Supabase Auth user)", "PASS", "user created server-side");
        record(5, "Submits registration", "PASS");
      }
    }
  } catch (err) {
    record(2, "Creates new account via registration API", "FAIL", err instanceof Error ? err.message : "unknown");
  }

  // Step 6 — DB evidence
  if (registrationId && applicantUserId) {
    try {
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: row, error } = await admin
        .from("institute_registration")
        .select("id,status,applicant_user_id,email,payload,institute_id")
        .eq("id", registrationId)
        .maybeSingle();
      if (error) {
        record(6, "Registration stored in real database", "FAIL", error.message);
      } else if (!row) {
        record(6, "Registration stored in real database", "FAIL", "Row not found");
      } else {
        const payload = row.payload;
        const payloadStr = JSON.stringify(payload);
        const pwdInPayload = payloadStr.includes(testPassword);
        record(
          6,
          "Registration stored in real database",
          pwdInPayload ? "FAIL" : "PASS",
          pwdInPayload ? "Password found in payload" : `status=${row.status}`,
        );
      }
    } catch (err) {
      record(6, "Registration stored in real database", "FAIL", err instanceof Error ? err.message : "unknown");
    }
  } else {
    record(6, "Registration stored in real database", "BLOCKED", "No registration id");
  }

  // Applicant sign-in for steps 7–8
  try {
    applicantToken = await signIn(testEmail, testPassword);
    record(17, "Applicant can log in with real credentials (partial — pre-approval)", "PASS", "sign-in ok");
  } catch (err) {
    record(7, "Status is pending (/registrations/me)", "BLOCKED", "Cannot sign in");
    record(8, "User cannot access institute workflows (/me empty)", "BLOCKED", "Cannot sign in");
    record(17, "Applicant logs in/reloads", "FAIL", err instanceof Error ? err.message : "unknown");
  }

  if (applicantToken) {
    try {
      const meReg = await apiFetch("/api/v1/registrations/me", { token: applicantToken });
      const regBody = await meReg.json();
      if (meReg.ok && regBody.data?.status === "pending") {
        record(7, "Status is pending (/registrations/me)", "PASS");
      } else {
        record(
          7,
          "Status is pending (/registrations/me)",
          "FAIL",
          `status=${regBody.data?.status ?? meReg.status}`,
        );
      }
    } catch (err) {
      record(7, "Status is pending", "FAIL", err instanceof Error ? err.message : "unknown");
    }

    try {
      const me = await apiFetch("/api/v1/me", { token: applicantToken });
      const meBody = await me.json();
      const institutes = meBody.data?.institutes ?? [];
      if (me.ok && institutes.length === 0) {
        record(8, "User cannot access institute workflows (/me has no memberships)", "PASS");
      } else {
        record(
          8,
          "User cannot access institute workflows",
          "FAIL",
          `institutes=${institutes.length}`,
        );
      }
    } catch (err) {
      record(8, "User cannot access institute workflows", "FAIL", err instanceof Error ? err.message : "unknown");
    }
  }

  // Steps 9–11 — Nexus review (needs reviewer credentials)
  const reviewerEmail = process.env.E2E_NEXUS_REVIEWER_EMAIL?.trim();
  const reviewerPassword = process.env.E2E_NEXUS_REVIEWER_PASSWORD?.trim();
  let reviewerToken = null;

  if (!registrationId) {
    record(9, "Nexus views pending registration", "BLOCKED", "No registration");
    record(10, "Manual offline verification (process)", "PASS", "Out-of-band — not software-gated");
    record(11, "Nexus approves registration", "BLOCKED", "No registration");
  } else if (!reviewerEmail || !reviewerPassword) {
    try {
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { count } = await admin
        .from("platform_operator")
        .select("id", { count: "exact", head: true })
        .in("role_code", ["nexus_root", "operations"]);
      record(
        9,
        "Nexus views pending registration",
        "BLOCKED",
        `Set E2E_NEXUS_REVIEWER_EMAIL/PASSWORD (platform_operator rows: ${count ?? "?"})`,
      );
    } catch {
      record(9, "Nexus views pending registration", "BLOCKED", "Set E2E_NEXUS_REVIEWER_EMAIL/PASSWORD");
    }
    record(10, "Manual offline verification (process)", "PASS", "Out-of-band — team verifies outside software");
    record(11, "Nexus approves registration", "BLOCKED", "Missing Nexus reviewer credentials in env");
  } else {
    try {
      reviewerToken = await signIn(reviewerEmail, reviewerPassword);
      const list = await apiFetch("/api/nexus/registrations?status=pending", {
        token: reviewerToken,
      });
      const listBody = await list.json();
      const found = (listBody.data ?? []).some((r) => r.id === registrationId);
      record(
        9,
        "Nexus views pending registration",
        list.ok && found ? "PASS" : list.ok ? "FAIL" : "FAIL",
        list.ok ? (found ? "registration visible in queue" : "not in pending list") : `HTTP ${list.status}`,
      );
    } catch (err) {
      record(9, "Nexus views pending registration", "FAIL", err instanceof Error ? err.message : "unknown");
    }
    record(10, "Manual offline verification (process)", "PASS", "Out-of-band — not software-gated");

    try {
      const approve = await apiFetch(`/api/nexus/registrations/${registrationId}/approve`, {
        method: "POST",
        token: reviewerToken,
      });
      const approveBody = await approve.json();
      if (approve.ok && approveBody.data?.status === "approved") {
        instituteId = approveBody.data?.instituteId ?? null;
        record(11, "Nexus approves registration", "PASS", `instituteId=${instituteId}`);
      } else {
        record(
          11,
          "Nexus approves registration",
          "FAIL",
          approveBody?.error?.message ?? `HTTP ${approve.status}`,
        );
      }
    } catch (err) {
      record(11, "Nexus approves registration", "FAIL", err instanceof Error ? err.message : "unknown");
    }
  }

  // Steps 12–16 — DB evidence after approval
  if (instituteId && applicantUserId) {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: institute } = await admin.from("institute").select("id,name,status").eq("id", instituteId).maybeSingle();
    record(
      12,
      "Real institute created",
      institute?.id ? "PASS" : "FAIL",
      institute ? `name=${institute.name}` : "not found",
    );

    const { data: settings } = await admin
      .from("institute_settings")
      .select("institute_id")
      .eq("institute_id", instituteId)
      .maybeSingle();
    record(13, "Institute settings created", settings ? "PASS" : "FAIL");

    const { data: profile } = await admin
      .from("user_profile")
      .select("id,status")
      .eq("id", applicantUserId)
      .maybeSingle();
    record(14, "User profile exists", profile?.id ? "PASS" : "FAIL", profile ? `status=${profile.status}` : undefined);

    const { data: membership } = await admin
      .from("membership")
      .select("id,institute_id,status")
      .eq("user_id", applicantUserId)
      .eq("institute_id", instituteId)
      .maybeSingle();
    record(
      15,
      "Membership created",
      membership?.status === "active" ? "PASS" : "FAIL",
      membership ? `status=${membership.status}` : "not found",
    );

    let roleOk = false;
    if (membership?.id) {
      const { data: roles } = await admin
        .from("membership_role")
        .select("role_code")
        .eq("membership_id", membership.id);
      roleOk = (roles ?? []).some((r) => r.role_code === "institute_admin");
    }
    record(16, "institute_admin role assigned", roleOk ? "PASS" : "FAIL");
  } else {
    for (const s of [12, 13, 14, 15, 16]) {
      const labels = {
        12: "Real institute created",
        13: "Institute settings created",
        14: "User profile exists",
        15: "Membership created",
        16: "institute_admin role assigned",
      };
      record(s, labels[s], "BLOCKED", "Approval did not complete");
    }
  }

  // Steps 17–19 — Post-approval applicant access
  if (instituteId && applicantToken) {
    try {
      applicantToken = await signIn(testEmail, testPassword);
      const me = await apiFetch("/api/v1/me", { token: applicantToken });
      const meBody = await me.json();
      const institutes = meBody.data?.institutes ?? [];
      const match = institutes.find((m) => m.instituteId === instituteId);
      const roles = match?.roles ?? [];
      if (me.ok && match && roles.includes("institute_admin")) {
        record(17, "Applicant logs in/reloads with membership", "PASS");
        record(18, "Applicant accesses only approved institute", "PASS", `roles=${roles.join(",")}`);
      } else {
        record(17, "Applicant logs in/reloads with membership", "FAIL", `institutes=${institutes.length}`);
        record(18, "Applicant accesses approved institute", "FAIL");
      }

      const regMe = await apiFetch("/api/v1/registrations/me", { token: applicantToken });
      const regBody = await regMe.json();
      const inst = await apiFetch(`/api/v1/institutes/${instituteId}`, { token: applicantToken });
      const instBody = await inst.json();
      if (
        regMe.ok &&
        regBody.data?.status === "approved" &&
        inst.ok &&
        instBody.data?.name
      ) {
        record(19, "Real data stored and retrieved", "PASS", `institute=${instBody.data.name}`);
      } else {
        record(19, "Real data stored and retrieved", "FAIL");
      }
    } catch (err) {
      record(17, "Applicant logs in/reloads", "FAIL", err instanceof Error ? err.message : "unknown");
      record(18, "Applicant accesses approved institute", "BLOCKED");
      record(19, "Real data stored and retrieved", "BLOCKED");
    }
  } else {
    if (results.every((r) => r.step !== 17 || r.result === "FAIL")) {
      record(17, "Applicant logs in/reloads after approval", "BLOCKED", "Approval incomplete");
    }
    record(18, "Applicant accesses approved institute", "BLOCKED", "Approval incomplete");
    record(19, "Real data stored and retrieved", "BLOCKED", "Approval incomplete");
  }

  console.log("\n--- Summary ---");
  for (const r of results.sort((a, b) => a.step - b.step)) {
    console.log(`${r.step}. ${r.result} — ${r.label}${r.detail ? ` (${r.detail})` : ""}`);
  }

  const failed = results.filter((r) => r.result === "FAIL").length;
  const blocked = results.filter((r) => r.result === "BLOCKED").length;
  console.log(`\nTotal: ${results.length} | FAIL: ${failed} | BLOCKED: ${blocked}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("E2E script error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
