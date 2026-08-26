import { Hono } from "hono";
import type { Env } from "./config/env.js";
import { createLogger, type Logger } from "./logger/logger.js";
import {
  createSupabaseClients,
  type SupabaseClients,
} from "./integrations/supabase.js";
import { requestId } from "./middleware/request-id.js";
import { corsMiddleware } from "./middleware/cors.js";
import { securityHeaders } from "./middleware/security-headers.js";
import { requestLogMiddleware } from "./middleware/request-log.js";
import { supabaseContext } from "./middleware/supabase-context.js";
import { createErrorHandler, notFoundHandler } from "./errors/error-handler.js";
import v1 from "./routes/v1/index.js";
import nexus from "./routes/nexus/index.js";
import type { AppBindings } from "./types/app.js";

/**
 * Build the Hono application.
 *
 * @param supabase - Pass explicitly to inject clients. When `undefined`,
 *   clients are created from env (null if not configured in non-production).
 */
export function createApp(
  env: Env,
  logger?: Logger,
  supabase?: SupabaseClients | null,
) {
  const log = logger ?? createLogger(env.LOG_LEVEL);
  const clients =
    supabase === undefined ? createSupabaseClients(env, log) : supabase;

  const app = new Hono<AppBindings>();

  // ── Global middleware ────────────────────────────────────────────
  app.use("*", requestId);
  app.use("*", corsMiddleware(env));
  app.use("*", securityHeaders);
  app.use("*", supabaseContext(clients));
  app.use("*", requestLogMiddleware(log));

  // ── Error handling ───────────────────────────────────────────────
  app.onError(createErrorHandler(log));
  app.notFound(notFoundHandler);

  // ── Route namespaces ─────────────────────────────────────────────
  app.route("/api/v1", v1);
  app.route("/api/nexus", nexus);

  return app;
}
