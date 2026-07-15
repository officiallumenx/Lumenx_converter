import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", ".screenshots");
mkdirSync(outDir, { recursive: true });

const base = "http://localhost:5174";
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
      name: "Aarav Sharma",
      phone: "+919876543210",
      roles: ["parent", "teacher", "student"],
    }),
  );
  localStorage.setItem("ues_role", "parent");
  localStorage.setItem("ues_institute", "ins-delhi-riverside");
  localStorage.setItem("ues_child", "C1");
});

await page.goto(`${base}/attendance`);
await page.waitForLoadState("networkidle");
await page.getByText("From date").waitFor({ timeout: 15000 });
await page.screenshot({
  path: join(outDir, "attendance-date-row.png"),
  fullPage: false,
});

await page.goto(`${base}/leave`);
await page.waitForLoadState("networkidle");
await page.getByRole("button", { name: /Apply leave/i }).click();
await page.getByText("Leave start", { exact: true }).first().waitFor({ timeout: 15000 });
const leaveForm = page.locator("section").filter({ hasText: "New leave application" });
await leaveForm.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await leaveForm.screenshot({
  path: join(outDir, "leave-date-row.png"),
});

await browser.close();
console.log("Saved screenshots to", outDir);
