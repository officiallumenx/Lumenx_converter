/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — OTP Service
 *
 *  Architecture: IOtpService interface + MockOtpService implementation.
 *
 *  To integrate with a real backend:
 *    • Firebase:  implement FirebaseOtpService using firebase/auth
 *    • Supabase:  implement SupabaseOtpService using @supabase/supabase-js
 *    • REST API:  implement ApiOtpService using fetch/axios
 *
 *  Then swap the exported `otpService` at the bottom of this file.
 * ───────────────────────────────────────────────────────────── */

// ── localStorage key for pending verification state ───────────

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
  } catch (_) {}
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
  } catch (_) {}
}

// ── Demo OTP codes (replace with real delivery in production) ──

export const DEMO_EMAIL_OTP  = "123456";
export const DEMO_MOBILE_OTP = "654321";

export const OTP_RESEND_COOLDOWN_SEC = 60;
export const OTP_LENGTH              = 6;

// ── IOtpService interface ─────────────────────────────────────

export interface OtpSendResult {
  success: boolean;
  /** Masked destination shown to the user, e.g. "a***@lumenx.edu" */
  maskedDestination: string;
  /** Only present in mock / dev mode */
  devOtp?: string;
}

export interface OtpVerifyResult {
  success: boolean;
  error?: string;
}

export interface IOtpService {
  /**
   * Send an OTP to the given email address.
   * In production: triggers an email send via your provider.
   */
  sendEmailOtp(email: string): Promise<OtpSendResult>;

  /**
   * Send an OTP to the given mobile number.
   * In production: triggers an SMS via Twilio / Firebase / etc.
   */
  sendMobileOtp(mobile: string): Promise<OtpSendResult>;

  /**
   * Verify the OTP the user entered for their email.
   */
  verifyEmailOtp(email: string, otp: string): Promise<OtpVerifyResult>;

  /**
   * Verify the OTP the user entered for their mobile number.
   */
  verifyMobileOtp(mobile: string, otp: string): Promise<OtpVerifyResult>;
}

// ── Utility helpers ───────────────────────────────────────────

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const visible = user.slice(0, 2);
  const masked  = "*".repeat(Math.max(user.length - 2, 3));
  return `${visible}${masked}@${domain}`;
}

export function maskMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  if (digits.length < 5) return mobile;
  const prefix  = mobile.startsWith("+91") ? "+91 " : "";
  const last5   = digits.slice(-5);
  const dotPart = "•".repeat(Math.max(digits.length - last5.length - (prefix ? 2 : 0), 5));
  return `${prefix}${dotPart} ${last5}`;
}

// ── Mock implementation ───────────────────────────────────────

class MockOtpService implements IOtpService {
  private readonly delay = 900;

  async sendEmailOtp(email: string): Promise<OtpSendResult> {
    await new Promise((r) => setTimeout(r, this.delay));
    return {
      success:            true,
      maskedDestination:  maskEmail(email),
      devOtp:             DEMO_EMAIL_OTP,
    };
  }

  async sendMobileOtp(mobile: string): Promise<OtpSendResult> {
    await new Promise((r) => setTimeout(r, this.delay));
    return {
      success:            true,
      maskedDestination:  maskMobile(mobile),
      devOtp:             DEMO_MOBILE_OTP,
    };
  }

  async verifyEmailOtp(email: string, otp: string, persist = true): Promise<OtpVerifyResult> {
    void email;
    await new Promise((r) => setTimeout(r, this.delay));
    if (otp === DEMO_EMAIL_OTP) {
      if (persist) saveOtpPending({ emailVerified: true });
      return { success: true };
    }
    return { success: false, error: "Invalid OTP. Please check the code and try again." };
  }

  async verifyMobileOtp(mobile: string, otp: string, persist = true): Promise<OtpVerifyResult> {
    void mobile;
    await new Promise((r) => setTimeout(r, this.delay));
    if (otp === DEMO_MOBILE_OTP) {
      if (persist) saveOtpPending({ mobileVerified: true });
      return { success: true };
    }
    return { success: false, error: "Invalid OTP. Please check the code and try again." };
  }
}

// ── Firebase stub (swap `otpService` below to activate) ───────

// import { RecaptchaVerifier, signInWithPhoneNumber, ... } from "firebase/auth";
// class FirebaseOtpService implements IOtpService { ... }

// ── Supabase stub ─────────────────────────────────────────────

// import { createClient } from "@supabase/supabase-js";
// class SupabaseOtpService implements IOtpService { ... }

// ── Active instance ───────────────────────────────────────────
// Swap MockOtpService → FirebaseOtpService / SupabaseOtpService / ApiOtpService

export const otpService: IOtpService = new MockOtpService();
