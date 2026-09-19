import { expect, test } from "@playwright/test";
import { blockApiWrites } from "./safe-api";

test("Careers signed-out shell routes Dashboard to login", async ({ page }) => {
  await blockApiWrites(page);
  await page.goto("/");
  await page.getByRole("link", { name: "Dashboard" }).click();

  await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("Careers API pre-login requests email before any auth call", async ({
  page,
}) => {
  const writes = await blockApiWrites(page);
  await page.goto("/login");

  await expect(page.getByText(/sign in with your email/i)).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Enter your email")).toBeVisible();
  expect(writes).toEqual([]);
});
