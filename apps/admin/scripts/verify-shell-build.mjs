import fs from "node:fs";
import path from "node:path";

const clientAssets = path.resolve("dist/client/assets");
const rootHtml = path.resolve("dist/index.html");
const clientHtmlCandidates = [
  path.resolve("dist/client/index.html"),
  rootHtml,
];

if (!fs.existsSync(clientAssets)) {
  console.error("Missing dist/client/assets — run npm run build first");
  process.exit(1);
}

const jsFiles = fs
  .readdirSync(clientAssets)
  .filter((f) => f.endsWith(".js"))
  .map((f) => ({
    f,
    n: fs.statSync(path.join(clientAssets, f)).size,
  }))
  .sort((a, b) => b.n - a.n);

console.log("=== dist/client top chunks ===");
for (const x of jsFiles.slice(0, 15)) {
  console.log(`${(x.n / 1024).toFixed(1)}KB\t${x.f}`);
}

const entry = jsFiles[0];
const entryText = fs.readFileSync(path.join(clientAssets, entry.f), "utf8");
console.log("\n=== Entry markers (substring counts) ===");
for (const m of [
  "exceljs",
  "ExcelJS",
  "recharts",
  "ResponsiveContainer",
  "sheet_to_json",
  "admissions-sync",
  "careers-sync",
  "demo-cross-port",
  "demo-shared-records",
  "marks-entry-store",
  "transport-approval-store",
  "leave-data",
]) {
  console.log(`  ${m}: ${(entryText.split(m).length - 1)}`);
}

console.log("\n=== Forbidden client chunks (should be 0) ===");
const forbidden = [
  /exceljs/,
  /^xlsx-/,
  /chart-utils|recharts|ComposedChart/,
  /demo-cross/,
  /demo-shared/,
  /admissions-sync/,
  /careers-sync/,
  /leave-data/,
  /transport-approval-store/,
];
// For preload exclusion we care about Home preload, not whether async chunks exist.
// Excel/xlsx/recharts SHOULD exist as async chunks.
const removedDemo = [
  "demo-cross",
  "demo-shared",
  "admissions-sync",
  "careers-sync",
  "leave-data",
  "transport-approval-store",
];
for (const key of removedDemo) {
  const hits = jsFiles.filter((x) => x.f.includes(key));
  console.log(
    `  ${key}: ${hits.length === 0 ? "ABSENT (good)" : hits.map((h) => h.f).join(", ")}`,
  );
}

console.log("\n=== Expected async vendor/feature chunks (should exist) ===");
for (const key of [
  "exceljs",
  "xlsx",
  "chart-utils",
  "transport-",
  "admissions-",
  "AnalyticsApiSummaryPanel",
  "StudentBulkImportDialog",
  "analytics-",
]) {
  const hits = jsFiles.filter((x) => x.f.includes(key)).slice(0, 3);
  console.log(
    `  ${key}: ${hits.length ? hits.map((h) => `${(h.n / 1024).toFixed(1)}KB ${h.f}`).join(" | ") : "MISSING"}`,
  );
}

function analyzeHtml(htmlPath) {
  if (!fs.existsSync(htmlPath)) {
    console.log(`\nHTML missing: ${htmlPath}`);
    return;
  }
  const html = fs.readFileSync(htmlPath, "utf8");
  const preloads = [...html.matchAll(/modulepreload[^>]+href="([^"]+)"/g)].map(
    (m) => m[1],
  );
  console.log(`\n=== ${path.relative(process.cwd(), htmlPath)} modulepreload (${preloads.length}) ===`);
  const bad = preloads.filter((u) =>
    /exceljs|xlsx|recharts|chart-utils|ComposedChart|demo-cross|demo-shared|admissions-sync|careers-sync|leave-data|transport-approval|marks-entry-store/i.test(
      u,
    ),
  );
  if (bad.length === 0) {
    console.log("  No forbidden heavy/demo preloads in this HTML list.");
  } else {
    console.log("  FORBIDDEN preloads:");
    for (const b of bad) console.log("   ", b);
  }
  // Resolve against dist/client/assets and dist/assets
  let resolved = 0;
  let missing = 0;
  for (const u of preloads) {
    const name = u.replace(/^\/assets\//, "");
    const p1 = path.join(clientAssets, name);
    const p2 = path.resolve("dist/assets", name);
    if (fs.existsSync(p1) || fs.existsSync(p2)) resolved++;
    else missing++;
  }
  console.log(`  Resolved files: ${resolved}, missing/stale hashes: ${missing}`);
  console.log("  First 12 preloads:");
  for (const u of preloads.slice(0, 12)) console.log("   ", u);
}

for (const h of clientHtmlCandidates) analyzeHtml(h);

// Shell import static check
const chrome = fs.readFileSync("src/components/AdminChrome.tsx", "utf8");
const inbox = fs.readFileSync("src/components/AdminInboxRefreshSync.tsx", "utf8");
const home = fs.readFileSync("src/components/home/HomeCommandCenter.tsx", "utf8");
console.log("\n=== Shell import checks ===");
console.log(
  "AdminChrome barrel import:",
  /from ["']@\/lib\/admin-queries["']/.test(chrome) ? "FAIL" : "PASS",
);
console.log(
  "AdminChrome hooks-shell:",
  /hooks-shell/.test(chrome) ? "PASS" : "FAIL",
);
console.log(
  "Inbox barrel import:",
  /from ["']@\/lib\/admin-queries["']/.test(inbox) ? "FAIL" : "PASS",
);
console.log(
  "Home hooks-shell:",
  /hooks-shell/.test(home) ? "PASS" : "FAIL",
);
console.log(
  "Home dynamic transport ops:",
  /import\(["']@\/lib\/transport\/ops-api["']\)/.test(home) ? "PASS" : "FAIL",
);
