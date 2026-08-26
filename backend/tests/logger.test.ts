import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger, type LogLevel } from "../src/logger/logger.js";

let stdoutChunks: string[];
let stderrChunks: string[];

beforeEach(() => {
  stdoutChunks = [];
  stderrChunks = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdoutChunks.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderrChunks.push(String(chunk));
    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function lastStdout(): Record<string, unknown> {
  return JSON.parse(stdoutChunks[stdoutChunks.length - 1]);
}

function lastStderr(): Record<string, unknown> {
  return JSON.parse(stderrChunks[stderrChunks.length - 1]);
}

// ── Level filtering ──────────────────────────────────────────────

describe("level filtering", () => {
  it("emits at the configured level", () => {
    const log = createLogger("info");
    log.info({ msg: "hello" });
    expect(stdoutChunks).toHaveLength(1);
    expect(lastStdout().level).toBe("info");
    expect(lastStdout().msg).toBe("hello");
  });

  it("emits above the configured level", () => {
    const log = createLogger("info");
    log.warn({ msg: "caution" });
    expect(stdoutChunks).toHaveLength(1);
    expect(lastStdout().level).toBe("warn");
  });

  it("suppresses below the configured level", () => {
    const log = createLogger("warn");
    log.info({ msg: "silent" });
    log.debug({ msg: "also silent" });
    expect(stdoutChunks).toHaveLength(0);
    expect(stderrChunks).toHaveLength(0);
  });

  it("error level writes to stderr", () => {
    const log = createLogger("debug");
    log.error({ msg: "boom" });
    expect(stderrChunks).toHaveLength(1);
    expect(lastStderr().level).toBe("error");
    expect(stdoutChunks).toHaveLength(0);
  });

  it("debug level emits when threshold is debug", () => {
    const log = createLogger("debug");
    log.debug({ msg: "trace" });
    expect(stdoutChunks).toHaveLength(1);
    expect(lastStdout().level).toBe("debug");
  });
});

// ── Structured output ────────────────────────────────────────────

describe("structured output", () => {
  it("includes level, time, and custom fields", () => {
    const log = createLogger("debug");
    log.info({ msg: "started", port: 8787 });

    const entry = lastStdout();
    expect(entry.level).toBe("info");
    expect(entry.time).toBeTruthy();
    expect(entry.msg).toBe("started");
    expect(entry.port).toBe(8787);
  });

  it("each line is valid JSON", () => {
    const log = createLogger("debug");
    log.info({ msg: "one" });
    log.warn({ msg: "two" });
    log.debug({ msg: "three" });

    for (const chunk of stdoutChunks) {
      expect(() => JSON.parse(chunk)).not.toThrow();
    }
  });
});

// ── Redaction ────────────────────────────────────────────────────

describe("sensitive data redaction", () => {
  const sensitiveKeys = [
    "password",
    "otp",
    "access_token",
    "accessToken",
    "refresh_token",
    "refreshToken",
    "authorization",
    "cookie",
    "secret",
    "service_role_key",
    "private_key",
    "privateKey",
    "firebase_private_key",
    "supabase_service_role_key",
    "api_key",
    "apiKey",
    "token",
    "credentials",
  ];

  for (const key of sensitiveKeys) {
    it(`redacts "${key}"`, () => {
      const log = createLogger("debug");
      log.info({ msg: "test", [key]: "super-secret-value" });

      const entry = lastStdout();
      expect(entry[key]).toBe("[REDACTED]");
      expect(JSON.stringify(entry)).not.toContain("super-secret-value");
    });
  }

  it("does not redact safe keys", () => {
    const log = createLogger("debug");
    log.info({ msg: "ok", requestId: "abc-123", path: "/api/v1/health" });

    const entry = lastStdout();
    expect(entry.requestId).toBe("abc-123");
    expect(entry.path).toBe("/api/v1/health");
  });

  it("redacts nested sensitive fields", () => {
    const log = createLogger("debug");
    log.info({
      msg: "nested",
      user: { email: "a@b.com", password: "secret123" },
    });

    const entry = lastStdout();
    const user = entry.user as Record<string, unknown>;
    expect(user.email).toBe("a@b.com");
    expect(user.password).toBe("[REDACTED]");
  });

  it("redacts sensitive fields inside arrays", () => {
    const log = createLogger("debug");
    log.info({
      msg: "arr",
      items: [{ name: "a", token: "xyz" }],
    });

    const entry = lastStdout();
    const items = entry.items as Array<Record<string, unknown>>;
    expect(items[0].name).toBe("a");
    expect(items[0].token).toBe("[REDACTED]");
  });
});

// ── Default level ────────────────────────────────────────────────

describe("defaults", () => {
  it("defaults to info level", () => {
    const log = createLogger();
    log.debug({ msg: "hidden" });
    log.info({ msg: "visible" });
    expect(stdoutChunks).toHaveLength(1);
    expect(lastStdout().msg).toBe("visible");
  });
});
