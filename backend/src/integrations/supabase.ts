import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../config/env.js";
import type { Logger } from "../logger/logger.js";

export interface SupabaseClients {
  /** Service-role client — full server-side access (Auth Admin, Postgres, Storage). */
  admin: SupabaseClient;
  /** Anon-key client — limited access, suitable for forwarding user JWTs. */
  anon: SupabaseClient;
}

/**
 * Validate that all required Supabase env vars are present.
 * Returns a typed tuple or `null` when credentials are absent.
 * Throws in production if credentials are missing.
 */
function resolveSupabaseConfig(
  env: Env,
  logger: Logger,
): { url: string; anonKey: string; serviceRoleKey: string } | null {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = env;

  const hasAll = SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY;

  if (!hasAll) {
    if (env.NODE_ENV === "production") {
      throw new Error(
        "Supabase credentials (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY) are required in production.",
      );
    }
    logger.warn({
      msg: "supabase_not_configured",
      hint: "Supabase integration is disabled — set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY to enable.",
    });
    return null;
  }

  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
  };
}

/**
 * Create Supabase server-side clients.
 *
 * Returns `null` when credentials are absent in non-production environments,
 * allowing the backend to start without Supabase during local development.
 *
 * Usage (future phases):
 *   - `admin` for Auth Admin, direct Postgres queries, Storage operations
 *   - `anon`  for user-scoped queries with forwarded JWTs
 */
export function createSupabaseClients(
  env: Env,
  logger: Logger,
): SupabaseClients | null {
  const config = resolveSupabaseConfig(env, logger);
  if (!config) return null;

  const admin = createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const anon = createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  logger.info({ msg: "supabase_initialized", url: config.url });

  return { admin, anon };
}
