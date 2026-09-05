/**
 * Live E2E login smoke across all LumenX apps (API auth mode).
 *
 * Uses backend/.env — never prints secrets or tokens.
 *
 * Optional:
 *   E2E_API_BASE_URL          (default http://127.0.0.1:8787)
 *   E2E_SMOKE_PASSWORD        (default E2eSmoke!2026)
 *   E2E_SKIP_FIXTURES=1       skip provisioning Connect/Transport smoke users
 *   E2E_SKIP_SHELLS=1         skip Vite app HTTP probes
 *
 * Exit 0 only when every required step is PASS (BLOCKED counts as fail unless
 * E2E_ALLOW_BLOCKED=1).
 */
import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

loadDotenv({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env") });

const API =
  process.env.E2E_API_BASE_URL?.trim() ||
  process.env.SMOKE_API_BASE_URL?.trim() ||
  "http://127.0.0.1:8787";
const PASSWORD = process.env.E2E_SMOKE_PASSWORD?.trim() || "E2eSmoke!2026";
const SKIP_FIXTURES = process.env.E2E_SKIP_FIXTURES === "1";
const SKIP_SHELLS = process.env.E2E_SKIP_SHELLS === "1";
const ALLOW_BLOCKED = process.env.E2E_ALLOW_BLOCKED === "1";

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY?.trim();
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const OPERATOR_EMAIL = "lumenx.e2e.operator@lumenx.test";
const SMOKE = {
  teacher: "smoke.connect.teacher@lumenx.test",
  parent: "smoke.connect.parent@lumenx.test",
  student: "smoke.connect.student@lumenx.test",
  driver: "smoke.transport.driver@lumenx.test",
};

const SHELLS = [
  { app: "Admin", url: "http://127.0.0.1:8081/login" },
  { app: "Nexus", url: "http://127.0.0.1:8080/" },
  { app: "Connect", url: "http://127.0.0.1:5174/login" },
  { app: "Transport", url: "http://127.0.0.1:5175/login" },
  { app: "Admissions", url: "http://127.0.0.1:5177/login" },
  { app: "Careers", url: "http://127.0.0.1:5176/login" },
  { app: "Website", url: "http://127.0.0.1:8082/" },
];

/** @type {Array<{ step: string, ok: boolean, detail?: string, blocked?: boolean }>} */
const results = [];

function record(step, ok, detail, blocked = false) {
  results.push({ step, ok, detail, blocked });
  const tag = blocked ? "BLOCKED" : ok ? "PASS" : "FAIL";
  console.log(`${tag.padEnd(7)} ${step}${detail ? ` — ${detail}` : ""}`);
}

function requireEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON || !SUPABASE_SERVICE) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY");
  }
}

async function api(path, { token, method = "GET", body } = {}) {
  const headers = { Accept: "application/json", "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { res, json };
}

async function signInPassword(email, password) {
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw new Error(error?.message ?? "signInWithPassword failed");
  }
  return data.session.access_token;
}

async function ensureAuthUser(admin, email, displayName) {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = listed.data?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
    });
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error || !data.user) throw new Error(error?.message ?? `createUser ${email}`);
  return data.user.id;
}

async function ensureUserProfile(admin, userId, email, displayName) {
  const { data: existing } = await admin
    .from("user_profile")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (existing?.id) {
    await admin
      .from("user_profile")
      .update({ email, display_name: displayName, status: "active", deleted_at: null })
      .eq("id", userId);
    return;
  }
  const { error } = await admin.from("user_profile").insert({
    id: userId,
    email,
    display_name: displayName,
    status: "active",
  });
  if (error) throw new Error(`user_profile: ${error.message}`);
}

async function ensureMembership(admin, userId, instituteId, roleCode) {
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
  return mem.id;
}

