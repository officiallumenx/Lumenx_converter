import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const tripsReqs = [];
page.on("request", (req) => {
  const u = req.url();
  if (u.includes("/transport/trips")) {
    tripsReqs.push(u.replace(/^https?:\/\/[^/]+/, ""));
  }
});

await page.goto("http://127.0.0.1:4184/login", {
  waitUntil: "domcontentloaded",
  timeout: 60_000,
});
await page.getByPlaceholder("9876543210").fill("9182670362");
await page.getByPlaceholder("App account PIN").fill("123456");
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForTimeout(18_000);

const body = await page.locator("body").innerText();
const result = {
  url: page.url(),
  hasStartDrop: /Start Drop Trip/i.test(body),
  hasStartPickup: /Start Pickup Trip/i.test(body),
  hasDayComplete: /Trips complete for today|Day complete/i.test(body),
  hasPickupComplete: /Pickup complete/i.test(body),
  tripsReqs: [...new Set(tripsReqs)],
  snippet: body.slice(0, 1000),
};
console.log(JSON.stringify(result, null, 2));
await browser.close();
if (!result.hasStartDrop) process.exit(2);
