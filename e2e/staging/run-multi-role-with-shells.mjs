/**
 * Start staging API + Admin + Connect shells (reuse if ready), run
 * Playwright staging-multi-role project, then stop only spawned children.
 *
 *   node --env-file=backend/.env.staging e2e/staging/run-multi-role-with-shells.mjs
 *
 * Never prints secrets. Staging ref hard-gated.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { assertStagingEnv, extractSupabaseProjectRef } = require(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../backend/scripts/assert-staging-env.mjs"),
);

assertStagingEnv(process.env);
const EXPECTED_REF = "yveadybpntziyryxsrsu";
const DENIED_REF = "kmpzflsurepjwqnfqyld";
const urlRef = extractSupabaseProjectRef(process.env.SUPABASE_URL);
if (urlRef !== EXPECTED_REF) {
  throw new Error(`Refusing: SUPABASE_URL ref !== ${EXPECTED_REF}`);
}
if (urlRef === DENIED_REF) {
  throw new Error("Refusing denylisted shared/default project");
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const API =
  process.env.E2E_API_BASE_URL?.trim() ||
  process.env.SMOKE_API_BASE_URL?.trim() ||
  "http://127.0.0.1:8787";
const SUPABASE_URL = process.env.SUPABASE_URL.trim();
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY.trim();
const READY_TIMEOUT_MS = Number(process.env.E2E_SHELL_READY_TIMEOUT_MS ?? 180_000);
const REUSE = process.env.E2E_SHELL_REUSE !== "0";

function resolveNpmInvocation() {
  const besideNode = join(
    dirname(process.execPath),
    "node_modules",
    "npm",
    "bin",
    "npm-cli.js",
  );
  if (existsSync(besideNode)) {
    return { command: process.execPath, argsPrefix: [besideNode] };
  }
  return {
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    argsPrefix: [],
    shell: process.platform === "win32",
  };
}

const npmInv = resolveNpmInvocation();

/** @type {Array<{ app: string, child: import('node:child_process').ChildProcess, log: string[] }>} */
const children = [];
let shuttingDown = false;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function redact(line) {
  return String(line)
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted-jwt]")
    .replace(/(service_role|anon|password|secret|token)\s*[:=]\s*\S+/gi, "$1=[redacted]");
}

async function probeUrl(url) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (res.ok || res.status === 304) return { ok: true };
    return { ok: false, err: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, err: err instanceof Error ? err.message : String(err) };
  }
}

async function waitForUrl(url, { timeoutMs, label, logLines = [] }) {
  const started = Date.now();
  let lastErr = "not started";
  while (Date.now() - started < timeoutMs) {
    const probe = await probeUrl(url);
    if (probe.ok) return;
    lastErr = probe.err ?? "down";
    await sleep(1000);
  }
  const tail = logLines.slice(-20).map(redact).join("\n");
  throw new Error(
    `Timed out waiting for ${label} at ${url} (${lastErr}).` +
      (tail ? `\n--- log ---\n${tail}` : ""),
  );
}

function startNpm(args, env, app) {
  const log = [];
  const pushLog = (buf) => {
    for (const line of buf.toString("utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      log.push(line);
      if (log.length > 80) log.shift();
    }
  };
  const child = spawn(npmInv.command, [...npmInv.argsPrefix, ...args], {
    cwd: repoRoot,
    env: { ...process.env, ...env, NODE_ENV: "development" },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    shell: Boolean(npmInv.shell),
    detached: process.platform === "win32",
  });
  children.push({ app, child, log });
  child.stdout?.on("data", pushLog);
  child.stderr?.on("data", pushLog);
  return { child, log };
}

function stopChildren() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const { app, child } of children) {
    try {
      if (process.platform === "win32" && child.pid) {
        spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
          stdio: "ignore",
          windowsHide: true,
        });
      } else if (child.pid) {
        process.kill(-child.pid, "SIGTERM");
      } else {
        child.kill("SIGTERM");
      }
    } catch {
      console.error(`Failed to stop shell ${app}`);
    }
  }
}

process.on("exit", stopChildren);
process.on("SIGINT", () => {
  stopChildren();
  process.exit(130);
});
process.on("SIGTERM", () => {
  stopChildren();
  process.exit(143);
});

const shells = [
  {
    app: "API",
    url: `${API.replace(/\/$/, "")}/api/v1/health`,
    start: () =>
      startNpm(
        ["run", "dev:staging", "--workspace=@lumenx/api"],
        {},
        "API",
      ),
  },
  {
    app: "Admin",
    url: "http://127.0.0.1:8081/login",
    start: () =>
      startNpm(
        [
          "run",
          "dev",
          "--workspace=@lumenx/app-admin",
          "--",
          "--host",
          "127.0.0.1",
          "--port",
          "8081",
          "--strictPort",
        ],
        {
          VITE_ADMIN_AUTH_MODE: "api",
          VITE_AUTH_PROVIDER: "supabase",
          VITE_API_BASE_URL: API,
          VITE_SUPABASE_URL: SUPABASE_URL,
          VITE_SUPABASE_ANON_KEY: SUPABASE_ANON,
        },
        "Admin",
      ),
  },
  {
    app: "Connect",
    url: "http://127.0.0.1:5174/login",
    start: () =>
      startNpm(
        [
          "run",
          "dev",
          "--workspace=@lumenx/app-connect",
          "--",
          "--host",
          "127.0.0.1",
          "--port",
          "5174",
          "--strictPort",
        ],
        {
          VITE_CONNECT_AUTH_MODE: "api",
          VITE_AUTH_PROVIDER: "supabase",
          VITE_API_BASE_URL: API,
          VITE_SUPABASE_URL: SUPABASE_URL,
          VITE_SUPABASE_ANON_KEY: SUPABASE_ANON,
        },
        "Connect",
      ),
  },
];

async function main() {
  for (const shell of shells) {
    const ready = REUSE ? await probeUrl(shell.url) : { ok: false };
    if (ready.ok) {
      console.log(`REUSE ${shell.app} (${shell.url})`);
      continue;
    }
    console.log(`SPAWN ${shell.app}`);
    const { log } = shell.start();
    await waitForUrl(shell.url, {
      timeoutMs: READY_TIMEOUT_MS,
      label: shell.app,
      logLines: log,
    });
    console.log(`READY ${shell.app}`);
  }

  // Re-probe with backoff — Windows can briefly flap after the first ready probe.
  for (const shell of shells) {
    let ok = false;
    let lastErr = "unknown";
    for (let i = 0; i < 15; i++) {
      const again = await probeUrl(shell.url);
      if (again.ok) {
        ok = true;
        break;
      }
      lastErr = again.err ?? "down";
      await sleep(1000);
    }
    if (!ok) {
      throw new Error(
        `Shell ${shell.app} became unreachable after ready (${lastErr})`,
      );
    }
  }

  const extraPwArgs = process.argv.slice(2);
  const pw = spawn(
    process.execPath,
    [
      join(repoRoot, "node_modules", "@playwright", "test", "cli.js"),
      "test",
      "--project=staging-multi-role",
      ...extraPwArgs,
    ],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        STAGING_E2E: "1",
        E2E_APP: "staging-multi-role",
      },
      stdio: "inherit",
      windowsHide: true,
    },
  );

  const code = await new Promise((resolveCode) => {
    pw.on("exit", (c) => resolveCode(c ?? 1));
  });
  stopChildren();
  process.exit(code);
}

main().catch((err) => {
  console.error("FAIL:", err instanceof Error ? err.message : err);
  stopChildren();
  process.exit(1);
});
