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

export default health;
