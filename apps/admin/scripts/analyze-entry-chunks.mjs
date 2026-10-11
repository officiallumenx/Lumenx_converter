import fs from "node:fs";
import path from "node:path";

const assetsDir = path.resolve("dist/client/assets");
if (!fs.existsSync(assetsDir)) {
  console.error("Missing dist/client/assets — run npm run build first");
  process.exit(1);
}

const files = fs
  .readdirSync(assetsDir)
  .filter((f) => f.endsWith(".js"))
  .map((f) => ({ f, n: fs.statSync(path.join(assetsDir, f)).size }))
  .sort((a, b) => b.n - a.n);

console.log("Top 25 client chunks:");
for (const x of files.slice(0, 25)) {
  console.log(`${(x.n / 1024).toFixed(1)}KB\t${x.f}`);
}

const entry = files[0];
const text = fs.readFileSync(path.join(assetsDir, entry.f), "utf8");
console.log("\nEntry:", entry.f, `${(entry.n / 1024).toFixed(1)}KB`);

for (const k of ["exceljs", "ExcelJS", "SheetJS", "recharts", "xlsx"]) {
  console.log(`  "${k}" occurrences:`, text.split(k).length - 1);
}

const chunkNameRe = /[A-Za-z0-9._-]*(?:exceljs|xlsx|analytics|recharts)[A-Za-z0-9._-]*/gi;
const names = [...new Set(text.match(chunkNameRe) ?? [])].slice(0, 40);
console.log("\nName-like refs in entry:", names);

// Which named chunks exist on disk
const heavy = files.filter((x) =>
  /exceljs|xlsx|analytics|recharts|students|teachers|marks|fees|transport/i.test(
    x.f,
  ),
);
console.log("\nHeavy/feature chunks on disk:");
for (const x of heavy) {
  console.log(`${(x.n / 1024).toFixed(1)}KB\t${x.f}`);
}

// Scan all chunks: which ones contain ExcelJS/xlsx/recharts source markers
console.log("\nChunks containing library markers:");
for (const x of files) {
  const t = fs.readFileSync(path.join(assetsDir, x.f), "utf8");
  const hits = [];
  if (t.includes("ExcelJS") || t.includes("exceljs")) hits.push("exceljs");
  if (t.includes("SheetJS") || /\bread\b.*\bxlsx\b/i.test(t.slice(0, 5000))) {
    /* skip noisy */
  }
  if (t.includes("sheet_to_json") || t.includes("bookType")) hits.push("xlsx-api");
  if (t.includes("ResponsiveContainer") || t.includes("ComposedChart"))
    hits.push("recharts");
  if (hits.length) console.log(`${(x.n / 1024).toFixed(1)}KB\t${x.f}\t${hits.join(",")}`);
}

const distRoot = path.resolve("dist");
function walkHtml(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkHtml(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}
const htmls = walkHtml(distRoot);
console.log("\nHTML files:", htmls);
for (const h of htmls.slice(0, 3)) {
  const html = fs.readFileSync(h, "utf8");
  const preloads = [...html.matchAll(/modulepreload[^>]+href="([^"]+)"/g)].map(
    (m) => m[1],
  );
  console.log(h, "modulepreloads", preloads.length);
  console.log(
    preloads
      .filter((u) => /exceljs|xlsx|analytics|recharts|index-/i.test(u))
      .slice(0, 20),
  );
}
