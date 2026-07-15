/**
 * Promotes TanStack Start client output to dist/ root for Capacitor + PWA.
 * TanStack writes client assets to dist/client/; Capacitor webDir expects dist/index.html.
 */
import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const distDir = join(process.cwd(), "dist");
const clientDir = join(distDir, "client");
const indexPath = join(clientDir, "index.html");

if (!existsSync(indexPath)) {
  console.error("[@lumenx/capacitor] dist/client/index.html not found after build.");
  process.exit(1);
}

const serverDir = join(distDir, "server");
if (existsSync(serverDir)) {
  rmSync(serverDir, { recursive: true, force: true });
}

for (const entry of readdirSync(clientDir)) {
  const src = join(clientDir, entry);
  const dest = join(distDir, entry);
  if (existsSync(dest)) {
    rmSync(dest, { recursive: true, force: true });
  }
  cpSync(src, dest, { recursive: true });
}

rmSync(clientDir, { recursive: true, force: true });

console.log("[@lumenx/capacitor] Capacitor dist ready: dist/index.html + assets/");
