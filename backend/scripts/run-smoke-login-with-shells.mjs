/**
 * Start local Vite app shells required by smoke:login shell checks, wait until
 * each login/home URL responds, run e2e-login-smoke, then stop only the children
 * this script spawned (never unrelated user processes).
 *
 * Staging credentials come from --env-file=.env.staging (never printed).
 *
 * Usage (from backend/):
 *   node --env-file=.env.staging scripts/run-smoke-login-with-shells.mjs --staging
 *
 * Env:
 *   E2E_SHELL_READY_TIMEOUT_MS  per-shell readiness timeout (default 180000)
 *   E2E_SHELL_REUSE=0           force spawn even when URL already responds
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertStagingEnv, extractSupabaseProjectRef } from "./assert-staging-env.mjs";
import { loadLumenxDotenv } from "./load-lumenx-dotenv.mjs";

loadLumenxDotenv();
assertStagingEnv(process.env);

const EXPECTED_REF = "yveadybpntziyryxsrsu";
const DENIED_REF = "kmpzflsurepjwqnfqyld";
const urlRef = extractSupabaseProjectRef(process.env.SUPABASE_URL);
if (urlRef !== EXPECTED_REF) {
  throw new Error(`Refusing shells: SUPABASE_URL ref ${urlRef} !== ${EXPECTED_REF}`);
}
if (urlRef === DENIED_REF) {
  throw new Error("Refusing shells against denylisted shared/default project");
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Resolve npm without depending on a local `npm` package (not always hoistable). */
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
  // Fall back to npm on PATH (npm.cmd on Windows).
  return {
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    argsPrefix: [],
    shell: process.platform === "win32",
  };
}

const npmInv = resolveNpmInvocation();

const API =
  process.env.E2E_API_BASE_URL?.trim() ||
  process.env.SMOKE_API_BASE_URL?.trim() ||
  "http://127.0.0.1:8787";

const SUPABASE_URL = process.env.SUPABASE_URL.trim();
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY.trim();
const READY_TIMEOUT_MS = Number(process.env.E2E_SHELL_READY_TIMEOUT_MS ?? 180_000);
const REUSE = process.env.E2E_SHELL_REUSE !== "0";

/** Shells required by e2e-login-smoke.mjs SHELLS list. */
const SHELLS = [
  {
    app: "Admin",
    url: "http://127.0.0.1:8081/login",
    workspace: "@lumenx/app-admin",
    port: 8081,
    env: {
      VITE_ADMIN_AUTH_MODE: "api",
      VITE_AUTH_PROVIDER: "supabase",
      VITE_API_BASE_URL: API,
      VITE_SUPABASE_URL: SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: SUPABASE_ANON,
    },
  },
  {
    app: "Nexus",
    url: "http://127.0.0.1:8080/",
    workspace: "@lumenx/app-nexus",
    port: 8080,
    env: {
      VITE_NEXUS_AUTH_MODE: "api",
      VITE_AUTH_PROVIDER: "supabase",
      VITE_API_BASE_URL: API,
      VITE_SUPABASE_URL: SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: SUPABASE_ANON,
    },
  },
  {
    app: "Connect",
    url: "http://127.0.0.1:5174/login",
    workspace: "@lumenx/app-connect",
    port: 5174,
    env: {
      VITE_CONNECT_AUTH_MODE: "api",
      VITE_AUTH_PROVIDER: "supabase",
      VITE_API_BASE_URL: API,
      VITE_SUPABASE_URL: SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: SUPABASE_ANON,
    },
  },
  {
    app: "Transport",
    url: "http://127.0.0.1:5175/login",
    workspace: "@lumenx/app-transport",
    port: 5175,
    env: {
      VITE_TRANSPORT_AUTH_MODE: "api",
      VITE_AUTH_PROVIDER: "supabase",
      VITE_API_BASE_URL: API,
      VITE_SUPABASE_URL: SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: SUPABASE_ANON,
    },
  },
  {
    app: "Admissions",
    url: "http://127.0.0.1:5177/login",
    workspace: "@lumenx/app-admissions",
    port: 5177,
    env: {
      VITE_ADMISSIONS_AUTH_MODE: "api",
      VITE_AUTH_PROVIDER: "supabase",
      VITE_API_BASE_URL: API,
      VITE_SUPABASE_URL: SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: SUPABASE_ANON,
    },
  },
  {
    app: "Careers",
    url: "http://127.0.0.1:5176/login",
    workspace: "@lumenx/app-careers",
    port: 5176,
    env: {
      VITE_CAREERS_AUTH_MODE: "api",
      VITE_AUTH_PROVIDER: "supabase",
      VITE_API_BASE_URL: API,
      VITE_SUPABASE_URL: SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: SUPABASE_ANON,
    },
  },
  {
    app: "Website",
    url: "http://127.0.0.1:8082/",
    workspace: "@lumenx/app-website",
    port: 8082,
    env: {
      VITE_API_BASE_URL: API,
      VITE_SUPABASE_URL: SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: SUPABASE_ANON,
    },
  },
];

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
    if (res.ok || res.status === 304) return { ok: true, status: res.status };
    return { ok: false, status: res.status, err: `HTTP ${res.status}` };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      err: err instanceof Error ? err.message : String(err),
    };
  }
}

