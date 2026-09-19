import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  completeNexusLogin,
  completeNexusPasswordReset,
  completeNexusPinReset,
  isNexusFirebaseProvider,
  requestNexusOtp,
  requestNexusPasswordResetOtp,
  requestNexusPinResetOtp,
  resolveNexusLoginMode,
  verifyNexusOtp,
  verifyNexusPasswordResetOtp,
  verifyNexusPinResetOtp,
} from "@/lib/nexus-login-api";
import { isNexusApiMode } from "@/lib/auth-mode";

export const Route = createFileRoute("/login")({
  component: NexusLoginPage,
});

/**
 * Firebase (default): mobile SMS OTP (Firebase) → password → PIN → home
 * Legacy server OTP: mobile OTP → email OTP → password → PIN → home
 */
type Step =
  | "identifier"
  | "mobile_otp"
  | "email_otp"
  | "password"
  | "pin"
  | "forgot_password_ids"
  | "forgot_password_mobile_otp"
  | "forgot_password_email_otp"
  | "forgot_password_set"
  | "forgot_password_firebase"
  | "forgot_pin_ids"
  | "forgot_pin_mobile_otp"
  | "forgot_pin_email_otp"
  | "forgot_pin_set";

function NexusLoginPage() {
  const navigate = useNavigate();
  const firebase = isNexusFirebaseProvider();
  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isRoot, setIsRoot] = useState(false);
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [maskedMobile, setMaskedMobile] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [devMobile, setDevMobile] = useState<string | undefined>();
  const [devEmail, setDevEmail] = useState<string | undefined>();
  const [phoneE164, setPhoneE164] = useState<string | undefined>();
  const [firebasePhoneIdToken, setFirebasePhoneIdToken] = useState<string | undefined>();
  const [mobileOtpGrant, setMobileOtpGrant] = useState("");
  const [emailOtpGrant, setEmailOtpGrant] = useState("");
  const [resetMobile, setResetMobile] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetMobileGrant, setResetMobileGrant] = useState("");
  const [resetEmailGrant, setResetEmailGrant] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isNexusApiMode()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">Nexus demo mode</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Switch to API mode (`VITE_NEXUS_AUTH_MODE=api`) to use operator login.
          </p>
        </div>
      </div>
    );
  }

  const clearError = () => setError(null);

  const onIdentifier = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    setLoading(true);
    try {
      const mode = await resolveNexusLoginMode(identifier.trim());
      setDisplayName(mode.displayName);
      setIsRoot(Boolean(mode.isRoot));
      setFirebasePhoneIdToken(undefined);
      const mobile = await requestNexusOtp(identifier.trim(), "mobile");
      setMaskedMobile(mobile.maskedDestination);
      setDevMobile("devOtp" in mobile ? mobile.devOtp : undefined);
      setPhoneE164("phoneE164" in mobile ? mobile.phoneE164 : undefined);
      setMobileOtp("");
      setStep("mobile_otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to continue.");
    } finally {
      setLoading(false);
    }
  };

  const onMobileOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    setLoading(true);
    try {
      const verified = await verifyNexusOtp(
        identifier.trim(),
        "mobile",
        mobileOtp.trim(),
        phoneE164,
      );
      if ("firebaseIdToken" in verified && verified.firebaseIdToken) {
        setFirebasePhoneIdToken(verified.firebaseIdToken);
        setPassword("");
        setStep("password");
        return;
      }
      if ("grant" in verified) setMobileOtpGrant(verified.grant);
      const email = await requestNexusOtp(identifier.trim(), "email");
      setMaskedEmail(email.maskedDestination);
      setDevEmail("devOtp" in email ? email.devOtp : undefined);
      setEmailOtp("");
      setStep("email_otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mobile OTP failed.");
    } finally {
      setLoading(false);
    }
  };

  const onEmailOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    setLoading(true);
    try {
      const verified = await verifyNexusOtp(
        identifier.trim(),
        "email",
        emailOtp.trim(),
      );
      if ("grant" in verified) setEmailOtpGrant(verified.grant);
      setPassword("");
      setStep("password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email OTP failed.");
    } finally {
      setLoading(false);
    }
  };

  const onPassword = (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    if (!password.trim()) {
      setError("Password is required.");
      return;
    }
    setPin("");
    setStep("pin");
  };

  const onPin = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    setLoading(true);
    try {
      await completeNexusLogin({
        identifier: identifier.trim(),
        password,
        pin: pin.trim(),
        mobileOtpGrant: mobileOtpGrant || undefined,
        emailOtpGrant: emailOtpGrant || undefined,
        firebasePhoneIdToken,
      });
      navigate({ to: "/", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const startForgotPassword = async () => {
    clearError();
    if (firebase && identifier.includes("@")) {
      setLoading(true);
      try {
        await requestNexusPasswordResetOtp(identifier.trim(), "email");
        setStep("forgot_password_firebase");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to send reset email.");
      } finally {
        setLoading(false);
      }
      return;
    }
    setResetMobile("");
    setResetEmail("");
    setResetMobileGrant("");
    setResetEmailGrant("");
    setNewPassword("");
    setConfirmPassword("");
    setStep("forgot_password_ids");
  };

  const startForgotPin = () => {
    clearError();
    setResetMobile("");
    setResetEmail("");
    setResetMobileGrant("");
    setResetEmailGrant("");
    setNewPin("");
    setConfirmPin("");
    setStep("forgot_pin_ids");
  };

  const onForgotPasswordIds = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    setLoading(true);
    try {
      if (!resetMobile.trim() || !resetEmail.trim()) {
        throw new Error("Enter both mobile number and email.");
      }
      const mobile = await requestNexusPasswordResetOtp(identifier.trim(), "mobile");
      setMaskedMobile(mobile.maskedDestination);
      setDevMobile("devOtp" in mobile ? mobile.devOtp : undefined);
      setMobileOtp("");
      setStep("forgot_password_mobile_otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start password reset.");
    } finally {
      setLoading(false);
    }
  };

  const onForgotPasswordMobileOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    setLoading(true);
    try {
      const verified = await verifyNexusPasswordResetOtp(
        identifier.trim(),
        "mobile",
        mobileOtp.trim(),
      );
      setResetMobileGrant(verified.grant);
      const email = await requestNexusPasswordResetOtp(identifier.trim(), "email");
      setMaskedEmail(email.maskedDestination);
      setDevEmail("devOtp" in email ? email.devOtp : undefined);
      setEmailOtp("");
      setStep("forgot_password_email_otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mobile OTP failed.");
    } finally {
      setLoading(false);
    }
  };

  const onForgotPasswordEmailOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    setLoading(true);
    try {
      const verified = await verifyNexusPasswordResetOtp(
        identifier.trim(),
        "email",
        emailOtp.trim(),
      );
      setResetEmailGrant(verified.grant);
      setStep("forgot_password_set");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email OTP failed.");
    } finally {
      setLoading(false);
    }
  };

  const onForgotPasswordSet = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    setLoading(true);
    try {
      if (newPassword.length < 8) throw new Error("Password must be at least 8 characters.");
      if (newPassword !== confirmPassword) throw new Error("Passwords do not match.");
      await completeNexusPasswordReset({
        identifier: identifier.trim(),
        mobileOtpGrant: resetMobileGrant,
        emailOtpGrant: resetEmailGrant,
        newPassword,
      });
      setPassword(newPassword);
      setPin("");
      setStep("pin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to set password.");
    } finally {
      setLoading(false);
    }
  };

  const onForgotPinIds = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    setLoading(true);
    try {
      if (!resetMobile.trim() || !resetEmail.trim()) {
        throw new Error("Enter both mobile number and email.");
      }
      const mobile = await requestNexusPinResetOtp(identifier.trim(), "mobile");
      setMaskedMobile(mobile.maskedDestination);
      setDevMobile(mobile.devOtp);
      setMobileOtp("");
      setStep("forgot_pin_mobile_otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start PIN reset.");
    } finally {
      setLoading(false);
    }
  };

  const onForgotPinMobileOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    setLoading(true);
    try {
      const verified = await verifyNexusPinResetOtp(
        identifier.trim(),
        "mobile",
        mobileOtp.trim(),
      );
      setResetMobileGrant(verified.grant);
      const email = await requestNexusPinResetOtp(identifier.trim(), "email");
      setMaskedEmail(email.maskedDestination);
      setDevEmail(email.devOtp);
      setEmailOtp("");
      setStep("forgot_pin_email_otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mobile OTP failed.");
    } finally {
      setLoading(false);
    }
  };

  const onForgotPinEmailOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    setLoading(true);
    try {
      const verified = await verifyNexusPinResetOtp(
        identifier.trim(),
        "email",
        emailOtp.trim(),
      );
      setResetEmailGrant(verified.grant);
      setStep("forgot_pin_set");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email OTP failed.");
    } finally {
      setLoading(false);
    }
  };

  const onForgotPinSet = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    setLoading(true);
    try {
      if (newPin.length < 4) throw new Error("PIN must be 4–8 digits.");
      if (newPin !== confirmPin) throw new Error("PINs do not match.");
      await completeNexusPinReset({
        identifier: identifier.trim(),
        mobileOtpGrant: resetMobileGrant,
        emailOtpGrant: resetEmailGrant,
        newPin,
      });
      setPin(newPin);
      await completeNexusLogin({
        identifier: identifier.trim(),
        password,
        pin: newPin,
        mobileOtpGrant: mobileOtpGrant || undefined,
        emailOtpGrant: emailOtpGrant || undefined,
        firebasePhoneIdToken,
      });
      navigate({ to: "/", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to set PIN.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">LumenX Nexus</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {firebase
            ? `${isRoot ? "Root" : "Operator"} · Firebase SMS OTP → password → PIN`
            : `${isRoot ? "Root" : "Operator"} · mobile OTP → email OTP → password → PIN`}
        </p>
        {displayName ? (
          <p className="mt-2 text-xs text-muted-foreground">Signed identity: {displayName}</p>
        ) : null}

        {step === "identifier" && (
          <form onSubmit={onIdentifier} className="mt-6 space-y-3">
            <label className="block text-xs font-medium">Mobile number or email</label>
            <input
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="username, email, or mobile"
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground"
            >
              Continue
            </button>
          </form>
        )}

        {step === "mobile_otp" && (
          <form onSubmit={onMobileOtp} className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              {firebase ? "Firebase SMS OTP sent to " : "Enter OTP (mobile) sent to "}
              {maskedMobile || "mobile"}
              {devMobile ? ` · demo ${devMobile}` : ""}
            </p>
            <input
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={mobileOtp}
              onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Mobile OTP"
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading || mobileOtp.length !== 6}
              className="h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground"
            >
              Verify mobile OTP
            </button>
          </form>
        )}

        {step === "email_otp" && (
          <form onSubmit={onEmailOtp} className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              Enter OTP (email) sent to {maskedEmail || "email"}
              {devEmail ? ` · demo ${devEmail}` : ""}
            </p>
            <input
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={emailOtp}
              onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Email OTP"
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading || emailOtp.length !== 6}
              className="h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground"
            >
              Verify email OTP
            </button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={onPassword} className="mt-6 space-y-3">
            <label className="block text-xs font-medium">Password</label>
            <input
              type="password"
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={() => void startForgotPassword()}
              className="h-10 w-full text-sm text-muted-foreground underline"
            >
              Forgotten password?
            </button>
          </form>
        )}

        {step === "pin" && (
          <form onSubmit={onPin} className="mt-6 space-y-3">
            <label className="block text-xs font-medium">PIN</label>
            <input
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="4–8 digit PIN"
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading || pin.length < 4}
              className="h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground"
            >
              Login to dashboard
            </button>
            <button
              type="button"
              onClick={startForgotPin}
              className="h-10 w-full text-sm text-muted-foreground underline"
            >
              Forgotten PIN?
            </button>
          </form>
        )}

        {step === "forgot_password_firebase" && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              Firebase password reset email was sent to <strong>{identifier}</strong>.
              Open the link, set a new password, then return here and continue with PIN.
            </p>
            <button
              type="button"
              onClick={() => setStep("password")}
              className="h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground"
            >
              Back to password
            </button>
          </div>
        )}

        {step === "forgot_password_ids" && (
          <form onSubmit={onForgotPasswordIds} className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              Enter mobile number and email to reset password.
            </p>
            <input
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={resetMobile}
              onChange={(e) => setResetMobile(e.target.value)}
              placeholder="Mobile number"
              required
            />
            <input
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="Email"
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground"
            >
              Send OTPs
            </button>
            <button
              type="button"
              onClick={() => setStep("password")}
              className="h-10 w-full text-sm text-muted-foreground underline"
            >
              Back
            </button>
          </form>
        )}

        {step === "forgot_password_mobile_otp" && (
          <form onSubmit={onForgotPasswordMobileOtp} className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              OTP (mobile) · {maskedMobile}
              {devMobile ? ` · demo ${devMobile}` : ""}
            </p>
            <input
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={mobileOtp}
              onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading || mobileOtp.length !== 6}
              className="h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground"
            >
              Verify mobile
            </button>
          </form>
        )}

        {step === "forgot_password_email_otp" && (
          <form onSubmit={onForgotPasswordEmailOtp} className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              OTP (email) · {maskedEmail}
              {devEmail ? ` · demo ${devEmail}` : ""}
            </p>
            <input
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={emailOtp}
              onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading || emailOtp.length !== 6}
              className="h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground"
            >
              Verify email
            </button>
          </form>
        )}

        {step === "forgot_password_set" && (
          <form onSubmit={onForgotPasswordSet} className="mt-6 space-y-3">
            <label className="block text-xs font-medium">Set new password</label>
            <input
              type="password"
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <label className="block text-xs font-medium">Re-enter password</label>
            <input
              type="password"
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground"
            >
              Save password & continue
            </button>
          </form>
        )}

        {step === "forgot_pin_ids" && (
          <form onSubmit={onForgotPinIds} className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              Enter mobile number and email to reset PIN.
            </p>
            <input
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={resetMobile}
              onChange={(e) => setResetMobile(e.target.value)}
              placeholder="Mobile number"
              required
            />
            <input
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="Email"
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground"
            >
              Send OTPs
            </button>
            <button
              type="button"
              onClick={() => setStep("pin")}
              className="h-10 w-full text-sm text-muted-foreground underline"
            >
              Back
            </button>
          </form>
        )}

        {step === "forgot_pin_mobile_otp" && (
          <form onSubmit={onForgotPinMobileOtp} className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              OTP (mobile) · {maskedMobile}
              {devMobile ? ` · demo ${devMobile}` : ""}
            </p>
            <input
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={mobileOtp}
              onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading || mobileOtp.length !== 6}
              className="h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground"
            >
              Verify mobile
            </button>
          </form>
        )}

        {step === "forgot_pin_email_otp" && (
          <form onSubmit={onForgotPinEmailOtp} className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              OTP (email) · {maskedEmail}
              {devEmail ? ` · demo ${devEmail}` : ""}
            </p>
            <input
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={emailOtp}
              onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading || emailOtp.length !== 6}
              className="h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground"
            >
              Verify email
            </button>
          </form>
        )}

        {step === "forgot_pin_set" && (
          <form onSubmit={onForgotPinSet} className="mt-6 space-y-3">
            <label className="block text-xs font-medium">Set new PIN</label>
            <input
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              required
            />
            <label className="block text-xs font-medium">Re-enter PIN</label>
            <input
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading || newPin.length < 4}
              className="h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground"
            >
              Save PIN & login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
