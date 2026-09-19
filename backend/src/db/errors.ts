import { AppError } from "../errors/app-error.js";

/**
 * Map Supabase/PostgREST failures to AppError without leaking PG internals.
 */
export function mapDbError(error: { code?: string; message?: string; details?: string; hint?: string } | null): never {
  const code = error?.code ?? "";
  const message = error?.message ?? "";

  // unique_violation / exclusion
  if (code === "23505" || code === "23P01") {
    throw AppError.conflict("Resource conflict");
  }

  // foreign_key_violation
  if (code === "23503") {
    throw AppError.validation("Referenced resource is invalid");
  }

  // check_violation
  if (code === "23514") {
    throw AppError.validation("Request violates a data constraint");
  }

  // Missing column / undefined table — migrations not applied.
  if (code === "42703" || code === "42P01" || code === "PGRST205" || code === "PGRST204") {
    throw AppError.internal(
      "Database schema is out of date. Apply pending Supabase migrations, then retry.",
      {
        code: code || undefined,
        message: message || undefined,
        details: error?.details || undefined,
        hint: error?.hint || undefined,
      },
    );
  }

  // Permission denied — usually means service_role client was poisoned with a user JWT.
  if (code === "42501") {
    throw AppError.internal(
      "Database permission denied. Restart the API server and try again.",
      {
        code: code || undefined,
        message: message || undefined,
        details: error?.details || undefined,
        hint: error?.hint || undefined,
      },
    );
  }

  // PostgREST cannot target partial unique indexes with onConflict.
  if (/no unique or exclusion constraint matching the ON CONFLICT/i.test(message)) {
    throw AppError.internal(
      "Database write used an invalid conflict target. Retry after updating the API.",
      {
        code: code || undefined,
        message: message || undefined,
        details: error?.details || undefined,
        hint: error?.hint || undefined,
      },
    );
  }

  throw AppError.internal("Database operation failed", {
    code: code || undefined,
    message: message || undefined,
    details: error?.details || undefined,
    hint: error?.hint || undefined,
  });
}

export function ensureDbOk<T>(
  result: { data: T; error: { code?: string; message?: string; details?: string; hint?: string } | null },
): T {
  if (result.error) {
    mapDbError(result.error);
  }
  return result.data;
}
