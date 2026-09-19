/**
 * Firebase Phone Auth (client) — SMS OTP via Firebase, not Twilio.
 * Returns a Firebase ID token after successful verification.
 */

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type Auth,
  type ConfirmationResult,
  type ApplicationVerifier,
} from "firebase/auth";
import { requireFirebaseAuth } from "./client";
import { mapFirebaseClientError } from "./errors";
import { assertFirebasePhoneAuthHostAllowed } from "./phone-host";

export type PhoneSignInSession = {
  verificationId: string;
  confirm: (otp: string) => Promise<{ idToken: string; uid: string }>;
};

function normalizeE164(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) return trimmed.replace(/\s+/g, "");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length > 10) return `+${digits}`;
  throw mapFirebaseClientError({ code: "auth/invalid-phone-number" });
}

/**
 * Start Firebase phone sign-in. `verifier` is typically a RecaptchaVerifier.
 */
export async function requestFirebasePhoneOtp(
  phone: string,
  verifier: ApplicationVerifier,
  auth?: Auth,
): Promise<PhoneSignInSession> {
  assertFirebasePhoneAuthHostAllowed();
  const authClient = auth ?? requireFirebaseAuth();
  const e164 = normalizeE164(phone);
  let confirmation: ConfirmationResult;
  try {
    confirmation = await signInWithPhoneNumber(authClient, e164, verifier);
  } catch (err) {
    throw mapFirebaseClientError(err);
  }

  return {
    verificationId: confirmation.verificationId,
    async confirm(otp: string) {
      const code = otp.trim();
      if (!/^\d{6}$/.test(code)) {
        throw mapFirebaseClientError({ code: "auth/invalid-verification-code" });
      }
      try {
        const credential = await confirmation.confirm(code);
        const idToken = await credential.user.getIdToken(true);
        return { idToken, uid: credential.user.uid };
      } catch (err) {
        throw mapFirebaseClientError(err);
      }
    },
  };
}

export function createInvisibleRecaptcha(
  containerOrId: string | HTMLElement,
  auth?: Auth,
): RecaptchaVerifier {
  const authClient = auth ?? requireFirebaseAuth();
  return new RecaptchaVerifier(authClient, containerOrId, { size: "invisible" });
}

export async function getCurrentFirebaseIdToken(
  forceRefresh = false,
  auth?: Auth,
): Promise<string | null> {
  const authClient = auth ?? requireFirebaseAuth();
  const user = authClient.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(forceRefresh);
  } catch (err) {
    throw mapFirebaseClientError(err);
  }
}
