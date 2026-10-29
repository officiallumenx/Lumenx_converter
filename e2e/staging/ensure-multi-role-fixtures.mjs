/**
 * Idempotent staging fixtures for multi-role browser E2E.
 * Sets Connect PINs, ensures class/section/enrollment/teacher assignment,
 * and attendance config for Institute A. Never prints secrets.
 *
 *   node --env-file=backend/.env.staging e2e/staging/ensure-multi-role-fixtures.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { assertStagingEnv, extractSupabaseProjectRef } = require(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../backend/scripts/assert-staging-env.mjs"),
);

assertStagingEnv(process.env);
const REF = "yveadybpntziyryxsrsu";
if (extractSupabaseProjectRef(process.env.SUPABASE_URL) !== REF) {
  throw new Error(`Wrong project ref`);
}

const PIN = (process.env.E2E_CONNECT_PIN ?? "1234").trim();
const TEACHER_EMAIL = "smoke.connect.teacher@lumenx.test";
const PARENT_EMAIL = "smoke.connect.parent@lumenx.test";
const STUDENT_EMAIL = "smoke.connect.student@lumenx.test";
const OTHER_TEACHER_EMAIL = "smoke.connect.teacher.b@lumenx.test";
const OTHER_PARENT_EMAIL = "smoke.connect.parent.b@lumenx.test";
const INST_A = "LumenX E2E Test Institute";
const INST_B = "LumenX E2E Isolation Institute";

const admin = createClient(
  process.env.SUPABASE_URL.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function hashPin(pin) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return { salt, hash };
}

async function findUser(email) {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listed.error) throw new Error(listed.error.message);
  return listed.data.users.find((u) => u.email?.toLowerCase() === email) ?? null;
}

async function ensureAuthUser(email, displayName) {
  const existing = await findUser(email);
  const password =
    process.env.E2E_SMOKE_PASSWORD?.trim() ||
    process.env.NEXUS_BOOTSTRAP_PASSWORD?.trim();
  if (!password) throw new Error("E2E_SMOKE_PASSWORD required");
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error || !data.user) throw new Error(error?.message ?? `create ${email}`);
  return data.user.id;
}

async function ensureProfile(userId, email, displayName, phone) {
  const { data: existing } = await admin
    .from("user_profile")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  const { salt, hash } = hashPin(PIN);
  const now = new Date().toISOString();
  const patch = {
    email,
    display_name: displayName,
    phone,
    status: "active",
    deleted_at: null,
    pin_hash: hash,
    pin_salt: salt,
    pin_set_at: now,
    first_login_completed_at: now,
  };
  if (existing?.id) {
    const { error } = await admin.from("user_profile").update(patch).eq("id", userId);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await admin.from("user_profile").insert({ id: userId, ...patch });
  if (error) throw new Error(error.message);
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
    if (ins.error) throw new Error(ins.error.message);
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
    if (error) throw new Error(error.message);
  }
}

async function instituteId(name) {
  const { data, error } = await admin
    .from("institute")
    .select("id")
    .eq("name", name)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data?.id) throw new Error(`Institute missing: ${name}`);
  return data.id;
}

async function main() {
  const instA = await instituteId(INST_A);
  const instB = await instituteId(INST_B);

  const teacherId = await ensureAuthUser(TEACHER_EMAIL, "Smoke Connect Teacher");
  await ensureProfile(teacherId, TEACHER_EMAIL, "Smoke Connect Teacher", "9000000091");
  await ensureMembership(teacherId, instA, "teacher");

  const parentId = await ensureAuthUser(PARENT_EMAIL, "Smoke Connect Parent");
  await ensureProfile(parentId, PARENT_EMAIL, "Smoke Connect Parent", "9000000092");
  await ensureMembership(parentId, instA, "parent");

  const studentUserId = await ensureAuthUser(STUDENT_EMAIL, "Smoke Connect Student");
  await ensureProfile(studentUserId, STUDENT_EMAIL, "Smoke Connect Student", "9000000093");
  await ensureMembership(studentUserId, instA, "student");

  // Other-institute isolation actors
  const teacherB = await ensureAuthUser(OTHER_TEACHER_EMAIL, "Smoke Teacher B");
  await ensureProfile(teacherB, OTHER_TEACHER_EMAIL, "Smoke Teacher B", "9000000191");
  await ensureMembership(teacherB, instB, "teacher");

  const parentB = await ensureAuthUser(OTHER_PARENT_EMAIL, "Smoke Parent B");
  await ensureProfile(parentB, OTHER_PARENT_EMAIL, "Smoke Parent B", "9000000192");
  await ensureMembership(parentB, instB, "parent");

  // Teacher row A
  let { data: teacherRow } = await admin
    .from("teacher")
    .select("id")
    .eq("institute_id", instA)
    .eq("user_profile_id", teacherId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!teacherRow) {
    const ins = await admin
      .from("teacher")
      .insert({
        institute_id: instA,
        user_profile_id: teacherId,
        display_name: "Smoke Connect Teacher",
        email: TEACHER_EMAIL,
        phone: "9000000091",
        department: "E2E",
        teaching_scope: "subject_teacher",
        portal_access_level: "faculty_grading",
        status: "active",
      })
      .select("id")
      .single();
    if (ins.error) throw new Error(ins.error.message);
    teacherRow = ins.data;
  }

  // Parent / student rows + guardian link
  let { data: parentRow } = await admin
    .from("parent")
    .select("id")
    .eq("institute_id", instA)
    .eq("user_profile_id", parentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!parentRow) {
    const ins = await admin
      .from("parent")
      .insert({
        institute_id: instA,
        user_profile_id: parentId,
        name: "Smoke Connect Parent",
        email: PARENT_EMAIL,
        phone: "9000000092",
        invite_status: "active",
        access_status: "active",
      })
      .select("id")
      .single();
    if (ins.error) throw new Error(ins.error.message);
    parentRow = ins.data;
  }

  let { data: studentRow } = await admin
    .from("student")
    .select("id")
    .eq("institute_id", instA)
    .eq("user_profile_id", studentUserId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!studentRow) {
    const ins = await admin
      .from("student")
      .insert({
        institute_id: instA,
        user_profile_id: studentUserId,
        first_name: "Smoke",
        surname: "Student",
        display_name: "Smoke Connect Student",
        gender: "other",
        address: "E2E address",
        status: "active",
        access_status: "active",
      })
      .select("id")
      .single();
    if (ins.error) throw new Error(ins.error.message);
    studentRow = ins.data;
  }

  const { data: link } = await admin
    .from("guardian_link")
    .select("id")
    .eq("parent_id", parentRow.id)
    .eq("student_id", studentRow.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!link) {
    const ins = await admin.from("guardian_link").insert({
      institute_id: instA,
      student_id: studentRow.id,
      parent_id: parentRow.id,
      relationship: "guardian",
      is_primary: true,
      status: "active",
    });
    if (ins.error) throw new Error(ins.error.message);
  }

  // Academic structure
  let { data: year } = await admin
    .from("academic_year")
    .select("id")
    .eq("institute_id", instA)
    .eq("code", "E2E-AY")
    .is("deleted_at", null)
    .maybeSingle();
  if (!year) {
    const ins = await admin
      .from("academic_year")
      .insert({
        institute_id: instA,
        name: "E2E Academic Year",
        code: "E2E-AY",
        starts_on: "2026-04-01",
        ends_on: "2027-03-31",
        status: "active",
      })
      .select("id")
      .single();
    if (ins.error) throw new Error(`academic_year: ${ins.error.message}`);
    year = ins.data;
  }

  let { data: klass } = await admin
    .from("class")
    .select("id")
    .eq("institute_id", instA)
    .eq("code", "E2E-C1")
    .is("deleted_at", null)
    .maybeSingle();
  if (!klass) {
    const ins = await admin
      .from("class")
      .insert({
        institute_id: instA,
        academic_year_id: year.id,
        name: "E2E Class 1",
        code: "E2E-C1",
        sort_order: 1,
        status: "active",
      })
      .select("id")
      .single();
    if (ins.error) throw new Error(`class: ${ins.error.message}`);
    klass = ins.data;
  }

  let { data: section } = await admin
    .from("section")
    .select("id")
    .eq("institute_id", instA)
    .eq("code", "E2E-S1")
    .is("deleted_at", null)
    .maybeSingle();
  if (!section) {
    const ins = await admin
      .from("section")
      .insert({
        institute_id: instA,
        academic_year_id: year.id,
        class_id: klass.id,
        name: "A",
        code: "E2E-S1",
        capacity: 40,
        status: "active",
      })
      .select("id")
      .single();
    if (ins.error) throw new Error(`section: ${ins.error.message}`);
    section = ins.data;
  }

  let { data: enrollment } = await admin
    .from("enrollment")
    .select("id")
    .eq("institute_id", instA)
    .eq("student_id", studentRow.id)
    .eq("section_id", section.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!enrollment) {
    const ins = await admin
      .from("enrollment")
      .insert({
        institute_id: instA,
        academic_year_id: year.id,
        class_id: klass.id,
        section_id: section.id,
        student_id: studentRow.id,
        roll_no: "E2E-01",
        enrolled_on: "2026-04-01",
        status: "active",
      })
      .select("id")
      .single();
    if (ins.error) throw new Error(`enrollment: ${ins.error.message}`);
    enrollment = ins.data;
  }

  // Keep student denormalized labels in sync with enrollment (Connect Home reads these).
  {
    const { data: klassRow } = await admin
      .from("class")
      .select("name, code")
      .eq("id", klass.id)
      .maybeSingle();
    const { data: sectionRow } = await admin
      .from("section")
      .select("name, code")
      .eq("id", section.id)
      .maybeSingle();
    const classLabel = (klassRow?.name || klassRow?.code || "E2E Class 1").trim();
    const sectionLabel = (sectionRow?.name || sectionRow?.code || "A").trim();
    const patch = await admin
      .from("student")
      .update({
        class_label: classLabel,
        section_label: sectionLabel,
        roll_no: "E2E-01",
      })
      .eq("id", studentRow.id)
      .is("deleted_at", null);
    if (patch.error) throw new Error(`student labels: ${patch.error.message}`);
  }

  // Subject + teacher assignment
  let { data: subject } = await admin
    .from("subject")
    .select("id")
    .eq("institute_id", instA)
    .eq("code", "E2E-SUB")
    .is("deleted_at", null)
    .maybeSingle();
  if (!subject) {
    const ins = await admin
      .from("subject")
      .insert({
        institute_id: instA,
        name: "E2E Subject",
        code: "E2E-SUB",
        category: "core",
        periods_per_week: 5,
        applicable_class_codes: ["E2E-C1"],
        status: "active",
      })
      .select("id")
      .single();
    if (ins.error) throw new Error(`subject: ${ins.error.message}`);
    subject = ins.data;
  }

  const { data: assignment } = await admin
    .from("teacher_assignment")
    .select("id")
    .eq("institute_id", instA)
    .eq("teacher_id", teacherRow.id)
    .eq("section_id", section.id)
    .eq("subject_id", subject.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!assignment) {
    const ins = await admin.from("teacher_assignment").insert({
      institute_id: instA,
      teacher_id: teacherRow.id,
      class_id: klass.id,
      section_id: section.id,
      subject_id: subject.id,
      academic_year_id: year.id,
      status: "active",
    });
    if (ins.error) throw new Error(`teacher_assignment: ${ins.error.message}`);
  }

  // Attendance config version (daily / class_teacher)
  const { data: attCfg } = await admin
    .from("attendance_config_version")
    .select("id")
    .eq("institute_id", instA)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (!attCfg) {
    const ins = await admin.from("attendance_config_version").insert({
      institute_id: instA,
      effective_from: "2026-04-01",
      method: "daily",
      owner: "class_teacher",
      scope: "section",
      class_codes: ["E2E-C1"],
      section_codes: ["E2E-S1"],
    });
    if (ins.error) throw new Error(`attendance_config_version: ${ins.error.message}`);
  }

  const { error: classTeacherErr } = await admin
    .from("section")
    .update({ class_teacher_id: teacherRow.id })
    .eq("id", section.id);
  if (classTeacherErr) throw new Error(`class_teacher: ${classTeacherErr.message}`);

  // Active certificate template for issued-certificate E2E (metadata_only issue path)
  let { data: certTpl } = await admin
    .from("template")
    .select("id")
    .eq("institute_id", instA)
    .eq("type", "certificate")
    .eq("status", "active")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (!certTpl) {
    const tplId = randomUUID();
    const ins = await admin
      .from("template")
      .insert({
        id: tplId,
        family_id: tplId,
        owner_scope: "institute",
        institute_id: instA,
        type: "certificate",
        name: "E2E Bonafide Certificate",
        description: "Staging multi-role certificate template",
        category: "Academic",
        status: "active",
        source: "custom",
        version: 1,
        preview_aspect: "a4",
        layout_mode: "blocks",
        blocks: [],
        tags: ["e2e"],
        created_by_user_id: teacherId,
      })
      .select("id")
      .single();
    if (ins.error) throw new Error(`certificate template: ${ins.error.message}`);
    certTpl = ins.data;
  }

  console.log(
    JSON.stringify(
      {
        target_ref: REF,
        institute_a: instA.slice(0, 8),
        institute_b: instB.slice(0, 8),
        section: section.id.slice(0, 8),
        enrollment: enrollment.id.slice(0, 8),
        teacher: teacherRow.id.slice(0, 8),
        student: studentRow.id.slice(0, 8),
        certificate_template: certTpl.id.slice(0, 8),
        connect_pin_set: true,
        pin_digits: PIN.length,
        secrets_printed: false,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
