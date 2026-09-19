import { expect, test } from "@playwright/test";
import { blockApiWrites } from "./safe-api";

test("Transport protected root redirects signed-out drivers to login", async ({
  page,
}) => {
  await blockApiWrites(page);
  await page.goto("/");

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: /Driver sign in/i })).toBeVisible();
});

test("Transport API login exposes email/password without starting SMS", async ({
  page,
}) => {
  const writes = await blockApiWrites(page);
  await page.goto("/login");

  await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Password" })).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  expect(writes).toEqual([]);
});
