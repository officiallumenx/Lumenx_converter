/**
 * Bootstrap standalone apps/admissions from Connect admissions zone + Careers app shell.
 * Run from repo root: node apps/admissions/scripts/bootstrap-standalone.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../../..");
const CONNECT = path.join(REPO, "apps/connect/src");
const CAREERS = path.join(REPO, "apps/careers");
const ADMISSIONS = path.join(REPO, "apps/admissions");
const ADM_SRC = path.join(ADMISSIONS, "src");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  if (!fs.existsSync(src)) return;
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

function replaceInTree(dir, replacer) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) replaceInTree(full, replacer);
    else if (/\.(tsx?|css|json)$/.test(entry.name)) {
      fs.writeFileSync(full, replacer(fs.readFileSync(full, "utf8")));
    }
  }
}

function transformPublicPaths(content) {
  let out = content;
  const pairs = [
    ["/admissions/institute/applications", "/institute/applications"],
    ["/admissions/institute/openings", "/institute/openings"],
    ["/admissions/institute/profile", "/institute/profile"],
    ["/admissions/institute/settings", "/institute/settings"],
    ["/admissions/institute/form", "/institute/form"],
    ["/admissions/institute", "/institute"],
    ["/admissions/applications", "/applications"],
    ["/admissions/institutes", "/institutes"],
    ["/admissions/programs", "/programs"],
    ["/admissions/dashboard", "/dashboard"],
    ["/admissions/notifications", "/notifications"],
    ["/admissions/documents", "/documents"],
    ["/admissions/inquiries", "/inquiries"],
    ["/admissions/settings", "/settings"],
    ["/admissions/profile", "/profile"],
    ["/admissions/privacy", "/privacy"],
    ["/admissions/forgot-password", "/forgot-password"],
    ["/admissions/setup-from-admin", "/setup-from-admin"],
    ["/admissions/signup", "/signup"],
    ["/admissions/login", "/login"],
    ["/admissions/contact", "/contact"],
    ["/admissions/apply", "/apply"],
    ["/admissions/terms", "/terms"],
    ["/admissions/faq", "/faq"],
  ];
  for (const [from, to] of pairs) {
    out = out.split(from).join(to);
  }
  out = out.replace(/\/admissions"/g, '/"');
  out = out.replace(/\/admissions'/g, "/'");
  out = out.replace(/\/admissions`/g, "/`");
  out = out.replace(/\/admissions\)/g, "/)");
  out = out.replace(/\/admissions,/g, "/,");
  out = out.replace(/\/admissions /g, "/ ");
  return out;
}

function transformRouteIds(content) {
  return content
    .replace(/createFileRoute\("\/admissions\//g, 'createFileRoute("/_app/')
    .replace(/createFileRoute\('\/admissions\//g, "createFileRoute('/_app/")
    .replace(/createFileRoute\("\/admissions"\)/g, 'createFileRoute("/_app")')
    .replace(/createFileRoute\('\/admissions'\)/g, "createFileRoute('/_app')")
    .replace(/createFileRoute\("\/admissions\/"\)/g, 'createFileRoute("/_app/")')
    .replace(/createFileRoute\('\/admissions\/'\)/g, "createFileRoute('/_app/')");
}

function transformBranding(content) {
  return content
    .replace(/VITE_CAREERS_AUTH_MODE/g, "VITE_ADMISSIONS_AUTH_MODE")
    .replace(/CAREERS_AUTH_MODE/g, "ADMISSIONS_AUTH_MODE")
    .replace(/getCareersApiClient/g, "getAdmissionsApiClient")
    .replace(/CareersApiClient/g, "AdmissionsApiClient")
    .replace(/careers-api/g, "admissions-api")
    .replace(/resetCareersApiClientForTests/g, "resetAdmissionsApiClientForTests")
    .replace(/setCareersApiUnauthorizedHandler/g, "setAdmissionsApiUnauthorizedHandler")
    .replace(/OfflineSyncHost app="careers"/g, 'OfflineSyncHost app="admissions"')
    .replace(/LumenX Careers/g, "LumenX Admissions")
    .replace(/@lumenx\/app-careers/g, "@lumenx/app-admissions");
}

function walkTransform(dir, { routeDir = false } = {}) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTransform(full, { routeDir: routeDir || entry.name === "_app" });
    } else if (/\.(tsx?|css)$/.test(entry.name)) {
      const isRoute = routeDir || full.includes(`${path.sep}routes${path.sep}`);
      let raw = fs.readFileSync(full, "utf8");
      if (isRoute && entry.name.endsWith(".tsx")) raw = transformRouteIds(raw);
      raw = transformPublicPaths(raw);
      raw = transformBranding(raw);
      fs.writeFileSync(full, raw);
    }
  }
}

// ── Config from careers ─────────────────────────────────────────────
console.log("Copying config from careers...");
for (const file of ["tsconfig.json", "eslint.config.js", "vite.config.ts"]) {
  copyFile(path.join(CAREERS, file), path.join(ADMISSIONS, file));
}
copyFile(path.join(CAREERS, "src/server.ts"), path.join(ADM_SRC, "server.ts"));

let vite = fs.readFileSync(path.join(ADMISSIONS, "vite.config.ts"), "utf8");
vite = vite.replace(/5176/g, "5177").replace(/vite-careers/g, "vite-admissions");
fs.writeFileSync(path.join(ADMISSIONS, "vite.config.ts"), vite);

// package.json
const pkg = JSON.parse(fs.readFileSync(path.join(CAREERS, "package.json"), "utf8"));
pkg.name = "@lumenx/app-admissions";
fs.writeFileSync(path.join(ADMISSIONS, "package.json"), JSON.stringify(pkg, null, 2) + "\n");

// .env.example
const env = `# LumenX Admissions — environment template
VITE_PUBLIC_APP_URL=
VITE_ADMISSIONS_AUTH_MODE=demo
VITE_API_BASE_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
`;
fs.writeFileSync(path.join(ADMISSIONS, ".env.example"), env);

// ── Shell infrastructure from careers ───────────────────────────────
console.log("Copying auth, api, components...");
copyDir(path.join(CAREERS, "src/auth"), path.join(ADM_SRC, "auth"));
copyDir(path.join(CAREERS, "src/lib/api"), path.join(ADM_SRC, "lib/api"));
copyDir(path.join(CAREERS, "src/lib/identity"), path.join(ADM_SRC, "lib/identity"));
copyDir(path.join(CAREERS, "src/lib/notification-inbox"), path.join(ADM_SRC, "lib/notification-inbox"));
copyDir(path.join(CAREERS, "src/lib/institute-profile"), path.join(ADM_SRC, "lib/institute-profile"));
copyDir(path.join(CAREERS, "src/lib/legal"), path.join(ADM_SRC, "lib/legal"));
copyDir(path.join(CAREERS, "src/components"), path.join(ADM_SRC, "components"));
copyDir(path.join(CAREERS, "src/assets"), path.join(ADM_SRC, "assets"));
copyFile(path.join(CAREERS, "src/styles.css"), path.join(ADM_SRC, "styles.css"));
copyFile(path.join(CAREERS, "src/router.tsx"), path.join(ADM_SRC, "router.tsx"));
copyFile(path.join(CAREERS, "src/lib/supabase-browser.ts"), path.join(ADM_SRC, "lib/supabase-browser.ts"));
copyFile(path.join(CAREERS, "src/lib/institute-id.ts"), path.join(ADM_SRC, "lib/institute-id.ts"));
copyFile(path.join(CAREERS, "src/lib/use-safe-timeout.ts"), path.join(ADM_SRC, "lib/use-safe-timeout.ts"));
copyFile(path.join(CAREERS, "src/lib/connect-calendar-theme.ts"), path.join(ADM_SRC, "lib/connect-calendar-theme.ts"));
copyFile(path.join(CAREERS, "src/lib/careers-api.ts"), path.join(ADM_SRC, "lib/admissions-api.ts"));

// ── Admissions domain from connect ──────────────────────────────────
console.log("Copying admissions-portal and lib/admissions...");
copyDir(path.join(CONNECT, "admissions-portal"), path.join(ADM_SRC, "admissions-portal"));
copyDir(path.join(CONNECT, "lib/admissions"), path.join(ADM_SRC, "lib/admissions"));
copyFile(
  path.join(CONNECT, "lib/admissions/lumenx-admin-bridge.ts"),
  path.join(ADM_SRC, "lib/admin-handoff.ts"),
);

// hooks from connect
console.log("Copying hooks...");
ensureDir(path.join(ADM_SRC, "hooks"));
for (const hook of ["use-admissions-api-inbox.ts"]) {
  copyFile(path.join(CONNECT, "src/hooks", hook), path.join(ADM_SRC, "hooks", hook));
}

// routes
console.log("Copying routes...");
copyFile(path.join(CONNECT, "routes/admissions.tsx"), path.join(ADM_SRC, "routes/_app.tsx"));
copyDir(path.join(CONNECT, "routes/admissions"), path.join(ADM_SRC, "routes/_app"));

// root route from careers template
copyFile(path.join(CAREERS, "src/routes/__root.tsx"), path.join(ADM_SRC, "routes/__root.tsx"));

// Remove interviews route
const interviewsRoute = path.join(ADM_SRC, "routes/_app/interviews.tsx");
if (fs.existsSync(interviewsRoute)) fs.unlinkSync(interviewsRoute);
const interviewsFeature = path.join(ADM_SRC, "admissions-portal/features/interviews");
if (fs.existsSync(interviewsFeature)) fs.rmSync(interviewsFeature, { recursive: true, force: true });

// ── Transform ───────────────────────────────────────────────────────
console.log("Transforming paths and branding...");
walkTransform(ADM_SRC);

// Fix _app layout imports
const appLayout = path.join(ADM_SRC, "routes/_app.tsx");
if (fs.existsSync(appLayout)) {
  let layout = fs.readFileSync(appLayout, "utf8");
  layout = layout.replace(
    /createFileRoute\("\/_app"\)/,
    'createFileRoute("/_app")',
  );
  fs.writeFileSync(appLayout, layout);
}

// auth-mode uses ADMISSIONS
const authMode = path.join(ADM_SRC, "auth/auth-mode.ts");
if (fs.existsSync(authMode)) {
  let am = fs.readFileSync(authMode, "utf8");
  am = am.replace(/careers/gi, (m) => (m === "Careers" ? "Admissions" : "admissions"));
  fs.writeFileSync(authMode, am);
}

console.log("Done — apps/admissions/src bootstrapped.");
