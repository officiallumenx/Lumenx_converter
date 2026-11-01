import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CANONICAL_PATHS, SITE_ORIGIN } from "../src/data/site-urls.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "sitemap.xml");

const urls = CANONICAL_PATHS.map((path) => {
  const loc = path === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;
  const priority = path === "/" ? "1.0" : path.split("/").length <= 2 ? "0.8" : "0.6";
  return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}).join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, xml, "utf8");
console.log(`Wrote ${out} (${CANONICAL_PATHS.length} URLs)`);
