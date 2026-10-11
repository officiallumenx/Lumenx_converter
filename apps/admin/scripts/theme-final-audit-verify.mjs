import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../.theme-verify-final");
fs.mkdirSync(outDir, { recursive: true });
const BASE = process.env.ADMIN_URL || "http://127.0.0.1:8080";
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

/** Cross-cohort sample + residual-fix surfaces */
const sessionRoutes = [
  ["home", "/"],
  ["students", "/students"],
  ["timetable", "/timetable"],
  ["documents", "/documents"],
  ["admissions", "/admissions"],
  ["careers", "/careers"],
  ["settings", "/settings"],
  ["pending-verification", "/pending-verification"],
];

const publicRoutes = [
  ["welcome", "/welcome"],
  ["login", "/login"],
];

async function seed(page, theme, withSession) {
  await page.addInitScript(
    ({ session, theme, inst, withSession }) => {
      localStorage.setItem("luminexa-theme", theme);
      if (withSession) {
        localStorage.setItem("lx_admin_session_v1", JSON.stringify(session));
        localStorage.setItem("lx_admin_remember", "1");
        localStorage.setItem("lumenx.admin.activeInstituteId.v1", inst);
        sessionStorage.setItem("lx_app_unlocked_session_v1", "1");
      } else {
        localStorage.removeItem("lx_admin_session_v1");
        localStorage.removeItem("lx_admin_remember");
        sessionStorage.removeItem("lx_app_unlocked_session_v1");
      }
    },
    { session, theme, inst: INST, withSession },
  );
}

async function capture(theme, viewport, label, routes, withSession) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport, colorScheme: theme });
  const page = await context.newPage();
  await seed(page, theme, withSession);
  const summary = [];
  for (const [name, route] of routes) {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1800);
    await page.evaluate((t) => {
      document.documentElement.classList.toggle("dark", t === "dark");
      document.documentElement.style.colorScheme = t;
    }, theme);
    await page.waitForTimeout(300);
    const info = await page.evaluate(() => {
      const text = document.body?.innerText || "";
      return {
        path: location.pathname + location.search,
        heading:
          document.querySelector(".lx-module-hero__title")?.textContent?.trim() ||
          document.querySelector("h1")?.textContent?.trim() ||
          null,
        overflowX: document.body.scrollWidth > document.body.clientWidth + 2,
        hasBlurOrb: /blur-3xl/.test(document.documentElement.innerHTML),
        looksLoading: /Loading|loading…|Could not load|Network request failed/i.test(text),
      };
    });
    summary.push({ name, ...info });
    await page.screenshot({
      path: path.join(outDir, `${theme}-${label}-${name}.png`),
      fullPage: true,
    });
    console.log("shot", theme, label, name, info.path, info.heading, info.looksLoading ? "loading/error" : "ok");
  }
  fs.writeFileSync(path.join(outDir, `${theme}-${label}-summary.json`), JSON.stringify(summary, null, 2));
  await browser.close();
}

await capture("light", { width: 1440, height: 960 }, "desktop-public", publicRoutes, false);
await capture("light", { width: 1440, height: 960 }, "desktop-session", sessionRoutes, true);
await capture("dark", { width: 1440, height: 960 }, "desktop-session", sessionRoutes, true);
await capture("light", { width: 390, height: 844 }, "mobile-session", sessionRoutes, true);
console.log("done", outDir);
