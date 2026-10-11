import fs from "node:fs";
import path from "node:path";

const htmlPath = path.resolve("dist/index.html");
const assetsDir = path.resolve("dist/client/assets");
const html = fs.readFileSync(htmlPath, "utf8");
const preloads = [...html.matchAll(/modulepreload[^>]+href="([^"]+)"/g)].map(
  (m) => m[1].replace(/^\/assets\//, ""),
);

console.log("Home modulepreload count:", preloads.length);
let total = 0;
const rows = [];
for (const name of preloads) {
  const p = path.join(assetsDir, name);
  const alt = fs.existsSync(p)
    ? p
    : fs
        .readdirSync(assetsDir)
        .find((f) => f.startsWith(name.split("-")[0]) && f.endsWith(".js"));
  const file = fs.existsSync(p) ? p : alt ? path.join(assetsDir, alt) : null;
  if (!file) {
    rows.push({ name, kb: null, note: "missing (stale html hash?)" });
    continue;
  }
  const kb = fs.statSync(file).size / 1024;
  total += kb;
  rows.push({ name: path.basename(file), kb, note: "" });
}
rows.sort((a, b) => (b.kb ?? 0) - (a.kb ?? 0));
for (const r of rows) {
  console.log(
    `${r.kb == null ? "  ?" : r.kb.toFixed(1).padStart(7)}KB  ${r.name} ${r.note}`,
  );
}
console.log(`\nPreload total (resolved): ${total.toFixed(1)}KB`);

const entries = fs
  .readdirSync(assetsDir)
  .filter((f) => f.startsWith("index-") && f.endsWith(".js"))
  .map((f) => ({ f, n: fs.statSync(path.join(assetsDir, f)).size }))
  .sort((a, b) => b.n - a.n);
console.log("\nLargest index-*.js:");
for (const e of entries.slice(0, 6)) {
  console.log(`${(e.n / 1024).toFixed(1)}KB  ${e.f}`);
}

// Rough marker scan of largest entry
const entry = entries[0];
if (entry) {
  const t = fs.readFileSync(path.join(assetsDir, entry.f), "utf8");
  const markers = [
    "firebase",
    "Firestore",
    "getAuth",
    "IndexedDB",
    "persistQueryClient",
    "createFileRoute",
    "AdminChrome",
    "HomeCommandCenter",
    "exceljs",
    "recharts",
    "student-directory",
    "marks-entry",
    "admissions",
    "careers",
    "transport",
  ];
  console.log("\nEntry marker counts:");
  for (const m of markers) {
    console.log(`  ${m}: ${(t.split(m).length - 1)}`);
  }
}
