/**
 * Live staging API probe: Admin → Teacher/Connect visibility + isolation denials.
 * Uses synthetic smoke users against yveadybpntziyryxsrsu via local staging API.
 * Distinguishes service_role setup from JWT+API authorization (not Postgres RLS).
 */
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { assertStagingEnv, extractSupabaseProjectRef } = require(
  resolve(dirname(fileURLToPath(import.meta.url)), "../backend/scripts/assert-staging-env.mjs"),
);

assertStagingEnv(process.env);
const REF = "yveadybpntziyryxsrsu";
if (extractSupabaseProjectRef(process.env.SUPABASE_URL) !== REF) {
  throw new Error("Refusing cross-app probe against unexpected project");
}

const API =
  process.env.E2E_API_BASE_URL?.trim() ||
  process.env.SMOKE_API_BASE_URL?.trim() ||
  "http://127.0.0.1:8787";
const PASSWORD = process.env.E2E_SMOKE_PASSWORD?.trim() || "E2eSmoke!2026";
const sfx = randomBytes(2).toString("hex");

const results = [];
function record(step, ok, detail) {
  results.push({ step, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${step}${detail ? ` — ${detail}` : ""}`);
}

async function signIn(email) {
  const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.session?.access_token) {
    throw new Error(`${email}: ${error?.message ?? "sign-in failed"}`);
  }
  return data.session.access_token;
}

async function api(path, { token, method = "GET", body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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

async function main() {
  const health = await api("/api/v1/health").then(async (first) =>
    first.ok ? first : api("/health"),
  );
  record("api.health", health.ok || health.status === 200, `HTTP ${health.status}`);

  const adminTok = await signIn("smoke.tenant.a@lumenx.test");
  const teacherTok = await signIn("smoke.connect.teacher@lumenx.test");
  const parentTok = await signIn("smoke.connect.parent@lumenx.test");
  const outsiderTok = await signIn("lumenx.e2e.outsider@lumenx.test");
  record("auth.roles_signed_in", true, "admin/teacher/parent/outsider");

  const meAdmin = await api("/api/v1/me", { token: adminTok });
  const instA =
    meAdmin.json?.data?.institutes?.find((i) =>
      (i.roles || []).includes("institute_admin"),
    )?.instituteId || meAdmin.json?.data?.institutes?.[0]?.instituteId;
  record("admin.institute", Boolean(instA), instA ? instA.slice(0, 8) : "missing");

  // Announcement create (admin) → teacher list
  const ann = await api("/api/v1/announcements", {
    token: adminTok,
    method: "POST",
    body: {
      institute_id: instA,
      title: `Staging cross-app ${sfx}`,
      body: `Synthetic announcement ${sfx}`,
      audience: "staff",
      status: "published",
    },
  });
  const annId = ann.json?.data?.id;
  record(
    "admin.create_announcement",
    ann.ok && Boolean(annId),
    ann.ok ? annId.slice(0, 8) : `HTTP ${ann.status} ${ann.json?.error?.message ?? ""}`,
  );

  if (annId) {
    const teacherList = await api(
      `/api/v1/announcements?institute_id=${instA}`,
      { token: teacherTok },
    );
    const rows = teacherList.json?.data ?? teacherList.json?.items ?? [];
    const seen = Array.isArray(rows) && rows.some((r) => r.id === annId);
    record(
      "teacher.sees_admin_announcement",
      teacherList.ok && seen,
      `HTTP ${teacherList.status} seen=${seen}`,
    );
  }

  // Teacher denied other institute list
  const svc = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: instB } = await svc
    .from("institute")
    .select("id")
    .eq("name", "LumenX E2E Isolation Institute")
    .maybeSingle();
  const crossAnn = await api(
    `/api/v1/announcements?institute_id=${instB.id}`,
    { token: teacherTok },
  );
  record(
    "teacher.denied_other_institute_announcements",
    crossAnn.status === 403 || crossAnn.status === 404,
    `HTTP ${crossAnn.status}`,
  );

  // Parent /me institutes present after membership link
  const meParent = await api("/api/v1/me", { token: parentTok });
  const parentInstCount = meParent.json?.data?.institutes?.length ?? 0;
  record("parent.membership_visible", parentInstCount >= 1, `institutes=${parentInstCount}`);

  // Outsider denied students list
  const outStudents = await api(`/api/v1/students?institute_id=${instA}`, {
    token: outsiderTok,
  });
  record(
    "outsider.denied_students",
    outStudents.status === 403 || outStudents.status === 404,
    `HTTP ${outStudents.status}`,
  );

  // Marks list (teacher) — permitted path may be empty but not 5xx
  const marks = await api(`/api/v1/marks?institute_id=${instA}`, { token: teacherTok });
  record(
    "teacher.marks_endpoint",
    marks.status < 500 && marks.status !== 401,
    `HTTP ${marks.status}`,
  );

  // Attendance sessions list
  const att = await api(`/api/v1/attendance/sessions?institute_id=${instA}`, {
    token: teacherTok,
  });
  record(
    "teacher.attendance_endpoint",
    att.status < 500 && att.status !== 401,
    `HTTP ${att.status}`,
  );

  // Transport routes (admin) — may 404 if unimplemented path variant
  const transport = await api(`/api/v1/transport/routes?institute_id=${instA}`, {
    token: adminTok,
  });
  record(
    "admin.transport_routes",
    transport.status < 500 && transport.status !== 401,
    `HTTP ${transport.status}`,
  );

  const failed = results.filter((r) => !r.ok);
  console.log(
    JSON.stringify(
      {
        target_ref: REF,
        api: API,
        auth_layer: "hono+jwt (service_role server-side)",
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

main().catch((e) => {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
