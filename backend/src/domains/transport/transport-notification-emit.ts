/**
 * Safe transport → notification pipeline emit.
 * Settings gate, severity mapping, dedupe-as-success, never fails trip writes.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import { emitNotificationForInstituteSystem } from "../notifications/service.js";
import type {
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

export type EmitTransportNotificationInput = {
  instituteId: string;
  createdByUserId: string;
  kind: string;
  title: string;
  body: string;
  recipientUserIds: string[];
  dedupeKey: string;
  deepLink: string;
  payload?: Record<string, unknown>;
  /** Override auto severity from kind. */
  severity?: TransportSeverity;
  softChime?: boolean;
  positiveOutcome?: boolean;
  approachThresholdMin?: number;
};

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

/**
 * Emit one transport business notification.
 * Returns true if a new notification was created, false if suppressed (dedupe/settings/empty).
 */
export async function emitTransportNotification(
  admin: SupabaseClient,
  input: EmitTransportNotificationInput,
): Promise<boolean> {
  if (input.recipientUserIds.length === 0) return false;

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
    if (!enabled) return false;
  }

  const priority: NotificationPriority = priorityForSeverity(severity, {
    positiveOutcome: input.positiveOutcome,
  });
  const presentation = presentationForSeverity(severity, {
    softChime: input.softChime,
  });

  const emitInput: EmitNotificationInput = {
    instituteId: input.instituteId,
    category: "transport",
    priority,
    title: input.title,
    body: input.body,
    deepLink: input.deepLink,
    dedupeKey: input.dedupeKey,
    recipientUserIds: [...new Set(input.recipientUserIds)],
    payload: {
      ...(input.payload ?? {}),
      kind: input.kind,
      severity,
      presentation,
    },
  };

  try {
    await emitNotificationForInstituteSystem(
      admin,
      input.createdByUserId,
      emitInput,
    );
    return true;
  } catch (err) {
    // Dedupe unique violation → idempotent success (no duplicate push).
    if (err instanceof AppError && (err.status === 409 || err.status === 400)) {
      return false;
    }
    // Never fail the transport write path.
    return false;
  }
}

/** Fire-and-forget wrapper for sync request paths. */
export function emitTransportNotificationSafe(
  admin: SupabaseClient,
  input: EmitTransportNotificationInput,
): void {
  void emitTransportNotification(admin, input);
}
