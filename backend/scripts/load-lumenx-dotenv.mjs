/**
 * Shared dotenv loader for API entry and smoke scripts.
 * When LUMENX_ENV=staging (or LUMENX_DOTENV / --staging), never merge
 * the default backend/.env — that can silently attach production credentials.
 *
 * Hosted Railway: LUMENX_ENV=staging + injected process.env is enough (no file).
 * Local: prefer backend/.env.staging when present (fills missing keys only).
 */
import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * @param {{ cwd?: string }} [opts]
 * @returns {{ mode: "staging" | "default", path: string | null, stagingSource?: "file" | "process_env" }}
 */
export function loadLumenxDotenv(opts = {}) {
  const cwd = opts.cwd ?? backendRoot;
  const explicit = process.env.LUMENX_DOTENV?.trim();
  const lumenxEnv = process.env.LUMENX_ENV?.trim().toLowerCase();

  const stagingPath = explicit
    ? isAbsolute(explicit)
      ? explicit
      : resolve(cwd, explicit)
    : resolve(cwd, ".env.staging");

  const wantsStaging =
    lumenxEnv === "staging" ||
    Boolean(explicit && /env\.staging$/i.test(explicit)) ||
    process.argv.includes("--staging");

  if (wantsStaging) {
    if (existsSync(stagingPath)) {
      loadDotenv({ path: stagingPath, override: false });
      return { mode: "staging", path: stagingPath, stagingSource: "file" };
    }

    if (explicit) {
      throw new Error(
        `Staging dotenv file not found: ${stagingPath}. Unset LUMENX_DOTENV to use injected process.env, or create the file from backend/.env.staging.example. See backend/STAGING.md.`,
      );
    }

    return { mode: "staging", path: null, stagingSource: "process_env" };
  }

  const defaultPath = resolve(cwd, ".env");
  loadDotenv({ path: defaultPath });
  return { mode: "default", path: existsSync(defaultPath) ? defaultPath : null };
}
