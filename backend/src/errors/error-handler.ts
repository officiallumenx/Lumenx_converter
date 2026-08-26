import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";
import { AppError } from "./app-error.js";
import type { Logger } from "../logger/logger.js";

/**
 * Canonical JSON error envelope.
 * Shape: { error: { code, message, requestId, details? } }
 *
 * - Known AppError → maps directly.
 * - ZodError → wraps as VALIDATION_ERROR with flattened issues.
 * - Unknown → 500 INTERNAL_ERROR; real message never leaks to client.
 */
export function createErrorHandler(logger: Logger) {
  return (err: Error, c: Context) => {
    const requestId: string = c.get("requestId") ?? "unknown";

    if (err instanceof AppError) {
      return c.json(
        {
          error: {
            code: err.code,
            message: err.message,
            requestId,
            ...(err.details !== undefined ? { details: err.details } : {}),
          },
        },
        err.status as ContentfulStatusCode,
      );
    }

    if (err instanceof ZodError) {
      const flat = err.flatten();
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR" as const,
            message: "Request validation failed",
            requestId,
            details: flat.fieldErrors,
          },
        },
        400 as ContentfulStatusCode,
      );
    }

    logger.error({
      msg: "unhandled_error",
      requestId,
      errorName: err.name,
      errorMessage: err.message,
    });

    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR" as const,
          message: "Internal server error",
          requestId,
        },
      },
      500 as ContentfulStatusCode,
    );
  };
}

/**
 * 404 handler for routes that don't match anything.
 */
export function notFoundHandler(c: Context) {
  const requestId: string = c.get("requestId") ?? "unknown";
  return c.json(
    {
      error: {
        code: "NOT_FOUND" as const,
        message: "Route not found",
        requestId,
      },
    },
    404 as ContentfulStatusCode,
  );
}
