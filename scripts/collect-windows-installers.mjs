/**
 * Copy Electron NSIS installers into dist/releases/windows/{admin,nexus}-setup.exe
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "dist", "releases", "windows");
fs.mkdirSync(outDir, { recursive: true });

const mapping = [
  {
    product: "admin",
    sources: [
      path.join(root, "apps", "admin-desktop", "dist-out", "LumenX-Admin-Setup.exe"),
      path.join(root, "apps", "admin-desktop", "dist", "LumenX-Admin-Setup.exe"),
    ],
    dest: "admin-setup.exe",
  },
  {
    product: "nexus",
    sources: [
      path.join(root, "apps", "nexus-desktop", "dist", "LumenX-Nexus-Setup.exe"),
    ],
    dest: "nexus-setup.exe",
  },
];

const results = [];
for (const item of mapping) {
  const found = item.sources.find((p) => fs.existsSync(p));
  if (!found) {
    results.push({ product: item.product, ok: false, reason: "Installer not found — run electron-builder first" });
    continue;
  }
  const dest = path.join(outDir, item.dest);
  fs.copyFileSync(found, dest);
  results.push({ product: item.product, ok: true, path: dest, bytes: fs.statSync(dest).size });
}

console.log(JSON.stringify({ outDir, results }, null, 2));
process.exit(results.every((r) => r.ok) ? 0 : 1);
