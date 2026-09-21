import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  completeNexusLogin,
  completeNexusPasswordReset,
  completeNexusPinReset,
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

/** Server OTP: mobile OTP → password → PIN → home */
type Step =
  | "identifier"
  | "mobile_otp"
  | "password"
  | "pin"
  | "forgot_password_ids"
  | "forgot_password_mobile_otp"
  | "forgot_password_set"
  | "forgot_pin_ids"
  | "forgot_pin_mobile_otp"
  | "forgot_pin_set";

function LoginBackButton({
  onClick,
  label = "Back",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {label}
    </button>
  );
}

function NexusLoginPage() {
  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isRoot, setIsRoot] = useState(false);
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [maskedMobile, setMaskedMobile] = useState("");
  const [devMobile, setDevMobile] = useState<string | undefined>();
  const [mobileOtpGrant, setMobileOtpGrant] = useState("");
  const [resetMobile, setResetMobile] = useState("");
  const [resetMobileGrant, setResetMobileGrant] = useState("");
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
      const mobile = await requestNexusOtp(identifier.trim(), "mobile");
      setMaskedMobile(mobile.maskedDestination);
      setDevMobile(mobile.devOtp);
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
      );
      setMobileOtpGrant(verified.grant);
      setPassword("");
      setStep("password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mobile OTP failed.");
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
      });
      // Full reload so the session root picks up the operator-login marker.
      window.location.assign("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed.";
      // Password is checked on the server during final login — show it on the
      // password step, not the PIN step.
      if (/incorrect password/i.test(message)) {
        setPin("");
        setError(message);
        setStep("password");
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const startForgotPassword = () => {
    clearError();
    setResetMobile("");
    setResetMobileGrant("");
    setNewPassword("");
    setConfirmPassword("");
    setStep("forgot_password_ids");
  };

  const startForgotPin = () => {
    clearError();
    setResetMobile("");
    setResetMobileGrant("");
    setNewPin("");
    setConfirmPin("");
    setStep("forgot_pin_ids");
  };

  const onForgotPasswordIds = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    setLoading(true);
    try {
      if (!resetMobile.trim()) {
        throw new Error("Enter your mobile number.");
      }
      const mobile = await requestNexusPasswordResetOtp(identifier.trim(), "mobile");
      setMaskedMobile(mobile.maskedDestination);
      setDevMobile(mobile.devOtp);
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
      setStep("forgot_password_set");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mobile OTP failed.");
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
      if (!resetMobile.trim()) {
        throw new Error("Enter your mobile number.");
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
      setStep("forgot_pin_set");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mobile OTP failed.");
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
        newPin,
      });
      setPin(newPin);
      await completeNexusLogin({
        identifier: identifier.trim(),
        password,
        pin: newPin,
        mobileOtpGrant: mobileOtpGrant || undefined,
      });
      window.location.assign("/");
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
          {`${isRoot ? "Root" : "Operator"} · mobile OTP → password → PIN`}
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
              placeholder="email, mobile, lokesh, or nexus-root"
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
            <LoginBackButton
              onClick={() => {
                clearError();
                setMobileOtp("");
                setStep("identifier");
              }}
            />
            <p className="text-sm text-muted-foreground">
              Enter OTP (mobile) sent to {maskedMobile || "mobile"}
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

        {step === "password" && (
          <form onSubmit={onPassword} className="mt-6 space-y-3">
            <LoginBackButton
              onClick={() => {
                clearError();
                setPassword("");
                setStep("mobile_otp");
              }}
            />
            <label className="block text-xs font-medium">Password</label>
            <input
              type="password"
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) clearError();
              }}
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
              onClick={startForgotPassword}
              className="h-10 w-full text-sm text-muted-foreground underline"
            >
              Forgotten password?
            </button>
          </form>
        )}

        {step === "pin" && (
          <form onSubmit={onPin} className="mt-6 space-y-3">
            <LoginBackButton
              onClick={() => {
                clearError();
                setPin("");
                setStep("password");
              }}
            />
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

        {step === "forgot_password_ids" && (
          <form onSubmit={onForgotPasswordIds} className="mt-6 space-y-3">
            <LoginBackButton
              onClick={() => {
                clearError();
                setStep("password");
              }}
            />
            <p className="text-sm text-muted-foreground">
              Enter mobile number to reset password.
            </p>
            <input
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={resetMobile}
              onChange={(e) => setResetMobile(e.target.value)}
              placeholder="Mobile number"
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground"
            >
              Send OTP
            </button>
          </form>
        )}

        {step === "forgot_password_mobile_otp" && (
          <form onSubmit={onForgotPasswordMobileOtp} className="mt-6 space-y-3">
            <LoginBackButton
              onClick={() => {
                clearError();
                setMobileOtp("");
                setStep("forgot_password_ids");
              }}
            />
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

        {step === "forgot_password_set" && (
          <form onSubmit={onForgotPasswordSet} className="mt-6 space-y-3">
            <LoginBackButton
              onClick={() => {
                clearError();
                setStep("forgot_password_mobile_otp");
              }}
            />
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
            <LoginBackButton
              onClick={() => {
                clearError();
                setStep("pin");
              }}
            />
            <p className="text-sm text-muted-foreground">
              Enter mobile number to reset PIN.
            </p>
            <input
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={resetMobile}
              onChange={(e) => setResetMobile(e.target.value)}
              placeholder="Mobile number"
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground"
            >
              Send OTP
            </button>
          </form>
        )}

        {step === "forgot_pin_mobile_otp" && (
          <form onSubmit={onForgotPinMobileOtp} className="mt-6 space-y-3">
            <LoginBackButton
              onClick={() => {
                clearError();
                setMobileOtp("");
                setStep("forgot_pin_ids");
              }}
            />
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

        {step === "forgot_pin_set" && (
          <form onSubmit={onForgotPinSet} className="mt-6 space-y-3">
            <LoginBackButton
              onClick={() => {
                clearError();
                setStep("forgot_pin_mobile_otp");
              }}
            />
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
