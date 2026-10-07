/**
 * Safe transport → notification pipeline emit.
 * Settings gate, severity mapping, dedupe-as-success, never fails trip writes.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import { createLogger } from "../../logger/logger.js";
import { emitNotificationForInstituteSystem } from "../notifications/service.js";
import { targetAppsForTransportAudience } from "../notifications/resolve-target-apps.js";
import type {
  DeviceApp,
  EmitNotificationInput,
  NotificationPriority,
} from "../notifications/types.js";
import { findTransportSettings } from "./repository.js";
import {
  isCriticalTransportBypass,
  presentationForSeverity,
  priorityForSeverity,
  severityForTransportEvent,
  type TransportSeverity,
} from "./transport-notification-severity.js";

const log = createLogger("info");

export type TransportNotifyAudience = "parent" | "driver" | "admin";

export type EmitTransportNotificationInput = {
  instituteId: string;
  createdByUserId: string;
  kind: string;
  title: string;
  body: string;
  recipientUserIds: string[];
  dedupeKey: string;
  deepLink: string;
  /** Who this emit is for — drives FCM target app filtering. */
  targetAudience: TransportNotifyAudience;
  /** Override audience→apps mapping (rare multi-app fanout). */
  targetApps?: DeviceApp[];
  payload?: Record<string, unknown>;
  /** Override auto severity from kind. */
  severity?: TransportSeverity;
  softChime?: boolean;
  positiveOutcome?: boolean;
  approachThresholdMin?: number;
};

export type TransportEmitResult =
  | { ok: true }
  | { ok: false; reason: "empty" | "disabled" | "dedupe" | "error"; error?: string };

let settingsCache: Map<string, { enabled: boolean; at: number }> | null = null;

async function transportNotificationsEnabled(
  admin: SupabaseClient,
  instituteId: string,
): Promise<boolean> {
  if (!settingsCache) settingsCache = new Map();
  const cached = settingsCache.get(instituteId);
  if (cached && Date.now() - cached.at < 30_000) return cached.enabled;
  const settings = await findTransportSettings(admin, instituteId);
  const enabled = settings?.notifications_enabled !== false;
  settingsCache.set(instituteId, { enabled, at: Date.now() });
  return enabled;
}

/** Test helper — clear settings cache between cases. */
export function clearTransportNotificationSettingsCache(): void {
  settingsCache = null;
}

function safeIdsFromPayload(payload: Record<string, unknown> | undefined): {
  tripId?: string;
  studentId?: string;
} {
  const tripId =
    typeof payload?.tripId === "string" ? payload.tripId : undefined;
  const studentId =
    typeof payload?.studentId === "string" ? payload.studentId : undefined;
  return { tripId, studentId };
}

/**
 * Emit one transport business notification.
 * Never throws into trip writers — failures are structured results + logs.
 */
export async function emitTransportNotification(
  admin: SupabaseClient,
  input: EmitTransportNotificationInput,
): Promise<TransportEmitResult> {
  if (input.recipientUserIds.length === 0) {
    return { ok: false, reason: "empty" };
  }

  const severity =
    input.severity ??
    severityForTransportEvent(input.kind, {
      approachThresholdMin: input.approachThresholdMin,
    });

  if (!isCriticalTransportBypass(severity)) {
    const enabled = await transportNotificationsEnabled(
      admin,
      input.instituteId,
    );
    if (!enabled) return { ok: false, reason: "disabled" };
  }

  const priority: NotificationPriority = priorityForSeverity(severity, {
    positiveOutcome: input.positiveOutcome,
  });
  const presentation = presentationForSeverity(severity, {
    softChime: input.softChime,
  });

  const targetApps =
    input.targetApps ?? targetAppsForTransportAudience(input.targetAudience);
  const { tripId, studentId } = safeIdsFromPayload(input.payload);

  const emitInput: EmitNotificationInput = {
    instituteId: input.instituteId,
    category: "transport",
    priority,
    title: input.title,
    body: input.body,
    deepLink: input.deepLink,
    dedupeKey: input.dedupeKey,
    recipientUserIds: [...new Set(input.recipientUserIds)],
    targetApps,
    payload: {
      ...(input.payload ?? {}),
      kind: input.kind,
      severity,
      presentation,
      targetAudience: input.targetAudience,
    },
  };

  try {
    await emitNotificationForInstituteSystem(
      admin,
      input.createdByUserId,
      emitInput,
    );
    return { ok: true };
  } catch (err) {
    // Dedupe unique violation → idempotent (no duplicate push).
    if (err instanceof AppError && (err.status === 409 || err.status === 400)) {
      return { ok: false, reason: "dedupe" };
    }
    const message = err instanceof Error ? err.message : String(err);
    log.error({
      msg: "transport_notification_emit_failed",
      kind: input.kind,
      instituteId: input.instituteId,
      tripId: tripId ?? null,
      studentId: studentId ?? null,
      targetAudience: input.targetAudience,
      targetApps,
      error: message,
    });
    // Never fail the transport write path.
    return { ok: false, reason: "error", error: message };
  }
}

/** Fire-and-forget wrapper for sync request paths. */
export function emitTransportNotificationSafe(
  admin: SupabaseClient,
  input: EmitTransportNotificationInput,
): void {
  void emitTransportNotification(admin, input).then((result) => {
    if (result.ok === false && result.reason === "error") {
      // Already logged in emitTransportNotification.
    }
  });
}
