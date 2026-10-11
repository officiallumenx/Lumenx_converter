/**
 * Phase 3 — Enrollment & trip behavior under pending/rejected stops.
 * Requires: node e2e/transport/provision-fixture.mjs --reset-pending-stops --reset-trips
 * Dedicated institute only. No blockApiWrites. No mocked write success.
 */
import { expect, test } from "@playwright/test";
import {
  apiAuthHeaders,
  approveStopApi,
  approveStopInAdminUi,
  asAdminFixture,
  createPendingStopApi,
  listEnrollmentsApi,
  listStopsApi,
  newAdminContext,
  openTransportRouteSetup as openRouteSetup,
  rejectStopApi,
  rejectStopInAdminUi,
  signInAdminUi,
  submitNewPendingStopViaUi,
  type AdminFixture,
} from "./transport/admin-helpers";
import {
  attachNetworkCapture,
  endTripViaUi,
  goHome,
  loadTransportFixture,
  markFirstStudent,
  signInTransportDriver,
  startTripViaUi,
  waitForHomeHydrated,
  waitForTripListOk,
} from "./transport/helpers";

const loaded = loadTransportFixture();
const adminFixture = loaded ? asAdminFixture(loaded) : null;

test.skip(
  !adminFixture,
  "BLOCKED: missing Admin fixture — run node e2e/transport/provision-fixture.mjs --reset-pending-stops --reset-trips",
);

const fixture = adminFixture as AdminFixture;

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(["geolocation", "notifications"], {
    origin: fixture.transportBaseUrl ?? "http://127.0.0.1:4184",
  });
  await context.setGeolocation({ latitude: 17.385, longitude: 78.4867 });
});

test.describe("P3-A Pending does not corrupt approved route", () => {
  test("Scenario A: pending stop keeps approved route + enrollments", async ({
    page,
    browser,
  }) => {
    const adminHeaders = await apiAuthHeaders(fixture, "admin");
    const beforeStops = await listStopsApi(fixture, adminHeaders);
    const approvedBaseline = beforeStops.filter((s) =>
      [fixture.pickupStopId, fixture.dropStopId].includes(s.id),
    );
    expect(approvedBaseline.length).toBeGreaterThan(0);
    for (const s of approvedBaseline) {
      expect(s.approvalStatus).toBe("approved");
    }

    const beforeEnroll = await listEnrollmentsApi(fixture, adminHeaders);
    const student1 = beforeEnroll.find((e) => e.studentId === fixture.studentId);
    expect(student1, "student1 enrollment").toBeTruthy();
    const baselinePickup = student1!.pickupStopId;
    const baselineDrop = student1!.dropStopId;
    expect(baselinePickup).toBe(fixture.pickupStopId);

    const pendingName = `P3A Pending ${Date.now()}`;
    const pendingId = await submitNewPendingStopViaUi(page, fixture, pendingName);

    const afterStops = await listStopsApi(fixture, adminHeaders);
    const pending = afterStops.find((s) => s.id === pendingId);
    expect(pending?.approvalStatus).toMatch(/pending/i);
    expect(pending?.approvalStatus).not.toBe("approved");

    for (const id of [fixture.pickupStopId, fixture.dropStopId]) {
      expect(afterStops.find((s) => s.id === id)?.approvalStatus).toBe("approved");
    }

    const afterEnroll = await listEnrollmentsApi(fixture, adminHeaders);
    const s1 = afterEnroll.find((e) => e.studentId === fixture.studentId);
    expect(s1?.pickupStopId).toBe(baselinePickup);
    expect(s1?.dropStopId).toBe(baselineDrop);

    // Trip availability for approved route remains (pending does not block).
    await goHome(page);
    await waitForHomeHydrated(page, fixture);
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/Start Pickup|Start Drop|Day complete|Pickup|Drop/i);

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForHomeHydrated(page, fixture);

    const { context, page: adminPage } = await newAdminContext(browser);
    await signInAdminUi(adminPage, fixture);
    await adminPage.goto(`${fixture.adminBaseUrl}/transport?view=reviews`);
    await expect(
      adminPage.getByText(new RegExp(`Stop:\\s*${pendingName}`, "i")),
    ).toBeVisible({ timeout: 45_000 });
    await adminPage.reload({ waitUntil: "domcontentloaded" });
    await expect(
      adminPage.getByText(new RegExp(`Stop:\\s*${pendingName}`, "i")),
    ).toBeVisible({ timeout: 45_000 });
    await context.close();

    const persisted = (await listStopsApi(fixture, adminHeaders)).find(
      (s) => s.id === pendingId,
    );
    expect(persisted?.approvalStatus).toMatch(/pending/i);
  });
});

