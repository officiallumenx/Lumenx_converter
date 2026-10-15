/**
 * Post-build helper for TanStack Start + Nitro Cloudflare Workers.
 *
 * Run from an app root after `vite build` (cwd = apps/<name>):
 *   node ../../scripts/prepare-cf-worker-deploy.mjs
 *
 * Ensures:
 * - dist/server/server.js bundle for Workers Builds
 * - dist/server/wrangler.json (dist-relative paths)
 * - apps/<name>/wrangler.jsonc + wrangler.json (app-root discovery)
 * - monorepo-root wrangler.json(+c) when deploy cwd is the repo root
 *   (Cloudflare often runs `npx wrangler versions upload` there)
 * - stale .wrangler/deploy redirects are cleared
 *
 * Does not publish.
 */
import fs from "node:fs";
import path from "node:path";
import { build as esbuild } from "esbuild";

const appRoot = process.cwd();
const serverDir = path.join(appRoot, "dist", "server");
const indexPath = path.join(serverDir, "index.mjs");
const serverJsPath = path.join(serverDir, "server.js");
const wranglerPath = path.join(serverDir, "wrangler.json");
const appWranglerJsonPath = path.join(appRoot, "wrangler.json");
const appWranglerJsoncPath = path.join(appRoot, "wrangler.jsonc");

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function findMonorepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 8; i++) {
    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        if (pkg.workspaces) return dir;
      } catch {
        // keep walking
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

if (!fs.existsSync(indexPath)) {
  console.error(
    `[prepare-cf-worker-deploy] Missing ${path.relative(appRoot, indexPath)} — run vite build with nitro: true first.`,
  );
  process.exit(1);
}

await esbuild({
  entryPoints: [indexPath],
  outfile: serverJsPath,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "es2022",
  logLevel: "warning",
  external: ["cloudflare:*", "node:*"],
  banner: {
    js: "globalThis.__nitro_main__ = import.meta.url;",
  },
});

if (!fs.existsSync(wranglerPath)) {
  console.error(
    `[prepare-cf-worker-deploy] Missing ${path.relative(appRoot, wranglerPath)} — Nitro did not emit a Worker config.`,
  );
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(wranglerPath, "utf8"));
if (config?.assets?.directory) {
  config.assets.directory = "../client";
}
config.main = "server.js";
config.no_bundle = true;
delete config.rules;
config.compatibility_flags = Array.from(
  new Set([...(config.compatibility_flags ?? []), "nodejs_compat"]),
);
const overrideNameEarly = process.env.WRANGLER_CI_OVERRIDE_NAME || "";
const appFolderEarly = path.basename(appRoot);
const overrideFolderEarly = {
  "lumenx-admin": "admin",
  "lumenx-nexus": "nexus",
  "lumenx-connect": "connect",
  "lumenx-transport": "transport",
  "lumenx-website": "website",
}[overrideNameEarly];
if (overrideNameEarly && overrideFolderEarly === appFolderEarly) {
  config.name = overrideNameEarly;
}
fs.writeFileSync(wranglerPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

const appConfig = {
  ...config,
  main: "dist/server/server.js",
};
if (appConfig.assets && typeof appConfig.assets === "object") {
  appConfig.assets = {
    ...appConfig.assets,
    directory: "dist/client",
  };
}
const appConfigText = `${JSON.stringify(appConfig, null, 2)}\n`;
fs.writeFileSync(appWranglerJsonPath, appConfigText, "utf8");
fs.writeFileSync(appWranglerJsoncPath, appConfigText, "utf8");

// When Workers Builds root directory is the monorepo root, bare
// `npx wrangler versions upload` looks here — not under apps/<name>.
const monorepoRoot = findMonorepoRoot(appRoot);
const overrideName = process.env.WRANGLER_CI_OVERRIDE_NAME || "";
const appFolder = path.basename(appRoot);
const overrideToFolder = {
  "lumenx-admin": "admin",
  "lumenx-nexus": "nexus",
  "lumenx-connect": "connect",
  "lumenx-transport": "transport",
  "lumenx-website": "website",
};
let monorepoNote = "skipped (monorepo root not found)";
if (monorepoRoot && path.resolve(monorepoRoot) !== path.resolve(appRoot)) {
  const expectedFolder = overrideToFolder[overrideName];
  if (expectedFolder && expectedFolder !== appFolder) {
    monorepoNote = `skipped monorepo-root write (CI worker=${overrideName}, app=${appFolder})`;
  } else {
    const relMain = toPosix(path.relative(monorepoRoot, serverJsPath));
    const relAssets = toPosix(
      path.relative(monorepoRoot, path.join(appRoot, "dist", "client")),
    );
    const monoConfig = {
      ...appConfig,
      main: relMain,
    };
    if (monoConfig.assets && typeof monoConfig.assets === "object") {
      monoConfig.assets = {
        ...monoConfig.assets,
        directory: relAssets,
      };
    }
    const monoText = `${JSON.stringify(monoConfig, null, 2)}\n`;
    fs.writeFileSync(path.join(monorepoRoot, "wrangler.json"), monoText, "utf8");
    fs.writeFileSync(path.join(monorepoRoot, "wrangler.jsonc"), monoText, "utf8");
    monorepoNote = `wrote monorepo-root wrangler.json (main=${relMain})`;
  }
}

fs.rmSync(path.join(appRoot, ".wrangler", "deploy"), {
  recursive: true,
  force: true,
});

if (!fs.existsSync(serverJsPath)) {
  console.error("[prepare-cf-worker-deploy] server.js missing after bundle");
  process.exit(1);
}

const sizeKb = Math.round(fs.statSync(serverJsPath).size / 1024);
const workerName = typeof config.name === "string" ? config.name : "(unnamed)";
console.log(
  `[prepare-cf-worker-deploy] ${workerName}: server.js ${sizeKb} KiB; app-root configs synced; ${monorepoNote}`,
);
