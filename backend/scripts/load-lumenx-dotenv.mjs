/**
 * Shared dotenv loader for API entry and smoke scripts.
 * When LUMENX_ENV=staging (or LUMENX_DOTENV points at .env.staging), never merge
 * the default backend/.env — that can silently attach production credentials.
 */
import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * @param {{ cwd?: string }} [opts]
 * @returns {{ mode: "staging" | "default", path: string | null }}
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
    if (!existsSync(stagingPath)) {
      throw new Error(
        `Staging mode requires ${stagingPath}. Copy backend/.env.staging.example → backend/.env.staging and fill staging-only values. See backend/STAGING.md.`,
      );
    }
    loadDotenv({ path: stagingPath, override: true });
    return { mode: "staging", path: stagingPath };
  }

  const defaultPath = resolve(cwd, ".env");
  loadDotenv({ path: defaultPath });
  return { mode: "default", path: existsSync(defaultPath) ? defaultPath : null };
}
