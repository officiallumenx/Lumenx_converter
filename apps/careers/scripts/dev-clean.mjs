/**
 * Kill stale port 5174, then start Vite.
 * Single entry point so npm reports a clear lifecycle (no fragile `&&` chain).
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "package.json"));

function resolveViteBin() {
  const vitePkg = require.resolve("vite/package.json");
  return path.join(path.dirname(vitePkg), "bin", "vite.js");
}

function runKillPort() {
  return new Promise((resolve) => {
    const killer = spawn(process.execPath, ["scripts/kill-dev-port.mjs"], {
      cwd: root,
      stdio: "inherit",
      shell: false,
    });
    killer.on("exit", () => resolve());
    killer.on("error", () => resolve());
  });
}

function runVite() {
  const viteBin = resolveViteBin();
  const child = spawn(process.execPath, [viteBin, "dev"], {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.exit(0);
      return;
    }
    process.exit(code ?? 0);
  });

  child.on("error", (err) => {
    console.error("[dev:clean] Failed to start Vite:", err.message);
    process.exit(1);
  });

  const forward = (sig) => {
    if (!child.killed) child.kill(sig);
  };
  process.on("SIGINT", () => forward("SIGINT"));
  process.on("SIGTERM", () => forward("SIGTERM"));
}

await runKillPort();
console.log("[dev:clean] Starting Vite…");
runVite();
