import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { AppError } from "../errors/app-error.js";
import type { AppBindings } from "../types/app.js";
import type { Actor } from "./types.js";
import { loadActorByUserId } from "../domains/session/repository.js";
import { enforceSubscriptionWriteGate } from "../middleware/subscription-write-gate.js";

const BEARER_RE = /^Bearer\s+(\S+)$/i;

/**
 * Require a verified Supabase Auth JWT and resolve durable actor context.
 *
 * Verification uses Auth Admin getUser(jwt) — does not trust client claims.
 * Actor rows are loaded with the service_role client after auth succeeds.
 * Mutating institute calls are blocked when subscription is read-only.
 */
export const requireAuth = createMiddleware<AppBindings>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header) {
    throw AppError.unauthenticated();
  }

  const match = BEARER_RE.exec(header.trim());
  if (!match) {
    throw AppError.unauthenticated("Malformed Authorization header");
  }

  const token = match[1];
  const clients = c.get("supabase");
  if (!clients) {
    throw AppError.internal("Authentication service unavailable");
  }

  const { data, error } = await clients.admin.auth.getUser(token);
  if (error || !data.user?.id) {
    throw AppError.unauthenticated("Invalid or expired token");
  }

  const actor = await loadActorByUserId(clients.admin, data.user.id);
  c.set("actor", actor);
  await enforceSubscriptionWriteGate(c, actor);
  await next();
});

/** Read actor from context; throws if requireAuth was not applied. */
export function assertAuthenticated(c: Context<AppBindings>): Actor {
  const actor = c.get("actor");
  if (!actor) {
    throw AppError.unauthenticated();
  }
  return actor;
}
