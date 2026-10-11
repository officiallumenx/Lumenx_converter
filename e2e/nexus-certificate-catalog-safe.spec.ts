import { expect, test } from "@playwright/test";
import {
  blockApiWrites,
  seedNexusLocalCertificateCatalog,
} from "./docs-certs/safe-mocks";

test.describe("Nexus certificate catalog (mocked / flag OFF)", () => {
  test("signed-out operators are sent to login for /certificates", async ({
    page,
  }) => {
    const writes = await blockApiWrites(page);
    await page.route(
      (url) => url.pathname.startsWith("/api/nexus/"),
      async (route) => {
        const method = route.request().method();
        if (method !== "GET") {
          writes.push(`${method} ${route.request().url()}`);
        }
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "UNAUTHENTICATED",
              message: "Mocked signed-out Nexus boundary",
            },
          }),
        });
      },
    );

    await page.goto("/certificates");
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "LumenX Nexus" }),
    ).toBeVisible();
    expect(
      writes.filter(
        (w) =>
          w.startsWith("POST") ||
          w.startsWith("PUT") ||
          w.startsWith("PATCH") ||
          w.startsWith("DELETE"),
      ),
    ).toEqual([]);
  });

  test("flag-off localStorage catalog is preserved and not wiped on login", async ({
    page,
  }) => {
    await seedNexusLocalCertificateCatalog(page);
    await blockApiWrites(page);
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "LumenX Nexus" }),
    ).toBeVisible({ timeout: 15_000 });

    const catalog = await page.evaluate(() => {
      const raw = localStorage.getItem("lumenx.nexus.certificate-templates.v1");
      return raw
        ? (JSON.parse(raw) as {
            templates: Array<{ name: string; status: string }>;
          })
        : null;
    });
    expect(catalog).toBeTruthy();
    expect(catalog?.templates.some((t) => t.name === "E2E LocalStorage Award")).toBe(
      true,
    );
    expect(catalog?.templates.some((t) => t.status === "published")).toBe(true);

    // Dual-read must stay off unless an explicit test-only flag is set for live work.
    expect(process.env.VITE_NEXUS_TEMPLATE_DB_CATALOG ?? "").toMatch(/^(false|0|)?$/i);
  });

  test("Nexus platform-template write APIs stay blocked while signed out", async ({
    page,
  }) => {
    const writes: string[] = [];
    await page.route(
      (url) => url.pathname.startsWith("/api/nexus/certificate-templates"),
      async (route) => {
        const method = route.request().method();
        if (method !== "GET") {
          writes.push(`${method} ${new URL(route.request().url()).pathname}`);
        }
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            error: { code: "UNAUTHENTICATED", message: "Blocked" },
          }),
        });
      },
    );

    await page.goto("/login");
    const status = await page.evaluate(async () => {
      const res = await fetch("/api/nexus/certificate-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "should-not-persist" }),
      });
      return res.status;
    });
    expect(status).toBe(401);
    expect(
      writes.some((w) => w.startsWith("POST") && w.includes("certificate-templates")),
    ).toBe(true);
  });
});
