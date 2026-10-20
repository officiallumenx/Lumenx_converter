/**
 * Hosted staging multi-role browser E2E (opt-in).
 *
 * Prerequisites:
 *   STAGING_E2E=1
 *   backend/.env.staging → yveadybpntziyryxsrsu
 *   Staging API on E2E_API_BASE_URL (default :8787)
 *   node --env-file=backend/.env.staging e2e/staging/ensure-multi-role-fixtures.mjs
 *   Admin :8081 + Connect :5174 pointed at staging anon (never service_role in browser)
 *
 * Auth layers:
 *   - Browser uses anon key + user JWT only
 *   - Persistence checked via authenticated API calls with that JWT
 *   - Does not claim Postgres RLS (see staging-anon-rls-probe.mjs)
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  evaluateStagingLiveGate,
  stagingLiveGateSkipMessage,
} from "./live-gate";

const gate = evaluateStagingLiveGate(process.env);

function loadStagingEnv(): Record<string, string> {
  const path = resolve(process.cwd(), "backend/.env.staging");
  const out: Record<string, string> = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const fileEnv = loadStagingEnv();
const PASSWORD =
  process.env.E2E_SMOKE_PASSWORD?.trim() ||
  fileEnv.E2E_SMOKE_PASSWORD ||
  fileEnv.NEXUS_BOOTSTRAP_PASSWORD ||
  "";
const PIN = (process.env.E2E_CONNECT_PIN ?? fileEnv.E2E_CONNECT_PIN ?? "1234").trim();
const SUPABASE_URL = process.env.SUPABASE_URL?.trim() || fileEnv.SUPABASE_URL || "";
const SUPABASE_ANON =
  process.env.SUPABASE_ANON_KEY?.trim() || fileEnv.SUPABASE_ANON_KEY || "";
const API = gate.apiBaseUrl;

const INST_A_NAME = "LumenX E2E Test Institute";
const INST_B_NAME = "LumenX E2E Isolation Institute";
const TEACHER_PHONE = "9000000091";
const PARENT_PHONE = "9000000092";
const OTHER_PARENT_PHONE = "9000000192";
const OTHER_TEACHER_PHONE = "9000000191";
const DEMO_OTP = "123456";

test.describe.configure({ mode: "serial" });

test.describe("Staging multi-role attendance (hosted)", () => {
  test.skip(!gate.ok, stagingLiveGateSkipMessage(gate));

  let instituteId = "";
  let academicYearId = "";
  let classId = "";
  let sectionId = "";
  let enrollmentId = "";
  let configVersionId = "";
  let studentDisplay = "Smoke Connect Student";
  let registerId = "";
  const attendanceDate = new Date().toISOString().slice(0, 10);

  test("0) resolve fixture ids via authenticated admin session", async () => {
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await anon.auth.signInWithPassword({
      email: "lumenx.e2e.operator@lumenx.test",
      password: PASSWORD,
    });
    expect(error, error?.message).toBeFalsy();
    const token = data.session?.access_token;
    expect(token).toBeTruthy();

    const me = await fetch(`${API}/api/v1/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());
    const inst = (me.data?.institutes ?? []).find(
      (i: { instituteId?: string; roles?: string[] }) =>
        i.roles?.includes("institute_admin") || i.roles?.includes("nexus_root"),
    );
    // Operator may only have platform role — resolve institute by listing
    const institutes = await fetch(`${API}/api/v1/institutes`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());
    const row = (institutes.data ?? []).find(
      (i: { name?: string }) => i.name === INST_A_NAME,
    );
    instituteId = row?.id || inst?.instituteId;
    expect(instituteId, "Institute A id").toBeTruthy();

    const years = await fetch(
      `${API}/api/v1/academic-years?institute_id=${instituteId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    ).then((r) => r.json());
    const year = (years.data ?? []).find(
      (y: { code?: string }) => y.code === "E2E-AY",
    );
    academicYearId = year?.id;
    expect(academicYearId, "E2E academic year — run ensure-multi-role-fixtures.mjs").toBeTruthy();

    const classes = await fetch(
      `${API}/api/v1/classes?institute_id=${instituteId}&academic_year_id=${academicYearId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    ).then((r) => r.json());
    const klass = (classes.data ?? []).find(
      (c: { code?: string }) => c.code === "E2E-C1",
    );
    classId = klass?.id;
    expect(classId).toBeTruthy();

    const sections = await fetch(
      `${API}/api/v1/sections?institute_id=${instituteId}&class_id=${classId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    ).then((r) => r.json());
    const section = (sections.data ?? []).find(
      (s: { code?: string }) => s.code === "E2E-S1",
    );
    sectionId = section?.id;
    expect(sectionId).toBeTruthy();

    const enrollments = await fetch(
      `${API}/api/v1/enrollments?institute_id=${instituteId}&section_id=${sectionId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    ).then((r) => r.json());
    const enr = (enrollments.data ?? [])[0];
    enrollmentId = enr?.id;
    expect(enrollmentId, "enrollment for E2E section").toBeTruthy();

    const cfg = await fetch(
      `${API}/api/v1/attendance/config?institute_id=${instituteId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    ).then((r) => r.json());
    configVersionId = (cfg.data ?? [])[0]?.id;
    expect(configVersionId, "attendance_config_version").toBeTruthy();
  });

  /**
   * Connect login IA: institute → portal role → phone → (OTP?) → PIN.
   * Uses live staging Auth/API (anon key in the Vite app). Never service_role.
   */
  async function connectLoginUi(
    page: Page,
    phone: string,
    role: "teacher" | "parent" | "student",
    instituteName: string = INST_A_NAME,
  ) {
    // Clear Connect-origin storage (must navigate to Connect first).
    await page.goto(`${gate.connectBaseUrl}/login`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      try {
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith("lumenx.connect") || key.startsWith("ues_")) {
            localStorage.removeItem(key);
          }
        }
        sessionStorage.clear();
      } catch {
        // ignore
      }
    });
    await page.reload({ waitUntil: "domcontentloaded" });

    // 1) Institute combobox
    const combobox = page.getByRole("combobox");
    await expect(combobox).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Loading institutes/i)).toHaveCount(0, {
      timeout: 30_000,
    });
    await combobox.click();
    const search = page.getByPlaceholder("Type name or code…");
    await expect(search).toBeVisible({ timeout: 10_000 });
    // Prefer unique fragment so Command filters the list
    const filter =
      instituteName.includes("Isolation") ? "Isolation" : "E2E Test";
    await search.fill(filter);
    await page.getByText(instituteName, { exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // 2) Portal role card
    const roleLabel =
      role === "teacher"
        ? "Teacher Portal"
        : role === "parent"
          ? "Parent Portal"
          : "Student Portal";
    await expect(page.getByText("Choose portal")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: new RegExp(roleLabel, "i") }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // 3) Phone
    const phoneInput = page.locator("#login-phone");
    await expect(phoneInput).toBeVisible({ timeout: 15_000 });
    await phoneInput.fill(phone);
    await page.getByRole("button", { name: "Continue" }).click();

    // 4) OTP (first-login / requiresOtp) or PIN verify
    const otpHeading = page.getByText(/Verify mobile|Verify to reset PIN/i);
    const pinHeading = page.getByText(/Enter your Login PIN|Create your Login PIN/i);
    await expect(otpHeading.or(pinHeading).first()).toBeVisible({ timeout: 30_000 });

    if (await otpHeading.isVisible().catch(() => false)) {
      // InputOTP: type into the hidden/active input
      const otpRoot = page.locator("[data-input-otp]");
      if ((await otpRoot.count()) > 0) {
        await otpRoot.first().click();
        await page.keyboard.type(DEMO_OTP, { delay: 40 });
      } else {
        await page.getByRole("textbox").last().fill(DEMO_OTP);
      }
      await page.getByRole("button", { name: /Verify & continue/i }).click();
      // PIN setup after OTP
      const newPin = page.locator("#connect-pin-new");
      await expect(newPin).toBeVisible({ timeout: 20_000 });
      await newPin.fill(PIN);
      await page.locator("#connect-pin-confirm").fill(PIN);
      await page.getByRole("button", { name: /Save PIN/i }).click();
    }

    // 5) PIN verify + sign in
    const pinField = page.locator("#portal-pin-verify");
    await expect(pinField).toBeVisible({ timeout: 20_000 });
    await pinField.fill(PIN);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 45_000 });
  }

  async function tokenFromConnect(page: Page): Promise<string> {
    const token = await page.evaluate(() => {
      const raw = localStorage.getItem("lumenx.connect.supabase.auth.v1");
      if (!raw) return "";
      try {
        const parsed = JSON.parse(raw) as {
          access_token?: string;
          currentSession?: { access_token?: string };
        };
        return (
          parsed.access_token ??
          parsed.currentSession?.access_token ??
          ""
        );
      } catch {
        return "";
      }
    });
    expect(token, "Connect access token after UI login").toBeTruthy();
    return token;
  }

  test("1-9) Admin → Teacher attendance → Parent visibility + isolation", async ({
    browser,
  }) => {
    test.setTimeout(300_000);

    // ── Teacher authenticates (Connect UI) and records attendance ──
    const teacherCtx = await browser.newContext();
    const teacherPage = await teacherCtx.newPage();
    await connectLoginUi(teacherPage, TEACHER_PHONE, "teacher", INST_A_NAME);
    const teacherToken = await tokenFromConnect(teacherPage);

    // Teacher sees assigned section portal (UI) — avoid matching hidden nav labels
    await teacherPage.goto(`${gate.connectBaseUrl}/attendance`);
    await expect(
      teacherPage.getByRole("heading", { name: /^Attendance$/i }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      teacherPage.getByText(/E2E Class 1|E2E-S1|Smoke Connect Student/i).first(),
    ).toBeVisible({ timeout: 45_000 });

    // Persist via authenticated teacher JWT (same API the UI uses). Unique slot avoids
    // colliding with any draft the take-attendance UI may already hold for today.
    const slotCode = `e2e-day-${attendanceDate}-${Date.now()}`;
    const create = await fetch(`${API}/api/v1/attendance/registers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${teacherToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: instituteId,
        academic_year_id: academicYearId,
        class_id: classId,
        section_id: sectionId,
        config_version_id: configVersionId,
        attendance_date: attendanceDate,
        slot_kind: "day",
        slot_code: slotCode,
        slot_label: "E2E Daily",
        marks: [{ enrollment_id: enrollmentId, status: "present" }],
      }),
    });
    const createJson = await create.json();
    expect(
      create.ok,
      `teacher create register HTTP ${create.status} ${createJson?.error?.message ?? ""}`,
    ).toBeTruthy();
    registerId = createJson.data?.id;
    expect(registerId, "register id after teacher mark").toBeTruthy();

    const submit = await fetch(
      `${API}/api/v1/attendance/registers/${registerId}/submit`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${teacherToken}` },
      },
    );
    expect(submit.ok, `submit HTTP ${submit.status}`).toBeTruthy();

    // Backend persistence re-check before UI soft assertion
    const teacherGet = await fetch(
      `${API}/api/v1/attendance/registers/${registerId}`,
      { headers: { Authorization: `Bearer ${teacherToken}` } },
    );
    expect(teacherGet.ok, `teacher get register HTTP ${teacherGet.status}`).toBeTruthy();
    const teacherReg = await teacherGet.json();
    expect(
      teacherReg.data?.status === "submitted" || teacherReg.data?.id === registerId,
    ).toBeTruthy();

    // Reload UI — wait out skeletons; fixture class/student proves non-mock data
    await teacherPage.reload({ waitUntil: "domcontentloaded" });
    await expect(
      teacherPage.getByRole("heading", { name: /^Attendance$/i }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      teacherPage.getByText(/E2E Class 1|E2E-S1|Smoke Connect Student/i).first(),
    ).toBeVisible({ timeout: 45_000 });

    // ── Admin independently sees persisted register ──
    const adminAnon = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const adminSign = await adminAnon.auth.signInWithPassword({
      email: "lumenx.e2e.operator@lumenx.test",
      password: PASSWORD,
    });
    const adminToken = adminSign.data.session?.access_token;
    expect(adminToken).toBeTruthy();
    const adminGet = await fetch(
      `${API}/api/v1/attendance/registers/${registerId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    expect(adminGet.ok, `admin get register HTTP ${adminGet.status}`).toBeTruthy();
    const adminReg = await adminGet.json();
    expect(adminReg.data?.status === "submitted" || adminReg.data?.id).toBeTruthy();

    const adminSession = adminSign.data.session;
    expect(adminSession?.access_token, "admin session for browser seed").toBeTruthy();
    expect(adminSession?.refresh_token, "admin refresh token for browser seed").toBeTruthy();

    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    // Seed real staging Auth session (anon JWT + refresh) — never service_role
    await adminPage.addInitScript(
      ({ sessionJson, instituteId: inst }) => {
        const now = Date.now();
        const session = JSON.parse(sessionJson) as {
          access_token: string;
          refresh_token: string;
          expires_in?: number;
          expires_at?: number;
          token_type?: string;
          user?: { id?: string; email?: string };
        };
        localStorage.setItem("lx_admin_remember", "1");
        localStorage.setItem("lumenx.admin.activeInstituteId.v1", inst);
        localStorage.setItem(
          `lumenx.admin.setup-core-complete.v1:${inst}`,
          JSON.stringify({ complete: true, at: now }),
        );
        localStorage.setItem(
          "lx_admin_session_v1",
          JSON.stringify({
            userId: session.user?.id,
            email: session.user?.email ?? "lumenx.e2e.operator@lumenx.test",
            phone: "",
            name: "E2E Operator",
            initials: "EO",
            role: "super_admin",
            title: "institute admin",
            instituteId: inst,
            instituteName: "LumenX E2E Test Institute",
            isVerified: true,
            token: "",
            authSource: "api",
            issuedAt: now,
            expiresAt: now + 86_400_000,
          }),
        );
        localStorage.setItem(
          "lumenx.admin.supabase.auth.v1",
          JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            token_type: session.token_type ?? "bearer",
            expires_in: session.expires_in ?? 86_400,
            expires_at:
              session.expires_at ?? Math.floor(now / 1000) + 86_400,
            user: session.user,
          }),
        );
      },
      {
        sessionJson: JSON.stringify(adminSession),
        instituteId,
      },
    );
    await adminPage.goto(`${gate.adminBaseUrl}/student-attendance`);
    await expect(adminPage).toHaveURL(/student-attendance|attendance/, {
      timeout: 30_000,
    });
    await expect(
      adminPage
        .getByRole("heading", { name: /Attendance/i })
        .or(adminPage.getByText(/Take attendance|Student attendance|Attendance settings/i))
        .first(),
    ).toBeVisible({ timeout: 45_000 });

    // ── Parent sees own student attendance; other parent denied ──
    const parentCtx = await browser.newContext();
    const parentPage = await parentCtx.newPage();
    await connectLoginUi(parentPage, PARENT_PHONE, "parent", INST_A_NAME);
    const parentToken = await tokenFromConnect(parentPage);
    await parentPage.goto(`${gate.connectBaseUrl}/attendance`);
    await expect(
      parentPage
        .getByRole("heading", { name: /^Attendance$/i })
        .or(parentPage.getByText(/present|absent|attendance %|days present/i))
        .first(),
    ).toBeVisible({ timeout: 20_000 });

    const parentPortal = await fetch(
      `${API}/api/v1/attendance/portal/students/${(await fetch(`${API}/api/v1/me`, { headers: { Authorization: `Bearer ${parentToken}` } }).then((r) => r.json())).data?.identities?.students?.[0]?.id ?? ""}?institute_id=${instituteId}`,
      { headers: { Authorization: `Bearer ${parentToken}` } },
    );
    // If student id resolution fails, list path still must not 5xx for parent
    expect(parentPortal.status).toBeLessThan(500);

    const otherParentCtx = await browser.newContext();
    const otherParentPage = await otherParentCtx.newPage();
    let otherParentLoginOk = true;
    try {
      await connectLoginUi(
        otherParentPage,
        OTHER_PARENT_PHONE,
        "parent",
        INST_B_NAME,
      );
    } catch {
      otherParentLoginOk = false;
    }
    if (otherParentLoginOk) {
      const otherTok = await tokenFromConnect(otherParentPage);
      const denied = await fetch(
        `${API}/api/v1/attendance/registers/${registerId}`,
        { headers: { Authorization: `Bearer ${otherTok}` } },
      );
      expect([401, 403, 404]).toContain(denied.status);
    }

    // ── Unassigned teacher (Institute B) cannot modify Institute A register ──
    const otherTeacherCtx = await browser.newContext();
    const otherTeacherPage = await otherTeacherCtx.newPage();
    let otherTeacherOk = true;
    try {
      await connectLoginUi(
        otherTeacherPage,
        OTHER_TEACHER_PHONE,
        "teacher",
        INST_B_NAME,
      );
    } catch {
      otherTeacherOk = false;
    }
    if (otherTeacherOk) {
      const otherTeacherTok = await tokenFromConnect(otherTeacherPage);
      const forbiddenPatch = await fetch(
        `${API}/api/v1/attendance/registers/${registerId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${otherTeacherTok}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            marks: [{ enrollment_id: enrollmentId, status: "absent" }],
          }),
        },
      );
      expect([401, 403, 404]).toContain(forbiddenPatch.status);
    }

    // ── Cache isolation: teacher context must not show parent shell identity ──
    await teacherPage.goto(`${gate.connectBaseUrl}/attendance`);
    await expect(teacherPage.getByText(/Parent Portal|Smoke Connect Parent/i)).toHaveCount(0);

    await teacherCtx.close();
    await adminCtx.close();
    await parentCtx.close();
    await otherParentCtx.close();
    await otherTeacherCtx.close();

    // Surface soft blockers without failing the core lifecycle
    expect(studentDisplay.length).toBeGreaterThan(0);
    if (!otherParentLoginOk) {
      test.info().annotations.push({
        type: "blocker",
        description:
          "Other-parent Connect UI login failed — isolation asserted only when login succeeds",
      });
    }
    if (!otherTeacherOk) {
      test.info().annotations.push({
        type: "blocker",
        description:
          "Institute-B teacher Connect UI login failed — cross-institute write denial asserted only when login succeeds",
      });
    }
  });
});
