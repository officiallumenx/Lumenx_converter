/**
 * Map Firebase client Auth errors to stable, user-safe messages.
 */

export type FirebaseClientAuthErrorCode =
  | "invalid-phone"
  | "invalid-email"
  | "invalid-password"
  | "invalid-otp"
  | "expired-otp"
  | "too-many-requests"
  | "user-disabled"
  | "user-not-found"
  | "wrong-password"
  | "network"
  | "recaptcha"
  | "expired-token"
  | "invalid-token"
  | "not-configured"
  | "unknown";

export class FirebaseClientAuthError extends Error {
  readonly code: FirebaseClientAuthErrorCode;
  readonly firebaseCode: string | null;

  constructor(
    code: FirebaseClientAuthErrorCode,
    message: string,
    firebaseCode: string | null = null,
  ) {
    super(message);
    this.name = "FirebaseClientAuthError";
    this.code = code;
    this.firebaseCode = firebaseCode;
  }
}

export function mapFirebaseClientError(err: unknown): FirebaseClientAuthError {
  const firebaseCode =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: string }).code ?? "")
      : "";
  const message =
    err instanceof Error ? err.message : "Firebase authentication failed";

  switch (firebaseCode) {
    case "auth/invalid-phone-number":
      return new FirebaseClientAuthError(
        "invalid-phone",
        "Enter a valid phone number with country code.",
        firebaseCode,
      );
    case "auth/invalid-email":
      return new FirebaseClientAuthError(
        "invalid-email",
        "Enter a valid email address.",
        firebaseCode,
      );
    case "auth/missing-password":
    case "auth/weak-password":
      return new FirebaseClientAuthError(
        "invalid-password",
        "Enter a valid password.",
        firebaseCode,
      );
    case "auth/invalid-verification-code":
    case "auth/code-expired":
      return new FirebaseClientAuthError(
        firebaseCode === "auth/code-expired" ? "expired-otp" : "invalid-otp",
        firebaseCode === "auth/code-expired"
          ? "This OTP has expired. Request a new code."
          : "Invalid OTP. Check the code and try again.",
        firebaseCode,
      );
    case "auth/too-many-requests":
      return new FirebaseClientAuthError(
        "too-many-requests",
        "Too many attempts. Please wait and try again.",
        firebaseCode,
      );
    case "auth/user-disabled":
      return new FirebaseClientAuthError(
        "user-disabled",
        "This account has been disabled.",
        firebaseCode,
      );
    case "auth/user-not-found":
      return new FirebaseClientAuthError(
        "user-not-found",
        "No account found for these credentials.",
        firebaseCode,
      );
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return new FirebaseClientAuthError(
        "wrong-password",
        "Invalid email or password.",
        firebaseCode,
      );
    case "auth/network-request-failed":
      return new FirebaseClientAuthError(
        "network",
        "Network error. Check your connection and try again.",
        firebaseCode,
      );
    case "auth/captcha-check-failed":
    case "auth/invalid-app-credential": {
      const host =
        typeof window !== "undefined" ? window.location.hostname : "";
      const onBlockedHost = host === "localhost" || host === "[::1]";
      return new FirebaseClientAuthError(
        "recaptcha",
        onBlockedHost
          ? "Firebase phone SMS cannot run on localhost. Open this app at http://127.0.0.1 (same port) and add 127.0.0.1 under Firebase Authentication → Settings → Authorized domains."
          : "Phone verification challenge failed. Add this domain under Firebase Authentication → Settings → Authorized domains, then reload and try again.",
        firebaseCode,
      );
    }
    case "auth/id-token-expired":
      return new FirebaseClientAuthError(
        "expired-token",
        "Your Firebase session expired. Sign in again.",
        firebaseCode,
      );
    case "auth/invalid-id-token":
      return new FirebaseClientAuthError(
        "invalid-token",
        "Invalid Firebase session. Sign in again.",
        firebaseCode,
      );
    default:
      if (/expired/i.test(message) && /otp|code|verification/i.test(message)) {
        return new FirebaseClientAuthError("expired-otp", message, firebaseCode || null);
      }
      if (/invalid/i.test(message) && /otp|code|verification/i.test(message)) {
        return new FirebaseClientAuthError("invalid-otp", message, firebaseCode || null);
      }
      return new FirebaseClientAuthError(
        "unknown",
        message || "Firebase authentication failed",
        firebaseCode || null,
      );
  }
}
