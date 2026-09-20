/**
 * Institute registration API — call only in API auth mode.
 * Demo mode must never invoke these functions.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import { getAdminAuthMode } from "@/auth/auth-mode";
import type { AdminApiClient } from "@/lib/api";
import type {
  InstituteRegistrationDto,
  ResubmitRegistrationInput,
  SubmitRegistrationInput,
} from "./types";

function assertApiMode(): void {
  // Throws when VITE_ADMIN_AUTH_MODE=demo (product is API-only).
  getAdminAuthMode();
}

function toRequestBody(input: SubmitRegistrationInput): Record<string, unknown> {
  return {
    applicant_name: input.applicantName.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
    phone: input.phone?.trim() || null,
    pin: input.pin?.trim() || undefined,
    payload: input.payload,
  };
}

/** Public — creates pending registration (no auth header). */
export async function submitRegistration(
  input: SubmitRegistrationInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<InstituteRegistrationDto> {
  assertApiMode();
  return client.post<InstituteRegistrationDto>(
    "/api/v1/registrations",
    toRequestBody(input),
    { skipAuth: true },
  );
}

/** Authenticated applicant — own registration only. */
export async function fetchOwnRegistration(
  client: AdminApiClient = getAdminApiClient(),
): Promise<InstituteRegistrationDto> {
  assertApiMode();
  return client.get<InstituteRegistrationDto>("/api/v1/registrations/me");
}

/** Authenticated applicant — resubmit rejected registration. */
export async function resubmitRegistration(
  input: ResubmitRegistrationInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<InstituteRegistrationDto> {
  assertApiMode();
  return client.post<InstituteRegistrationDto>(
    "/api/v1/registrations/me/resubmit",
    {
      applicant_name: input.applicantName?.trim() || undefined,
      phone: input.phone?.trim() || null,
      payload: input.payload,
    },
  );
}
