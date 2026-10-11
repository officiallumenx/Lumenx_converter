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

async function injectSampleRows(page) {
  await page.evaluate(() => {
    const list = document.querySelector(".lx-home-activity__list");
    const empty = document.querySelector(".lx-home-activity__empty");
    if (!list) return;
    empty?.remove();
    list.replaceChildren();
    for (let i = 0; i < 5; i += 1) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lx-home-activity__row";
      btn.innerHTML = [
        '<span class="lx-home-activity__chip border" aria-hidden style="background:#eff6ff;color:#2563eb">•</span>',
        '<span class="lx-home-activity__body">',
        '<span class="lx-home-activity__title-line">',
        '<span class="lx-home-activity__unread bg-primary"></span>',
        `<span class="lx-home-activity__title font-semibold text-foreground">Transport stop review requested ${i + 1}</span>`,
        "</span>",
        '<span class="lx-home-activity__desc">Driver submitted a stop change for route review. Please open the transport inbox and confirm the details before approving.</span>',
        '<span class="lx-home-activity__tags"><span class="text-[11px] px-1.5 py-0.5 rounded bg-muted">Transport</span></span>',
        "</span>",
        '<span class="lx-home-activity__aside">',
        '<span class="lx-home-activity__time">2h ago</span>',
        '<span class="text-[11px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">New</span>',
        "</span>",
      ].join("");
      li.appendChild(btn);
      list.appendChild(li);
    }
  });
}

async function capture(label, viewport) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport, colorScheme: "light" });
  const page = await context.newPage();
  await seed(page);
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3500);
  await injectSampleRows(page);
  await page.waitForTimeout(200);

  const metrics = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".lx-home-activity__row")];
    const ops = [...document.querySelectorAll(".lx-home-ops__head")];
    const tabs = document.querySelector(".lx-home-qa .lx-quick-action-tabs-scroller");
    const labels = [...document.querySelectorAll(".lx-home-qa .lx-quick-action-label")];
    const activity = document.querySelector(".lx-home-activity");
    return {
      activityH: activity ? Math.round(activity.getBoundingClientRect().height) : 0,
      activityMaxH: activity ? getComputedStyle(activity).maxHeight : null,
      rows: rows.map((r) => {
        const desc = r.querySelector(".lx-home-activity__desc");
        return {
          h: Math.round(r.getBoundingClientRect().height),
          display: getComputedStyle(r).display,
          cols: getComputedStyle(r).gridTemplateColumns,
          descClamp: desc ? getComputedStyle(desc).webkitLineClamp : null,
          descH: desc ? Math.round(desc.getBoundingClientRect().height) : null,
        };
      }),
      opsHeads: ops.map((h) => ({
        titleWrap: getComputedStyle(h.querySelector(".lx-home-panel__title")).whiteSpace,
        openAligned: Boolean(h.querySelector(".lx-home-ops__open")),
      })),
      tabsWrap: tabs ? getComputedStyle(tabs).flexWrap : null,
      tabsOverflow: tabs ? tabs.scrollWidth > tabs.clientWidth + 2 : null,
      clippedLabels: labels.filter((el) => el.scrollHeight > el.clientHeight + 1).length,
      overflowX: document.body.scrollWidth > document.body.clientWidth + 2,
    };
  });

  await page.screenshot({
    path: path.join(outDir, `${label}-focus.png`),
    fullPage: true,
  });
  fs.writeFileSync(path.join(outDir, `${label}-focus.json`), JSON.stringify(metrics, null, 2));
  console.log(label, JSON.stringify(metrics));
  await browser.close();
}

await capture("desktop-1440", { width: 1440, height: 960 });
await capture("desktop-1280", { width: 1280, height: 900 });
await capture("tablet-768", { width: 768, height: 1024 });
await capture("mobile-390", { width: 390, height: 844 });
console.log("done", outDir);
