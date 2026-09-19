/**
 * Live route/shell probe across all LumenX apps.
 * Checks every concrete (non-$param) SPA route returns HTTP 200 from Vite.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");

const apps = [
  {
    name: "API",
    base: "http://127.0.0.1:8787",
    routes: ["/api/v1/health", "/api/v1/health/ready"],
  },
  { name: "Admin", base: "http://127.0.0.1:8081", tree: "apps/admin/src/routeTree.gen.ts" },
  { name: "Nexus", base: "http://127.0.0.1:8080", tree: "apps/nexus/src/routeTree.gen.ts" },
  { name: "Connect", base: "http://127.0.0.1:5174", tree: "apps/connect/src/routeTree.gen.ts" },
  { name: "Transport", base: "http://127.0.0.1:5175", tree: "apps/transport/src/routeTree.gen.ts" },
  { name: "Careers", base: "http://127.0.0.1:5176", tree: "apps/careers/src/routeTree.gen.ts" },
  { name: "Admissions", base: "http://127.0.0.1:5177", tree: "apps/admissions/src/routeTree.gen.ts" },
  { name: "Website", base: "http://127.0.0.1:8082", tree: "apps/website/src/routeTree.gen.ts" },
];

function routesFromTree(rel) {
  const text = readFileSync(join(root, rel), "utf8");
  const re = /fullPath: '(\/[^']*)'/g;
  const set = new Set();
  let m;
  while ((m = re.exec(text))) {
    const p = m[1];
    if (p.includes("$")) continue;
    if (p.endsWith("/") && p !== "/") continue;
    set.add(p);
  }
  return [...set].sort();
}

async function probe(url) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    const text = await res.text();
    const ms = Date.now() - t0;
    const badBody =
      /Cannot GET|Internal Server Error|Vite Error/i.test(text) && res.status >= 400;
    return { ok: res.ok && !badBody, status: res.status, ms, bytes: text.length };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      ms: Date.now() - t0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

const summary = [];

for (const app of apps) {
  const routes = app.routes ?? routesFromTree(app.tree);
  console.log(`\n==== ${app.name} (${app.base}) — ${routes.length} routes ====`);
  let pass = 0;
  let fail = 0;
  const fails = [];
  for (const route of routes) {
    const url = `${app.base.replace(/\/$/, "")}${route}`;
    const r = await probe(url);
    const tag = r.ok ? "PASS" : "FAIL";
    if (r.ok) pass += 1;
    else {
      fail += 1;
      fails.push({ route, ...r });
    }
    const highlight =
      !r.ok ||
      route === "/" ||
      route === "/login" ||
      route.startsWith("/api/v1/health") ||
      route === "/academic-management" ||
      route === "/diary" ||
      route === "/academic-history";
    if (highlight) {
      console.log(
        `${tag}  ${route}  HTTP ${r.status}${r.error ? `  ${r.error}` : ""}  ${r.ms}ms`,
      );
    }
  }
  console.log(`→ ${app.name}: PASS ${pass}  FAIL ${fail}  TOTAL ${routes.length}`);
  if (fails.length) {
    console.log("  Failures:");
    for (const f of fails) {
      console.log(
        `   - ${f.route} HTTP ${f.status}${f.error ? ` ${f.error}` : ""}`,
      );
    }
  }
  summary.push({
    app: app.name,
    pass,
    fail,
    total: routes.length,
    fails: fails.map((f) => f.route),
  });
}

console.log("\n======== OVERALL ========");
for (const s of summary) {
  const mark = s.fail === 0 ? "OK " : "!! ";
  console.log(
    `${mark}${s.app.padEnd(12)} ${s.pass}/${s.total}${
      s.fails.length ? `  FAIL: ${s.fails.join(", ")}` : ""
    }`,
  );
}

const totalFail = summary.reduce((a, s) => a + s.fail, 0);
const totalPass = summary.reduce((a, s) => a + s.pass, 0);
console.log(`\nTOTAL PASS ${totalPass}  FAIL ${totalFail}`);
process.exit(totalFail ? 1 : 0);