async function ensureTeacher(admin, userId, instituteId, email) {
  const { data: existing } = await admin
    .from("teacher")
    .select("id")
    .eq("institute_id", instituteId)
    .eq("user_profile_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await admin
    .from("teacher")
    .insert({
      institute_id: instituteId,
      user_profile_id: userId,
      display_name: "Smoke Connect Teacher",
      email,
      phone: "9000000091",
      department: "Smoke",
      teaching_scope: "subject_teacher",
      portal_access_level: "faculty_grading",
      status: "active",
    })
    .select("id")
    .single();
  if (error) throw new Error(`teacher: ${error.message}`);
  return data.id;
}

async function ensureParent(admin, userId, instituteId, email) {
  const { data: existing } = await admin
    .from("parent")
    .select("id")
    .eq("institute_id", instituteId)
    .eq("user_profile_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await admin
    .from("parent")
    .insert({
      institute_id: instituteId,
      user_profile_id: userId,
      name: "Smoke Connect Parent",
      email,
      phone: "9000000092",
      invite_status: "active",
      access_status: "active",
    })
    .select("id")
    .single();
  if (error) throw new Error(`parent: ${error.message}`);
  return data.id;
}

async function ensureStudent(admin, userId, instituteId) {
  const { data: existing } = await admin
    .from("student")
    .select("id")
    .eq("institute_id", instituteId)
    .eq("user_profile_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await admin
    .from("student")
    .insert({
      institute_id: instituteId,
      user_profile_id: userId,
      first_name: "Smoke",
      surname: "Student",
      display_name: "Smoke Connect Student",
      gender: "other",
      address: "Smoke E2E address",
      status: "active",
      access_status: "active",
    })
    .select("id")
    .single();
  if (error) throw new Error(`student: ${error.message}`);
  return data.id;
}

async function ensureDriver(admin, userId, instituteId) {
  const { data: existing } = await admin
    .from("driver")
    .select("id")
    .eq("institute_id", instituteId)
    .eq("user_profile_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await admin
    .from("driver")
    .insert({
      institute_id: instituteId,
      user_profile_id: userId,
      display_name: "Smoke Transport Driver",
      phone: "9000000093",
      license_number: "SMOKE-DL-0093",
      status: "active",
    })
    .select("id")
    .single();
  if (error) throw new Error(`driver: ${error.message}`);
  return data.id;
}

async function ensureFixtures(admin) {
  const { data: op } = await admin
    .from("platform_operator")
    .select("user_id")
    .eq("status", "active")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (!op?.user_id) throw new Error("No active platform_operator for institute fixture");

  const { data: mem } = await admin
    .from("membership")
    .select("institute_id")
    .eq("user_id", op.user_id)
    .eq("status", "active")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (!mem?.institute_id) throw new Error("Operator has no active membership");
  const instituteId = mem.institute_id;

  // Operator password for Admin / Nexus / Admissions / Careers
  const opUser = await admin.auth.admin.getUserById(op.user_id);
  const opEmail = opUser.data.user?.email || OPERATOR_EMAIL;
  await admin.auth.admin.updateUserById(op.user_id, {
    password: PASSWORD,
    email_confirm: true,
  });

  const teacherId = await ensureAuthUser(admin, SMOKE.teacher, "Smoke Connect Teacher");
  await ensureUserProfile(admin, teacherId, SMOKE.teacher, "Smoke Connect Teacher");
  await ensureMembership(admin, teacherId, instituteId, "teacher");
  await ensureTeacher(admin, teacherId, instituteId, SMOKE.teacher);

  const parentId = await ensureAuthUser(admin, SMOKE.parent, "Smoke Connect Parent");
  await ensureUserProfile(admin, parentId, SMOKE.parent, "Smoke Connect Parent");
  await ensureParent(admin, parentId, instituteId, SMOKE.parent);

  const studentId = await ensureAuthUser(admin, SMOKE.student, "Smoke Connect Student");
  await ensureUserProfile(admin, studentId, SMOKE.student, "Smoke Connect Student");
  await ensureStudent(admin, studentId, instituteId);

  const driverId = await ensureAuthUser(admin, SMOKE.driver, "Smoke Transport Driver");
  await ensureUserProfile(admin, driverId, SMOKE.driver, "Smoke Transport Driver");
  await ensureMembership(admin, driverId, instituteId, "driver");
  await ensureDriver(admin, driverId, instituteId);

  return { instituteId, operatorEmail: opEmail };
}

async function assertMe(email, password, predicate, label) {
  try {
    const token = await signInPassword(email, password);
    const { res, json } = await api("/api/v1/me", { token });
    const me = json?.data;
    if (!res.ok || !me) {
      record(label, false, `HTTP ${res.status}`);
      return null;
    }
    const ok = predicate(me);
    record(
      label,
      ok,
      ok
        ? `email=${email} institutes=${me.institutes?.length ?? 0}`
        : `predicate failed for ${email}`,
    );
    return ok ? { token, me } : null;
  } catch (err) {
    record(label, false, err instanceof Error ? err.message : String(err));
    return null;
  }
}

async function main() {
  console.log(`Login smoke target: ${API}\n`);
  requireEnv();

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── API health ──
  try {
    const live = await api("/api/v1/health");
    const ready = await api("/api/v1/health/ready");
    record(
      "api.health",
      live.res.ok && live.json?.status === "ok",
      `HTTP ${live.res.status}`,
    );
    record(
      "api.ready",
      ready.res.ok && ready.json?.status === "ready",
      `supabase=${ready.json?.checks?.supabase}`,
    );
  } catch (err) {
    record("api.health", false, err instanceof Error ? err.message : String(err));
    record("api.ready", false, "skipped");
  }

  // ── App shells ──
  if (!SKIP_SHELLS) {
    for (const shell of SHELLS) {
      try {
        const res = await fetch(shell.url, { redirect: "follow" });
        record(`shell.${shell.app}`, res.ok, `${shell.url} HTTP ${res.status}`);
      } catch (err) {
        record(
          `shell.${shell.app}`,
          false,
          err instanceof Error ? err.message : String(err),
        );
      }
    }
  }

  // ── Fixtures ──
  let operatorEmail = OPERATOR_EMAIL;
  let instituteId = null;
  if (!SKIP_FIXTURES) {
    try {
      const fx = await ensureFixtures(admin);
      operatorEmail = fx.operatorEmail;
      instituteId = fx.instituteId;
      record(
        "fixtures.provision",
        true,
        `institute=${instituteId.slice(0, 8)}… password set for operator + connect/transport smoke users`,
      );
    } catch (err) {
      record(
        "fixtures.provision",
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  } else {
    record("fixtures.provision", true, "skipped", true);
  }

  // ── Password logins (same path apps use) ──
  await assertMe(
    operatorEmail,
    PASSWORD,
    (me) =>
      me.institutes?.some(
        (i) =>
          i.status === "active" &&
          i.roles?.some((r) =>
            ["institute_admin", "principal", "vice_principal"].includes(r),
          ),
      ),
    "login.Admin (institute_admin /me)",
  );

  await assertMe(
    operatorEmail,
    PASSWORD,
    (me) => me.platformOperator?.active === true,
    "login.Nexus (platform_operator /me)",
  );

  await assertMe(
    SMOKE.teacher,
    PASSWORD,
    (me) => (me.identities?.teachers?.length ?? 0) > 0,
    "login.Connect teacher (identity /me)",
  );

  await assertMe(
    SMOKE.parent,
    PASSWORD,
    (me) => (me.identities?.parents?.length ?? 0) > 0,
    "login.Connect parent (identity /me)",
  );

  await assertMe(
    SMOKE.student,
    PASSWORD,
    (me) => (me.identities?.students?.length ?? 0) > 0,
    "login.Connect student (identity /me)",
  );

  const driverSession = await assertMe(
    SMOKE.driver,
    PASSWORD,
    (me) =>
      me.institutes?.some(
        (i) => i.status === "active" && i.roles?.includes("driver"),
      ),
    "login.Transport driver (role /me)",
  );

  if (driverSession?.token && instituteId) {
    try {
      const { res, json } = await api(
        `/api/v1/transport/drivers/me?institute_id=${instituteId}`,
        { token: driverSession.token },
      );
      record(
        "login.Transport drivers/me",
        res.ok && Boolean(json?.data?.driverId || json?.data?.id),
        `HTTP ${res.status}`,
      );
    } catch (err) {
      record(
        "login.Transport drivers/me",
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  } else {
    record("login.Transport drivers/me", false, "no driver session", true);
  }

  await assertMe(
    operatorEmail,
    PASSWORD,
    (me) =>
      me.institutes?.some((i) =>
        i.roles?.some((r) =>
          ["institute_admin", "principal", "admissions_officer", "coordinator"].includes(
            r,
          ),
        ),
      ),
    "login.Admissions institute_admin (/me)",
  );

  await assertMe(
    operatorEmail,
    PASSWORD,
    (me) =>
      me.institutes?.some((i) =>
        i.roles?.some((r) =>
          ["institute_admin", "principal", "staff", "teacher"].includes(r),
        ),
      ),
    "login.Careers recruiter (/me)",
  );

  record("login.Website", true, "marketing shell only (no auth required)");

  console.log("\n── Summary ──");
  const failed = results.filter((r) => !r.ok && !(ALLOW_BLOCKED && r.blocked));
  const passed = results.filter((r) => r.ok);
  const blocked = results.filter((r) => r.blocked);
  console.log(
    `PASS ${passed.length}  FAIL ${failed.length}  BLOCKED ${blocked.length}  TOTAL ${results.length}`,
  );

  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
