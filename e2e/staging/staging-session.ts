/**
 * Shared helpers for hosted staging multi-role Playwright suites.
 * Never logs secrets. Browser uses anon key + user JWT only.
 */
import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  evaluateStagingLiveGate,
  type StagingLiveGate,
} from "./live-gate";

export const EXPECTED_STAGING_REF = "yveadybpntziyryxsrsu";
export const DENIED_PRODUCTION_REF = "kmpzflsurepjwqnfqyld";

export const INST_A_NAME = "LumenX E2E Test Institute";
export const INST_B_NAME = "LumenX E2E Isolation Institute";
export const TEACHER_PHONE = "9000000091";
export const PARENT_PHONE = "9000000092";
export const STUDENT_PHONE = "9000000093";
export const OTHER_PARENT_PHONE = "9000000192";
export const OTHER_TEACHER_PHONE = "9000000191";
export const DEMO_OTP = "123456";
export const OPERATOR_EMAIL = "lumenx.e2e.operator@lumenx.test";

export function loadStagingEnvFile(): Record<string, string> {
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

export type StagingCredentials = {
  gate: StagingLiveGate;
  password: string;
  pin: string;
  supabaseUrl: string;
  supabaseAnon: string;
  api: string;
};

export function loadStagingCredentials(): StagingCredentials {
  const gate = evaluateStagingLiveGate(process.env);
  const fileEnv = loadStagingEnvFile();
  const password =
    process.env.E2E_SMOKE_PASSWORD?.trim() ||
    fileEnv.E2E_SMOKE_PASSWORD ||
    fileEnv.NEXUS_BOOTSTRAP_PASSWORD ||
    "";
  return {
    gate,
    password,
    pin: (process.env.E2E_CONNECT_PIN ?? fileEnv.E2E_CONNECT_PIN ?? "1234").trim(),
    supabaseUrl: process.env.SUPABASE_URL?.trim() || fileEnv.SUPABASE_URL || "",
    supabaseAnon:
      process.env.SUPABASE_ANON_KEY?.trim() || fileEnv.SUPABASE_ANON_KEY || "",
    api: gate.apiBaseUrl,
  };
}

/** Hard abort before any mutation if staging identity is wrong. */
export function assertStagingMutationSafe(creds: StagingCredentials): void {
  expect(creds.gate.ok, creds.gate.reasons.join("; ")).toBeTruthy();
  expect(creds.gate.projectRef).toBe(EXPECTED_STAGING_REF);
  expect(creds.gate.projectRef).not.toBe(DENIED_PRODUCTION_REF);
  expect(creds.password.length).toBeGreaterThan(0);
  expect(creds.supabaseUrl).toContain(`${EXPECTED_STAGING_REF}.supabase.co`);
}

/** Wait for local staging API shell; recovers from brief ECONNREFUSED between files. */
export async function ensureStagingApiUp(creds: StagingCredentials): Promise<void> {
  await expect(async () => {
    const res = await fetch(`${creds.api}/api/v1/health`);
    expect(res.ok, `API health HTTP ${res.status}`).toBeTruthy();
  }).toPass({ timeout: 90_000, intervals: [1_000, 2_000, 5_000, 10_000] });
}

/** Gate + API readiness before fixture resolution / mutations. */
export async function assertStagingReady(creds: StagingCredentials): Promise<void> {
  assertStagingMutationSafe(creds);
  await ensureStagingApiUp(creds);
}

export async function signInEmail(
  creds: StagingCredentials,
  email: string,
): Promise<string> {
  const anon = createClient(creds.supabaseUrl, creds.supabaseAnon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon.auth.signInWithPassword({
    email,
    password: creds.password,
  });
  expect(error, error?.message).toBeFalsy();
  const token = data.session?.access_token;
  expect(token, `session for ${email}`).toBeTruthy();
  return token!;
}

export async function signInOperatorSession(creds: StagingCredentials) {
  const anon = createClient(creds.supabaseUrl, creds.supabaseAnon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon.auth.signInWithPassword({
    email: OPERATOR_EMAIL,
    password: creds.password,
  });
  expect(error, error?.message).toBeFalsy();
  expect(data.session?.access_token).toBeTruthy();
  return data.session!;
}

export type InstituteAFixtures = {
  instituteId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  enrollmentId: string;
  studentId: string;
  teacherId: string;
};

export async function resolveInstituteAFixtures(
  creds: StagingCredentials,
  adminToken: string,
): Promise<InstituteAFixtures> {
  const api = creds.api;
  const institutes = await fetch(`${api}/api/v1/institutes`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  }).then((r) => r.json());
  const row = (institutes.data ?? []).find(
    (i: { name?: string }) => i.name === INST_A_NAME,
  );
  const instituteId = row?.id as string;
  expect(instituteId, "Institute A id").toBeTruthy();

  const years = await fetch(
    `${api}/api/v1/academic-years?institute_id=${instituteId}`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
  ).then((r) => r.json());
  const year = (years.data ?? []).find((y: { code?: string }) => y.code === "E2E-AY");
  const academicYearId = year?.id as string;
  expect(
    academicYearId,
    "E2E academic year — run e2e/staging/ensure-multi-role-fixtures.mjs",
  ).toBeTruthy();

  const classes = await fetch(
    `${api}/api/v1/classes?institute_id=${instituteId}&academic_year_id=${academicYearId}`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
  ).then((r) => r.json());
  const klass = (classes.data ?? []).find((c: { code?: string }) => c.code === "E2E-C1");
  const classId = klass?.id as string;
  expect(classId).toBeTruthy();

  const sections = await fetch(
    `${api}/api/v1/sections?institute_id=${instituteId}&class_id=${classId}`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
  ).then((r) => r.json());
  const section = (sections.data ?? []).find(
    (s: { code?: string }) => s.code === "E2E-S1",
  );
  const sectionId = section?.id as string;
  expect(sectionId).toBeTruthy();

  const subjects = await fetch(
    `${api}/api/v1/subjects?institute_id=${instituteId}`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
  ).then((r) => r.json());
  const subject = (subjects.data ?? []).find(
    (s: { code?: string }) => s.code === "E2E-SUB",
  );
  const subjectId = subject?.id as string;
  expect(subjectId, "E2E-SUB subject").toBeTruthy();

  const enrollments = await fetch(
    `${api}/api/v1/enrollments?institute_id=${instituteId}&section_id=${sectionId}`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
  ).then((r) => r.json());
  const enr = (enrollments.data ?? [])[0];
  expect(enr?.id, "enrollment for E2E section").toBeTruthy();

  const teachers = await fetch(
    `${api}/api/v1/teachers?institute_id=${instituteId}`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
  ).then((r) => r.json());
  const teacher = (teachers.data ?? []).find(
    (t: { email?: string; phone?: string; displayName?: string }) =>
      t.email === "smoke.connect.teacher@lumenx.test" ||
      t.phone === TEACHER_PHONE ||
      /Smoke Connect Teacher/i.test(t.displayName ?? ""),
  );
  expect(teacher?.id, "Smoke Connect Teacher row").toBeTruthy();

  return {
    instituteId,
    academicYearId,
    classId,
    sectionId,
    subjectId,
    enrollmentId: enr.id as string,
    studentId: enr.studentId as string,
    teacherId: teacher.id as string,
  };
}

export async function connectLoginUi(
  page: Page,
  creds: StagingCredentials,
  phone: string,
  role: "teacher" | "parent" | "student",
  instituteName: string = INST_A_NAME,
) {
  await page.goto(`${creds.gate.connectBaseUrl}/login`, {
    waitUntil: "domcontentloaded",
  });
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

  const combobox = page.getByRole("combobox");
  await expect(combobox).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Loading institutes/i)).toHaveCount(0, {
    timeout: 30_000,
  });
  await combobox.click();
  const search = page.getByPlaceholder("Type name or code…");
  await expect(search).toBeVisible({ timeout: 10_000 });
  const filter = instituteName.includes("Isolation") ? "Isolation" : "E2E Test";
  await search.fill(filter);
  await page.getByText(instituteName, { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  const roleLabel =
    role === "teacher"
      ? "Teacher Portal"
      : role === "parent"
        ? "Parent Portal"
        : "Student Portal";
  await expect(page.getByText("Choose portal")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: new RegExp(roleLabel, "i") }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  const phoneInput = page.locator("#login-phone");
  await expect(phoneInput).toBeVisible({ timeout: 15_000 });
  await phoneInput.fill(phone);
  await page.getByRole("button", { name: "Continue" }).click();

  const otpHeading = page.getByText(/Verify mobile|Verify to reset PIN/i);
  const pinHeading = page.getByText(/Enter your Login PIN|Create your Login PIN/i);
  await expect(otpHeading.or(pinHeading).first()).toBeVisible({ timeout: 30_000 });

  if (await otpHeading.isVisible().catch(() => false)) {
    const otpRoot = page.locator("[data-input-otp]");
    if ((await otpRoot.count()) > 0) {
      await otpRoot.first().click();
      await page.keyboard.type(DEMO_OTP, { delay: 40 });
    } else {
      await page.getByRole("textbox").last().fill(DEMO_OTP);
    }
    await page.getByRole("button", { name: /Verify & continue/i }).click();
    const newPin = page.locator("#connect-pin-new");
    await expect(newPin).toBeVisible({ timeout: 20_000 });
    await newPin.fill(creds.pin);
    await page.locator("#connect-pin-confirm").fill(creds.pin);
    await page.getByRole("button", { name: /Save PIN/i }).click();
  }

  const pinField = page.locator("#portal-pin-verify");
  await expect(pinField).toBeVisible({ timeout: 20_000 });
  await pinField.fill(creds.pin);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Full multi-role suites can trip Connect PIN rate limits ("Too many requests").
  await expect(async () => {
    if (page.url().includes("/login")) {
      const rateLimited = await page
        .getByText(/Too many requests/i)
        .isVisible()
        .catch(() => false);
      if (rateLimited) {
        await page.getByRole("button", { name: "Sign in" }).click();
      }
    }
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5_000 });
  }).toPass({ timeout: 120_000, intervals: [5_000, 10_000, 15_000, 20_000] });
}

export async function tokenFromConnect(page: Page): Promise<string> {
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

export async function apiJson(
  api: string,
  path: string,
  token: string,
  init?: RequestInit,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${api}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  return { status: res.status, body };
}
