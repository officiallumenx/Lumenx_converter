import { Hono } from "hono";
import type { Env } from "./config/env.js";
import { createLogger, type Logger } from "./logger/logger.js";
import { requestId } from "./middleware/request-id.js";
import { corsMiddleware } from "./middleware/cors.js";
import { securityHeaders } from "./middleware/security-headers.js";
import { requestLogMiddleware } from "./middleware/request-log.js";
import { createErrorHandler, notFoundHandler } from "./errors/error-handler.js";
import v1 from "./routes/v1/index.js";
import nexus from "./routes/nexus/index.js";

export function createApp(env: Env, logger?: Logger) {
  const log = logger ?? createLogger(env.LOG_LEVEL);
  const app = new Hono();

  // ── Global middleware ────────────────────────────────────────────
  app.use("*", requestId);
  app.use("*", corsMiddleware(env));
  app.use("*", securityHeaders);
  app.use("*", requestLogMiddleware(log));

  // ── Error handling ───────────────────────────────────────────────
  app.onError(createErrorHandler(log));
  app.notFound(notFoundHandler);

  // ── Route namespaces ─────────────────────────────────────────────
  app.route("/api/v1", v1);
  app.route("/api/nexus", nexus);

  return app;
}