async function waitForUrl(url, { timeoutMs, label, logLines = [] } = {}) {
  const started = Date.now();
  let lastErr = "not started";
  while (Date.now() - started < timeoutMs) {
    const probe = await probeUrl(url);
    if (probe.ok) return;
    lastErr = probe.err ?? `HTTP ${probe.status}`;
    await sleep(1000);
  }
  const tail = logLines
    .slice(-20)
    .map(redact)
    .join("\n");
  const hint = tail
    ? `\n--- last ${Math.min(20, logLines.length)} log lines ---\n${tail}`
    : "";
  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for ${label} at ${url} (${lastErr}).` +
      ` Start manually: npm run dev --workspace=<pkg> -- --host 127.0.0.1 --port <port> --strictPort` +
      hint,
  );
}

function startShell(shell) {
  const log = [];
  const pushLog = (buf) => {
    const text = buf.toString("utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      log.push(line);
      if (log.length > 80) log.shift();
    }
  };
  const child = spawn(
    npmInv.command,
    [
      ...npmInv.argsPrefix,
      "run",
      "dev",
      `--workspace=${shell.workspace}`,
      "--",
      "--host",
      "127.0.0.1",
      "--port",
      String(shell.port),
      "--strictPort",
    ],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        ...shell.env,
        NODE_ENV: "development",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: Boolean(npmInv.shell),
      // On Windows, create a new process group so we can kill the tree we own.
      detached: process.platform === "win32",
    },
  );
  children.push({ app: shell.app, child, log });
  child.stdout?.on("data", pushLog);
  child.stderr?.on("data", pushLog);
  child.on("exit", (code, signal) => {
    if (!shuttingDown && code && code !== 0) {
      console.error(
        `Shell ${shell.app} exited early (code=${code} signal=${signal ?? ""}).` +
          (log.length
            ? `\n${log.slice(-10).map(redact).join("\n")}`
            : ""),
      );
    }
  });
  return { child, log };
}

function stopChildren() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const { app, child } of children) {
    try {
      if (child.killed || child.exitCode !== null) continue;
      if (process.platform === "win32" && child.pid) {
        // Kill only the process tree rooted at our spawn (not unrelated listeners).
        spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
          stdio: "ignore",
          windowsHide: true,
        });
      } else {
        child.kill("SIGTERM");
      }
    } catch (err) {
      console.error(
        `warn: could not stop ${app}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

async function ensureApiReady() {
  await waitForUrl(`${API}/api/v1/health`, {
    timeoutMs: 30_000,
    label: "staging API /api/v1/health",
  });
  console.log(`API ready at ${API} (ref ${EXPECTED_REF})`);
}

async function main() {
  process.on("exit", stopChildren);
  process.on("SIGINT", () => {
    stopChildren();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    stopChildren();
    process.exit(143);
  });

  console.log(
    `Preparing ${SHELLS.length} staging app shells (anon → ${EXPECTED_REF})…`,
  );
  await ensureApiReady();

  /** @type {Array<{ shell: typeof SHELLS[0], log: string[], reused: boolean }>} */
  const tracked = [];

  for (const shell of SHELLS) {
    if (REUSE) {
      const probe = await probeUrl(shell.url);
      if (probe.ok) {
        console.log(`  reuse ${shell.app} — already ready (${shell.url})`);
        tracked.push({ shell, log: [], reused: true });
        continue;
      }
    }
    console.log(
      `  start ${shell.app} — ${shell.workspace} :${shell.port}`,
    );
    const { log } = startShell(shell);
    tracked.push({ shell, log, reused: false });
    // Stagger npm workspace starts to reduce lock contention on Windows.
    await sleep(750);
  }

  for (const { shell, log, reused } of tracked) {
    if (reused) continue;
    process.stdout.write(`  wait ${shell.app}… `);
    await waitForUrl(shell.url, {
      timeoutMs: READY_TIMEOUT_MS,
      label: shell.app,
      logLines: log,
    });
    console.log("ok");
  }

  console.log("All shells ready — running smoke:login…");
  const smoke = spawn(
    process.execPath,
    ["scripts/e2e-login-smoke.mjs", "--staging"],
    {
      cwd: resolve(repoRoot, "backend"),
      env: { ...process.env },
      stdio: "inherit",
      windowsHide: true,
    },
  );

  const code = await new Promise((resolveCode) => {
    smoke.on("exit", (c) => resolveCode(c ?? 1));
  });
  stopChildren();
  process.exit(code);
}

main().catch((err) => {
  console.error("FAIL:", err instanceof Error ? err.message : err);
  stopChildren();
  process.exit(1);
});
