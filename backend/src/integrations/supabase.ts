import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../config/env.js";
import type { Logger } from "../logger/logger.js";

export interface SupabaseClients {
  /** Service-role client — full server-side access (Auth Admin, Postgres, Storage). */
  admin: SupabaseClient;
  /** Anon-key client — limited access; base for request-scoped JWT forwarding. */
  anon: SupabaseClient;
  /** Public project URL (safe to log / probe). Never includes keys. */
  url: string;
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

  return { admin, anon, url: config.url };
}

/**
 * Request-scoped Supabase client that forwards a caller JWT.
 *
 * BOUNDARY ONLY — does not authenticate, validate sessions, or resolve users.
 * Future auth middleware will extract the bearer token and call this helper.
 */
export function createRequestScopedClient(
  env: Env,
  accessToken: string,
): SupabaseClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error("Supabase is not configured");
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export type SupabaseConnectivityResult =
  | { status: "ok"; latencyMs: number }
  | { status: "unavailable"; latencyMs: number }
  | { status: "not_configured" };

/**
 * Safe connectivity probe against Supabase Auth health.
 * Does not query application tables and does not log credentials.
 */
export async function checkSupabaseConnectivity(input: {
  url: string;
  apikey: string;
}): Promise<SupabaseConnectivityResult> {
  const start = performance.now();
  try {
    const res = await fetch(`${input.url}/auth/v1/health`, {
      method: "GET",
      headers: {
        apikey: input.apikey,
      },
    });
    const latencyMs = Math.round(performance.now() - start);
    return res.ok
      ? { status: "ok", latencyMs }
      : { status: "unavailable", latencyMs };
  } catch {
    const latencyMs = Math.round(performance.now() - start);
    return { status: "unavailable", latencyMs };
  }
}

/** Resolve probe credentials from env. Returns null when not configured. */
export function resolveConnectivityProbe(
  env: Env,
): { url: string; apikey: string } | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  return { url: env.SUPABASE_URL, apikey: env.SUPABASE_ANON_KEY };
}
