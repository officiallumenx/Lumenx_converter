/**
 * Typed application error with HTTP status and machine-readable code.
 * Every error thrown inside a route handler becomes a deterministic JSON response.
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "GPS_POINT_TOO_OLD"
  | "GPS_POINT_TOO_FUTURE"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }

  // ── Factories ───────────────────────────────────────────────

  static validation(message: string, details?: unknown) {
    return new AppError(400, "VALIDATION_ERROR", message, details);
  }

  /** GPS ping captured_at older than the server accept window. */
  static gpsPointTooOld(message = "captured_at is too old to accept") {
    return new AppError(400, "GPS_POINT_TOO_OLD", message);
  }

  /** GPS ping captured_at too far ahead of server clock. */
  static gpsPointTooFuture(message = "captured_at is too far in the future") {
    return new AppError(400, "GPS_POINT_TOO_FUTURE", message);
  }

  static unauthenticated(message = "Authentication required") {
    return new AppError(401, "UNAUTHENTICATED", message);
  }

  static forbidden(message = "Insufficient permissions", details?: unknown) {
    return new AppError(403, "FORBIDDEN", message, details);
  }

  static notFound(message = "Resource not found") {
    return new AppError(404, "NOT_FOUND", message);
  }

  static conflict(message: string) {
    return new AppError(409, "CONFLICT", message);
  }

  static rateLimited(message = "Too many requests") {
    return new AppError(429, "RATE_LIMITED", message);
  }

  static internal(message = "Internal server error", details?: unknown) {
    return new AppError(500, "INTERNAL_ERROR", message, details);
  }
}
