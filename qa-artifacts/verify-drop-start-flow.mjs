import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto("http://127.0.0.1:4184/login", {
  waitUntil: "domcontentloaded",
  timeout: 60_000,
});
await page.getByPlaceholder("9876543210").fill("9182670362");
await page.getByPlaceholder("App account PIN").fill("123456");
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForTimeout(16_000);

const startDrop = page.getByRole("button", { name: /Start Drop Trip/i });
await startDrop.waitFor({ timeout: 10_000 });
await startDrop.click();
await page.waitForTimeout(1500);

const confirm = page.getByRole("button", { name: /Confirm|Start/i }).last();
if (await confirm.count()) {
  await confirm.click();
}
await page.waitForTimeout(8000);

const body = await page.locator("body").innerText();
const result = {
  url: page.url(),
  hasDroppingTab: /Dropping/i.test(body),
  hasBoardingTab: /Boarding/i.test(body),
  snippet: body.slice(0, 1200),
};
console.log(JSON.stringify(result, null, 2));
await browser.close();
if (!/attendance|Attendance|Dropping|Open current/i.test(body + result.url)) {
  process.exit(2);
}
