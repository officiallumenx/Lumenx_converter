import { Hono } from "hono";
import {
  checkSupabaseConnectivity,
  resolveConnectivityProbe,
} from "../../integrations/supabase.js";
import { loadEnv } from "../../config/env.js";
import type { AppBindings } from "../../types/app.js";

const health = new Hono<AppBindings>();

/**
 * Liveness — never depends on Supabase or other integrations.
 */
health.get("/", (c) => {
  const env = loadEnv();
  return c.json({
    service: "lumenx-api",
    status: "ok",
    version: "v1",
    env: env.NODE_ENV,
    release: process.env.GIT_SHA ?? process.env.npm_package_version ?? null,
  });
});

/**
 * Readiness — reports dependency status without exposing connection details.
 * Liveness (/) stays green even when Supabase is unavailable.
 */
health.get("/ready", async (c) => {
  const clients = c.get("supabase");
  const env = loadEnv();
  const probe = resolveConnectivityProbe(env);

  if (!clients || !probe) {
    return c.json({
      status: "degraded",
      checks: { supabase: "not_configured" },
    });
  }

  const result = await checkSupabaseConnectivity(probe);

  if (result.status === "ok") {
    return c.json({
      status: "ready",
      checks: { supabase: "ok" },
    });
  }

  return c.json(
    {
      status: "degraded",
      checks: { supabase: "unavailable" },
    },
    503,
  );
});

/**
 * Public browser Auth config (anon / publishable only — never service_role).
 * Frontends can sync this at login so stale Vite-baked keys do not block setSession.
 */
health.get("/supabase-public", (c) => {
  const env = loadEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return c.json(
      { error: { message: "Supabase is not configured on the API." } },
      503,
    );
  }
  return c.json({
    data: {
      url: env.SUPABASE_URL,
      anonKey: env.SUPABASE_ANON_KEY,
    },
  });
});

export default health;
