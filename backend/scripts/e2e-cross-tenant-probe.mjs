/**
 * Live cross-tenant isolation probe against a running API + Supabase.
 *
 * Provisions two non-platform institute_admins (Tenant A / Tenant B), seeds
 * minimal resources via the public API, then verifies:
 *   - same-tenant read/list OK
 *   - cross-tenant get/list/create denied (403 or 404)
 *   - outsider (no membership) denied
 *   - platform operator may still access (positive control)
 *
 * Uses backend/.env — never prints tokens.
 *
 * Optional:
 *   E2E_API_BASE_URL     (default http://127.0.0.1:8787)
 *   E2E_SMOKE_PASSWORD   (default E2eSmoke!2026)
 */
import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

loadDotenv({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env") });

const API =
  process.env.E2E_API_BASE_URL?.trim() ||
  process.env.SMOKE_API_BASE_URL?.trim() ||
  "http://127.0.0.1:8787";
const PASSWORD = process.env.E2E_SMOKE_PASSWORD?.trim() || "E2eSmoke!2026";

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY?.trim();
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const EMAIL_A = "smoke.tenant.a@lumenx.test";
const EMAIL_B = "smoke.tenant.b@lumenx.test";
const EMAIL_OUTSIDER = "lumenx.e2e.outsider@lumenx.test";
const EMAIL_OPERATOR = "lumenx.e2e.operator@lumenx.test";

const INST_A_NAME = "LumenX E2E Test Institute";
const INST_B_NAME = "LumenX E2E Isolation Institute";

const sfx = randomBytes(3).toString("hex");

/** @type {Array<{ step: string, ok: boolean, detail?: string }>} */
const results = [];

function record(step, ok, detail) {
  results.push({ step, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${step}${detail ? ` — ${detail}` : ""}`);
}

function denied(status) {
  return status === 403 || status === 404;
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
  return { status: res.status, ok: res.ok, json };
}

async function signIn(email) {
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error || !data.session?.access_token) {
    throw new Error(`${email}: ${error?.message ?? "sign-in failed"}`);
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
  if (error) throw new Error(`user_profile ${email}: ${error.message}`);
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
}

async function resolveInstitute(admin, name) {
  const { data, error } = await admin
    .from("institute")
    .select("id, name")
    .eq("name", name)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data?.id) throw new Error(`Institute not found: ${name}`);
  return data.id;
}

async function ensureFixtures(admin) {
  const instA = await resolveInstitute(admin, INST_A_NAME);
  const instB = await resolveInstitute(admin, INST_B_NAME);

  const userA = await ensureAuthUser(admin, EMAIL_A, "Smoke Tenant A Admin");
  await ensureUserProfile(admin, userA, EMAIL_A, "Smoke Tenant A Admin");
  await ensureMembership(admin, userA, instA, "institute_admin");

  const userB = await ensureAuthUser(admin, EMAIL_B, "Smoke Tenant B Admin");
  await ensureUserProfile(admin, userB, EMAIL_B, "Smoke Tenant B Admin");
  await ensureMembership(admin, userB, instB, "institute_admin");

  // Outsider + operator passwords for probe sign-in
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  for (const email of [EMAIL_OUTSIDER, EMAIL_OPERATOR]) {
    const u = listed.data?.users?.find((x) => x.email?.toLowerCase() === email);
    if (u) {
      await admin.auth.admin.updateUserById(u.id, {
        password: PASSWORD,
        email_confirm: true,
      });
    }
  }

  // Ensure outsider has no active membership
  const outsider = listed.data?.users?.find(
    (x) => x.email?.toLowerCase() === EMAIL_OUTSIDER,
  );
  if (outsider) {
    await admin
      .from("membership")
      .update({ status: "ended", deleted_at: new Date().toISOString() })
      .eq("user_id", outsider.id)
      .is("deleted_at", null);
  }

  return { instA, instB };
}

async function seedTenant(token, instituteId, label) {
  const year = await api("/api/v1/academic-years", {
    token,
    method: "POST",
    body: {
      institute_id: instituteId,
      name: `Probe AY ${label} ${sfx}`,
      code: `P${label}${sfx}`.slice(0, 20),
      starts_on: "2027-04-01",
      ends_on: "2028-03-31",
      // upcoming avoids single-active-year CONFLICT on institutes that already have an active year
      status: "upcoming",
    },
  });
  const yearId = year.json?.data?.id;
  if (!year.ok || !yearId) {
    throw new Error(`seed year ${label}: HTTP ${year.status}`);
  }

  const classCode = `C${label}${sfx}`.slice(0, 20);
  const klass = await api("/api/v1/classes", {
    token,
    method: "POST",
    body: {
      institute_id: instituteId,
      academic_year_id: yearId,
      name: `Probe Class ${label}`,
      code: classCode,
      sort_order: 1,
    },
  });
  const classId = klass.json?.data?.id;
  if (!klass.ok || !classId) {
    throw new Error(`seed class ${label}: HTTP ${klass.status}`);
  }

  const section = await api("/api/v1/sections", {
    token,
    method: "POST",
    body: {
      institute_id: instituteId,
      academic_year_id: yearId,
      class_id: classId,
      name: "A",
      code: `S${label}${sfx}`.slice(0, 20),
      capacity: 40,
    },
  });
  const sectionId = section.json?.data?.id;
  if (!section.ok || !sectionId) {
    throw new Error(`seed section ${label}: HTTP ${section.status}`);
  }

  const subject = await api("/api/v1/subjects", {
    token,
    method: "POST",
    body: {
      institute_id: instituteId,
      name: `Probe Subj ${label}`,
      code: `M${label}${sfx}`.slice(0, 20),
      category: "core",
      periods_per_week: 5,
      applicable_class_codes: [classCode],
    },
  });
  const subjectId = subject.json?.data?.id;
  if (!subject.ok || !subjectId) {
    throw new Error(`seed subject ${label}: HTTP ${subject.status}`);
  }

  const teacher = await api("/api/v1/teachers", {
    token,
    method: "POST",
    body: {
      institute_id: instituteId,
      display_name: `Probe Teacher ${label}`,
      employee_id: `E${label}${sfx}`.slice(0, 20),
      department: "Probe",
      teaching_scope: "subject_teacher",
      portal_access_level: "faculty_grading",
      status: "active",
    },
  });
  const teacherId = teacher.json?.data?.id;
  if (!teacher.ok || !teacherId) {
    throw new Error(`seed teacher ${label}: HTTP ${teacher.status}`);
  }

  const student = await api("/api/v1/students", {
    token,
    method: "POST",
    body: {
      institute_id: instituteId,
      first_name: "Probe",
      surname: `${label}${sfx}`,
      gender: "other",
      address: "Probe address",
      status: "active",
    },
  });
  const studentId = student.json?.data?.id;
  if (!student.ok || !studentId) {
    throw new Error(`seed student ${label}: HTTP ${student.status}`);
  }

  const parentPhone = `9${sfx}${label === "A" ? "1" : "2"}`.padEnd(10, "0").slice(0, 10);
  const parent = await api("/api/v1/parents", {
    token,
    method: "POST",
    body: {
      institute_id: instituteId,
      name: `Probe Parent ${label}`,
      phone: parentPhone,
      email: `probe.parent.${label}.${sfx}@lumenx.test`,
    },
  });
  const parentId = parent.json?.data?.id;
  if (!parent.ok || !parentId) {
    throw new Error(`seed parent ${label}: HTTP ${parent.status}`);
  }

  const enroll = await api("/api/v1/enrollments", {
    token,
    method: "POST",
    body: {
      institute_id: instituteId,
      academic_year_id: yearId,
      class_id: classId,
      section_id: sectionId,
      student_id: studentId,
      roll_no: `R${label}${sfx}`.slice(0, 20),
      enrolled_on: "2027-04-01",
      status: "active",
    },
  });
  const enrollmentId = enroll.json?.data?.id;
  if (!enroll.ok || !enrollmentId) {
    throw new Error(`seed enrollment ${label}: HTTP ${enroll.status} ${enroll.json?.error?.message ?? ""}`);
  }

  return {
    instituteId,
    yearId,
    classId,
    sectionId,
    subjectId,
    teacherId,
    studentId,
    parentId,
    enrollmentId,
  };
}

function probeSameTenant(name, token, seed) {
  return (async () => {
    const checks = [
      [`${name}.same.year`, `/api/v1/academic-years/${seed.yearId}`],
      [`${name}.same.class`, `/api/v1/classes/${seed.classId}`],
      [`${name}.same.section`, `/api/v1/sections/${seed.sectionId}`],
      [`${name}.same.subject`, `/api/v1/subjects/${seed.subjectId}`],
      [`${name}.same.teacher`, `/api/v1/teachers/${seed.teacherId}`],
      [`${name}.same.student`, `/api/v1/students/${seed.studentId}`],
      [`${name}.same.parent`, `/api/v1/parents/${seed.parentId}`],
      [`${name}.same.enrollment`, `/api/v1/enrollments/${seed.enrollmentId}`],
      [
        `${name}.same.list.years`,
        `/api/v1/academic-years?institute_id=${seed.instituteId}`,
      ],
      [
        `${name}.same.list.students`,
        `/api/v1/students?institute_id=${seed.instituteId}`,
      ],
    ];
    for (const [step, path] of checks) {
      const r = await api(path, { token });
      record(step, r.ok, `HTTP ${r.status}`);
    }
  })();
}

function probeCrossTenant(attacker, victim, attackerToken, victimSeed) {
  return (async () => {
    const prefix = `${attacker}->${victim}`;
    const gets = [
      [`${prefix}.get.year`, `/api/v1/academic-years/${victimSeed.yearId}`],
      [`${prefix}.get.class`, `/api/v1/classes/${victimSeed.classId}`],
      [`${prefix}.get.section`, `/api/v1/sections/${victimSeed.sectionId}`],
      [`${prefix}.get.subject`, `/api/v1/subjects/${victimSeed.subjectId}`],
      [`${prefix}.get.teacher`, `/api/v1/teachers/${victimSeed.teacherId}`],
      [`${prefix}.get.student`, `/api/v1/students/${victimSeed.studentId}`],
      [`${prefix}.get.parent`, `/api/v1/parents/${victimSeed.parentId}`],
      [`${prefix}.get.enrollment`, `/api/v1/enrollments/${victimSeed.enrollmentId}`],
      [`${prefix}.get.institute`, `/api/v1/institutes/${victimSeed.instituteId}`],
    ];
    for (const [step, path] of gets) {
      const r = await api(path, { token: attackerToken });
      record(step, denied(r.status), `HTTP ${r.status}`);
    }

    const lists = [
      [
        `${prefix}.list.years`,
        `/api/v1/academic-years?institute_id=${victimSeed.instituteId}`,
      ],
      [
        `${prefix}.list.students`,
        `/api/v1/students?institute_id=${victimSeed.instituteId}`,
      ],
      [
        `${prefix}.list.teachers`,
        `/api/v1/teachers?institute_id=${victimSeed.instituteId}`,
      ],
      [
        `${prefix}.list.enrollments`,
        `/api/v1/enrollments?institute_id=${victimSeed.instituteId}`,
      ],
    ];
    for (const [step, path] of lists) {
      const r = await api(path, { token: attackerToken });
      record(step, denied(r.status), `HTTP ${r.status}`);
    }

    const create = await api("/api/v1/students", {
      token: attackerToken,
      method: "POST",
      body: {
        institute_id: victimSeed.instituteId,
        first_name: "XTenant",
        surname: sfx,
        gender: "other",
        address: "should-fail",
        status: "active",
      },
    });
    record(`${prefix}.create.student`, denied(create.status), `HTTP ${create.status}`);

    const promote = await api("/api/v1/enrollments/promote", {
      token: attackerToken,
      method: "POST",
      body: {
        institute_id: victimSeed.instituteId,
        source_academic_year_id: victimSeed.yearId,
        target_academic_year_id: victimSeed.yearId,
        items: [
          {
            enrollment_id: victimSeed.enrollmentId,
            target_class_id: victimSeed.classId,
            target_section_id: victimSeed.sectionId,
            action: "promote",
          },
        ],
      },
    });
    record(`${prefix}.promote`, denied(promote.status), `HTTP ${promote.status}`);

    const graduate = await api("/api/v1/enrollments/graduate", {
      token: attackerToken,
      method: "POST",
      body: {
        institute_id: victimSeed.instituteId,
        academic_year_id: victimSeed.yearId,
        enrollment_ids: [victimSeed.enrollmentId],
      },
    });
    record(`${prefix}.graduate`, denied(graduate.status), `HTTP ${graduate.status}`);
  })();
}

async function main() {
  console.log(`Cross-tenant probe target: ${API}\n`);
  if (!SUPABASE_URL || !SUPABASE_ANON || !SUPABASE_SERVICE) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY");
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const live = await api("/api/v1/health");
  record("api.health", live.ok && live.json?.status === "ok", `HTTP ${live.status}`);

  let instA;
  let instB;
  try {
    ({ instA, instB } = await ensureFixtures(admin));
    record(
      "fixtures.tenants",
      true,
      `A=${instA.slice(0, 8)}… B=${instB.slice(0, 8)}…`,
    );
  } catch (err) {
    record("fixtures.tenants", false, err instanceof Error ? err.message : String(err));
    console.log("\nAborting — cannot provision tenants.");
    process.exit(1);
  }

  let tokenA;
  let tokenB;
  let tokenOut;
  let tokenOp;
  try {
    tokenA = await signIn(EMAIL_A);
    tokenB = await signIn(EMAIL_B);
    tokenOut = await signIn(EMAIL_OUTSIDER);
    tokenOp = await signIn(EMAIL_OPERATOR);
    record("auth.tokens", true, "A/B/outsider/operator signed in");
  } catch (err) {
    record("auth.tokens", false, err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  // Confirm A/B are not platform operators (otherwise isolation checks are invalid)
  const meA = await api("/api/v1/me", { token: tokenA });
  const meB = await api("/api/v1/me", { token: tokenB });
  const meOut = await api("/api/v1/me", { token: tokenOut });
  const meOp = await api("/api/v1/me", { token: tokenOp });
  record(
    "auth.A.non_platform",
    meA.ok && !meA.json?.data?.platformOperator?.active,
    meA.json?.data?.platformOperator?.active ? "is platform operator" : "ok",
  );
  record(
    "auth.B.non_platform",
    meB.ok && !meB.json?.data?.platformOperator?.active,
    meB.json?.data?.platformOperator?.active ? "is platform operator" : "ok",
  );
  record(
    "auth.outsider.no_membership",
    meOut.ok && (meOut.json?.data?.institutes?.length ?? 0) === 0,
    `institutes=${meOut.json?.data?.institutes?.length ?? "?"}`,
  );
  record(
    "auth.operator.platform",
    meOp.ok && meOp.json?.data?.platformOperator?.active === true,
    meOp.json?.data?.platformOperator?.roleCode ?? "missing",
  );

  let seedA;
  let seedB;
  try {
    seedA = await seedTenant(tokenA, instA, "A");
    seedB = await seedTenant(tokenB, instB, "B");
    record("seed.A", true, `year=${seedA.yearId.slice(0, 8)}… student=${seedA.studentId.slice(0, 8)}…`);
    record("seed.B", true, `year=${seedB.yearId.slice(0, 8)}… student=${seedB.studentId.slice(0, 8)}…`);
  } catch (err) {
    record("seed", false, err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  await probeSameTenant("A", tokenA, seedA);
  await probeSameTenant("B", tokenB, seedB);
  await probeCrossTenant("A", "B", tokenA, seedB);
  await probeCrossTenant("B", "A", tokenB, seedA);
  await probeCrossTenant("outsider", "A", tokenOut, seedA);
  await probeCrossTenant("outsider", "B", tokenOut, seedB);

  // Platform operator positive control — may read both tenants
  const opA = await api(`/api/v1/students/${seedA.studentId}`, { token: tokenOp });
  const opB = await api(`/api/v1/students/${seedB.studentId}`, { token: tokenOp });
  record("operator->A.get.student", opA.ok, `HTTP ${opA.status}`);
  record("operator->B.get.student", opB.ok, `HTTP ${opB.status}`);

  console.log("\n── Summary ──");
  const failed = results.filter((r) => !r.ok);
  const passed = results.filter((r) => r.ok);
  console.log(`PASS ${passed.length}  FAIL ${failed.length}  TOTAL ${results.length}`);
  if (failed.length) {
    console.log("\nFailures:");
    for (const f of failed) console.log(`  - ${f.step}${f.detail ? ` (${f.detail})` : ""}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
