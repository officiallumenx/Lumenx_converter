import { expect, test } from "@playwright/test";
import { blockApiWrites } from "./safe-api";

test("Nexus root redirects signed-out operators to login", async ({ page }) => {
  await blockApiWrites(page);
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "LumenX Nexus" })).toBeVisible({
    timeout: 15_000,
  });
  await page.goto("/");

  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "LumenX Nexus" })).toBeVisible();
});

test("Nexus pre-login requires an operator identifier without network activity", async ({
  page,
}) => {
  const writes = await blockApiWrites(page);
  await page.goto("/login");

  const identifier = page.getByPlaceholder("username, email, or mobile");
  await expect(identifier).toBeVisible();
  await page.getByRole("button", { name: /continue/i }).click();
  await expect(identifier).toHaveAttribute("required", "");
  expect(writes).toEqual([]);
});
