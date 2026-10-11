import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import type { TransportFixture } from "./helpers";
import { grantDriverPermissions, signInTransportDriver, waitForHomeHydrated } from "./helpers";

export type AdminFixture = TransportFixture & {
  adminEmail: string;
  adminPassword: string;
  adminPin: string;
  adminBaseUrl: string;
  transportBaseUrl: string;
  student2Name: string;
  student2Id: string;
};

export function asAdminFixture(fixture: TransportFixture): AdminFixture | null {
  const f = fixture as AdminFixture;
  if (!f.adminEmail || !f.adminPassword || !f.adminPin || !f.adminBaseUrl) {
    return null;
  }
  return f;
}

export async function signInAdminUi(
  page: Page,
  fixture: AdminFixture,
): Promise<void> {
  // Prefill the same key AdminLoginFlow reads so the dedicated institute is
  // selected after the staff/institutes fetch (picker open is flaky under PW).
  await page.goto(`${fixture.adminBaseUrl}/login`, {
    waitUntil: "domcontentloaded",
  });
  await page.evaluate((instituteId) => {
    localStorage.setItem("lx_admin_login_institute_id", instituteId);
  }, fixture.instituteId);
  const institutesRes = page.waitForResponse(
    (res) =>
      /\/api\/v1\/auth\/staff\/institutes/.test(res.url()) && res.status() === 200,
    { timeout: 45_000 },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await institutesRes.catch(() => null);

  await expect(page.getByText(/Choose your institute/i)).toBeVisible({
    timeout: 30_000,
  });

  const picker = page.locator("#instituteId");
  await expect(picker).toBeVisible({ timeout: 30_000 });
  await expect(picker).toBeEnabled({ timeout: 45_000 });

  const nameRe = new RegExp(escapeRegExp(fixture.instituteName), "i");
  if (!nameRe.test(await picker.innerText())) {
    await picker.click({ force: true });
    const option = page.getByRole("option", { name: nameRe });
    await expect(option).toBeVisible({ timeout: 20_000 });
    await option.click();
  }
  await expect(picker).toContainText(nameRe, { timeout: 20_000 });

  await page.getByRole("button", { name: /^Continue$/i }).click();

  // Identifier
  const idInput = page
    .getByPlaceholder(/email|mobile|identifier/i)
    .or(page.getByLabel(/email|mobile|identifier|Your ID/i))
    .first();
  await expect(idInput).toBeVisible({ timeout: 20_000 });
  await idInput.fill(fixture.adminEmail);
  await page.getByRole("button", { name: /^Continue$/i }).click();

  // Password (requiresOtp=false for provisioned admin)
  const passwordInput = page.locator('input[type="password"]').first();
  await expect(passwordInput).toBeVisible({ timeout: 20_000 });
  await passwordInput.fill(fixture.adminPassword);
  await page.getByRole("button", { name: /^Continue$/i }).click();

  // PIN — submit label is "Login" (disabled until 4–8 digits)
  const pinInput = page
    .getByPlaceholder(/digit PIN|PIN/i)
    .or(page.locator('input[inputmode="numeric"]'))
    .last();
  await expect(pinInput).toBeVisible({ timeout: 20_000 });
  await pinInput.fill(fixture.adminPin);
  const loginBtn = page.getByRole("button", { name: /^Login$/i });
  await expect(loginBtn).toBeEnabled({ timeout: 10_000 });
  await loginBtn.click();

  await expect(page).not.toHaveURL(/\/login/, { timeout: 45_000 });
}

export async function openAdminTransportReviews(
  page: Page,
  fixture: AdminFixture,
): Promise<void> {
  await page.goto(`${fixture.adminBaseUrl}/transport?view=reviews`, {
    waitUntil: "domcontentloaded",
  });
  await expect
    .poll(async () => page.locator("body").innerText(), { timeout: 45_000 })
    .toMatch(/Publish|review|Nothing to publish|Stop:/i);
}

export async function openTransportRouteSetup(
  page: Page,
  fixture: AdminFixture,
): Promise<void> {
  await grantDriverPermissions(page.context(), fixture.transportBaseUrl);

  // Always establish a driver session first (handles fresh + expired sessions).
  // signInTransportDriver no-ops when already authenticated.
  await signInTransportDriver(page, fixture);
  await waitForHomeHydrated(page, fixture);
  await page.goto(`${fixture.transportBaseUrl}/more/route-setup`, {
    waitUntil: "domcontentloaded",
  });

  await expect
    .poll(async () => page.locator("body").innerText(), { timeout: 45_000 })
    .toMatch(/Route Setup|Add Stop|My Stops|Stops/i);
}

/** Clear student2 pickup so Route Setup "New" list is non-empty for UI assigns. */
export async function ensureStudent2NeedsPickup(
  fixture: AdminFixture,
): Promise<void> {
  if (!fixture.enrollment2Id) return;
  const headers = await apiAuthHeaders(fixture, "admin");
  await fetch(
    `${fixture.apiBaseUrl}/api/v1/transport/enrollments/${fixture.enrollment2Id}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        pickup_stop_id: null,
        drop_stop_id: fixture.dropStopId,
      }),
    },
  );
}

export async function submitNewPendingStopViaUi(
  page: Page,
  fixture: AdminFixture,
  stopName: string,
  opts?: { requireStudent?: boolean },
): Promise<string> {
  const requireStudent = opts?.requireStudent ?? false;
  await ensureStudent2NeedsPickup(fixture);
  await openTransportRouteSetup(page, fixture);

  const addBtn = page.getByRole("button", { name: /Add Stop/i });
  await expect(addBtn).toBeVisible({ timeout: 20_000 });
  await addBtn.click();

  // GPS capture may be automatic or need a button
  const captureBtn = page.getByRole("button", {
    name: /Capture|Use location|Get location|GPS/i,
  });
  if (await captureBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await captureBtn.click();
  }

  await expect(page.getByRole("button", { name: /Send to Admin|Resubmit to Admin/i })).toBeVisible({
    timeout: 30_000,
  });

  const nameInput = page
    .getByLabel(/stop name|name/i)
    .or(page.getByPlaceholder(/stop name|name|e\.g\./i))
    .or(page.locator('input[type="text"]').first());
  await nameInput.first().fill(stopName);

  // Prefer "New" students; fall back to Existing (update location)
  let studentRow = page
    .locator("button, label, [role='checkbox'], li")
    .filter({ hasText: new RegExp(escapeRegExp(fixture.student2Name), "i") });
  if (!(await studentRow.count())) {
    const mode = page.getByLabel(/^Students$/i).or(page.locator("#rs-student-mode"));
    if (await mode.count()) {
      await mode.first().selectOption({ label: /Existing/i }).catch(async () => {
        await mode.first().click();
        await page.getByText(/Existing/i).first().click();
      });
    }
    studentRow = page
      .locator("button, label, [role='checkbox'], li")
      .filter({ hasText: new RegExp(escapeRegExp(fixture.student2Name), "i") });
  }
  if (await studentRow.count()) {
    await studentRow.first().click();
  } else if (requireStudent) {
    throw new Error("BLOCKED: no eligible student visible for stop assignment");
  }

  const stopPost = page.waitForResponse(
    (res) =>
      res.request().method() === "POST" &&
      /\/api\/v1\/transport\/stops$/.test(res.url().split("?")[0] ?? "") &&
      res.status() < 500,
    { timeout: 60_000 },
  );

  await page.getByRole("button", { name: /Send to Admin|Submit|Resubmit/i }).click();
  const res = await stopPost;
  expect(res.status()).toBeLessThan(300);
  const json = (await res.json()) as {
    data?: { id?: string; approvalStatus?: string; name?: string };
  };
  expect(json.data?.approvalStatus ?? "pending").toMatch(/pending/i);
  expect(json.data?.id).toBeTruthy();
  return json.data!.id!;
}

function reviewCardForStop(page: Page, stopName: string) {
  // Narrow to the leaf card that owns both the Stop title and action buttons
  // (outer wrappers also match a broad hasText filter).
  return page
    .locator("div")
    .filter({
      has: page.getByText(
        new RegExp(`Stop:\\s*${escapeRegExp(stopName)}`, "i"),
      ),
    })
    .filter({ has: page.locator("textarea") })
    .filter({ has: page.getByRole("button", { name: /^Decline$/i }) })
    .last();
}

export async function approveStopInAdminUi(
  page: Page,
  fixture: AdminFixture,
  stopName: string,
): Promise<void> {
  await openAdminTransportReviews(page, fixture);
  const card = reviewCardForStop(page, stopName);
  await expect(card).toBeVisible({ timeout: 45_000 });

  const approvePost = page.waitForResponse(
    (res) =>
      res.request().method() === "POST" &&
      /\/stops\/[^/]+\/approve$/.test(res.url()) &&
      res.status() < 500,
    { timeout: 60_000 },
  );
  await card.getByRole("button", { name: /^(Publish|Approve)$/i }).click();
  const res = await approvePost;
  expect(res.status()).toBeLessThan(300);
}

export async function rejectStopInAdminUi(
  page: Page,
  fixture: AdminFixture,
  stopName: string,
  reason: string,
): Promise<void> {
  await openAdminTransportReviews(page, fixture);
  const card = reviewCardForStop(page, stopName);
  await expect(card).toBeVisible({ timeout: 45_000 });
  await card.locator("textarea").first().fill(reason);

  const rejectPost = page.waitForResponse(
    (res) =>
      res.request().method() === "POST" &&
      /\/stops\/[^/]+\/reject$/.test(res.url()) &&
      res.status() < 500,
    { timeout: 60_000 },
  );
  await card.getByRole("button", { name: /^Decline$/i }).click();
  const res = await rejectPost;
  expect(res.status()).toBeLessThan(300);
  const json = (await res.json()) as {
    data?: { approvalStatus?: string; rejectionReason?: string };
  };
  expect(json.data?.approvalStatus).toMatch(/rejected/i);
  expect(json.data?.rejectionReason ?? "").toMatch(new RegExp(escapeRegExp(reason), "i"));
}

export async function apiAuthHeaders(
  fixture: AdminFixture,
  who: "admin" | "driver",
): Promise<Record<string, string>> {
  if (who === "driver") {
    const login = await fetch(`${fixture.apiBaseUrl}/api/v1/auth/transport/pin-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        phone: fixture.driverPhone,
        pin: fixture.driverPin,
        institute_id: fixture.instituteId,
      }),
    });
    const json = (await login.json()) as { data?: { access_token?: string } };
    const token = json.data?.access_token;
    if (!token) throw new Error("driver token missing");
    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }

  const staff = await fetch(`${fixture.apiBaseUrl}/api/v1/auth/staff/password-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      institute_id: fixture.instituteId,
      identifier: fixture.adminEmail,
      password: fixture.adminPassword,
      pin: fixture.adminPin,
    }),
  });
  const json = (await staff.json().catch(() => ({}))) as {
    data?: { access_token?: string };
    error?: { message?: string };
  };
  if (!staff.ok || !json.data?.access_token) {
    throw new Error(
      `BLOCKED: admin staff password-login HTTP ${staff.status}: ${json.error?.message ?? "no token"}`,
    );
  }
  return {
    Authorization: `Bearer ${json.data.access_token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export async function listStopsApi(
  fixture: AdminFixture,
  headers: Record<string, string>,
): Promise<
  Array<{
    id: string;
    name: string;
    approvalStatus: string;
    rejectionReason?: string | null;
    routeOrder?: number;
    kind?: string;
  }>
> {
  const res = await fetch(
    `${fixture.apiBaseUrl}/api/v1/transport/stops?route_id=${fixture.routeId}`,
    { headers },
  );
  const json = (await res.json()) as { data?: Array<Record<string, unknown>> };
  if (!res.ok) throw new Error(`list stops ${res.status}`);
  return (json.data ?? []).map((s) => ({
    id: String(s.id),
    name: String(s.name),
    approvalStatus: String(s.approvalStatus ?? s.approval_status ?? ""),
    rejectionReason: (s.rejectionReason ?? s.rejection_reason ?? null) as string | null,
    routeOrder:
      typeof s.routeOrder === "number"
        ? s.routeOrder
        : typeof s.route_order === "number"
          ? s.route_order
          : undefined,
    kind: s.kind != null ? String(s.kind) : undefined,
  }));
}

export type EnrollmentApiRow = {
  id: string;
  studentId: string;
  routeId: string;
  pickupStopId: string | null;
  dropStopId: string | null;
  approvalStatus: string;
};

export async function listEnrollmentsApi(
  fixture: AdminFixture,
  headers: Record<string, string>,
): Promise<EnrollmentApiRow[]> {
  const res = await fetch(
    `${fixture.apiBaseUrl}/api/v1/transport/enrollments?institute_id=${fixture.instituteId}`,
    { headers },
  );
  const json = (await res.json()) as { data?: Array<Record<string, unknown>> };
  if (!res.ok) throw new Error(`list enrollments ${res.status}`);
  return (json.data ?? []).map((e) => ({
    id: String(e.id),
    studentId: String(e.studentId ?? e.student_id ?? ""),
    routeId: String(e.routeId ?? e.route_id ?? ""),
    pickupStopId: (e.pickupStopId ?? e.pickup_stop_id ?? null) as string | null,
    dropStopId: (e.dropStopId ?? e.drop_stop_id ?? null) as string | null,
    approvalStatus: String(e.approvalStatus ?? e.approval_status ?? ""),
  }));
}

export async function createPendingStopApi(
  fixture: AdminFixture,
  headers: Record<string, string>,
  input: { name: string; routeOrder: number; lat?: number; lng?: number },
): Promise<{ id: string; approvalStatus: string; routeOrder: number }> {
  const res = await fetch(`${fixture.apiBaseUrl}/api/v1/transport/stops`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      institute_id: fixture.instituteId,
      route_id: fixture.routeId,
      name: input.name,
      location_label: input.name,
      latitude: input.lat ?? 17.385 + Math.random() * 0.01,
      longitude: input.lng ?? 78.4867 + Math.random() * 0.01,
      route_order: input.routeOrder,
      kind: "waypoint",
    }),
  });
  const json = (await res.json()) as {
    data?: { id?: string; approvalStatus?: string; routeOrder?: number };
    error?: { message?: string };
  };
  if (!res.ok || !json.data?.id) {
    throw new Error(`create stop ${res.status}: ${json.error?.message ?? "fail"}`);
  }
  return {
    id: json.data.id,
    approvalStatus: String(json.data.approvalStatus ?? "pending"),
    routeOrder: Number(json.data.routeOrder ?? input.routeOrder),
  };
}

export async function rejectStopApi(
  fixture: AdminFixture,
  headers: Record<string, string>,
  stopId: string,
  reason: string,
): Promise<void> {
  const res = await fetch(
    `${fixture.apiBaseUrl}/api/v1/transport/stops/${stopId}/reject`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ reason }),
    },
  );
  if (!res.ok) throw new Error(`reject stop ${res.status}`);
}

export async function approveStopApi(
  fixture: AdminFixture,
  headers: Record<string, string>,
  stopId: string,
): Promise<void> {
  const res = await fetch(
    `${fixture.apiBaseUrl}/api/v1/transport/stops/${stopId}/approve`,
    { method: "POST", headers },
  );
  if (!res.ok) throw new Error(`approve stop ${res.status}`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function newAdminContext(browser: Browser): Promise<{
  context: BrowserContext;
  page: Page;
}> {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4181",
  });
  const page = await context.newPage();
  return { context, page };
}
