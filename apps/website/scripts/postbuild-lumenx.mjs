import { readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const distDir = join(process.cwd(), "dist");

function collectFiles(dir, ext) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...collectFiles(full, ext));
    } else if (!ext || full.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

const assetsDir = join(distDir, "_lumenx");
const renamedMap = new Map();

for (const filePath of collectFiles(assetsDir)) {
  const base = filePath.split(/[\\/]/).pop();
  if (/astro/i.test(base)) {
    const newBase = base.replace(/astro/gi, "lumenx");
    const newPath = join(filePath.slice(0, -base.length), newBase);
    renameSync(filePath, newPath);
    renamedMap.set(base, newBase);
  }
}

for (const cssFile of collectFiles(assetsDir, ".css")) {
  let css = readFileSync(cssFile, "utf8");
  if (/data-astro-/i.test(css)) {
    css = css.replace(/data-astro-/gi, "data-lumenx-");
    writeFileSync(cssFile, css, "utf8");
  }
}

for (const htmlFile of collectFiles(distDir, ".html")) {
  let html = readFileSync(htmlFile, "utf8");
  for (const [oldName, newName] of renamedMap.entries()) {
    html = html.split(oldName).join(newName);
  }
  html = html.replace(/data-astro-/gi, "data-lumenx-");
  writeFileSync(htmlFile, html, "utf8");
}

console.log(`Sanitized dist/ output (${renamedMap.size} asset(s) renamed to lumenx).`);
