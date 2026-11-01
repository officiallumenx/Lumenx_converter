import { expect, test } from "@playwright/test";

test("Admin login uses the mocked institute directory without writes", async ({
  page,
}) => {
  const writes: string[] = [];
  await page.route((url) => url.pathname.startsWith("/api/v1/"), async (route) => {
    const request = route.request();
    if (request.method() !== "GET") writes.push(request.method());
    if (
      request.method() === "GET" &&
      request.url().includes("/api/v1/auth/staff/institutes")
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              name: "Alpha Public School",
              code: "ALPHA",
              kind: "school",
            },
          ],
        }),
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
  await page.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (url.includes("/api/v1/auth/staff/institutes")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                  name: "Alpha Public School",
                  code: "ALPHA",
                  kind: "school",
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return nativeFetch(input, init);
    };
  });

  await page.goto("/login");
  // Prefer the login form label — "Institute" also appears in nav/chips (strict mode).
  await expect(page.locator("#institute-picker-label")).toBeVisible();
  await expect(page.getByRole("button", { name: "Institute" })).toBeVisible();
  const directory = await page.evaluate(async () => {
    const response = await fetch("/api/v1/auth/staff/institutes");
    return response.json() as Promise<{
      data: Array<{ name: string; code: string }>;
    }>;
  });
  expect(directory.data).toEqual([
    expect.objectContaining({ name: "Alpha Public School", code: "ALPHA" }),
  ]);
  expect(writes).toEqual([]);
});

test("Admin protected root sends a signed-out user to public onboarding", async ({
  page,
}) => {
  // Safe suite points VITE_API_BASE_URL at the Vite origin — mock signed-out JSON
  // so hydration cannot treat HTML/self-responses as an authenticated session.
  await page.route((url) => url.pathname.startsWith("/api/v1/"), async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "UNAUTHENTICATED", message: "Mocked signed-out boundary" },
      }),
    });
  });
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
      localStorage.clear();
      sessionStorage.clear();
      // Drop persisted query/session DBs so a prior worker cannot revive auth.
      const ide = indexedDB as IDBFactory & {
        databases?: () => Promise<Array<{ name?: string }>>;
      };
      void ide.databases?.().then((dbs) => {
        for (const db of dbs) {
          if (db.name) indexedDB.deleteDatabase(db.name);
        }
      });
    } catch {
      // ignore
    }
  });
  // Use a clearly protected module path (same contract as /). Root `/` can linger
  // on a blank AuthGate frame while redirect settles under mocked API self-hosting.
  await page.goto("/students");
  await expect(page).toHaveURL(/\/(welcome|login)/, { timeout: 30_000 });
  await expect(page.getByText(/LumenX Admin|Welcome/i).first()).toBeVisible({
    timeout: 15_000,
  });
});
