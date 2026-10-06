const fs = require("fs");
const path = "apps/admin/src/routeTree.gen.ts";
let s = fs.readFileSync(path, "utf8");
if (s.includes("profile-settings")) {
  console.log("already present");
  process.exit(0);
}

s = s.replace(
  "import { Route as PrivacyRouteImport } from './routes/privacy'",
  "import { Route as PrivacyRouteImport } from './routes/privacy'\nimport { Route as ProfileSettingsRouteImport } from './routes/profile-settings'",
);

const privacyConst = `const PrivacyRoute = PrivacyRouteImport.update({
  id: '/privacy',
  path: '/privacy',
  getParentRoute: () => rootRouteImport,
} as any)`;
const profileConst = `const ProfileSettingsRoute = ProfileSettingsRouteImport.update({
  id: '/profile-settings',
  path: '/profile-settings',
  getParentRoute: () => rootRouteImport,
} as any)`;
if (!s.includes(privacyConst)) {
  console.error("privacy const missing");
  process.exit(1);
}
s = s.replace(privacyConst, privacyConst + "\n" + profileConst);

const typeNeedle = "  '/privacy': typeof PrivacyRoute\n  '/reports':";
const typeRepl =
  "  '/privacy': typeof PrivacyRoute\n  '/profile-settings': typeof ProfileSettingsRoute\n  '/reports':";
while (s.includes(typeNeedle)) s = s.replace(typeNeedle, typeRepl);

const unionNeedle = "| '/privacy'\n  | '/reports'";
const unionRepl = "| '/privacy'\n  | '/profile-settings'\n  | '/reports'";
while (s.includes(unionNeedle)) s = s.replace(unionNeedle, unionRepl);

s = s.replace(
  "  PrivacyRoute: typeof PrivacyRoute\n  ReportsRoute:",
  "  PrivacyRoute: typeof PrivacyRoute\n  ProfileSettingsRoute: typeof ProfileSettingsRoute\n  ReportsRoute:",
);

const privacyPath = `    '/privacy': {
      id: '/privacy'
      path: '/privacy'
      fullPath: '/privacy'
      preLoaderRoute: typeof PrivacyRouteImport
      parentRoute: typeof rootRouteImport
    }`;
const profilePath = `    '/profile-settings': {
      id: '/profile-settings'
      path: '/profile-settings'
      fullPath: '/profile-settings'
      preLoaderRoute: typeof ProfileSettingsRouteImport
      parentRoute: typeof rootRouteImport
    }`;
if (!s.includes(privacyPath)) {
  console.error("privacy path block missing");
  process.exit(1);
}
s = s.replace(privacyPath, privacyPath + "\n" + profilePath);

s = s.replace(
  "  PrivacyRoute: PrivacyRoute,\n  ReportsRoute: ReportsRoute,",
  "  PrivacyRoute: PrivacyRoute,\n  ProfileSettingsRoute: ProfileSettingsRoute,\n  ReportsRoute: ReportsRoute,",
);

fs.writeFileSync(path, s);
console.log("patched", (s.match(/profile-settings/g) || []).length);
