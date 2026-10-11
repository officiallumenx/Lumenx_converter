import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../.theme-verify-home");
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

async function seed(page) {
  await page.addInitScript(
    ({ session, inst }) => {
      localStorage.setItem("lx_admin_session_v1", JSON.stringify(session));
      localStorage.setItem("lx_admin_remember", "1");
      localStorage.setItem("lumenx.admin.activeInstituteId.v1", inst);
      localStorage.setItem("luminexa-theme", "light");
      sessionStorage.setItem("lx_app_unlocked_session_v1", "1");
    },
    { session, inst: INST },
  );
}

function box(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    w: Math.round(r.width),
    h: Math.round(r.height),
    top: Math.round(r.top),
    left: Math.round(r.left),
  };
}

async function capture(label, viewport) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport, colorScheme: "light" });
  const page = await context.newPage();
  await seed(page);
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2200);
  const info = await page.evaluate(() => {
    const qs = (s) => document.querySelector(s);
    const measure = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    };
    const board = qs(".lx-home-board");
    const main = qs(".lx-home-board__main");
    const aside = qs(".lx-home-board__aside");
    const birthdays = qs(".lx-home-birthdays");
    const attention = qs(".lx-home-attention, .lx-home-healthy");
    const qa = qs(".lx-home-qa");
    const activity = qs(".lx-home-activity");
    const tabsScroller = qs(".lx-home-qa .lx-quick-action-tabs-scroller");
    const activityRows = [...document.querySelectorAll(".lx-home-activity__row")];
    const tileLabels = [...document.querySelectorAll(".lx-home-qa .lx-quick-action-label")];
    const opsHeads = [...document.querySelectorAll(".lx-home-ops__head")];
    const boardStyle = board ? getComputedStyle(board) : null;
    const tabsStyle = tabsScroller ? getComputedStyle(tabsScroller) : null;
    const clippedLabels = tileLabels.filter((el) => el.scrollHeight > el.clientHeight + 1).length;
    return {
      path: location.pathname,
      overflowX: document.body.scrollWidth > document.body.clientWidth + 2,
      boardCols: boardStyle?.gridTemplateColumns || null,
      boardAlign: boardStyle?.alignItems || null,
      board: measure(board),
      main: measure(main),
      aside: measure(aside),
      birthdays: measure(birthdays),
      attention: measure(attention),
      qa: measure(qa),
      activity: measure(activity),
      activityRowCount: activityRows.length,
      activityRowSample: activityRows.slice(0, 2).map((row) => {
        const r = row.getBoundingClientRect();
        const style = getComputedStyle(row);
        return {
          h: Math.round(r.height),
          display: style.display,
          cols: style.gridTemplateColumns,
        };
      }),
      tabsWrap: tabsStyle?.flexWrap || null,
      tabsOverflowX: tabsScroller
        ? tabsScroller.scrollWidth > tabsScroller.clientWidth + 2
        : null,
      clippedTileLabels: clippedLabels,
      opsHeadCount: opsHeads.length,
      qaHeightMatchActivity:
        qa && activity
          ? Math.abs(qa.getBoundingClientRect().height - activity.getBoundingClientRect().height) < 24
          : null,
      mainChildren: main ? main.children.length : 0,
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

await capture("desktop-1440", { width: 1440, height: 960 });
await capture("desktop-1280", { width: 1280, height: 900 });
await capture("tablet-768", { width: 768, height: 1024 });
await capture("mobile-390", { width: 390, height: 844 });
console.log("done", outDir);
