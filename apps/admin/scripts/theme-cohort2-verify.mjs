import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../.theme-verify-c2");
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

const routes = [
  ["attendance", "/attendance"],
  ["student-attendance", "/student-attendance"],
  ["teacher-attendance", "/teacher-attendance"],
  ["timetable", "/timetable"],
  ["subjects", "/subjects"],
  ["photos", "/photos"],
];

async function seed(page, theme) {
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

async function capture(theme, viewport, label) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport, colorScheme: theme });
  const page = await context.newPage();
  await seed(page, theme);
  const summary = [];
  for (const [name, route] of routes) {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1800);
    await page.evaluate((t) => {
      document.documentElement.classList.toggle("dark", t === "dark");
      document.documentElement.style.colorScheme = t;
    }, theme);
    await page.waitForTimeout(400);
    const info = await page.evaluate(() => {
      const hero = document.querySelector(".lx-module-hero");
      const hs = hero ? getComputedStyle(hero) : null;
      const cards = [...document.querySelectorAll(".lx-card, .lx-module-panel, .lx-timetable-slot--filled")].slice(0, 6);
      return {
        path: location.pathname + location.search,
        title: document.title,
        heroTitle: document.querySelector(".lx-module-hero__title")?.textContent?.trim() || null,
        heroBg: hs?.backgroundColor || null,
        heroBgImage: hs?.backgroundImage || null,
        overflowX: document.body.scrollWidth > document.body.clientWidth + 2,
        samples: cards.map((el) => {
          const s = getComputedStyle(el);
          return {
            cls: el.className.toString().slice(0, 60),
            bg: s.backgroundImage !== "none" ? s.backgroundImage.slice(0, 100) : s.backgroundColor,
            shadow: s.boxShadow.slice(0, 80),
          };
        }),
      };
    });
    summary.push({ name, ...info });
    await page.screenshot({
      path: path.join(outDir, `${theme}-${label}-${name}.png`),
      fullPage: true,
    });
    console.log("shot", theme, label, name, info.path, info.heroTitle);
  }
  fs.writeFileSync(path.join(outDir, `${theme}-${label}-summary.json`), JSON.stringify(summary, null, 2));
  await browser.close();
}

await capture("light", { width: 1440, height: 960 }, "desktop");
await capture("dark", { width: 1440, height: 960 }, "desktop");
await capture("light", { width: 390, height: 844 }, "mobile");
await capture("dark", { width: 390, height: 844 }, "mobile");
console.log("done", outDir);
