/**
 * Staging-aware dotenv load for the API process entrypoint.
 *
 * When LUMENX_ENV=staging:
 * - Never merge backend/.env (avoids attaching production keys).
 * - If `.env.staging` (or LUMENX_DOTENV) exists, load it with override:false so
 *   Railway / `node --env-file=...` injected values win over file placeholders.
 * - If no staging file exists (hosted Railway), rely on process.env; fail-closed
 *   validation runs in assertStagingEnv before any DB/side effects.
 *
 * Never package secrets into the build; Railway injects variable names at runtime.
 */
import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

export type LumenxDotenvResult = {
  mode: "staging" | "default";
  /** Path loaded, or null when staging uses process.env only / default file missing. */
  path: string | null;
  /** How staging configuration was sourced (ignored for default mode). */
  stagingSource?: "file" | "process_env";
};

export function loadLumenxDotenv(cwd: string = process.cwd()): LumenxDotenvResult {
  const explicit = process.env.LUMENX_DOTENV?.trim();
  const lumenxEnv = process.env.LUMENX_ENV?.trim().toLowerCase();

  const stagingPath = explicit
    ? isAbsolute(explicit)
      ? explicit
      : resolve(cwd, explicit)
    : resolve(cwd, ".env.staging");

  const wantsStaging =
    lumenxEnv === "staging" ||
    Boolean(explicit && /env\.staging$/i.test(explicit));

  if (wantsStaging) {
    if (existsSync(stagingPath)) {
      // Fill gaps only — do not override Railway / --env-file injected values.
      loadDotenv({ path: stagingPath, override: false });
      return { mode: "staging", path: stagingPath, stagingSource: "file" };
    }

    if (explicit) {
      throw new Error(
        `Staging dotenv file not found: ${stagingPath}. Unset LUMENX_DOTENV to use Railway-injected process.env, or create the file from backend/.env.staging.example. See backend/STAGING.md.`,
      );
    }

    // Hosted staging: LUMENX_ENV=staging with vars injected by the platform.
    // assertStagingEnv() validates ref / denylist / keys before side effects.
    return { mode: "staging", path: null, stagingSource: "process_env" };
  }

  const defaultPath = resolve(cwd, ".env");
  loadDotenv({ path: defaultPath });
  return { mode: "default", path: existsSync(defaultPath) ? defaultPath : null };
}
