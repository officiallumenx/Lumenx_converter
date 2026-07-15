import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", ".screenshots");
mkdirSync(outDir, { recursive: true });

const base = process.env.CONNECT_URL ?? "http://localhost:5174";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});

await page.goto(`${base}/login`);
await page.evaluate(() => {
  localStorage.setItem(
    "ues_user",
    JSON.stringify({
      id: "u_demo",
      name: "Priya Sharma",
      phone: "+919876543210",
      roles: ["parent", "teacher", "student"],
    }),
  );
  localStorage.setItem("ues_role", "parent");
  localStorage.setItem("ues_institute", "ins-delhi-riverside");
  localStorage.setItem("ues_child", "C1");
  localStorage.removeItem("ues_connect_parent_notif_read");
  localStorage.removeItem("ues_connect_parent_notif_read_v2");
});

await page.goto(`${base}/alerts`);
await page.waitForLoadState("networkidle");
await page.getByRole("heading", { name: "Alerts" }).waitFor({ timeout: 20000 });
await page.waitForTimeout(800);

await page.screenshot({
  path: join(outDir, "alerts-overview.png"),
  fullPage: true,
});

const unreadCard = page.locator("button").filter({ hasText: "Sent to sick bay" }).first();
if (await unreadCard.count()) {
  await unreadCard.click();
  await page.waitForTimeout(600);
  await page.screenshot({
    path: join(outDir, "alerts-unread-detail.png"),
    fullPage: false,
  });
  await page.keyboard.press("Escape");
}

const readCard = page.locator("button").filter({ hasText: "Allergy incident" }).first();
if (await readCard.count()) {
  await readCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
}

await page.screenshot({
  path: join(outDir, "alerts-list-read-unread.png"),
  fullPage: false,
});

await browser.close();
console.log("Saved alerts screenshots to", outDir);
