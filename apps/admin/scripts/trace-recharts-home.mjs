import fs from "node:fs";
import path from "node:path";

const assets = "dist/client/assets";
if (!fs.existsSync(assets)) {
  console.log("NO_DIST");
  process.exit(0);
}
const files = fs
  .readdirSync(assets)
  .filter((f) => f.endsWith(".js"))
  .map((f) => ({ f, n: fs.statSync(path.join(assets, f)).size }))
  .sort((a, b) => b.n - a.n);

const entry = files[0];
const t = fs.readFileSync(path.join(assets, entry.f), "utf8");
console.log("entry", entry.f, (entry.n / 1024).toFixed(1) + "KB");
for (const k of [
  "recharts",
  "ResponsiveContainer",
  "ChartContainer",
  "RechartsPrimitive",
  "chart-utils",
]) {
  console.log(" ", k, t.split(k).length - 1);
}
console.log(
  "recharts-ish chunks:",
  files
    .filter((x) => /recharts|chart-utils|ComposedChart|exceljs/i.test(x.f))
    .map((x) => `${(x.n / 1024).toFixed(1)}KB ${x.f}`),
);

// Who in admin src imports Chart* from lumenx/ui?
const root = "src";
const hits = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?)$/.test(name)) {
      const s = fs.readFileSync(p, "utf8");
      if (
        /ChartContainer|ChartTooltipContent|ChartLegendContent|ChartStyle/.test(
          s,
        ) &&
        /@lumenx\/ui/.test(s)
      ) {
        hits.push(p);
      }
      if (/from ["']@lumenx\/ui["']/.test(s) && /Chart/.test(s)) {
        hits.push("chart-name-import? " + p);
      }
    }
  }
}
walk(root);
console.log("admin files importing Chart* with @lumenx/ui:", hits);
