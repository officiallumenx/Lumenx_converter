/**
 * Block mutating /api/v1 calls when the institute subscription is missing
 * or read-only. Invoked from requireAuth after actor resolution.
 * Platform operators bypass. Pre-subscription / recovery paths are allowlisted.
 */
import type { Context } from "hono";
import { AppError } from "../errors/app-error.js";
import type { AppBindings } from "../types/app.js";
import type { Actor } from "../auth/types.js";
import {
  resolveInstituteWriteGate,
  writeGateForbiddenError,
} from "../domains/subscriptions/write-gate.js";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Path prefixes under /api/v1 that must remain writable without a writable
 * subscription. Keep this list minimal and justified:
 *
 * - health: ops probes
 * - me: session / access profile (includes /me/access)
 * - auth/* + firebase: login, OTP, handoff, recovery (pre-subscription)
 * - subscriptions: checkout, offline pay, quote while read_only / renewing
 * - reports: export jobs are read-oriented (authorized reporting while read_only)
 * - registrations: institute signup before Nexus creates a trial row
 * - product-feedback: support channel while locked
 *
 * Payment webhooks are unauthenticated and never pass through requireAuth.
 */
const ALLOWLIST_PREFIXES = [
  "/api/v1/health",
  "/api/v1/me",
  "/api/v1/auth",
  "/api/v1/firebase",
  "/api/v1/subscriptions",
  "/api/v1/reports",
  "/api/v1/registrations",
  "/api/v1/product-feedback",
];

function isAllowlisted(path: string): boolean {
  return ALLOWLIST_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

function instituteFromObject(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (isUuid(record.institute_id)) return record.institute_id.trim();
  if (isUuid(record.instituteId)) return String(record.instituteId).trim();
  return null;
}

async function resolveInstituteIdFromRequest(
  c: Context<AppBindings>,
  actor: Actor,
): Promise<string | null> {
  const queryId = c.req.query("institute_id") ?? c.req.query("instituteId");
  if (isUuid(queryId)) return queryId.trim();

  const headerId =
    c.req.header("x-institute-id") ?? c.req.header("X-Institute-Id");
  if (isUuid(headerId)) return headerId.trim();

  const path = c.req.path;
  const institutesMatch = /^\/api\/v1\/institutes\/([0-9a-f-]{36})(?:\/|$)/i.exec(
    path,
  );
  if (institutesMatch?.[1] && isUuid(institutesMatch[1])) {
    return institutesMatch[1];
  }

  try {
    const clone = c.req.raw.clone();
    const body = await clone.json();
    const fromBody = instituteFromObject(body);
    if (fromBody) return fromBody;
  } catch {
    // no / invalid JSON body
  }

  const active = actor.memberships
    .filter((m) => m.status === "active")
    .map((m) => m.instituteId);
  const unique = [...new Set(active)];
  if (unique.length === 1 && isUuid(unique[0])) return unique[0]!;
  return null;
}

/**
 * Enforce subscription write-gate for the current request.
 * No-op for safe methods, allowlisted paths, and platform operators.
 */
export async function enforceSubscriptionWriteGate(
  c: Context<AppBindings>,
  actor: Actor,
): Promise<void> {
  const method = c.req.method.toUpperCase();
  if (!MUTATING.has(method)) return;

  const path = c.req.path;
  if (isAllowlisted(path)) return;

  if (actor.isPlatformOperator) return;

  const clients = c.get("supabase");
  if (!clients?.admin) {
    // Fail closed — cannot evaluate commercial state without DB.
    throw AppError.internal("Subscription enforcement unavailable");
  }

  const instituteId = await resolveInstituteIdFromRequest(c, actor);
  if (instituteId) {
    const gate = await resolveInstituteWriteGate(clients.admin, instituteId);
    if (gate.writeLocked) {
      throw writeGateForbiddenError(gate);
    }
    return;
  }

  const instituteIds = [
    ...new Set(
      actor.memberships
        .filter((m) => m.status === "active")
        .map((m) => m.instituteId),
    ),
  ];
  if (instituteIds.length === 0) return;

  const gates = await Promise.all(
    instituteIds.map((id) => resolveInstituteWriteGate(clients.admin, id)),
  );
  // Ambiguous institute on a mutating call: only allow when at least one
  // membership is writable (trial/active/grace). If every membership is
  // locked or missing a subscription, block.
  if (gates.every((g) => g.writeLocked)) {
    throw writeGateForbiddenError(gates[0]!);
  }
}
