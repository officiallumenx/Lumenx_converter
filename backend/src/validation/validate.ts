import type { ZodSchema } from "zod";
import { AppError } from "../errors/app-error.js";

function parseWithSchema<T>(schema: ZodSchema<T>, data: unknown, message: string): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  throw AppError.validation(message, result.error.flatten().fieldErrors);
}

/**
 * Parse body against a zod schema.
 * Usage: `const body = validateBody(schema, await c.req.json());`
 */
export function validateBody<T>(schema: ZodSchema<T>, data: unknown): T {
  return parseWithSchema(schema, data, "Request validation failed");
}

/**
 * Parse query object against a zod schema.
 * Usage: `const query = validateQuery(schema, c.req.query());`
 */
export function validateQuery<T>(schema: ZodSchema<T>, data: unknown): T {
  return parseWithSchema(schema, data, "Query validation failed");
}

/**
 * Parse path params against a zod schema.
 * Usage: `const params = validateParams(schema, c.req.param());`
 */
export function validateParams<T>(schema: ZodSchema<T>, data: unknown): T {
  return parseWithSchema(schema, data, "Path parameter validation failed");
}
