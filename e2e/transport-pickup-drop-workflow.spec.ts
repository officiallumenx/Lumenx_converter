/**
 * Real API-mode Pickup → Drop → Day complete regression.
 * Requires: node e2e/transport/provision-fixture.mjs --reset-trips
 * Does not use blockApiWrites. Does not bypass readiness in app code —
 * browser permissions (geolocation + notifications) are granted via Playwright.
 */
import { expect, test } from "@playwright/test";
import {
  attachNetworkCapture,
  endTripViaUi,
  grantDriverPermissions,
  loadTransportFixture,
  markFirstStudent,
  signInTransportDriver,
  startTripViaUi,
  waitForHomeHydrated,
  waitForTripListOk,
  type NetworkCapture,
  type TransportFixture,
} from "./transport/helpers";

test.describe.configure({ mode: "serial" });

const loadedFixture = loadTransportFixture();
const fixtureReady = Boolean(
  loadedFixture?.driverPhone &&
    loadedFixture.driverPin &&
    loadedFixture.instituteId &&
    loadedFixture.vehicleId,
);

test.skip(
  !fixtureReady,
  "BLOCKED: missing e2e/transport/.fixture.json — run node e2e/transport/provision-fixture.mjs --reset-trips",
);

const fixture = loadedFixture as TransportFixture;
let capture: NetworkCapture;

