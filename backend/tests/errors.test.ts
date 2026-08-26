import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { z } from "zod";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { AppError } from "../src/errors/app-error.js";
import { createErrorHandler, notFoundHandler } from "../src/errors/error-handler.js";
import { requestId } from "../src/middleware/request-id.js";
import { validateBody } from "../src/validation/validate.js";
import { createLogger } from "../src/logger/logger.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function json(res: Response): Promise<any> {
  return res.json();
}

const silentLogger = createLogger("error");

function testEnv() {
  resetEnvCache();
  return loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
}

// ── Unknown route ─────────────────────────────────────────────────

describe("not-found handler", () => {
  it("returns 404 with canonical error envelope", async () => {
    const app = createApp(testEnv());
    const res = await app.request("/api/v1/does-not-exist");

    expect(res.status).toBe(404);
    const body = await json(res);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("Route not found");
    expect(body.error.requestId).toBeTruthy();
  });

  it("includes the request-id in the error body", async () => {
    const app = createApp(testEnv());
    const clientId = "aabbccdd-1122-4334-8556-ffeeddccbbaa";
    const res = await app.request("/nope", {
      headers: { "X-Request-Id": clientId },
    });

    const body = await json(res);
    expect(body.error.requestId).toBe(clientId);
  });
});

// ── AppError factories ────────────────────────────────────────────

describe("AppError thrown in a handler", () => {
  function miniApp() {
    const app = new Hono();
    app.use("*", requestId);
    app.onError(createErrorHandler(silentLogger));
    app.notFound(notFoundHandler);
    return app;
  }

  it("maps validation error to 400", async () => {
    const app = miniApp();
    app.get("/test", () => {
      throw AppError.validation("bad input", { field: ["required"] });
    });

    const res = await app.request("/test");
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toEqual({ field: ["required"] });
  });

  it("maps unauthenticated to 401", async () => {
    const app = miniApp();
    app.get("/test", () => {
      throw AppError.unauthenticated();
    });

    const res = await app.request("/test");
    expect(res.status).toBe(401);
    expect((await json(res)).error.code).toBe("UNAUTHENTICATED");
  });

  it("maps forbidden to 403", async () => {
    const app = miniApp();
    app.get("/test", () => {
      throw AppError.forbidden();
    });

    const res = await app.request("/test");
    expect(res.status).toBe(403);
    expect((await json(res)).error.code).toBe("FORBIDDEN");
  });

  it("maps notFound to 404", async () => {
    const app = miniApp();
    app.get("/test", () => {
      throw AppError.notFound("Student not found");
    });

    const res = await app.request("/test");
    expect(res.status).toBe(404);
    const body = await json(res);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("Student not found");
  });

  it("maps conflict to 409", async () => {
    const app = miniApp();
    app.get("/test", () => {
      throw AppError.conflict("Duplicate enrollment");
    });

    const res = await app.request("/test");
    expect(res.status).toBe(409);
    expect((await json(res)).error.code).toBe("CONFLICT");
  });

  it("maps rateLimited to 429", async () => {
    const app = miniApp();
    app.get("/test", () => {
      throw AppError.rateLimited();
    });

    const res = await app.request("/test");
    expect(res.status).toBe(429);
    expect((await json(res)).error.code).toBe("RATE_LIMITED");
  });

  it("maps internal to 500", async () => {
    const app = miniApp();
    app.get("/test", () => {
      throw AppError.internal();
    });

    const res = await app.request("/test");
    expect(res.status).toBe(500);
    expect((await json(res)).error.code).toBe("INTERNAL_ERROR");
  });
});

// ── Unknown errors → production-safe 500 ──────────────────────────

describe("unexpected errors", () => {
  it("returns generic 500 and never leaks the real message", async () => {
    const app = new Hono();
    app.use("*", requestId);
    app.onError(createErrorHandler(silentLogger));
    app.get("/test", () => {
      throw new TypeError("Cannot read property 'x' of undefined");
    });

    const res = await app.request("/test");
    expect(res.status).toBe(500);
    const body = await json(res);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("Internal server error");
    expect(JSON.stringify(body)).not.toContain("Cannot read property");
  });
});

// ── ZodError thrown directly ──────────────────────────────────────

describe("ZodError handling", () => {
  it("catches a raw ZodError and returns 400 with field errors", async () => {
    const schema = z.object({ name: z.string().min(1) });

    const app = new Hono();
    app.use("*", requestId);
    app.onError(createErrorHandler(silentLogger));
    app.post("/test", async (c) => {
      const data = await c.req.json();
      schema.parse(data);
      return c.json({ ok: true });
    });

    const res = await app.request("/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });

    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toBeTruthy();
  });
});

// ── validateBody helper ───────────────────────────────────────────

describe("validateBody", () => {
  const schema = z.object({
    email: z.string().email(),
    age: z.number().int().positive(),
  });

  it("returns parsed data on valid input", () => {
    const result = validateBody(schema, { email: "a@b.com", age: 25 });
    expect(result).toEqual({ email: "a@b.com", age: 25 });
  });

  it("throws AppError.validation on invalid input", () => {
    try {
      validateBody(schema, { email: "bad", age: -1 });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.status).toBe(400);
      expect(appErr.code).toBe("VALIDATION_ERROR");
      expect(appErr.details).toBeTruthy();
    }
  });
});
