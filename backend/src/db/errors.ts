import { AppError } from "../errors/app-error.js";

/**
 * Map Supabase/PostgREST failures to AppError without leaking PG internals.
 */
export function mapDbError(error: { code?: string; message?: string } | null): never {
  const code = error?.code ?? "";

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

  throw AppError.internal("Database operation failed");
}

export function ensureDbOk<T>(
  result: { data: T; error: { code?: string; message?: string } | null },
): T {
  if (result.error) {
    mapDbError(result.error);
  }
  return result.data;
}
