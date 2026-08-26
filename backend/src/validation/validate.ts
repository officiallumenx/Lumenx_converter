import type { ZodSchema } from "zod";
import { AppError } from "../errors/app-error.js";

/**
 * Parse `data` against a zod schema.
 * Returns the typed result on success; throws AppError.validation on failure.
 *
 * Usage in route handlers:
 *   const body = validateBody(schema, await c.req.json());
 */
export function validateBody<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  throw AppError.validation(
    "Request validation failed",
    result.error.flatten().fieldErrors,
  );
}
