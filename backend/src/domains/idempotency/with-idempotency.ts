import type { Context } from "hono";
import { AppError } from "../../errors/app-error.js";
import type { AppBindings } from "../../types/app.js";
import {
  completeIdempotencyRow,
  deleteIdempotencyRow,
  failIdempotencyRow,
  findIdempotencyRow,
  insertIdempotencyInProgress,
} from "./repository.js";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export type IdempotentResult = {
  status: number;
  body: unknown;
};

function readIdempotencyKey(c: Context<AppBindings>): string | null {
  const raw = c.req.header("Idempotency-Key")?.trim() ?? "";
  if (!raw) return null;
  if (raw.length < 8 || raw.length > 200) {
    throw AppError.validation("Idempotency-Key must be 8–200 characters", {
      "Idempotency-Key": ["Invalid length"],
    });
  }
  return raw;
}

function requireAdmin(c: Context<AppBindings>) {
  const clients = c.get("supabase");
  if (!clients?.admin) {
    throw AppError.internal("Database unavailable");
  }
  return clients.admin;
}

/**
 * When `Idempotency-Key` is present, store/replay the JSON response for this
 * actor + route. When absent, run normally (backward compatible).
 */
export async function withIdempotency(
  c: Context<AppBindings>,
  routeKey: string,
  execute: () => Promise<IdempotentResult>,
): Promise<Response> {
  const key = readIdempotencyKey(c);
  if (!key) {
    const result = await execute();
    return c.json(result.body as never, result.status as 200);
  }

  const actor = c.get("actor");
  if (!actor) {
    throw AppError.unauthenticated();
  }

  const admin = requireAdmin(c);
  const scopeKey = `user:${actor.userId}`;
  const existing = await findIdempotencyRow(admin, {
    scopeKey,
    routeKey,
    idempotencyKey: key,
  });

  if (existing?.status === "completed" && existing.response_status != null) {
    return c.json(
      existing.response_body as never,
      existing.response_status as 200,
    );
  }
  if (existing?.status === "in_progress") {
    throw AppError.conflict(
      "Request with this Idempotency-Key is already in progress",
    );
  }
  if (existing?.status === "failed") {
    await deleteIdempotencyRow(admin, existing.id);
  }

  let rowId: string;
  try {
    const row = await insertIdempotencyInProgress(admin, {
      scopeKey,
      routeKey,
      idempotencyKey: key,
      ttlMs: DEFAULT_TTL_MS,
    });
    rowId = row.id;
  } catch {
    const raced = await findIdempotencyRow(admin, {
      scopeKey,
      routeKey,
      idempotencyKey: key,
    });
    if (raced?.status === "completed" && raced.response_status != null) {
      return c.json(raced.response_body as never, raced.response_status as 200);
    }
    throw AppError.conflict(
      "Request with this Idempotency-Key is already in progress",
    );
  }

  try {
    const result = await execute();
    await completeIdempotencyRow(admin, rowId, {
      responseStatus: result.status,
      responseBody: result.body,
    });
    return c.json(result.body as never, result.status as 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "request_failed";
    try {
      await failIdempotencyRow(admin, rowId, message);
    } catch {
      // best-effort
    }
    throw err;
  }
}

/** Prefer explicit body dedupe_key; else reuse Idempotency-Key when present. */
export function resolveNotificationDedupeKey(
  c: Context<AppBindings>,
  bodyDedupeKey: string | null | undefined,
): string | null {
  if (bodyDedupeKey != null && String(bodyDedupeKey).trim()) {
    return String(bodyDedupeKey).trim();
  }
  return readIdempotencyKey(c);
}
