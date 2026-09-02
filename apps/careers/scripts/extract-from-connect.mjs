/**
 * One-time extraction: Connect careers zone → standalone apps/careers.
 * Run from repo root: node apps/careers/scripts/extract-from-connect.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../../..");
const CONNECT = path.join(REPO, "apps/connect/src");
const CAREERS = path.join(REPO, "apps/careers/src");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else copyFile(s, d);
  }
}

/** Public URL paths (nav, Link, Navigate) — strip /careers prefix. */
function transformPublicPaths(content) {
  let out = content;
  // Longer paths first
  out = out.replace(/\/careers\/recruiter/g, "/recruiter");
  out = out.replace(/\/careers\/applications/g, "/applications");
  out = out.replace(/\/careers\/institutes/g, "/institutes");
  out = out.replace(/\/careers\/dashboard/g, "/dashboard");
  out = out.replace(/\/careers\/notifications/g, "/notifications");
  out = out.replace(/\/careers\/interviews/g, "/interviews");
  out = out.replace(/\/careers\/documents/g, "/documents");
  out = out.replace(/\/careers\/settings/g, "/settings");
  out = out.replace(/\/careers\/profile/g, "/profile");
  out = out.replace(/\/careers\/privacy/g, "/privacy");
  out = out.replace(/\/careers\/forgot-password/g, "/forgot-password");
  out = out.replace(/\/careers\/setup-from-admin/g, "/setup-from-admin");
  out = out.replace(/\/careers\/signup/g, "/signup");
  out = out.replace(/\/careers\/login/g, "/login");
  out = out.replace(/\/careers\/saved/g, "/saved");
  out = out.replace(/\/careers\/apply/g, "/apply");
  out = out.replace(/\/careers\/terms/g, "/terms");
  out = out.replace(/\/careers\/jobs/g, "/jobs");
  out = out.replace(/\/careers"/g, '/"');
  out = out.replace(/\/careers'/g, "/'");
  out = out.replace(/\/careers\`/g, "/`");
  out = out.replace(/\/careers\)/g, "/)");
  out = out.replace(/\/careers,/g, "/,");
  out = out.replace(/\/careers /g, "/ ");
  out = out.replace(/to: "\/"/g, 'to: "/"');
  return out;
}

/** TanStack route ids — map /careers/* → /_app/* */
function transformRouteIds(content) {
  return content
    .replace(/createFileRoute\("\/careers\//g, 'createFileRoute("/_app/')
    .replace(/createFileRoute\('\/careers\//g, "createFileRoute('/_app/")
    .replace(/createFileRoute\("\/careers"\)/g, 'createFileRoute("/_app")')
    .replace(/createFileRoute\('\/careers'\)/g, "createFileRoute('/_app')")
    .replace(/createFileRoute\("\/careers\/"\)/g, 'createFileRoute("/_app/")')
    .replace(/createFileRoute\('\/careers\/'\)/g, "createFileRoute('/_app/')");
}

function transformContent(content, { routeFile = false } = {}) {
  let out = content;
  if (routeFile) out = transformRouteIds(out);
  out = transformPublicPaths(out);
  out = out.replace(
    /@\/lib\/admissions\/lumenx-admin-bridge/g,
    "@/lib/admin-handoff",
  );
  return out;
}

function walkTransform(dir, { routeDir = false } = {}) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTransform(full, { routeDir: routeDir || entry.name === "_app" });
    } else if (/\.(tsx?|css)$/.test(entry.name)) {
      const raw = fs.readFileSync(full, "utf8");
      const isRoute = routeDir || full.includes(`${path.sep}routes${path.sep}`);
      fs.writeFileSync(
        full,
        transformContent(raw, { routeFile: isRoute && entry.name.endsWith(".tsx") }),
      );
    }
  }
}

// ── Copy core careers code ──────────────────────────────────────────
console.log("Copying careers-portal...");
copyDir(path.join(CONNECT, "careers-portal"), path.join(CAREERS, "careers-portal"));

console.log("Copying lib/careers...");
copyDir(path.join(CONNECT, "lib/careers"), path.join(CAREERS, "lib/careers"));

console.log("Copying admin handoff...");
copyFile(
  path.join(CONNECT, "lib/admissions/lumenx-admin-bridge.ts"),
  path.join(CAREERS, "lib/admin-handoff.ts"),
);

console.log("Copying shared components...");
const componentFiles = [
  "components/app/SectionCard.tsx",
  "components/app/StatCard.tsx",
  "components/app/LumenXLogo.tsx",
  "components/app/MobileMoreSheetContent.tsx",
  "components/app/PhoneInput.tsx",
  "components/app/attendance/AttendanceDatePicker.tsx",
  "components/app/settings/SettingsPrimitives.tsx",
  "components/legal/TermsAcceptCheckbox.tsx",
];
for (const rel of componentFiles) {
  copyFile(path.join(CONNECT, rel), path.join(CAREERS, rel));
}

console.log("Copying assets + styles...");
copyDir(path.join(CONNECT, "assets"), path.join(CAREERS, "assets"));
copyFile(path.join(CONNECT, "styles.css"), path.join(CAREERS, "styles.css"));

console.log("Copying routes...");
copyFile(
  path.join(CONNECT, "routes/careers.tsx"),
  path.join(CAREERS, "routes/_app.tsx"),
);
copyDir(path.join(CONNECT, "routes/careers"), path.join(CAREERS, "routes/_app"));

console.log("Transforming paths...");
walkTransform(CAREERS);

// Fix _app layout route id
const appLayout = path.join(CAREERS, "routes/_app.tsx");
if (fs.existsSync(appLayout)) {
  let layout = fs.readFileSync(appLayout, "utf8");
  layout = layout.replace(
    /createFileRoute\("\/_app"\)/,
    'createFileRoute("/_app")',
  );
  fs.writeFileSync(appLayout, layout);
}

console.log("Done — apps/careers/src populated.");
