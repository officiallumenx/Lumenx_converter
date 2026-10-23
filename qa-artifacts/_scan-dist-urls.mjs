import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const roots = [
  "apps/transport/dist",
  "apps/transport/android/app/src/main/assets/public",
];
const patterns = [
  "127.0.0.1:8787",
  "yveadybpntziyryxsrsu",
  "api.lumenxtech.in",
  "supabase.co",
];

for (const root of roots) {
  if (!existsSync(root)) {
    console.log(JSON.stringify({ root, missing: true }));
    continue;
  }
  const hits = [];
  function walk(dir) {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, name.name);
      if (name.isDirectory()) {
        if (name.name === "node_modules") continue;
        walk(p);
        continue;
      }
      if (!/\.(js|html|json|css)$/i.test(name.name)) continue;
      const text = readFileSync(p, "utf8");
      for (const pat of patterns) {
        if (text.includes(pat)) {
          hits.push({ file: p.replace(/\\/g, "/"), pat });
        }
      }
    }
  }
  walk(root);
  console.log(
    JSON.stringify(
      {
        root,
        indexHtml: existsSync(join(root, "index.html")),
        hits: hits.slice(0, 40),
        hitCount: hits.length,
      },
      null,
      2,
    ),
  );
}
