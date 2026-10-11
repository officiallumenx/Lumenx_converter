/**
 * Strip short-lived signed photo URLs from persisted RQ JSON.
 * Keep photoAssetPath / structural fields so warm reopen still works;
 * images refresh via the in-memory signed-URL cache / API.
 */

const URL_FIELD_NAMES = new Set([
  "photoUrl",
  "photoSignedUrl",
  "avatar",
  "photo_signed_url",
  "photo_url",
]);

function looksLikeSignedOrHttpUrl(value: string): boolean {
  const v = value.trim();
  if (!v.startsWith("http://") && !v.startsWith("https://")) return false;
  // Supabase / storage signed URLs and generic query-token URLs.
  return (
    v.includes("token=") ||
    v.includes("X-Amz-") ||
    v.includes("Signature=") ||
    v.includes("/storage/v1/object/sign/") ||
    v.includes("?")
  );
}

function isExpiredIso(iso: unknown, nowMs: number): boolean {
  if (typeof iso !== "string") return false;
  const t = Date.parse(iso);
  return Number.isFinite(t) && t <= nowMs;
}

export function sanitizePersistedConnectValue(
  value: unknown,
  nowMs: number = Date.now(),
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePersistedConnectValue(item, nowMs));
  }
  if (!value || typeof value !== "object") return value;

  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const expired =
    isExpiredIso(obj.photoExpiresAt, nowMs) ||
    isExpiredIso(obj.photo_expires_at, nowMs);

  for (const [k, v] of Object.entries(obj)) {
    if (URL_FIELD_NAMES.has(k) && typeof v === "string" && looksLikeSignedOrHttpUrl(v)) {
      out[k] = null;
      continue;
    }
    if (expired && URL_FIELD_NAMES.has(k)) {
      out[k] = null;
      continue;
    }
    out[k] = sanitizePersistedConnectValue(v, nowMs);
  }
  return out;
}

/** Deep-sanitize a dehydrated RQ client payload before IDB write / after read. */
export function sanitizePersistedQueryClient(
  client: unknown,
  nowMs: number = Date.now(),
): unknown {
  return sanitizePersistedConnectValue(client, nowMs);
}
