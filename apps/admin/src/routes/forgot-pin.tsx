/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — Forgot PIN
 *  Login → Email OTP → Mobile OTP → New PIN
 * ───────────────────────────────────────────────────────────── */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AtSign, Lock, ArrowRight, ShieldCheck } from "lucide-react";

import { AuthInput } from "@/auth/components/AuthInput";
import { AuthButton } from "@/auth/components/AuthButton";
import { AuthFormError } from "@/auth/components/AuthFormError";
import { AuthSuccessScreen } from "@/auth/components/AuthSuccessScreen";
import { PinInput } from "@/auth/components/PinInput";
import { RecoveryLayout } from "@/auth/components/RecoveryLayout";
import { RecoveryOtpStep } from "@/auth/components/RecoveryOtpStep";
import {
  validateSignIn,
  hasErrors,
  isValidLoginIdentifier,
} from "@/auth/validation";
import { maskEmail, maskMobile } from "@/auth/otp-service";
import {
  loadRecoveryFlow,
  saveRecoveryFlow,
  clearRecoveryFlow,
  initRecoveryFlow,
  updateRecoveryFlow,
  type RecoveryStep,
} from "@/auth/recovery-flow-store";
import { mockVerifyRecoveryLogin, mockResetPin } from "@/auth/recovery-service";
import type { SignInFormErrors } from "@/auth/types";

export const Route = createFileRoute("/forgot-pin")({
  head: () => ({ meta: [{ title: "Forgot PIN — LumenX Admin" }] }),
  component: ForgotPinPage,
});

