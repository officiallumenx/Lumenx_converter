/**
 * Lightweight structured JSON logger.
 * One line per event. No external dependencies.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// Keys whose values must never appear in log output.
const REDACT_PATTERNS = [
  "password",
  "otp",
  "access_token",
  "accesstoken",
  "refresh_token",
  "refreshtoken",
  "authorization",
  "cookie",
  "secret",
  "service_role",
  "service_role_key",
  "private_key",
  "privatekey",
  "firebase_private_key",
  "firebase_credentials",
  "supabase_service_role_key",
  "api_key",
  "apikey",
  "token",
  "credentials",
];

function shouldRedact(key: string): boolean {
  const lower = key.toLowerCase();
  return REDACT_PATTERNS.some((p) => lower.includes(p));
}

function redactValue(value: unknown, key?: string): unknown {
  if (key && shouldRedact(key)) return "[REDACTED]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactValue(v, k);
    }
    return out;
  }
  return String(value);
}

export type LogEntry = Record<string, unknown>;

export interface Logger {
  debug(entry: LogEntry): void;
  info(entry: LogEntry): void;
  warn(entry: LogEntry): void;
  error(entry: LogEntry): void;
}

export function createLogger(minLevel: LogLevel = "info"): Logger {
  const threshold = LEVEL_WEIGHT[minLevel];

  function emit(level: LogLevel, entry: LogEntry): void {
    if (LEVEL_WEIGHT[level] < threshold) return;

    const line = JSON.stringify({
      level,
      time: new Date().toISOString(),
      ...(redactValue(entry) as LogEntry),
    });

    if (level === "error") {
      process.stderr.write(line + "\n");
    } else {
      process.stdout.write(line + "\n");
    }
  }

  return {
    debug: (entry) => emit("debug", entry),
    info: (entry) => emit("info", entry),
    warn: (entry) => emit("warn", entry),
    error: (entry) => emit("error", entry),
  };
}
