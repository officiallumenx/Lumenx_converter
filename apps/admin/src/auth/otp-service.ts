/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — OTP Service
 *
 *  demo mode  → MockOtpService (DEMO_OTP) — offline only
 *  api+firebase → Firebase phone SMS OTP (email channel uses Firebase email/password, not demo OTP)
 *  api+supabase → rejects demo OTP (use staff/signup API / Twilio / Resend flows)
 * ───────────────────────────────────────────────────────────── */

import {
  assertFirebaseWebConfig,
  createInvisibleRecaptcha,
  requestFirebasePhoneOtp,
  assertFirebasePhoneAuthHostAllowed,
  type PhoneSignInSession,
  FirebaseClientAuthError,
} from "@lumenx/auth";
import {
  isDemoAuthMode,
  isFirebaseAuthProvider,
} from "./auth-mode";

export const OTP_PENDING_KEY = "lx_otp_pending_v1";

export interface OtpPendingData {
  email: string;
  mobile: string;
  emailVerified: boolean;
  mobileVerified: boolean;
  startedAt: number;
}

export function saveOtpPending(data: Partial<OtpPendingData>): void {
  try {
    const existing = loadOtpPending() ?? {
      email: "",
      mobile: "",
      emailVerified: false,
      mobileVerified: false,
      startedAt: Date.now(),
    };
    localStorage.setItem(OTP_PENDING_KEY, JSON.stringify({ ...existing, ...data }));
  } catch (_) {
    // Continue without persisted OTP state when storage is unavailable.
  }
}

export function loadOtpPending(): OtpPendingData | null {
  try {
    const raw = localStorage.getItem(OTP_PENDING_KEY);
    return raw ? (JSON.parse(raw) as OtpPendingData) : null;
  } catch (_) {
    return null;
  }
}

export function clearOtpPending(): void {
  try {
    localStorage.removeItem(OTP_PENDING_KEY);
  } catch (_) {
    // Ignore storage cleanup failures.
  }
}

/** Demo OTP — only valid when VITE_ADMIN_AUTH_MODE=demo. */
export const DEMO_OTP = "123456";
export const DEMO_EMAIL_OTP = DEMO_OTP;
export const DEMO_MOBILE_OTP = DEMO_OTP;

export const OTP_RESEND_COOLDOWN_SEC = 60;
export const OTP_LENGTH = 6;

export interface OtpSendResult {
  success: boolean;
  maskedDestination: string;
  /** Only present in explicit demo mode */
  devOtp?: string;
}

export interface OtpVerifyResult {
  success: boolean;
  error?: string;
  /** Firebase ID token after successful phone verify (firebase provider). */
  firebaseIdToken?: string;
}

export interface IOtpService {
  sendEmailOtp(email: string): Promise<OtpSendResult>;
  sendMobileOtp(mobile: string): Promise<OtpSendResult>;
  verifyEmailOtp(email: string, otp: string, persist?: boolean): Promise<OtpVerifyResult>;
  verifyMobileOtp(mobile: string, otp: string, persist?: boolean): Promise<OtpVerifyResult>;
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const visible = user.slice(0, 2);
  const masked = "*".repeat(Math.max(user.length - 2, 3));
  return `${visible}${masked}@${domain}`;
}

export function maskMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  if (digits.length < 5) return mobile;
  const prefix = mobile.startsWith("+91") ? "+91 " : "";
  const last5 = digits.slice(-5);
  const dotPart = "•".repeat(Math.max(digits.length - last5.length - (prefix ? 2 : 0), 5));
  return `${prefix}${dotPart} ${last5}`;
}

class MockOtpService implements IOtpService {
  private readonly delay = 900;

  async sendEmailOtp(email: string): Promise<OtpSendResult> {
    if (!isDemoAuthMode()) {
      throw new Error(
        "Demo email OTP is disabled in API mode. Use Supabase/Resend staff flows or VITE_AUTH_PROVIDER=firebase.",
      );
    }
    await new Promise((r) => setTimeout(r, this.delay));
    return {
      success: true,
      maskedDestination: maskEmail(email),
      devOtp: DEMO_EMAIL_OTP,
    };
  }

  async sendMobileOtp(mobile: string): Promise<OtpSendResult> {
    if (!isDemoAuthMode()) {
      throw new Error(
        "Demo mobile OTP is disabled in API mode. Use Twilio staff flows or VITE_AUTH_PROVIDER=firebase.",
      );
    }
    await new Promise((r) => setTimeout(r, this.delay));
    return {
      success: true,
      maskedDestination: maskMobile(mobile),
      devOtp: DEMO_MOBILE_OTP,
    };
  }

  async verifyEmailOtp(email: string, otp: string, persist = true): Promise<OtpVerifyResult> {
    void email;
    if (!isDemoAuthMode()) {
      throw new Error("Demo email OTP verification is disabled in API mode.");
    }
    await new Promise((r) => setTimeout(r, this.delay));
    if (otp === DEMO_EMAIL_OTP) {
      if (persist) saveOtpPending({ emailVerified: true });
      return { success: true };
    }
    return { success: false, error: "Invalid OTP. Please check the code and try again." };
  }

  async verifyMobileOtp(mobile: string, otp: string, persist = true): Promise<OtpVerifyResult> {
    void mobile;
    if (!isDemoAuthMode()) {
      throw new Error("Demo mobile OTP verification is disabled in API mode.");
    }
    await new Promise((r) => setTimeout(r, this.delay));
    if (otp === DEMO_MOBILE_OTP) {
      if (persist) saveOtpPending({ mobileVerified: true });
      return { success: true };
    }
    return { success: false, error: "Invalid OTP. Please check the code and try again." };
  }
}

