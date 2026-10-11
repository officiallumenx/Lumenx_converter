import { expect, type BrowserContext, type Page, type Response } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type TransportFixture = {
  instituteId: string;
  instituteName: string;
  driverPhone: string;
  driverPin: string;
  driverId: string;
  vehicleId: string;
  vehicleNumber: string;
  routeId: string;
  routeName: string;
  pickupStopId: string;
  dropStopId: string;
  studentId: string;
  enrollmentId: string;
  serviceDate: string;
  apiBaseUrl: string;
  adminEmail?: string;
  adminPassword?: string;
  adminPin?: string;
  adminUserId?: string;
  adminBaseUrl?: string;
  transportBaseUrl?: string;
  student2Id?: string;
  enrollment2Id?: string;
  student2Name?: string;
};

const FIXTURE_PATH = resolve(process.cwd(), "e2e/transport/.fixture.json");

export function loadTransportFixture(): TransportFixture | null {
  if (!existsSync(FIXTURE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as TransportFixture;
  } catch {
    return null;
  }
}

export function fixtureOrSkip(): TransportFixture {
  const fixture = loadTransportFixture();
  if (!fixture?.driverPhone || !fixture.driverPin || !fixture.instituteId) {
    throw new Error(
      "BLOCKED: missing e2e/transport/.fixture.json — run node e2e/transport/provision-fixture.mjs --reset-trips",
    );
  }
  return fixture;
}

export type NetworkCapture = {
  failed: Array<{ url: string; status: number; method: string }>;
  consoleErrors: string[];
  tripPosts: Array<{ status: number; slot?: string; id?: string }>;
  droppingPosts: Array<{
    status: number;
    droppingStatus?: string;
    stopId?: string;
    studentId?: string;
  }>;
  tripEnds: Array<{ status: number; phase?: string; slot?: string }>;
  tripLists: Array<{ status: number; url: string }>;
};

export function attachNetworkCapture(page: Page): NetworkCapture {
  const capture: NetworkCapture = {
    failed: [],
    consoleErrors: [],
    tripPosts: [],
    droppingPosts: [],
    tripEnds: [],
    tripLists: [],
  };

  page.on("console", (msg) => {
    if (msg.type() === "error") capture.consoleErrors.push(msg.text());
  });

  page.on("response", async (response) => {
    const url = response.url();
    const status = response.status();
    const method = response.request().method();
    if (status >= 400) {
      capture.failed.push({ url: redactUrl(url), status, method });
    }
    if (!url.includes("/api/v1/transport/")) return;

    try {
      if (method === "GET" && /\/transport\/trips\?/.test(url)) {
        capture.tripLists.push({ status, url: redactUrl(url) });
      }
      if (method === "POST" && /\/transport\/trips$/.test(url.split("?")[0]!)) {
        const json = (await response.json().catch(() => null)) as {
          data?: { id?: string; slot?: string };
        } | null;
        capture.tripPosts.push({
          status,
          slot: json?.data?.slot,
          id: json?.data?.id,
        });
      }
      if (method === "POST" && /\/dropping$/.test(url)) {
        const json = (await response.json().catch(() => null)) as {
          data?: {
            droppingStatus?: string;
            stopId?: string;
            studentId?: string;
          };
        } | null;
        capture.droppingPosts.push({
          status,
          droppingStatus: json?.data?.droppingStatus,
          stopId: json?.data?.stopId,
          studentId: json?.data?.studentId,
        });
      }
      if (method === "POST" && /\/end$/.test(url)) {
        const json = (await response.json().catch(() => null)) as {
          data?: { phase?: string; slot?: string };
        } | null;
        capture.tripEnds.push({
          status,
          phase: json?.data?.phase,
          slot: json?.data?.slot,
        });
      }
    } catch {
      // ignore body parse races
    }
  });

  return capture;
}

function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("access_token");
    u.searchParams.delete("token");
    return `${u.pathname}${u.search}`;
  } catch {
    return url.replace(/https?:\/\/[^/]+/, "");
  }
}

export async function grantDriverPermissions(
  context: BrowserContext,
  origin = "http://127.0.0.1:4184",
): Promise<void> {
  await context.grantPermissions(["geolocation", "notifications"], { origin });
  await context.setGeolocation({ latitude: 17.385, longitude: 78.4867 });
}

export async function signInTransportDriver(
  page: Page,
  fixture: TransportFixture,
): Promise<void> {
  await page.goto("/login", { waitUntil: "domcontentloaded" });

  // Already authenticated → app redirects off /login.
  await expect
    .poll(
      async () => {
        const url = page.url();
        const text = await page.locator("body").innerText();
        if (/Driver sign in/i.test(text)) return "login";
        if (!/\/login/i.test(url)) return "authed";
        return "wait";
      },
      { timeout: 20_000 },
    )
    .toMatch(/login|authed/);

  if (!/Driver sign in/i.test(await page.locator("body").innerText())) {
    return;
  }

  await page.getByPlaceholder("9876543210").fill(fixture.driverPhone);
  await page.getByPlaceholder("App account PIN").fill(fixture.driverPin);
  // Dedicated institute when the login form exposes the field.
  const instituteField = page.getByPlaceholder(/institute/i).or(
    page.getByLabel(/institute/i),
  );
  if (await instituteField.count()) {
    await instituteField.first().fill(fixture.instituteId);
  }
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
}

