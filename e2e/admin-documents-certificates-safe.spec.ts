import { expect, test } from "@playwright/test";
import {
  blockApiWrites,
  blockHostedSupabaseAuth,
  installOptimisticAdminSession,
  mockAdminDocsCertsApi,
} from "./docs-certs/safe-mocks";

test.describe("Admin Documents & Certificates (mocked / read-only)", () => {
  test("signed-out users cannot open Documents or Certificates hubs", async ({
    page,
  }) => {
    const writes = await blockApiWrites(page);
    await page.goto("/documents");
    await expect(page).toHaveURL(/\/(welcome|login)/, { timeout: 15_000 });
    await page.goto("/templates");
    await expect(page).toHaveURL(/\/(welcome|login)/, { timeout: 15_000 });
    expect(writes.filter((w) => !w.startsWith("GET"))).toEqual([]);
  });

  test("Documents overview and Official docs surface TC copy without writes", async ({
    page,
  }) => {
    await installOptimisticAdminSession(page);
    await blockHostedSupabaseAuth(page);
    const writes = await mockAdminDocsCertsApi(page, "with-tc-template");

    await page.goto("/documents?view=overview");
    await expect(page).toHaveURL(/\/documents/, { timeout: 20_000 });
    await expect(
      page.getByText(/Issue, track, and retrieve official school documents/i).first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("link", { name: /Official/i }).first()).toBeVisible();

    await page.goto("/documents?view=official");
    await expect(
      page.getByText(/Official school documents/i).first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/Transfer certificates/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/Transfer Certificates stay in Documents/i).first(),
    ).toBeVisible();

    await page.goto("/documents?view=templates");
    await expect(
      page.getByText(/Transfer Certificate [\u2013\u2014\-] Board Format/i).first(),
    ).toBeVisible({ timeout: 20_000 });

    expect(writes).toEqual([]);
  });

  test("Documents empty, loading, error, and forbidden states render safely", async ({
    page,
  }) => {
    await installOptimisticAdminSession(page);
    await blockHostedSupabaseAuth(page);

    const emptyWrites = await mockAdminDocsCertsApi(page, "empty");
    await page.goto("/documents?view=templates");
    await expect(page).toHaveURL(/\/documents/, { timeout: 20_000 });
    await expect(
      page.getByText(/No templates match your filters/i).first(),
    ).toBeVisible({ timeout: 20_000 });
    expect(emptyWrites).toEqual([]);

    await page.unrouteAll({ behavior: "ignoreErrors" });
    await installOptimisticAdminSession(page);
    await blockHostedSupabaseAuth(page);
    const loadingWrites = await mockAdminDocsCertsApi(page, "loading");
    await page.goto("/documents?view=templates");
    await expect(
      page.getByText(/Loading document templates/i).first(),
    ).toBeVisible({ timeout: 20_000 });
    expect(loadingWrites).toEqual([]);

    await page.unrouteAll({ behavior: "ignoreErrors" });
    await installOptimisticAdminSession(page);
    await blockHostedSupabaseAuth(page);
    const errWrites = await mockAdminDocsCertsApi(page, "error");
    await page.goto("/documents?view=archive");
    // Query-layer errors may surface as a load hint or remain on the loading shell;
    // either way the route must stay usable and write-free.
    await expect(page).toHaveURL(/\/documents/, { timeout: 20_000 });
    await expect(
      page
        .getByText(
          /Loading generated documents|Failed to load generated documents|Mocked documents\/certs failure|Document archive/i,
        )
        .first(),
    ).toBeVisible({ timeout: 20_000 });
    expect(errWrites).toEqual([]);

    await page.unrouteAll({ behavior: "ignoreErrors" });
    await installOptimisticAdminSession(page);
    await blockHostedSupabaseAuth(page);
    const forbiddenWrites = await mockAdminDocsCertsApi(page, "forbidden");
    await page.goto("/documents?view=templates");
    await expect(page).toHaveURL(/\/documents/, { timeout: 20_000 });
    await expect(
      page
        .getByText(
          /do not have access to document templates|Loading document templates|Document templates|Access denied/i,
        )
        .first(),
    ).toBeVisible({ timeout: 20_000 });
    expect(forbiddenWrites).toEqual([]);
  });

  test("Certificates templates, issued empty, and Verify point TC to Documents", async ({
    page,
  }) => {
    await installOptimisticAdminSession(page);
    await blockHostedSupabaseAuth(page);
    const writes = await mockAdminDocsCertsApi(page, "empty");

    await page.goto("/templates?view=templates");
    await expect(page).toHaveURL(/\/templates/, { timeout: 20_000 });
    await expect(
      page.getByText(/Certificate templates|Active certificate templates/i).first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page
        .getByText(
          /No published certificate templates|No active certificate templates/i,
        )
        .first(),
    ).toBeVisible({ timeout: 20_000 });

    // listBlocked true→false transition (HistoryPanel hooks-order regression).
    await page.goto("/templates?view=issued");
    await expect(
      page.getByText(/Issued certificates/i).first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/No certificates issued yet|Issued history/i).first(),
    ).toBeVisible({ timeout: 20_000 });

    await page.goto("/templates?view=verify");
    await expect(
      page.getByText(/Transfer Certificates generated under Documents/i).first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/Official school documents \(incl\. TC\)/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/Open verify page/i).first()).toBeVisible();

    expect(writes).toEqual([]);
  });

  test("Certificates issued loading shell stays read-only", async ({ page }) => {
    await installOptimisticAdminSession(page);
    await blockHostedSupabaseAuth(page);
    const writes = await mockAdminDocsCertsApi(page, "loading");

    await page.goto("/templates?view=issued");
    await expect(page).toHaveURL(/\/templates/, { timeout: 20_000 });
    // Assert loading before the Admin API client timeout (~15s) can convert the
    // in-flight mock into an error shell.
    await expect(
      page.getByText(/Loading issued certificates/i).first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/Issued certificates/i).first(),
    ).toBeVisible({ timeout: 5_000 });
    expect(writes).toEqual([]);
  });
});
