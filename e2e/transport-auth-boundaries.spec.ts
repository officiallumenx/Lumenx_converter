import { expect, test } from "@playwright/test";
import { blockApiWrites } from "./safe-api";

test("Transport protected root redirects signed-out drivers to login", async ({
  page,
}) => {
  // Do not mock /api/v1 here — fulfilling every call with 401 can stall auth hydrate
  // on a blank "/" shell. Signed-out redirect only needs a clean browser profile.
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /Driver sign in/i })).toBeVisible();
});

test("Transport API login exposes phone/PIN without starting SMS", async ({
  page,
}) => {
  const writes = await blockApiWrites(page);
  await page.goto("/login", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: /Driver sign in/i })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByPlaceholder("9876543210")).toBeVisible();
  await expect(page.getByPlaceholder("App account PIN")).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  expect(writes).toEqual([]);
});
