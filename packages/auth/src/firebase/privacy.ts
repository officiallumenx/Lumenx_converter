/**
 * Shared redaction for Analytics params and Crashlytics messages.
 * Never send emails, phones, tokens, or LumenX business PII to Firebase.
 */

const SENSITIVE_PARAM_KEYS =
  /^(email|phone|mobile|password|token|name|student|child|address|dob|ssn|aadhaar|institute|school|parent|guardian)/i;

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/g;
const JWT_RE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const BEARER_RE = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;
const UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

function looksLikeSecret(value: string): boolean {
  return (
    value.includes("@") ||
    /^\+?\d{8,}$/.test(value.replace(/\s/g, "")) ||
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(value) ||
    /Bearer\s+[A-Za-z0-9._~+/=-]+/i.test(value) ||
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i.test(
      value,
    )
  );
}

export function sanitizeAnalyticsParams(
  params?: Record<string, string | number | boolean>,
): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (SENSITIVE_PARAM_KEYS.test(key)) continue;
    if (typeof value === "string" && looksLikeSecret(value)) continue;
    out[key] = value;
  }
  return out;
}

export function scrubCrashMessage(message: string): string {
  return message
    .slice(0, 500)
    .replace(EMAIL_RE, "[redacted]")
    .replace(JWT_RE, "[redacted]")
    .replace(BEARER_RE, "[redacted]")
    .replace(PHONE_RE, "[redacted]")
    .replace(UUID_RE, "[redacted]");
}