function ForgotPinPage() {
  const existing = loadRecoveryFlow();
  const initialStep: RecoveryStep =
    existing?.type === "forgot_pin" ? existing.step : "identify";

  const [step, setStep] = useState<RecoveryStep>(initialStep);
  const [flow, setFlow] = useState(() =>
    existing?.type === "forgot_pin" ? existing : null,
  );

  const [identifier, setIdentifier] = useState(flow?.email ?? "");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<SignInFormErrors>({});
  const [loading, setLoading] = useState(false);

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [resetErrors, setResetErrors] = useState<{ pin?: string; confirmPin?: string }>({});

  const goTo = (next: RecoveryStep) => {
    setStep(next);
    if (flow) {
      const updated = { ...flow, step: next };
      saveRecoveryFlow(updated);
      setFlow(updated);
    }
  };

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateSignIn({ identifier, password, rememberMe: false });
    if (hasErrors(errs)) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const account = await mockVerifyRecoveryLogin(identifier, password);
      const nextFlow = initRecoveryFlow("forgot_pin", {
        email: account.email,
        mobile: account.user.phone ?? "",
        userId: account.user.id,
        userName: account.user.name,
      });
      setFlow(nextFlow);
      setStep("email_otp");
    } catch (err) {
      setErrors({ general: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flow) return;
    const errs: { pin?: string; confirmPin?: string } = {};
    if (!pin || pin.length < 6) errs.pin = "PIN must be exactly 6 digits";
    else if (!/^\d{6}$/.test(pin)) errs.pin = "PIN must contain only digits";
    if (!confirmPin) errs.confirmPin = "Please confirm your PIN";
    else if (pin !== confirmPin) errs.confirmPin = "PINs do not match";
    if (hasErrors(errs)) { setResetErrors(errs); return; }

    setResetErrors({});
    setLoading(true);
    try {
      await mockResetPin(flow.userId, pin);
      clearRecoveryFlow();
      setStep("complete");
    } catch (err) {
      setResetErrors({ pin: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleBackFromOtp = () => {
    if (step === "email_otp") {
      clearRecoveryFlow();
      setFlow(null);
      setStep("identify");
    } else if (step === "mobile_otp") {
      goTo("email_otp");
    } else if (step === "reset") {
      goTo("mobile_otp");
    }
  };

  if (step === "complete") {
    return (
      <RecoveryLayout type="forgot_pin" currentStep="reset" title="PIN updated">
        <AuthSuccessScreen
          title="Security PIN reset successful"
          description="Your new 6-digit PIN is active. Use it the next time you open LumenX Admin."
        >
          <Link to="/login">
            <AuthButton>
              Continue to login <ArrowRight className="size-4" />
            </AuthButton>
          </Link>
        </AuthSuccessScreen>
      </RecoveryLayout>
    );
  }

  if (step === "email_otp" && flow) {
    return (
      <RecoveryLayout
        type="forgot_pin"
        currentStep="email_otp"
        title="Verify your email"
        subtitle="Confirm your identity with the code sent to your email"
        onBack={handleBackFromOtp}
      >
        <RecoveryOtpStep
          channel="email"
          destination={flow.email}
          maskedDestination={maskEmail(flow.email)}
          onVerified={() => {
            const next = updateRecoveryFlow({ emailVerified: true, step: "mobile_otp" });
            if (next) setFlow(next);
            setStep("mobile_otp");
          }}
          onBack={handleBackFromOtp}
        />
      </RecoveryLayout>
    );
  }

  if (step === "mobile_otp" && flow) {
    return (
      <RecoveryLayout
        type="forgot_pin"
        currentStep="mobile_otp"
        title="Verify your mobile"
        subtitle="Enter the code sent to your registered mobile number"
        onBack={handleBackFromOtp}
      >
        <RecoveryOtpStep
          channel="mobile"
          destination={flow.mobile}
          maskedDestination={maskMobile(flow.mobile)}
          onVerified={() => {
            const next = updateRecoveryFlow({ mobileVerified: true, step: "reset" });
            if (next) setFlow(next);
            setStep("reset");
          }}
          onBack={handleBackFromOtp}
        />
      </RecoveryLayout>
    );
  }

  if (step === "reset" && flow) {
    const pinMatch = pin.length === 6 && confirmPin.length === 6 && pin === confirmPin;
    return (
      <RecoveryLayout
        type="forgot_pin"
        currentStep="reset"
        title="Create new security PIN"
        subtitle={`Set a new 6-digit PIN for ${flow.userName}`}
        onBack={handleBackFromOtp}
      >
        <form onSubmit={handleResetPin} className="space-y-5">
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-border/50 bg-muted/30">
            <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Choose a PIN you haven't used before. You'll need it every time you open the app.
            </p>
          </div>

          <PinInput
            label="New 6-digit security PIN"
            value={pin}
            onChange={(v) => {
              setPin(v);
              if (resetErrors.pin) setResetErrors((p) => ({ ...p, pin: undefined }));
            }}
            error={resetErrors.pin}
            required
            autoFocus
          />
          <PinInput
            label="Confirm 6-digit security PIN"
            value={confirmPin}
            onChange={(v) => {
              setConfirmPin(v);
              if (resetErrors.confirmPin) setResetErrors((p) => ({ ...p, confirmPin: undefined }));
            }}
            error={resetErrors.confirmPin}
            hint={pinMatch ? "PINs match" : undefined}
            required
          />

          {pin.length === 6 && confirmPin.length === 6 && (
            <p className={`text-[11px] ${pinMatch ? "text-emerald-600" : "text-destructive"}`}>
              {pinMatch ? "✓ PINs match" : "PINs do not match"}
            </p>
          )}

          <AuthButton type="submit" loading={loading}>
            Reset security PIN <ArrowRight className="size-4" />
          </AuthButton>
        </form>
      </RecoveryLayout>
    );
  }

  const identifierHint = identifier.trim()
    ? isValidLoginIdentifier(identifier.trim()) ? "Account found format valid" : ""
    : "Use email or mobile registered with your account";

  return (
    <RecoveryLayout
      type="forgot_pin"
      currentStep="identify"
      title="Forgot your security PIN?"
      subtitle="Login with your email or mobile and password to verify your identity"
      backTo="/login"
    >
      <form onSubmit={handleIdentify} className="space-y-4">
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-primary/20 bg-primary/[0.04]">
          <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            For security, you must verify your account password before resetting your PIN.
          </p>
        </div>

        <AuthInput
          label="Email or mobile number"
          name="identifier"
          type="text"
          icon={AtSign}
          placeholder="admin@institute.edu or +91 98765 43210"
          value={identifier}
          onChange={(e) => {
            setIdentifier(e.target.value);
            if (errors.identifier || errors.general) setErrors({});
          }}
          error={errors.identifier}
          hint={identifierHint}
          required
        />
        <AuthInput
          label="Password"
          name="password"
          type="password"
          icon={Lock}
          placeholder="Enter your account password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password || errors.general) setErrors({});
          }}
          error={errors.password}
          required
        />

        {errors.general && <AuthFormError message={errors.general} />}

        <AuthButton type="submit" loading={loading}>
          Verify &amp; continue <ArrowRight className="size-4" />
        </AuthButton>
        <Link to="/login">
          <AuthButton type="button" variant="outline">Back to login</AuthButton>
        </Link>
      </form>
    </RecoveryLayout>
  );
}
