import { AppError } from "../errors/app-error.js";

/**
 * Map Supabase/PostgREST failures to AppError without leaking PG internals.
 */
export function mapDbError(error: { code?: string; message?: string; details?: string; hint?: string } | null): never {
  const code = error?.code ?? "";
  const message = error?.message ?? "";

  // unique_violation / exclusion — prefer actionable copy over generic "Resource conflict"
  if (code === "23505" || code === "23P01") {
    const hay = `${message} ${error?.details ?? ""} ${error?.hint ?? ""}`.toLowerCase();
    if (/transport_trip_vehicle_date_slot/.test(hay)) {
      // Slot is not always in the PG message — callers may refine Pickup vs Drop copy.
      throw AppError.conflict("Trip already exists for this vehicle, date, and slot");
    }
    if (/transport_trip_client_event/.test(hay)) {
      throw AppError.conflict("Trip start already recorded for this client event");
    }
    // Institute notification dedupe (partial unique index). Prefer specific copy
    // before diary / subject heuristics that also mention "dedupe" or "subject".
    if (/notification_institute_dedupe_uidx/.test(hay)) {
      throw AppError.conflict("Notification already recorded");
    }
    // Diary / reminder unique keys often include scope value "subject" in DETAIL —
    // match those before the subject-catalog heuristic below.
    if (
      /diary-reminder/.test(hay) ||
      ((/notification|dedupe_key|dedupe/.test(hay) && /diary/.test(hay)))
    ) {
      throw AppError.conflict("Diary reminder already recorded");
    }
    if (/diary_day|diary_day_institute_teacher_date_scope/.test(hay)) {
      throw AppError.conflict(
        "A diary day already exists for this teacher, date, and scope",
      );
    }
    if (/class|section|classes|sections/.test(hay)) {
      throw AppError.conflict("This class or section already exists — change the name");
    }
    // Subject catalog only — do not match diary scope=subject DETAIL payloads.
    if (
      /subject/.test(hay) &&
      !/diary/.test(hay) &&
      !/\bscope\b/.test(hay)
    ) {
      throw AppError.conflict("This subject already exists — change the name or code");
    }
    if (/membership|user_profile|email|auth/.test(hay)) {
      throw AppError.conflict("This account or membership already exists");
    }
    if (/enrollment|student/.test(hay)) {
      throw AppError.conflict("This student is already enrolled");
    }
    if (/assignment|teacher/.test(hay)) {
      throw AppError.conflict("This teacher assignment already exists");
    }
    throw AppError.conflict("That item already exists — try a different name");
  }

  // foreign_key_violation
  if (code === "23503") {
    throw AppError.validation("Referenced resource is invalid");
  }

  // check_violation
  if (code === "23514") {
    throw AppError.validation("Request violates a data constraint");
  }

  // Missing column / undefined table — migrations not applied.
  if (code === "42703" || code === "42P01" || code === "PGRST205" || code === "PGRST204") {
    throw AppError.internal(
      "Database schema is out of date. Apply pending Supabase migrations, then retry.",
      {
        code: code || undefined,
        message: message || undefined,
        details: error?.details || undefined,
        hint: error?.hint || undefined,
      },
    );
  }

  // Permission denied — usually means service_role client was poisoned with a user JWT.
  if (code === "42501") {
    throw AppError.internal(
      "Database permission denied. Restart the API server and try again.",
      {
        code: code || undefined,
        message: message || undefined,
        details: error?.details || undefined,
        hint: error?.hint || undefined,
      },
    );
  }

  // PostgREST cannot target partial unique indexes with onConflict.
  if (/no unique or exclusion constraint matching the ON CONFLICT/i.test(message)) {
    throw AppError.internal(
      "Database write used an invalid conflict target. Retry after updating the API.",
      {
        code: code || undefined,
        message: message || undefined,
        details: error?.details || undefined,
        hint: error?.hint || undefined,
      },
    );
  }

  throw AppError.internal("Database operation failed", {
    code: code || undefined,
    message: message || undefined,
    details: error?.details || undefined,
    hint: error?.hint || undefined,
  });
}

export function ensureDbOk<T>(
  result: { data: T; error: { code?: string; message?: string; details?: string; hint?: string } | null },
  _context?: string,
): T {
  if (result.error) {
    mapDbError(result.error);
  }
  return result.data;
}