/**
 * Module-level Firebase phone sessions so every `createOtpService()` instance
 * (and HMR-safe remounts that keep the module) share the same confirmation map.
 * Key = last 10 digits — matches Connect bridge and tolerates +91 / E.164 variance.
 */
const firebasePhoneSessions = new Map<string, PhoneSignInSession>();

export function phoneSessionKey(mobile: string): string {
  return mobile.replace(/\D/g, "").slice(-10);
}

/**
 * Firebase phone SMS OTP. Email channel is not 6-digit Firebase OTP —
 * callers should use signInWithFirebaseEmail / loginWithFirebaseEmail.
 */
class FirebaseOtpService implements IOtpService {
  private recaptcha: ReturnType<typeof createInvisibleRecaptcha> | null = null;

  private ensureRecaptcha() {
    assertFirebaseWebConfig();
    if (typeof document === "undefined") {
      throw new Error("Firebase phone auth requires a browser document.");
    }
    let el = document.getElementById("lx-firebase-recaptcha");
    if (!el) {
      el = document.createElement("div");
      el.id = "lx-firebase-recaptcha";
      document.body.appendChild(el);
    }
    if (!this.recaptcha) {
      this.recaptcha = createInvisibleRecaptcha(el);
    }
    return this.recaptcha;
  }

  private resetRecaptcha() {
    this.recaptcha?.clear();
    this.recaptcha = null;
    document.getElementById("lx-firebase-recaptcha")?.remove();
  }

  async sendEmailOtp(_email: string): Promise<OtpSendResult> {
    throw new Error(
      "Firebase email authentication uses email/password (not SMS-style OTP). Use loginWithFirebaseEmail from @lumenx/auth.",
    );
  }

  async sendMobileOtp(mobile: string): Promise<OtpSendResult> {
    try {
      assertFirebasePhoneAuthHostAllowed();
      // Firebase reCAPTCHA tokens are single-use. Always start with a fresh,
      // mounted widget so a prior login, back-navigation, or failed attempt
      // cannot leak a stale app credential into this request.
      this.resetRecaptcha();
      const verifier = this.ensureRecaptcha();
      await verifier.render();
      const session = await requestFirebasePhoneOtp(mobile, verifier);
      const key = phoneSessionKey(mobile);
      if (!key) {
        throw new Error("Enter a valid mobile number before requesting OTP.");
      }
      firebasePhoneSessions.set(key, session);
      this.resetRecaptcha();
      return {
        success: true,
        maskedDestination: maskMobile(mobile),
      };
    } catch (err) {
      // A verifier token is single-use. Recreate the widget after any failed
      // request so resend can recover without requiring a page reload.
      this.resetRecaptcha();
      if (err instanceof FirebaseClientAuthError) throw err;
      throw err;
    }
  }

  async verifyEmailOtp(_email: string, _otp: string): Promise<OtpVerifyResult> {
    return {
      success: false,
      error:
        "Firebase email authentication uses email/password. Use loginWithFirebaseEmail from @lumenx/auth.",
    };
  }

  async verifyMobileOtp(
    mobile: string,
    otp: string,
    persist = true,
  ): Promise<OtpVerifyResult> {
    const key = phoneSessionKey(mobile);
    const session = key ? firebasePhoneSessions.get(key) : undefined;
    if (!session) {
      return {
        success: false,
        error: "Request a new OTP before verifying.",
      };
    }
    try {
      const { idToken } = await session.confirm(otp);
      firebasePhoneSessions.delete(key);
      if (persist) saveOtpPending({ mobileVerified: true });
      return { success: true, firebaseIdToken: idToken };
    } catch (err) {
      const message =
        err instanceof FirebaseClientAuthError
          ? err.message
          : "Invalid OTP. Please check the code and try again.";
      return { success: false, error: message };
    }
  }
}

/** Rejects demo OTP when API mode uses supabase provider (Twilio/Resend/staff APIs). */
class ApiModeNoDemoOtpService implements IOtpService {
  async sendEmailOtp(): Promise<OtpSendResult> {
    throw new Error(
      "Demo OTP is disabled in API mode. Use staff/signup Resend flows or set VITE_AUTH_PROVIDER=firebase.",
    );
  }
  async sendMobileOtp(): Promise<OtpSendResult> {
    throw new Error(
      "Demo OTP is disabled in API mode. Use staff/signup Twilio flows or set VITE_AUTH_PROVIDER=firebase.",
    );
  }
  async verifyEmailOtp(): Promise<OtpVerifyResult> {
    throw new Error("Demo OTP verification is disabled in API mode.");
  }
  async verifyMobileOtp(): Promise<OtpVerifyResult> {
    throw new Error("Demo OTP verification is disabled in API mode.");
  }
}

export function createOtpService(): IOtpService {
  // Product mode is API-only — never instantiate MockOtpService.
  // Boot rejects VITE_ADMIN_AUTH_MODE=demo via assertProductionApiAuthMode.
  if (isFirebaseAuthProvider()) return new FirebaseOtpService();
  return new ApiModeNoDemoOtpService();
}

export const otpService: IOtpService = createOtpService();

/** Demo OTP hint UI is disabled (API-only product mode). */
export function shouldShowDemoOtpHint(): boolean {
  return false;
}