export async function waitForHomeHydrated(
  page: Page,
  fixture: TransportFixture,
): Promise<void> {
  await expect
    .poll(async () => page.locator("body").innerText(), { timeout: 60_000 })
    .toMatch(new RegExp(fixture.vehicleNumber, "i"));

  await expect
    .poll(
      async () => {
        const text = await page.locator("body").innerText();
        if (/Loading…|Loading assignment/i.test(text)) return "loading";
        if (/Start Pickup Trip/i.test(text)) return "start_pickup";
        if (/Start Drop Trip/i.test(text)) return "start_drop";
        if (/Open current trip/i.test(text)) return "continue";
        if (/Day complete|Trips complete for today/i.test(text)) return "day_complete";
        if (/Set up route|View stops/i.test(text)) return "setup";
        return "other";
      },
      { timeout: 60_000 },
    )
    .toMatch(/^(start_pickup|start_drop|continue|day_complete)$/);
}

export async function waitForTripListOk(
  page: Page,
  capture: NetworkCapture,
): Promise<void> {
  await expect
    .poll(() => capture.tripLists.some((r) => r.status === 200), {
      timeout: 45_000,
    })
    .toBe(true);
}

export async function startTripViaUi(
  page: Page,
  kind: "Pickup" | "Drop",
): Promise<Response | null> {
  const homeStart = page.getByRole("button", {
    name: new RegExp(`Start ${kind} Trip`, "i"),
  });
  await expect(homeStart).toBeVisible({ timeout: 20_000 });
  await homeStart.click();

  await expect(
    page.getByText(new RegExp(`Before you start ${kind}`, "i")),
  ).toBeVisible({ timeout: 15_000 });

  const confirmStart = page.getByRole("button", {
    name: new RegExp(`Confirm Start ${kind}`, "i"),
  });
  const fixBtn = page.getByRole("button", { name: /Fix & check again/i });
  // Readiness sheet footer: either Fix & check again, or Start {kind} Trip (then confirm sheet).
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (await confirmStart.isVisible().catch(() => false)) break;
    if (await fixBtn.isVisible().catch(() => false)) {
      await fixBtn.click();
      await page.waitForTimeout(2_500);
      continue;
    }
    const readyStart = page
      .getByText(new RegExp(`Before you start ${kind}`, "i"))
      .locator("..")
      .getByRole("button", { name: new RegExp(`Start ${kind} Trip`, "i") });
    // Prefer any visible Start {kind} Trip that is not the buried home CTA.
    const sheetStart = page.getByRole("button", {
      name: new RegExp(`Start ${kind} Trip`, "i"),
    });
    if (await sheetStart.count()) {
      // Click the last matching button (sheet footer sits above home hero).
      await sheetStart.last().click();
      break;
    }
    if (await readyStart.isVisible().catch(() => false)) {
      await readyStart.click();
      break;
    }
    await page.waitForTimeout(1_000);
  }

  await expect(confirmStart).toBeVisible({ timeout: 45_000 });

  const tripPostPromise = page.waitForResponse(
    (res) =>
      res.request().method() === "POST" &&
      /\/api\/v1\/transport\/trips$/.test(res.url().split("?")[0] ?? "") &&
      res.status() < 500,
    { timeout: 60_000 },
  );
  await confirmStart.click();

  const response = await tripPostPromise.catch(() => null);
  await expect(page).toHaveURL(/attendance/i, { timeout: 60_000 });
  return response;
}

export async function markFirstStudent(
  page: Page,
  _mode: "boarded" | "dropped",
): Promise<void> {
  const byName = page.getByText("E2E Rider", { exact: false }).first();
  await expect(byName).toBeVisible({ timeout: 20_000 });
  await byName.click();

  const confirm = page.getByRole("button", { name: /^Confirm$/i });
  if (await confirm.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await confirm.click();
  }
}

export async function endTripViaUi(page: Page): Promise<Response | null> {
  const endBtn = page.getByRole("button", { name: /^End Trip$/i });
  await expect(endBtn).toBeVisible({ timeout: 20_000 });
  await endBtn.click();

  const endPromise = page.waitForResponse(
    (res) =>
      res.request().method() === "POST" &&
      /\/api\/v1\/transport\/trips\/[^/]+\/end$/.test(res.url()) &&
      res.status() < 500,
    { timeout: 45_000 },
  );

  const confirm = page.getByRole("button", { name: /Confirm End Trip/i });
  await expect(confirm).toBeVisible({ timeout: 15_000 });
  await confirm.click();

  const response = await endPromise.catch(() => null);
  // Some builds remain on attendance briefly after end — accept home or force navigate.
  try {
    await expect(page).toHaveURL(/\/($|\?)/, { timeout: 15_000 });
  } catch {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/($|\?)/, { timeout: 20_000 });
  }
  return response;
}

export async function goHome(page: Page): Promise<void> {
  const home = page
    .getByRole("button", { name: /^Home$/i })
    .or(page.getByRole("link", { name: /^Home$/i }))
    .first();
  await home.click();
  await expect(page).toHaveURL(/\/($|\?)/, { timeout: 20_000 });
}