test.describe("P3-B Rejected stop does not become active", () => {
  test("Scenario B: Admin reject persists; approved route intact", async ({
    page,
    browser,
  }) => {
    const adminHeaders = await apiAuthHeaders(fixture, "admin");
    const beforeEnroll = await listEnrollmentsApi(fixture, adminHeaders);
    const s1Before = beforeEnroll.find((e) => e.studentId === fixture.studentId);

    const rejectName = `P3B Reject ${Date.now()}`;
    const rejectId = await submitNewPendingStopViaUi(page, fixture, rejectName);

    const reason = "P3B: stop overlaps existing approved gate";
    const { context, page: adminPage } = await newAdminContext(browser);
    await signInAdminUi(adminPage, fixture);
    await rejectStopInAdminUi(adminPage, fixture, rejectName, reason);
    await context.close();

    const stops = await listStopsApi(fixture, adminHeaders);
    const rejected = stops.find((s) => s.id === rejectId);
    expect(rejected?.approvalStatus).toMatch(/rejected/i);
    expect(rejected?.rejectionReason ?? "").toMatch(/overlaps/i);

    expect(stops.find((s) => s.id === fixture.pickupStopId)?.approvalStatus).toBe(
      "approved",
    );

    const s1After = (await listEnrollmentsApi(fixture, adminHeaders)).find(
      (e) => e.studentId === fixture.studentId,
    );
    expect(s1After?.pickupStopId).toBe(s1Before?.pickupStopId);
    expect(s1After?.dropStopId).toBe(s1Before?.dropStopId);

    // Rejected stop must not be treated as approved.
    expect(rejected?.approvalStatus).not.toBe("approved");

    await openRouteSetup(page, fixture);
    const declinedTab = page.getByRole("button", { name: /^Declined$/i });
    if (await declinedTab.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await declinedTab.click();
    }
    await expect
      .poll(async () => page.locator("body").innerText(), { timeout: 45_000 })
      .toMatch(new RegExp(rejectName, "i"));
    await expect
      .poll(async () => page.locator("body").innerText(), { timeout: 30_000 })
      .toMatch(/Declined|Rejected|overlaps/i);
  });
});

