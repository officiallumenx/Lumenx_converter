import { submitRegistration } from "@/lib/registrations/api";
import { getCurrentFirebaseIdToken } from "@lumenx/auth";
import { apiSignInWithPassword, type ApiAuthHydration } from "./api-auth";
import { isFirebaseAuthProvider } from "./auth-mode";
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
    let firebaseIdToken: string | undefined;
    if (isFirebaseAuthProvider() && data.phone?.trim()) {
      // Prefer the token captured immediately after SMS confirm. Re-reading
      // getCurrentFirebaseIdToken() can return a non-phone session (e.g. a
      // leftover email/password user), which the API rejects as
      // "A fresh Firebase phone verification is required".
      firebaseIdToken = data.firebaseIdToken?.trim() || undefined;
      if (!firebaseIdToken) {
        firebaseIdToken =
          (await getCurrentFirebaseIdToken(true)) ?? undefined;
      }
      if (!firebaseIdToken) {
        throw new Error(
          "Phone verification session is unavailable. Verify your phone again.",
        );
      }
    }
    const registration = await submitRegistration({
      applicantName: data.fullName.trim(),
      email: data.email.trim(),
      password: data.password,
      phone: data.phone?.trim() || null,
      ...(firebaseIdToken ? { firebaseIdToken } : {}),
      pin: data.securityPin?.trim() || null,
      payload,
    });
    setApiRegistrationSnapshot(registration, registration.applicantUserId);
    return await apiSignInWithPassword(data.email, data.password, {
      allowPendingApplicant: true,
    });
  } catch (err) {
    clearApiRegistrationSnapshot();
    throw err;
  }
}
