/**
 * Staging-aware dotenv load for the API process entrypoint.
 * When LUMENX_ENV=staging, never merge backend/.env (avoids attaching prod keys).
 */
import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

export function loadLumenxDotenv(cwd: string = process.cwd()): {
  mode: "staging" | "default";
  path: string | null;
} {
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
    if (!existsSync(stagingPath)) {
      throw new Error(
        `Staging mode requires ${stagingPath}. Copy backend/.env.staging.example → backend/.env.staging. See backend/STAGING.md.`,
      );
    }
    loadDotenv({ path: stagingPath, override: true });
    return { mode: "staging", path: stagingPath };
  }

  const defaultPath = resolve(cwd, ".env");
  loadDotenv({ path: defaultPath });
  return { mode: "default", path: existsSync(defaultPath) ? defaultPath : null };
}
