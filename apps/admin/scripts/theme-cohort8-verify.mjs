import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../.theme-verify-c8");
fs.mkdirSync(outDir, { recursive: true });
const BASE = process.env.ADMIN_URL || "http://127.0.0.1:8081";
const INST = "11111111-1111-4111-8111-111111111111";

const session = {
  userId: "visual-verify-user",
  email: "visual.verify@lumenx.local",
  phone: "",
  name: "Visual Verify",
  initials: "VV",
  role: "admin",
  title: "Principal",
  accessRoleId: "",
  instituteId: INST,
  instituteName: "LumenX Visual Institute",
  isVerified: true,
  token: "",
  authSource: "api",
  issuedAt: Date.now(),
  expiresAt: Date.now() + 86400000,
};

/** Public / logged-out routes — no session seed */
const publicRoutes = [
  ["splash", "/splash"],
  ["welcome", "/welcome"],
  ["login", "/login"],
  ["signup", "/signup"],
  ["forgot-password", "/forgot-password"],
  ["forgot-pin", "/forgot-pin"],
  ["privacy", "/privacy"],
  ["terms", "/terms"],
  ["cookies", "/cookies"],
];

/** Routes that typically need a session (may redirect) */
const sessionRoutes = [
  ["pending-verification", "/pending-verification"],
  ["institute-setup", "/institute-setup"],
  ["verify-email-otp", "/verify-email-otp"],
  ["verify-mobile-otp", "/verify-mobile-otp"],
];

async function seedSession(page, theme) {
  await page.addInitScript(
    ({ session, theme, inst }) => {
      localStorage.setItem("lx_admin_session_v1", JSON.stringify(session));
      localStorage.setItem("lx_admin_remember", "1");
      localStorage.setItem("lumenx.admin.activeInstituteId.v1", inst);
      localStorage.setItem("luminexa-theme", theme);
      sessionStorage.setItem("lx_app_unlocked_session_v1", "1");
    },
    { session, theme, inst: INST },
  );
}

async function seedThemeOnly(page, theme) {
  await page.addInitScript(
    ({ theme }) => {
      localStorage.setItem("luminexa-theme", theme);
      localStorage.removeItem("lx_admin_session_v1");
      localStorage.removeItem("lx_admin_remember");
      sessionStorage.removeItem("lx_app_unlocked_session_v1");
    },
    { theme },
  );
}

async function captureGroup(theme, viewport, label, routes, withSession) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport, colorScheme: theme });
  const page = await context.newPage();
  if (withSession) await seedSession(page, theme);
  else await seedThemeOnly(page, theme);

  const summary = [];
  for (const [name, route] of routes) {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2200);
    await page.evaluate((t) => {
      document.documentElement.classList.toggle("dark", t === "dark");
      document.documentElement.style.colorScheme = t;
    }, theme);
    await page.waitForTimeout(400);
    await page.waitForSelector("h1, h2, .lx-module-hero__title", { timeout: 12000 }).catch(() => {});
    const info = await page.evaluate(() => {
      const hasOrb = Boolean(
        document.querySelector("[class*='blur-3xl'], [class*='shadow-glow']"),
      );
      return {
        path: location.pathname + location.search,
        heading:
          document.querySelector("h1")?.textContent?.trim() ||
          document.querySelector("h2")?.textContent?.trim() ||
          null,
        overflowX: document.body.scrollWidth > document.body.clientWidth + 2,
        hasOrbClass: hasOrb,
      };
    });
    summary.push({ name, ...info });
    await page.screenshot({
      path: path.join(outDir, `${theme}-${label}-${name}.png`),
      fullPage: true,
    });
    console.log("shot", theme, label, name, info.path, info.heading);
  }
  fs.writeFileSync(
    path.join(outDir, `${theme}-${label}-summary.json`),
    JSON.stringify(summary, null, 2),
  );
  await browser.close();
}

for (const theme of ["light", "dark"]) {
  for (const [viewport, label] of [
    [{ width: 1440, height: 960 }, "desktop"],
    [{ width: 390, height: 844 }, "mobile"],
  ]) {
    await captureGroup(theme, viewport, `${label}-public`, publicRoutes, false);
    await captureGroup(theme, viewport, `${label}-session`, sessionRoutes, true);
  }
}
console.log("done", outDir);
