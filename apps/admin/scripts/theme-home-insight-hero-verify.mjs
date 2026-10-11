import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../.theme-verify-home");
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

async function capture(label, viewport, colorScheme) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport, colorScheme });
  const page = await context.newPage();
  await page.addInitScript(
    ({ session, inst, theme }) => {
      localStorage.setItem("lx_admin_session_v1", JSON.stringify(session));
      localStorage.setItem("lx_admin_remember", "1");
      localStorage.setItem("lumenx.admin.activeInstituteId.v1", inst);
      localStorage.setItem("luminexa-theme", theme);
      sessionStorage.setItem("lx_app_unlocked_session_v1", "1");
    },
    { session, inst: INST, theme: colorScheme },
  );
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2800);

  const info = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".lx-home-insight")];
    const hero = document.querySelector(".lx-home-hero");
    const linksStrip = document.querySelector(".lx-home-insight-links");
    const heights = cards.map((c) => Math.round(c.getBoundingClientRect().height));
    const tops = cards.map((c) => Math.round(c.getBoundingClientRect().top));
    const rowGroups = new Map();
    tops.forEach((top, i) => {
      const key = String(top);
      if (!rowGroups.has(key)) rowGroups.set(key, []);
      rowGroups.get(key).push(heights[i]);
    });
    const equalRows = [...rowGroups.values()].every((hs) => {
      if (hs.length < 2) return true;
      return Math.max(...hs) - Math.min(...hs) <= 2;
    });
    const heroStyle = hero ? getComputedStyle(hero) : null;
    const titleStyle = hero
      ? getComputedStyle(hero.querySelector(".lx-home-hero__title"))
      : null;
    return {
      cardCount: cards.length,
      heights,
      equalRows,
      hasLinksStrip: Boolean(linksStrip),
      overflowX: document.body.scrollWidth > document.body.clientWidth + 2,
      heroBg: heroStyle?.backgroundImage || heroStyle?.backgroundColor || null,
      heroTitleColor: titleStyle?.color || null,
      notAvailable: document.querySelectorAll(
        ".lx-home-insight__value--unavailable",
      ).length,
      notes: [...document.querySelectorAll(".lx-home-insight__note")]
        .map((n) => n.textContent?.trim())
        .filter(Boolean),
    };
  });

  await page.screenshot({
    path: path.join(outDir, `${label}.png`),
    fullPage: true,
  });
  fs.writeFileSync(path.join(outDir, `${label}.json`), JSON.stringify(info, null, 2));
  console.log(label, JSON.stringify(info));
  await browser.close();
}

await capture("consistency-1440", { width: 1440, height: 960 }, "light");
await capture("consistency-1280", { width: 1280, height: 900 }, "light");
await capture("consistency-768", { width: 768, height: 1024 }, "light");
await capture("consistency-390", { width: 390, height: 844 }, "light");
await capture("consistency-1440-dark", { width: 1440, height: 960 }, "dark");
console.log("done", outDir);
