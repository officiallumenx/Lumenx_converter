import { AppError } from "../../errors/app-error.js";

/** Max horizontal accuracy accepted for a usable ping (meters). */
export const GPS_ACCURACY_MAX_M = 500;
/** Soft warn threshold — still accepted. */
export const GPS_ACCURACY_WARN_M = 100;
/** Captured_at may not be more than this far in the future. */
export const GPS_CAPTURED_FUTURE_SKEW_MS = 60_000;
/** Captured_at may not be older than this relative to server now. */
export const GPS_CAPTURED_MAX_AGE_MS = 30 * 60_000;

export type ValidatedGpsPing = {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  capturedAt: string;
  clientEventId: string | null;
  sequenceNumber: number | null;
};

/**
 * Validate driver GPS ping coordinates and metadata.
 * Rejects NaN, out-of-range, absurd accuracy, and extreme timestamps.
 */
export function validateGpsPingInput(input: {
  latitude: unknown;
  longitude: unknown;
  accuracyM?: unknown;
  capturedAt?: unknown;
  clientEventId?: unknown;
  sequenceNumber?: unknown;
}): ValidatedGpsPing {
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw AppError.validation("latitude must be between -90 and 90");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw AppError.validation("longitude must be between -180 and 180");
  }

  let accuracyM: number | null = null;
  if (input.accuracyM !== undefined && input.accuracyM !== null) {
    const acc = Number(input.accuracyM);
    if (!Number.isFinite(acc) || acc < 0) {
      throw AppError.validation("accuracy_m must be a non-negative number");
    }
    if (acc > GPS_ACCURACY_MAX_M) {
      throw AppError.validation(
        `accuracy_m must be <= ${GPS_ACCURACY_MAX_M} meters (got ${acc})`,
      );
    }
    accuracyM = acc;
  }

  const now = Date.now();
  let capturedAt = new Date(now).toISOString();
  if (input.capturedAt !== undefined && input.capturedAt !== null) {
    if (typeof input.capturedAt !== "string" || !input.capturedAt.trim()) {
      throw AppError.validation("captured_at must be an ISO timestamp");
    }
    const parsed = Date.parse(input.capturedAt);
    if (!Number.isFinite(parsed)) {
      throw AppError.validation("captured_at must be a valid ISO timestamp");
    }
    if (parsed - now > GPS_CAPTURED_FUTURE_SKEW_MS) {
      throw AppError.gpsPointTooFuture();
    }
    if (now - parsed > GPS_CAPTURED_MAX_AGE_MS) {
      throw AppError.gpsPointTooOld();
    }
    capturedAt = new Date(parsed).toISOString();
  }

  let clientEventId: string | null = null;
  if (input.clientEventId !== undefined && input.clientEventId !== null) {
    if (typeof input.clientEventId !== "string" || !input.clientEventId.trim()) {
      throw AppError.validation("client_event_id must be a non-empty string");
    }
    if (input.clientEventId.length > 128) {
      throw AppError.validation("client_event_id is too long");
    }
    clientEventId = input.clientEventId.trim();
  }

  let sequenceNumber: number | null = null;
  if (input.sequenceNumber !== undefined && input.sequenceNumber !== null) {
    const seq = Number(input.sequenceNumber);
    if (!Number.isInteger(seq) || seq < 0) {
      throw AppError.validation("sequence_number must be an integer >= 0");
    }
    sequenceNumber = seq;
  }

  return {
    latitude,
    longitude,
    accuracyM,
    capturedAt,
    clientEventId,
    sequenceNumber,
  };
}
