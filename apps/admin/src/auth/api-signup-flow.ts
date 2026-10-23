import { submitRegistration } from "@/lib/registrations/api";
import { apiSignInWithPassword, type ApiAuthHydration } from "./api-auth";
import {
  clearApiRegistrationSnapshot,
  setApiRegistrationSnapshot,
} from "./api-registration-state";
import {
  assertSignupLegalConsent,
  buildRegistrationLegalConsentAssertion,
  clearSignupFormDraft,
  clearSignupLegalConsent,
  recordSignupLegalConsent,
} from "./signup-legal-consent";
import type { SignUpFormData } from "./types";

/**
 * API-mode institute registration: POST /api/v1/registrations then Supabase sign-in.
 * Never falls back to demo/localStorage registration on failure.
 * Legal consent must be explicitly accepted before the registration API is called;
 * the server validates and persists consent (client session record is secondary).
 */
export async function runApiInstituteSignUp(
  data: SignUpFormData,
): Promise<ApiAuthHydration> {
  assertSignupLegalConsent(Boolean(data.acceptTerms));

  const payload = data.registrationPayload;
  if (!payload?.instituteName?.trim()) {
    throw new Error("Institute details are required for registration.");
  }

  const legalConsent = buildRegistrationLegalConsentAssertion();

  try {
    const registration = await submitRegistration({
      applicantName: data.fullName.trim(),
      email: data.email.trim(),
      password: data.password,
      phone: data.phone?.trim() || null,
      pin: data.securityPin?.trim() || null,
      payload,
      legalConsent,
    });
    setApiRegistrationSnapshot(registration, registration.applicantUserId);
    const hydrated = await apiSignInWithPassword(data.email, data.password, {
      allowPendingApplicant: true,
    });
    // Local audit trail only after backend confirmed registration + consent.
    recordSignupLegalConsent(data.email, registration.id);
    clearSignupFormDraft();
    return hydrated;
  } catch (err) {
    clearApiRegistrationSnapshot();
    clearSignupLegalConsent();
    throw err;
  }
}
