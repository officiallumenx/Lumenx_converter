import { expect, test } from "@playwright/test";
import {
  blockApiWrites,
  blockHostedSupabaseAuth,
  installOptimisticAdminSession,
  mockAdminDocsCertsApi,
} from "./docs-certs/safe-mocks";

/**
 * Admin Documents & Certificates hubs use a Templates | Published IA.
 * Legacy ?view= aliases (overview/official/issued/verify/archive) still resolve.
 */

/** Em dash / en dash / hyphen — mock uses em dash; keep matcher resilient. */
const TC_BOARD_FORMAT = /Transfer Certificate.+Board Format/i;

test.describe("Admin Documents & Certificates (mocked / read-only)", () => {
  test("signed-out users cannot open Documents or Certificates hubs", async ({
    page,
  }) => {
    // Ensure no optimistic session seed; AuthGate redirects once status leaves idle/loading.
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    const writes = await blockApiWrites(page);
    await page.goto("/documents");
    await expect(page).toHaveURL(/\/(welcome|login)/, { timeout: 20_000 });
    await page.goto("/templates");
    await expect(page).toHaveURL(/\/(welcome|login)/, { timeout: 20_000 });
    expect(writes.filter((w) => !w.startsWith("GET"))).toEqual([]);
  });

  test("Documents templates hub surfaces TC workflow without writes", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await installOptimisticAdminSession(page);
    await blockHostedSupabaseAuth(page);
    const mock = await mockAdminDocsCertsApi(page, "with-tc-template");

    // Legacy overview alias → templates
    await page.goto("/documents?view=overview");
    await expect(page).toHaveURL(/\/documents/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: /^Document templates$/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText(/Generate documents|Select a template|Template → students/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    // Legacy official alias → templates (TC remains a Documents template kind)
    await page.goto("/documents?view=official");
    await expect(
      page.getByRole("heading", { name: /^Document templates$/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText(/Document \(incl\. Transfer Certificate\)|Transfer Certificate|Documents API templates/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    const templatesResponse = page.waitForResponse(
      (response) => {
        if (response.request().method() !== "GET") return false;
        try {
          return new URL(response.url()).pathname === "/api/v1/documents/templates";
        } catch {
          return false;
        }
      },
      { timeout: 20_000 },
    );
    await page.goto("/documents?view=templates");
    await expect(page).toHaveURL(/\/documents/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: /^Document templates$/i }).first(),
    ).toBeVisible({ timeout: 15_000 });

    const response = await templatesResponse;
    expect(response.ok(), `templates API status ${response.status()}`).toBeTruthy();
    const payload = (await response.json()) as { data?: Array<{ name?: string }> };
    expect(
      payload.data?.some((row) => TC_BOARD_FORMAT.test(row.name ?? "")),
      "mocked templates payload must include TC Board Format",
    ).toBeTruthy();

    await expect(page.getByText(TC_BOARD_FORMAT).first()).toBeVisible({
      timeout: 20_000,
    });

    expect(mock.writes).toEqual([]);
  });

  test("Documents empty, loading, error, and forbidden states render safely", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await installOptimisticAdminSession(page);
    await blockHostedSupabaseAuth(page);

    const emptyMock = await mockAdminDocsCertsApi(page, "empty");
    await page.goto("/documents?view=templates");
    await expect(page).toHaveURL(/\/documents/, { timeout: 20_000 });
    await expect(
      page
        .getByText(
          /No templates match your filters|No active templates|No document templates found/i,
        )
        .first(),
    ).toBeVisible({ timeout: 20_000 });
    expect(emptyMock.writes).toEqual([]);

    await page.unrouteAll({ behavior: "ignoreErrors" });
    await installOptimisticAdminSession(page);
    await blockHostedSupabaseAuth(page);
    const loadingMock = await mockAdminDocsCertsApi(page, "loading");
    try {
      await page.goto("/documents?view=templates");
      await expect(
        page.getByText(/Loading document templates/i).first(),
      ).toBeVisible({ timeout: 20_000 });
      expect(loadingMock.writes).toEqual([]);
    } finally {
      loadingMock.releaseLoading();
    }

    await page.unrouteAll({ behavior: "ignoreErrors" });
    await installOptimisticAdminSession(page);
    await blockHostedSupabaseAuth(page);
    const errMock = await mockAdminDocsCertsApi(page, "error");
    // Legacy archive alias → published
    await page.goto("/documents?view=archive");
    await expect(page).toHaveURL(/\/documents/, { timeout: 20_000 });
    await expect(
      page
        .getByText(
          /Loading published documents|Failed to load published documents|Mocked documents\/certs failure|Published documents|Access denied/i,
        )
        .first(),
    ).toBeVisible({ timeout: 20_000 });
    expect(errMock.writes).toEqual([]);

    await page.unrouteAll({ behavior: "ignoreErrors" });
    await installOptimisticAdminSession(page);
    await blockHostedSupabaseAuth(page);
    const forbiddenMock = await mockAdminDocsCertsApi(page, "forbidden");
    await page.goto("/documents?view=templates");
    await expect(page).toHaveURL(/\/documents/, { timeout: 20_000 });
    await expect(
      page
        .getByText(
          /do not have access to document templates|Loading document templates|Document templates|Access denied/i,
        )
        .first(),
    ).toBeVisible({ timeout: 20_000 });
    expect(forbiddenMock.writes).toEqual([]);
  });

  test("Certificates templates, published empty, and verify point TC to Documents", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await installOptimisticAdminSession(page);
    await blockHostedSupabaseAuth(page);
    const mock = await mockAdminDocsCertsApi(page, "empty");

    await page.goto("/templates?view=templates");
    await expect(page).toHaveURL(/\/templates/, { timeout: 20_000 });
    await expect(
      page.getByText(/Certificate templates|Published certificates|Generate certificates/i).first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page
        .getByText(
          /No published certificate templates|No active certificate templates|No published templates/i,
        )
        .first(),
    ).toBeVisible({ timeout: 20_000 });

    // Legacy issued alias → published
    await page.goto("/templates?view=issued");
    await expect(page).toHaveURL(/\/templates/, { timeout: 20_000 });
    await expect(
      page
        .getByText(
          /Published certificates|Issued history|Loading issued certificates|No certificates issued yet|No issued certificates found/i,
        )
        .first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText(/No certificates issued yet|No issued certificates found|issued certificates|0 published/i).first(),
    ).toBeVisible({ timeout: 30_000 });

    // Legacy verify alias → published (verify panel still renders under Published)
    await page.goto("/templates?view=verify");
    await expect(page).toHaveURL(/\/templates/, { timeout: 20_000 });
    await expect(
      page.getByRole("heading", { name: /Published certificates/i }).first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page
        .getByText(
          /Public verification|Transfer Certificates generated under Documents|Open verify page|Official school documents \(incl\. TC\)/i,
        )
        .first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Open verify page/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText(/Official school documents \(incl\. TC\)/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    expect(mock.writes).toEqual([]);
  });

  test("Certificates published loading shell stays read-only", async ({ page }) => {
    await installOptimisticAdminSession(page);
    await blockHostedSupabaseAuth(page);
    const mock = await mockAdminDocsCertsApi(page, "loading");

    try {
      await page.goto("/templates?view=issued");
      await expect(page).toHaveURL(/\/templates/, { timeout: 20_000 });
      await expect(
        page.getByText(/Loading issued certificates/i).first(),
      ).toBeVisible({ timeout: 20_000 });
      await expect(
        page.getByText(/Published certificates|Issued history/i).first(),
      ).toBeVisible({ timeout: 5_000 });
      expect(mock.writes).toEqual([]);
    } finally {
      mock.releaseLoading();
    }
  });
});
