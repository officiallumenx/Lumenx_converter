/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — Forgot Password
 *  Email → Email OTP → Mobile OTP → New Password
 * ───────────────────────────────────────────────────────────── */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, ArrowRight, Lock } from "lucide-react";

import { AuthFormError } from "@/auth/components/AuthFormError";
import { AuthSuccessScreen } from "@/auth/components/AuthSuccessScreen";
import { PasswordStrength } from "@/auth/components/PasswordStrength";
import { RecoveryLayout } from "@/auth/components/RecoveryLayout";
import { RecoveryOtpStep } from "@/auth/components/RecoveryOtpStep";
import { validateForgotPassword, hasErrors, getPasswordErrors } from "@/auth/validation";
import { maskEmail, maskMobile } from "@/auth/otp-service";
import {
  loadRecoveryFlow,
  saveRecoveryFlow,
  clearRecoveryFlow,
  initRecoveryFlow,
  updateRecoveryFlow,
  type RecoveryStep,
} from "@/auth/recovery-flow-store";
import { mockLookupAccountByEmail, mockResetPassword } from "@/auth/recovery-service";
import type { ForgotPasswordFormErrors } from "@/auth/types";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot Password — LumenX Admin" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const existing = loadRecoveryFlow();
  const initialStep: RecoveryStep =
    existing?.type === "forgot_password" ? existing.step : "identify";

  const [step, setStep] = useState<RecoveryStep>(initialStep);
  const [flow, setFlow] = useState(() =>
    existing?.type === "forgot_password" ? existing : null,
  );

  const [email, setEmail] = useState(flow?.email ?? "");
  const [errors, setErrors] = useState<ForgotPasswordFormErrors>({});
  const [loading, setLoading] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetErrors, setResetErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  const goTo = (next: RecoveryStep, nextFlow = flow) => {
    setStep(next);
    if (nextFlow) {
      const updated = { ...nextFlow, step: next };
      saveRecoveryFlow(updated);
      setFlow(updated);
    }
  };

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateForgotPassword({ email });
    if (hasErrors(errs)) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const account = await mockLookupAccountByEmail(email);
      const nextFlow = initRecoveryFlow("forgot_password", {
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flow) return;
    const errs: { password?: string; confirmPassword?: string } = {};
    const pwdErrs = getPasswordErrors(password);
    if (!password) errs.password = "Password is required";
    else if (pwdErrs.length) errs.password = pwdErrs[0];
    if (!confirmPassword) errs.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) errs.confirmPassword = "Passwords do not match";
    if (hasErrors(errs)) { setResetErrors(errs); return; }

    setResetErrors({});
    setLoading(true);
    try {
      await mockResetPassword(flow.email, password);
      clearRecoveryFlow();
      setStep("complete");
    } catch (err) {
      setResetErrors({ password: (err as Error).message });
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
      <RecoveryLayout type="forgot_password" currentStep="reset" title="Password updated">
        <AuthSuccessScreen
          title="Password reset successful"
          description="Your new password is active. Sign in with your email or mobile number and the new password."
        >
          <Link to="/login">
            <AuthButton>
              Continue to sign in <ArrowRight className="size-4" />
            </AuthButton>
          </Link>
        </AuthSuccessScreen>
      </RecoveryLayout>
    );
  }

  if (step === "email_otp" && flow) {
    return (
      <RecoveryLayout
        type="forgot_password"
        currentStep="email_otp"
        title="Verify your email"
        subtitle="Enter the 6-digit code sent to your registered email"
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
        type="forgot_password"
        currentStep="mobile_otp"
        title="Verify your mobile"
        subtitle="Enter the 6-digit code sent to your registered mobile number"
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
    return (
      <RecoveryLayout
        type="forgot_password"
        currentStep="reset"
        title="Create new password"
        subtitle={`Set a new password for ${flow.userName}`}
        onBack={handleBackFromOtp}
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <AuthInput
            label="New password"
            name="password"
            type="password"
            icon={Lock}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (resetErrors.password) setResetErrors((p) => ({ ...p, password: undefined }));
            }}
            error={resetErrors.password}
            required
          />
          <PasswordStrength password={password} />
          <AuthInput
            label="Confirm password"
            name="confirmPassword"
            type="password"
            icon={Lock}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (resetErrors.confirmPassword) setResetErrors((p) => ({ ...p, confirmPassword: undefined }));
            }}
            error={resetErrors.confirmPassword}
            required
          />
          <AuthButton type="submit" loading={loading}>
            Reset password <ArrowRight className="size-4" />
          </AuthButton>
        </form>
      </RecoveryLayout>
    );
  }

  return (
    <RecoveryLayout
      type="forgot_password"
      currentStep="identify"
      title="Forgot your password?"
      subtitle="Enter your registered email to begin secure recovery"
      backTo="/login"
    >
      <form onSubmit={handleIdentify} className="space-y-4">
        <AuthInput
          label="Email address"
          name="email"
          type="email"
          icon={Mail}
          placeholder="admin@institute.edu"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email || errors.general) setErrors({});
          }}
          error={errors.email}
          hint="Must match the email on your LumenX Admin account"
          required
        />
        {errors.general && <AuthFormError message={errors.general} />}
        <AuthButton type="submit" loading={loading}>
          Continue <ArrowRight className="size-4" />
        </AuthButton>
        <Link to="/login">
          <AuthButton type="button" variant="outline">Back to sign in</AuthButton>
        </Link>
      </form>
    </RecoveryLayout>
  );
}
