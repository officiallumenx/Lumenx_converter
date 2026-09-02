import { submitRegistration } from "@/lib/registrations/api";
import { apiSignInWithPassword, type ApiAuthHydration } from "./api-auth";
import {
  clearApiRegistrationSnapshot,
  setApiRegistrationSnapshot,
} from "./api-registration-state";
import type { SignUpFormData } from "./types";

/**
 * API-mode institute registration: POST /api/v1/registrations then Supabase sign-in.
 * Never falls back to demo/localStorage registration on failure.
 */
export async function runApiInstituteSignUp(
  data: SignUpFormData,
): Promise<ApiAuthHydration> {
  const payload = data.registrationPayload;
  if (!payload?.instituteName?.trim()) {
    throw new Error("Institute details are required for registration.");
  }

  try {
    const registration = await submitRegistration({
      applicantName: data.fullName.trim(),
      email: data.email.trim(),
      password: data.password,
      phone: data.phone?.trim() || null,
      payload,
    });
    setApiRegistrationSnapshot(registration, registration.applicantUserId);
    return await apiSignInWithPassword(data.email, data.password);
  } catch (err) {
    clearApiRegistrationSnapshot();
    throw err;
  }
}
