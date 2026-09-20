/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — OTP Service
 *
 *  API mode → rejects demo OTP (use staff/signup API / StartMessaging / Resend flows)
 * ───────────────────────────────────────────────────────────── */

import {
  isDemoAuthMode,
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
        "Demo email OTP is disabled in API mode. Use staff/signup Resend or StartMessaging flows.",
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
        "Demo mobile OTP is disabled in API mode. Use staff/signup StartMessaging flows.",
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

/** Rejects demo OTP when API mode is active (server OTP via staff/signup APIs). */
class ApiModeNoDemoOtpService implements IOtpService {
  async sendEmailOtp(): Promise<OtpSendResult> {
    throw new Error(
      "Demo OTP is disabled in API mode. Use staff/signup Resend or StartMessaging flows.",
    );
  }
  async sendMobileOtp(): Promise<OtpSendResult> {
    throw new Error(
      "Demo OTP is disabled in API mode. Use staff/signup StartMessaging flows.",
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
  // Staff/signup OTP goes through server APIs (StartMessaging / Resend).
  return new ApiModeNoDemoOtpService();
}

export const otpService: IOtpService = createOtpService();

/** Demo OTP hint UI is disabled (API-only product mode). */
export function shouldShowDemoOtpHint(): boolean {
  return false;
}
