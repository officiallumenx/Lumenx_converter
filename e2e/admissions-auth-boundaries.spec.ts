import { expect, test } from "@playwright/test";
import { blockApiWrites } from "./safe-api";

test("Admissions signed-out shell routes Applications to login", async ({
  page,
}) => {
  await blockApiWrites(page);
  await page.goto("/");
  await page.getByRole("link", { name: "Applications" }).click();

  await expect(page).toHaveURL(/\/login\?redirect=%2Fapplications/);
  await expect(
    page.getByRole("heading", { name: "Admissions sign in" }),
  ).toBeVisible();
});

test("Admissions pre-login account choice is safe and app-specific", async ({
  page,
}) => {
  const writes = await blockApiWrites(page);
  await page.goto("/login");

  await page.getByRole("button", { name: /Parent \/ applicant/i }).click();
  await expect(page.getByRole("heading", { name: "Parent login" })).toBeVisible();
  await expect(page.getByText(/mobile number and password/i).first()).toBeVisible();
  expect(writes).toEqual([]);
});