test.describe("P3-C Edit and resubmit rejected", () => {
  test("Scenario C: resubmit returns pending + Admin queue; reason retained", async ({
    page,
    browser,
  }) => {
    const adminHeaders = await apiAuthHeaders(fixture, "admin");
    const driverHeaders = await apiAuthHeaders(fixture, "driver");

    const name = `P3C Resubmit ${Date.now()}`;
    const orders = (await listStopsApi(fixture, adminHeaders)).map(
      (s) => s.routeOrder ?? 0,
    );
    const created = await createPendingStopApi(fixture, driverHeaders, {
      name,
      routeOrder: Math.max(-1, ...orders) + 1,
    });
    const reason = "P3C: move farther from school";

    // Reject via API (Admin UI Decline covered in Scenario B); assert persistence.
    await rejectStopApi(fixture, adminHeaders, created.id, reason);
    expect(
      (await listStopsApi(fixture, adminHeaders)).find((s) => s.id === created.id)
        ?.approvalStatus,
    ).toMatch(/rejected/i);
    expect(
      (await listStopsApi(fixture, adminHeaders)).find((s) => s.id === created.id)
        ?.rejectionReason ?? "",
    ).toMatch(/move farther/i);

    // Driver UI Edit & Resubmit
    await openRouteSetup(page, fixture);
    const declinedTab = page.getByRole("button", { name: /^Declined$/i });
    if (await declinedTab.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await declinedTab.click();
    }
    // Prefer My Stops / Declined listitem that owns this exact stop title
    const stopTitle = page.getByText(name, { exact: true }).first();
    await expect(stopTitle).toBeVisible({ timeout: 20_000 });
    const card = page
      .locator("li")
      .filter({ has: stopTitle })
      .filter({ has: page.getByRole("button", { name: /Edit & Resubmit/i }) })
      .first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.getByRole("button", { name: /Edit & Resubmit/i }).click();
    await expect(
      page.getByText(new RegExp(`Edit & resubmit ·\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i")),
    ).toBeVisible({ timeout: 15_000 });
    const nameField = page
      .getByLabel(/stop name|name/i)
      .or(page.getByPlaceholder(/stop name|e\.g\./i))
      .first();
    await expect(nameField).toBeVisible({ timeout: 10_000 });
    await nameField.fill(`${name} Fixed`);
    const resubmit = page.getByRole("button", {
      name: /Resubmit to Admin|Send to Admin/i,
    });
    await expect(resubmit).toBeVisible({ timeout: 15_000 });
    const waitRes = page.waitForResponse(
      (res) =>
        res.request().method() === "PATCH" &&
        res.url().includes(`/stops/${created.id}`) &&
        res.status() < 500,
      { timeout: 60_000 },
    );
    await resubmit.click();
    const res = await waitRes;
    expect(res.ok(), `resubmit PATCH HTTP ${res.status()}`).toBeTruthy();
    const body = (await res.json()) as {
      data?: { approvalStatus?: string; rejectionReason?: string | null };
    };
    expect(body.data?.approvalStatus).toMatch(/pending/i);
    expect(body.data?.rejectionReason ?? "").toMatch(/move farther/i);

    const after = (await listStopsApi(fixture, adminHeaders)).find(
      (s) => s.id === created.id,
    );
    expect(after?.approvalStatus).toMatch(/pending/i);
    expect(after?.approvalStatus).not.toBe("approved");
    expect(after?.rejectionReason ?? "").toMatch(/move farther/i);

    // Back in Admin review queue (single re-login)
    const { context: c2, page: admin2 } = await newAdminContext(browser);
    await signInAdminUi(admin2, fixture);
    await admin2.goto(`${fixture.adminBaseUrl}/transport?view=reviews`);
    await expect(
      admin2.getByText(new RegExp(`Stop:\\s*${name}`, "i")),
    ).toBeVisible({ timeout: 45_000 });
    await c2.close();
  });
});

test.describe("P3-D Student enrollment integrity", () => {
  test("Scenario D: approved enrollment intact; pending assign + reject/approve", async ({
    page,
    browser,
  }) => {
    const adminHeaders = await apiAuthHeaders(fixture, "admin");
    const driverHeaders = await apiAuthHeaders(fixture, "driver");

    const before = await listEnrollmentsApi(fixture, adminHeaders);
    const s1 = before.find((e) => e.studentId === fixture.studentId);
    expect(s1?.pickupStopId).toBe(fixture.pickupStopId);
    expect(s1?.dropStopId).toBe(fixture.dropStopId);
    const s1Pickup = s1!.pickupStopId;
    const s1Drop = s1!.dropStopId;

    // Pending stop via UI (assigns student2 when available — product updates enrollment immediately)
    const pendingName = `P3D Pending ${Date.now()}`;
    const pendingId = await submitNewPendingStopViaUi(page, fixture, pendingName);

    const mid = await listEnrollmentsApi(fixture, adminHeaders);
    const s1Mid = mid.find((e) => e.studentId === fixture.studentId);
    expect(s1Mid?.pickupStopId).toBe(s1Pickup);
    expect(s1Mid?.dropStopId).toBe(s1Drop);

    const s2Mid = mid.find((e) => e.studentId === fixture.student2Id);
    // Established rule: pending is operationally usable — pickup may move to pending stop.
    if (s2Mid?.pickupStopId === pendingId) {
      expect(s2Mid.approvalStatus).toMatch(/pending|approved/i);
    }

    // Reject proposed stop — student1 must remain on approved gate
    await rejectStopApi(
      fixture,
      adminHeaders,
      pendingId,
      "P3D reject proposed stop",
    );
    const afterReject = await listEnrollmentsApi(fixture, adminHeaders);
    expect(
      afterReject.find((e) => e.studentId === fixture.studentId)?.pickupStopId,
    ).toBe(s1Pickup);

    // Approve a separate valid pending stop and attach student2 via enrollment PATCH
    const orders = (await listStopsApi(fixture, adminHeaders))
      .map((s) => s.routeOrder ?? 0)
      .filter((n) => Number.isFinite(n));
    const nextOrder = Math.max(-1, ...orders) + 1;
    const toApprove = await createPendingStopApi(fixture, driverHeaders, {
      name: `P3D Approve ${Date.now()}`,
      routeOrder: nextOrder,
    });
    await approveStopApi(fixture, adminHeaders, toApprove.id);
    expect(
      (await listStopsApi(fixture, adminHeaders)).find((s) => s.id === toApprove.id)
        ?.approvalStatus,
    ).toMatch(/approved/i);

    if (fixture.enrollment2Id && fixture.student2Id) {
      const enrollPatch = await fetch(
        `${fixture.apiBaseUrl}/api/v1/transport/enrollments/${fixture.enrollment2Id}`,
        {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({
            pickup_stop_id: toApprove.id,
            drop_stop_id: fixture.dropStopId,
          }),
        },
      );
      expect([200, 201]).toContain(enrollPatch.status);
      const s2Final = (await listEnrollmentsApi(fixture, adminHeaders)).find(
        (e) => e.studentId === fixture.student2Id,
      );
      expect(s2Final?.pickupStopId).toBe(toApprove.id);
      expect(s2Final?.dropStopId).toBe(fixture.dropStopId);
    }

    // No duplicate enrollments for student1
    const all = await listEnrollmentsApi(fixture, adminHeaders);
    const s1Rows = all.filter((e) => e.studentId === fixture.studentId);
    expect(s1Rows.length).toBe(1);

    // Approve path via Admin UI (API-created pending → Publish)
    const uiName = `P3D UI Pub ${Date.now()}`;
    const uiOrders = (await listStopsApi(fixture, adminHeaders)).map(
      (s) => s.routeOrder ?? 0,
    );
    const uiStop = await createPendingStopApi(fixture, driverHeaders, {
      name: uiName,
      routeOrder: Math.max(-1, ...uiOrders) + 1,
    });
    const { context, page: adminPage } = await newAdminContext(browser);
    await signInAdminUi(adminPage, fixture);
    await approveStopInAdminUi(adminPage, fixture, uiName);
    await context.close();
    expect(
      (await listStopsApi(fixture, adminHeaders)).find((s) => s.id === uiStop.id)
        ?.approvalStatus,
    ).toMatch(/approved/i);
  });
});

test.describe("P3-E Trip behavior under approval states", () => {
  test("Scenario E: trip on approved route; pending/reject do not activate bad route", async ({
    page,
    browser,
  }) => {
    const adminHeaders = await apiAuthHeaders(fixture, "admin");
    const driverHeaders = await apiAuthHeaders(fixture, "driver");
    const capture = attachNetworkCapture(page);

    await signInTransportDriver(page, fixture);
    await waitForHomeHydrated(page, fixture);
    await waitForTripListOk(page, capture);

    // Prefer Pickup; if morning already done, Drop is acceptable for policy check.
    const homeText = await page.locator("body").innerText();
    const kind: "Pickup" | "Drop" = /Start Pickup Trip/i.test(homeText)
      ? "Pickup"
      : /Start Drop Trip/i.test(homeText)
        ? "Drop"
        : "Pickup";

    if (!new RegExp(`Start ${kind} Trip`, "i").test(homeText)) {
      test.info().annotations.push({
        type: "blocked",
        description:
          "No Start Pickup/Drop CTA — day may already be complete; verifying API trip list only",
      });
      const trips = await fetch(
        `${fixture.apiBaseUrl}/api/v1/transport/trips?institute_id=${fixture.instituteId}&vehicle_id=${fixture.vehicleId}&trip_date=${fixture.serviceDate}`,
        { headers: driverHeaders },
      );
      expect(trips.status).toBe(200);
    } else {
      const startRes = await startTripViaUi(page, kind);
      expect(startRes, "trip start response").toBeTruthy();
      expect(startRes!.status()).toBeLessThan(300);
      await markFirstStudent(page, kind === "Pickup" ? "boarded" : "dropped");
      const endRes = await endTripViaUi(page);
      if (endRes) expect(endRes.status()).toBeLessThan(300);
      await goHome(page);
      await waitForHomeHydrated(page, fixture);
    }

    // Pending route-change (new stop) must not flip approved baseline
    const orders = (await listStopsApi(fixture, adminHeaders)).map(
      (s) => s.routeOrder ?? 0,
    );
    const pending = await createPendingStopApi(fixture, driverHeaders, {
      name: `P3E Pending ${Date.now()}`,
      routeOrder: Math.max(-1, ...orders) + 1,
    });
    expect(pending.approvalStatus).toMatch(/pending/i);
    expect(
      (await listStopsApi(fixture, adminHeaders)).find(
        (s) => s.id === fixture.pickupStopId,
      )?.approvalStatus,
    ).toBe("approved");

    await rejectStopApi(
      fixture,
      adminHeaders,
      pending.id,
      "P3E reject change — keep original route",
    );
    expect(
      (await listStopsApi(fixture, adminHeaders)).find((s) => s.id === pending.id)
        ?.approvalStatus,
    ).toMatch(/rejected/i);
    expect(
      (await listStopsApi(fixture, adminHeaders)).find(
        (s) => s.id === fixture.pickupStopId,
      )?.approvalStatus,
    ).toBe("approved");

    // Approve a valid change and hydrate
    const nextName = `P3E Approved ${Date.now()}`;
    const next = await createPendingStopApi(fixture, driverHeaders, {
      name: nextName,
      routeOrder: Math.max(-1, ...orders, pending.routeOrder) + 2,
    });
    const { context, page: adminPage } = await newAdminContext(browser);
    await signInAdminUi(adminPage, fixture);
    await approveStopInAdminUi(adminPage, fixture, nextName);
    await context.close();
    expect(
      (await listStopsApi(fixture, adminHeaders)).find((s) => s.id === next.id)
        ?.approvalStatus,
    ).toMatch(/approved/i);

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForHomeHydrated(page, fixture);
    const afterReload = await listStopsApi(fixture, adminHeaders);
    expect(afterReload.find((s) => s.id === pending.id)?.approvalStatus).toMatch(
      /rejected/i,
    );
    expect(afterReload.find((s) => s.id === next.id)?.approvalStatus).toMatch(
      /approved/i,
    );

    // Invalid: reject already-rejected
    const bad = await fetch(
      `${fixture.apiBaseUrl}/api/v1/transport/stops/${pending.id}/reject`,
      {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ reason: "duplicate reject" }),
      },
    );
    expect([400, 409, 422]).toContain(bad.status);
  });
});

test.describe("P3-F Route order and sync regression", () => {
  test("Scenario F: nextFree route_order; no duplicate conflict; no false approved", async () => {
    const adminHeaders = await apiAuthHeaders(fixture, "admin");
    const driverHeaders = await apiAuthHeaders(fixture, "driver");

    const before = await listStopsApi(fixture, adminHeaders);
    const maxOrder = Math.max(-1, ...before.map((s) => s.routeOrder ?? 0));

    const a = await createPendingStopApi(fixture, driverHeaders, {
      name: `P3F A ${Date.now()}`,
      routeOrder: maxOrder + 1,
    });
    const b = await createPendingStopApi(fixture, driverHeaders, {
      name: `P3F B ${Date.now()}`,
      routeOrder: maxOrder + 2,
    });
    expect(a.routeOrder).not.toBe(b.routeOrder);
    expect(a.approvalStatus).toMatch(/pending/i);
    expect(b.approvalStatus).toMatch(/pending/i);

    // Collision with school/existing order must 409 (regression guard)
    const collide = await fetch(`${fixture.apiBaseUrl}/api/v1/transport/stops`, {
      method: "POST",
      headers: driverHeaders,
      body: JSON.stringify({
        institute_id: fixture.instituteId,
        route_id: fixture.routeId,
        name: `P3F Collide ${Date.now()}`,
        location_label: "collide",
        latitude: 17.39,
        longitude: 78.49,
        route_order: fixture.dropStopId ? 1 : 0,
        kind: "waypoint",
      }),
    });
    // School commonly occupies 1 — expect conflict when that slot is taken
    if (before.some((s) => s.routeOrder === 1)) {
      expect(collide.status).toBe(409);
    } else {
      expect([201, 409]).toContain(collide.status);
    }

    const after = await listStopsApi(fixture, adminHeaders);
    const pendingNames = after.filter((s) =>
      /^P3F [AB]/.test(s.name),
    );
    expect(pendingNames.every((s) => s.approvalStatus === "pending")).toBeTruthy();
    expect(pendingNames.every((s) => s.approvalStatus !== "approved")).toBeTruthy();

    // Unit-level nextFreeRouteOrder covered in api-sync.test.ts (run separately in report)
  });
});
