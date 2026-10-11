import { expect, test } from "@playwright/test";
import {
  E2E_INSTITUTE_ID,
  mockConnectVerifyApi,
} from "./docs-certs/safe-mocks";

test.describe("Connect public certificate verify (mocked)", () => {
  test("verify page loads without login", async ({ page }) => {
    await page.goto("/verify-certificate");
    await expect(
      page.getByRole("heading", { name: /Verify certificate/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/no login required/i)).toBeVisible();
  });

  test("valid mocked verification shows recipient without exposing a PDF", async ({
    page,
  }) => {
    await mockConnectVerifyApi(page, "valid");
    await page.goto(
      `/verify-certificate?institute_id=${E2E_INSTITUTE_ID}&number=${encodeURIComponent("CERT/2026/0001")}`,
    );
    await expect(page.getByText(/Student A/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/CERT\/2026\/0001/i).first()).toBeVisible();
    await expect(page.locator("a[href*='.pdf']")).toHaveCount(0);
  });

  test("not-found and error states render safely", async ({ page }) => {
    await mockConnectVerifyApi(page, "not_found");
    await page.goto(
      `/verify-certificate?institute_id=${E2E_INSTITUTE_ID}&number=${encodeURIComponent("CERT/2099/9999")}`,
    );
    await expect(
      page.getByText(/not found|Certificate not found|Verification failed/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    await page.unrouteAll({ behavior: "ignoreErrors" });
    await mockConnectVerifyApi(page, "error");
    await page.goto(
      `/verify-certificate?institute_id=${E2E_INSTITUTE_ID}&number=${encodeURIComponent("CERT/2099/9999")}`,
    );
    await expect(
      page.getByText(/failed|error|Mocked verify|Verification failed/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