test.beforeEach(async ({ context, page }, testInfo) => {
  await grantDriverPermissions(context);
  capture = attachNetworkCapture(page);
  testInfo.annotations.push({
    type: "fixture",
    description: `${fixture.instituteName} / ${fixture.vehicleNumber} / ${fixture.serviceDate}`,
  });
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    await page.screenshot({
      path: `qa-artifacts/pw-${testInfo.title.replace(/\W+/g, "-").slice(0, 60)}.png`,
      fullPage: true,
    });
    testInfo.attach("network-capture", {
      body: JSON.stringify(
        {
          failed: capture.failed,
          consoleErrors: capture.consoleErrors.slice(0, 20),
          tripPosts: capture.tripPosts,
          droppingPosts: capture.droppingPosts,
          tripEnds: capture.tripEnds,
          tripLists: capture.tripLists.slice(-5),
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
  }
});

test("Test 1: Pickup completion reveals Start Drop Trip", async ({ page }) => {
  await signInTransportDriver(page, fixture);
  await waitForHomeHydrated(page, fixture);
  await waitForTripListOk(page, capture);

  await expect(page.getByRole("button", { name: /Start Pickup Trip/i })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(fixture.vehicleNumber, { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: /Start Drop Trip/i })).toHaveCount(0);

  const startRes = await startTripViaUi(page, "Pickup");
  expect(startRes, "Pickup trip POST").toBeTruthy();
  expect(startRes!.status(), "Pickup create status").toBeLessThan(300);
  const startJson = (await startRes!.json()) as { data?: { slot?: string } };
  expect(startJson.data?.slot).toBe("morning");

  await expect(page.getByRole("tab", { name: /Boarding/i })).toBeVisible({
    timeout: 15_000,
  });
  await markFirstStudent(page, "boarded");
  await expect
    .poll(async () => page.locator("body").innerText(), { timeout: 20_000 })
    .toMatch(/Boarded|updated|Confirmed/i);

  const endRes = await endTripViaUi(page);
  expect(endRes, "Pickup end POST").toBeTruthy();
  expect(endRes!.status()).toBeLessThan(300);

  await waitForTripListOk(page, capture);
  await expect
    .poll(async () => page.locator("body").innerText(), { timeout: 45_000 })
    .toMatch(/Start Drop Trip/i);

  const home = await page.locator("body").innerText();
  expect(home).toMatch(/Start Drop Trip/i);
  expect(home).toMatch(/Pickup complete/i);
  expect(home).not.toMatch(/Start Pickup Trip/i);
  expect(capture.failed.filter((f) => f.status >= 500)).toEqual([]);
});

test("Test 2: Start Return/Drop trip via UI", async ({ page }) => {
  await signInTransportDriver(page, fixture);
  await waitForHomeHydrated(page, fixture);
  await expect(page.getByRole("button", { name: /Start Drop Trip/i })).toBeVisible({
    timeout: 45_000,
  });

  const startRes = await startTripViaUi(page, "Drop");
  expect(startRes, "Drop trip POST from UI").toBeTruthy();
  expect(startRes!.status()).toBeLessThan(300);
  const startJson = (await startRes!.json()) as {
    data?: { slot?: string; id?: string };
  };
  expect(startJson.data?.slot).toBe("evening");
  expect(startJson.data?.id).toBeTruthy();

  await expect(page).toHaveURL(/attendance/i);
  await expect(page.getByRole("tab", { name: /Dropping/i })).toBeVisible({
    timeout: 15_000,
  });
  // Active tab should be Dropping for evening slot.
  const droppingTab = page.getByRole("tab", { name: /Dropping/i });
  await expect(droppingTab).toHaveAttribute("data-state", /active|on/, {
    timeout: 10_000,
  }).catch(async () => {
    // Fallback: aria-selected
    await expect(droppingTab).toHaveAttribute("aria-selected", "true");
  });

  const lastDropCreate = capture.tripPosts.filter((t) => t.slot === "evening").at(-1);
  expect(lastDropCreate?.status).toBeLessThan(300);
});

test("Test 3: Mark student dropped persists via API", async ({ page }) => {
  await signInTransportDriver(page, fixture);
  await waitForHomeHydrated(page, fixture);

  // Continue active drop or open attendance.
  const continueBtn = page.getByRole("button", { name: /Open current trip/i });
  if (await continueBtn.isVisible().catch(() => false)) {
    await continueBtn.click();
  } else {
    await page.getByRole("link", { name: /Attendance/i }).first().click();
  }
  await expect(page).toHaveURL(/attendance/i, { timeout: 20_000 });

  const droppingTab = page.getByRole("tab", { name: /Dropping/i });
  if (await droppingTab.isVisible().catch(() => false)) {
    await droppingTab.click();
  }

  const dropPromise = page.waitForResponse(
    (res) =>
      res.request().method() === "POST" &&
      /\/dropping$/.test(res.url()) &&
      res.status() < 500,
    { timeout: 45_000 },
  );
  await markFirstStudent(page, "dropped");
  const confirm = page.getByRole("button", { name: /^Confirm$/i });
  if (await confirm.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await confirm.click();
  }
  const dropRes = await dropPromise;
  expect(dropRes.status()).toBeLessThan(300);
  const dropJson = (await dropRes.json()) as {
    data?: { droppingStatus?: string; stopId?: string; studentId?: string };
  };
  expect(dropJson.data?.droppingStatus).toBe("dropped");
  expect(dropJson.data?.studentId).toBe(fixture.studentId);
  expect(dropJson.data?.stopId).toBe(fixture.dropStopId);
  expect(dropJson.data?.stopId).not.toBe(fixture.pickupStopId);

  await expect
    .poll(async () => page.locator("body").innerText(), { timeout: 20_000 })
    .toMatch(/Dropped|updated/i);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/attendance/i, { timeout: 30_000 });
  await expect
    .poll(async () => page.locator("body").innerText(), { timeout: 30_000 })
    .toMatch(/Dropped/i);
});

test("Test 4: Complete Return/Drop → Day complete", async ({ page }) => {
  await signInTransportDriver(page, fixture);
  await waitForHomeHydrated(page, fixture);

  const continueBtn = page.getByRole("button", { name: /Open current trip/i });
  if (await continueBtn.isVisible().catch(() => false)) {
    await continueBtn.click();
    await expect(page).toHaveURL(/attendance/i, { timeout: 20_000 });
  } else if (!/attendance/i.test(page.url())) {
    await page.getByRole("link", { name: /Attendance/i }).first().click();
  }

  const endRes = await endTripViaUi(page);
  expect(endRes, "Drop end POST").toBeTruthy();
  expect(endRes!.status()).toBeLessThan(300);
  const endJson = (await endRes!.json()) as {
    data?: { phase?: string; slot?: string };
  };
  expect(endJson.data?.phase).toBe("completed");
  expect(endJson.data?.slot).toBe("evening");

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForHomeHydrated(page, fixture);
  await waitForTripListOk(page, capture);

  const home = await page.locator("body").innerText();
  expect(home).toMatch(/Day complete|Trips complete for today/i);
  expect(home).not.toMatch(/Start Pickup Trip/i);
  expect(home).not.toMatch(/Start Drop Trip/i);
});

test("Test 5: Persistence after app reload", async ({ page, context }) => {
  // Fresh day state for this scenario: reset trips then re-run morning+evening briefly via UI.
  // Provision script must have been run with --reset-trips before the suite; here we only
  // verify restore while a Drop trip is active by starting Drop if day is complete already
  // from prior tests — if day complete, this test documents restore of day_complete instead.
  await signInTransportDriver(page, fixture);
  await waitForHomeHydrated(page, fixture);
  const before = await page.locator("body").innerText();

  if (/Day complete|Trips complete for today/i.test(before)) {
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForHomeHydrated(page, fixture);
    await waitForTripListOk(page, capture);
    const after = await page.locator("body").innerText();
    expect(after).toMatch(/Day complete|Trips complete for today/i);
    expect(after).not.toMatch(/Start Pickup Trip/i);
    return;
  }

  if (/Start Drop Trip/i.test(before)) {
    await startTripViaUi(page, "Drop");
  } else if (/Open current trip/i.test(before)) {
    await page.getByRole("button", { name: /Open current trip/i }).click();
  } else {
    test.skip(true, "No active Drop or Start Drop available for reload restore");
  }

  await expect(page).toHaveURL(/attendance/i, { timeout: 30_000 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect
    .poll(async () => page.locator("body").innerText(), { timeout: 45_000 })
    .toMatch(/Drop|Dropping|Open current|Attendance/i);

  // New context reload (app relaunch simulation)
  const page2 = await context.newPage();
  const capture2 = attachNetworkCapture(page2);
  await grantDriverPermissions(context);
  await signInTransportDriver(page2, fixture);
  await waitForHomeHydrated(page2, fixture);
  await waitForTripListOk(page2, capture2);
  const relaunch = await page2.locator("body").innerText();
  expect(relaunch).toMatch(/Open current trip|Dropping|DROP TRIP|Day complete/i);
  await page2.close();
});

test("Test 6: Duplicate Pickup prevention", async ({ page, request }) => {
  await signInTransportDriver(page, fixture);
  await waitForHomeHydrated(page, fixture);
  await waitForTripListOk(page, capture);

  const home = await page.locator("body").innerText();
  expect(home).not.toMatch(/Start Pickup Trip/i);
  expect(home).toMatch(/Day complete|Trips complete for today|Start Drop Trip|Open current trip/i);

  // API guard on the dedicated fixture vehicle/institute only.
  const login = await request.post(`${fixture.apiBaseUrl}/api/v1/auth/transport/pin-login`, {
    data: {
      phone: fixture.driverPhone,
      pin: fixture.driverPin,
      institute_id: fixture.instituteId,
    },
  });
  expect(login.ok()).toBeTruthy();
  const loginJson = (await login.json()) as { data?: { access_token?: string } };
  const token = loginJson.data?.access_token;
  expect(token).toBeTruthy();

  const dup = await request.post(`${fixture.apiBaseUrl}/api/v1/transport/trips`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    data: {
      institute_id: fixture.instituteId,
      route_id: fixture.routeId,
      vehicle_id: fixture.vehicleId,
      driver_id: fixture.driverId,
      slot: "morning",
      trip_date: fixture.serviceDate,
      client_event_id: `pw-dup-pickup-${Date.now()}`,
    },
  });
  expect(dup.status()).toBe(409);
  const dupJson = (await dup.json()) as { error?: { message?: string } };
  expect(dupJson.error?.message ?? "").toMatch(/Pickup trip already exists/i);
});
