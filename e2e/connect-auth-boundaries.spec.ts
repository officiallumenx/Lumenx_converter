import { expect, test, type Page } from "@playwright/test";

const institutes = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "Alpha Public School",
    code: "ALPHA",
    kind: "school",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    name: "Beta College",
    code: "BETA",
    kind: "college",
  },
];

async function mockReadOnlyAuthBoundary(page: Page) {
  const unsafeRequests: string[] = [];
  // Prevent hosted Supabase Auth from hanging Connect bootstrap (signed-out journeys).
  await page.route(
    (url) =>
      url.hostname.endsWith("supabase.co") || url.pathname.includes("/auth/v1/"),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: null,
          token_type: "bearer",
          user: null,
        }),
      });
    },
  );
  await page.addInitScript(() => {
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
  await page.route((url) => url.pathname.startsWith("/api/v1/"), async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      unsafeRequests.push(`${request.method()} ${request.url()}`);
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "E2E_WRITE_BLOCKED", message: "Safe browser test blocked a write" },
        }),
      });
      return;
    }
    if (request.url().includes("/api/v1/auth/staff/institutes")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: institutes }),
      });
      return;
    }
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "UNAUTHENTICATED", message: "Mocked signed-out boundary" },
      }),
    });
  });
  return unsafeRequests;
}

test("public certificate route remains outside the authenticated app shell", async ({
  page,
}) => {
  await mockReadOnlyAuthBoundary(page);
  await page.goto("/verify-certificate");

  await expect(page).toHaveURL(/\/verify-certificate/);
  await expect(page.getByText(/verify certificate/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /account menu/i })).toHaveCount(0);
});

test("protected route redirects a signed-out browser to login", async ({ page }) => {
  const unsafeRequests = await mockReadOnlyAuthBoundary(page);
  await page.goto("/login");
  await expect(page.getByRole("combobox")).toBeVisible({ timeout: 20_000 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
  await expect(page.getByRole("combobox")).toBeVisible({ timeout: 20_000 });
  expect(unsafeRequests).toEqual([]);
});

test("institute selector uses mocked API data and remembers selection", async ({
  page,
}) => {
  const unsafeRequests = await mockReadOnlyAuthBoundary(page);
  await page.goto("/login");

  await page.getByRole("combobox").click();
  await page.getByPlaceholder("Type name or code…").fill("BETA");
  await page.getByText("Beta College", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Signing in to Beta College.")).toBeVisible();
  expect(unsafeRequests).toEqual([]);
});

test("async institute failure is visible and never falls back to demo data", async ({
  page,
}) => {
  await page.route(
    (url) =>
      url.hostname.endsWith("supabase.co") || url.pathname.includes("/auth/v1/"),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ access_token: null, user: null }),
      });
    },
  );
  await page.addInitScript(() => {
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
  await page.route("**/api/v1/auth/staff/institutes", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "UNAVAILABLE", message: "Directory temporarily unavailable" },
      }),
    }),
  );
  await page.goto("/login");

  await expect(
    page.getByText(/Directory temporarily unavailable|Unable to load institutes/i),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("combobox")).toHaveCount(0);
});
