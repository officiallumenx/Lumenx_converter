import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, AtSign, Building2, Check, ChevronDown, Lock, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";

import { useAuth } from "@/auth/AuthContext";
import { AuthLayout } from "@/auth/components/AuthLayout";
import { AuthInput } from "@/auth/components/AuthInput";
import { AuthButton } from "@/auth/components/AuthButton";
import { AuthFormError } from "@/auth/components/AuthFormError";
import { DemoOtpHint } from "@/auth/components/DemoOtpHint";
import { OtpInput } from "@/auth/components/OtpInput";
import {
  completeStaffPasswordReset,
  completeStaffPinReset,
  listStaffLoginInstitutes,
  requestStaffLoginOtp,
  requestStaffPasswordResetOtp,
  requestStaffPinResetOtp,
  resolveStaffLoginMode,
  verifyStaffChannelOtp,
  verifyStaffPasswordResetOtp,
  verifyStaffPinResetOtp,
  type StaffLoginInstituteDto,
} from "@/lib/access-roles";
import { isInstituteUuid } from "@/lib/active-institute";
import { cn } from "@lumenx/ui";

function isInstituteLogoUrl(value: string | null | undefined): boolean {
  const v = value?.trim() ?? "";
  return (
    v.startsWith("data:image/") ||
    v.startsWith("https://") ||
    v.startsWith("http://")
  );
}

function LoginInstituteMark({
  name,
  logoUrl,
  size = "sm",
}: {
  name: string;
  logoUrl?: string | null;
  size?: "sm" | "md";
}) {
  const dim = size === "md" ? "size-7" : "size-6";
  if (isInstituteLogoUrl(logoUrl)) {
    return (
      <span
        className={cn(
          dim,
          "shrink-0 overflow-hidden rounded-md border border-border/80 bg-background",
        )}
      >
        <img src={logoUrl!} alt="" className="size-full object-cover" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        dim,
        "flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/80 bg-muted/40",
      )}
      title={name}
    >
      <Building2 className="size-3.5 text-muted-foreground" aria-hidden />
    </span>
  );
}

/**
 * Admin root + operator notebook login:
 *   first: institute → id → OTP → password → PIN
 *   return: institute → id → password → PIN
 * Recovery branches for forgotten password / PIN.
 * Server OTP only (StartMessaging / Resend).
 */
type LoginStep =
  | "institute"
  | "identifier"
  | "mobile_otp"
  | "email_otp"
  | "password"
  | "pin"
  | "forgot_password_ids"
  | "forgot_password_mobile_otp"
  | "forgot_password_email_otp"
  | "forgot_password_set"
  | "forgot_pin_ids"
  | "forgot_pin_mobile_otp"
  | "forgot_pin_email_otp"
  | "forgot_pin_set";

const INSTITUTE_STORAGE_KEY = "lx_admin_login_institute_id";

function isApiIdentifierValid(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  const digits = trimmed.replace(/\D/g, "");
  // Allow 10-digit or +91… forms — API canonicalizes to last 10 digits.
  if (digits.length >= 10 && /^\d{10}$/.test(digits.slice(-10))) return true;
  return /^[a-zA-Z0-9._-]{3,64}$/.test(trimmed);
}

export function AdminLoginFlow() {
  const navigate = useNavigate();
  const { signInWithStaffOtp, signInWithStaffPassword, clearError } = useAuth();

  const [step, setStep] = useState<LoginStep>("institute");
  const [institutes, setInstitutes] = useState<StaffLoginInstituteDto[]>([]);
  const [institutesLoading, setInstitutesLoading] = useState(false);
  const [institutePickerOpen, setInstitutePickerOpen] = useState(false);
  const [instituteId, setInstituteId] = useState(() => {
    try {
      return localStorage.getItem(INSTITUTE_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [requiresOtp, setRequiresOtp] = useState(true);
  const [requiresDualOtp, setRequiresDualOtp] = useState(false);
  const [maskedDestination, setMaskedDestination] = useState("");
  const [maskedEmailDestination, setMaskedEmailDestination] = useState("");
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const [devEmailOtp, setDevEmailOtp] = useState<string | undefined>();
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginMobileGrant, setLoginMobileGrant] = useState("");
  const [loginEmailGrant, setLoginEmailGrant] = useState("");
  const [resetMobileGrant, setResetMobileGrant] = useState("");
  const [resetEmailGrant, setResetEmailGrant] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const institutePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!institutePickerOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const root = institutePickerRef.current;
      if (root && !root.contains(event.target as Node)) {
        setInstitutePickerOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInstitutePickerOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [institutePickerOpen]);

  useEffect(() => {
    let cancelled = false;
    setInstitutesLoading(true);
    void listStaffLoginInstitutes()
      .then((rows) => {
        if (!cancelled) setInstitutes(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setInstitutes([]);
          setError(
            err instanceof Error
              ? `Could not load institutes: ${err.message}`
              : "Could not load institutes. Try again.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setInstitutesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedInstitute = institutes.find((row) => row.id === instituteId);

  const handleInstitute = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const id = instituteId.trim();
    if (!isInstituteUuid(id)) {
      setError("Select your institute to continue.");
      return;
    }
    try {
      localStorage.setItem(INSTITUTE_STORAGE_KEY, id);
    } catch {
      // ignore
    }
    setStep("identifier");
  };

  const handleIdentifier = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    clearError();

    if (!isApiIdentifierValid(identifier)) {
      setError("Enter a registered email, username, or an exact 10-digit mobile number.");
      return;
    }
    setLoading(true);
    try {
      const mode = await resolveStaffLoginMode({
        instituteId: instituteId.trim(),
        identifier: identifier.trim(),
      });
      setDisplayName(mode.displayName);
      setRequiresOtp(Boolean(mode.requiresOtp));
      // Mobile server OTP + password is enough.
      // Email OTP needs Resend; skip until OTP_EMAIL_PROVIDER is fully configured.
      setRequiresDualOtp(false);
      setLoginMobileGrant("");
      setLoginEmailGrant("");
      if (mode.requiresOtp) {
        const mobile = await requestStaffLoginOtp({
          instituteId: instituteId.trim(),
          identifier: identifier.trim(),
          channel: "mobile",
        });
        setMaskedDestination(mobile.maskedDestination);
        setDevOtp(mobile.devOtp);
        setStep("mobile_otp");
      } else {
        setStep("password");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to continue sign-in.");
    } finally {
      setLoading(false);
    }
  };

  const handleApiMobileOtpContinue = async (
    event?: React.FormEvent,
    code?: string,
  ) => {
    event?.preventDefault();
    const otpValue = (code ?? mobileOtp).replace(/\D/g, "").slice(0, 6);
    if (otpValue.length !== 6) {
      setError("Enter the 6-digit mobile code.");
      return;
    }
    setMobileOtp(otpValue);
    setError(null);
    setLoading(true);
    try {
      const mobileVerified = await verifyStaffChannelOtp({
        instituteId: instituteId.trim(),
        identifier: identifier.trim(),
        channel: "mobile",
        otp: otpValue,
      });
      setLoginMobileGrant(mobileVerified.grant);
      // Never request email OTP here — Resend is optional; mobile grant + password is enough.
      setStep("password");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to continue after mobile OTP.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApiEmailOtpContinue = async (
    event?: React.FormEvent,
    code?: string,
  ) => {
    event?.preventDefault();
    const otpValue = (code ?? emailOtp).replace(/\D/g, "").slice(0, 6);
    if (otpValue.length !== 6) {
      setError("Enter the 6-digit email code.");
      return;
    }
    setEmailOtp(otpValue);
    setError(null);
    setLoading(true);
    try {
      const emailVerified = await verifyStaffChannelOtp({
        instituteId: instituteId.trim(),
        identifier: identifier.trim(),
        channel: "email",
        otp: otpValue,
      });
      setLoginEmailGrant(emailVerified.grant);
      setPassword("");
      setStep("password");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Invalid email OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handlePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password.trim()) {
      setError("Enter your password.");
      return;
    }
    setPin("");
    setStep("pin");
  };

  const handlePin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{4,8}$/.test(pin.trim())) {
      setError("Enter your 4–8 digit PIN.");
      return;
    }
    if (!password.trim()) {
      setError("Enter your password before the PIN step.");
      setStep("password");
      return;
    }
    setLoading(true);
    setError(null);
    clearError();
    try {
      if (requiresOtp) {
        if (!loginMobileGrant) {
          throw new Error("Verify the mobile OTP before continuing.");
        }
        if (requiresDualOtp && !loginEmailGrant) {
          throw new Error("Verify the email OTP before continuing.");
        }
        await signInWithStaffOtp({
          instituteId: instituteId.trim(),
          identifier: identifier.trim(),
          mobileOtpGrant: loginMobileGrant || undefined,
          emailOtpGrant: loginEmailGrant || undefined,
          password,
          pin: pin.trim(),
          remember: rememberMe,
        });
      } else {
        await signInWithStaffPassword({
          instituteId: instituteId.trim(),
          identifier: identifier.trim(),
          password,
          pin: pin.trim(),
          remember: rememberMe,
        });
      }
      navigate({ to: "/", replace: true });
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : "PIN verification failed.";
      if (/incorrect password/i.test(message)) {
        setError("Incorrect password. Enter it again, then your PIN.");
        setPassword("");
        setStep("password");
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const startForgotPassword = () => {
    setError(null);
    setResetMobileGrant("");
    setResetEmailGrant("");
    setNewPassword("");
    setConfirmPassword("");
    setStep("forgot_password_ids");
  };

  const startForgotPin = () => {
    setError(null);
    setResetMobileGrant("");
    setResetEmailGrant("");
    setNewPin("");
    setConfirmPin("");
    setStep("forgot_pin_ids");
  };

  const onForgotPasswordIds = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const mobile = await requestStaffPasswordResetOtp({
        instituteId: instituteId.trim(),
        identifier: identifier.trim(),
        channel: "mobile",
      });
      setMaskedDestination(mobile.maskedDestination);
      setDevOtp(mobile.devOtp);
      setMobileOtp("");
      setStep("forgot_password_mobile_otp");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to start password reset.");
    } finally {
      setLoading(false);
    }
  };

  const onForgotPasswordMobileOtp = async (
    event?: React.FormEvent,
    code?: string,
  ) => {
    event?.preventDefault();
    const otpValue = (code ?? mobileOtp).replace(/\D/g, "").slice(0, 6);
    if (otpValue.length !== 6) {
      setError("Enter the 6-digit mobile code.");
      return;
    }
    setMobileOtp(otpValue);
    setError(null);
    setLoading(true);
    try {
      const verified = await verifyStaffPasswordResetOtp({
        instituteId: instituteId.trim(),
        identifier: identifier.trim(),
        channel: "mobile",
        otp: otpValue,
      });
      setResetMobileGrant(verified.grant);
      // Mobile OTP is enough until Resend email OTP is configured.
      setResetEmailGrant("firebase-email-skipped");
      setNewPassword("");
      setConfirmPassword("");
      setStep("forgot_password_set");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Mobile OTP failed.");
    } finally {
      setLoading(false);
    }
  };

  const onForgotPasswordEmailOtp = async (
    event?: React.FormEvent,
    code?: string,
  ) => {
    event?.preventDefault();
    const otpValue = (code ?? emailOtp).replace(/\D/g, "").slice(0, 6);
    if (otpValue.length !== 6) {
      setError("Enter the 6-digit email code.");
      return;
    }
    setEmailOtp(otpValue);
    setError(null);
    setLoading(true);
    try {
      const verified = await verifyStaffPasswordResetOtp({
        instituteId: instituteId.trim(),
        identifier: identifier.trim(),
        channel: "email",
        otp: otpValue,
      });
      setResetEmailGrant(verified.grant);
      setStep("forgot_password_set");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Email OTP failed.");
    } finally {
      setLoading(false);
    }
  };

  const onForgotPasswordSet = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (newPassword.length < 8) throw new Error("Password must be at least 8 characters.");
      if (newPassword !== confirmPassword) throw new Error("Passwords do not match.");
      await completeStaffPasswordReset({
        instituteId: instituteId.trim(),
        identifier: identifier.trim(),
        mobileOtpGrant: resetMobileGrant,
        emailOtpGrant: resetEmailGrant,
        newPassword,
      });
      setPassword(newPassword);
      setRequiresOtp(false);
      setPin("");
      setError("Password updated. Enter your PIN to finish signing in.");
      setStep("pin");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to set password.");
    } finally {
      setLoading(false);
    }
  };

  const onForgotPinIds = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const mobile = await requestStaffPinResetOtp({
        instituteId: instituteId.trim(),
        identifier: identifier.trim(),
        channel: "mobile",
      });
      setMaskedDestination(mobile.maskedDestination);
      setDevOtp(mobile.devOtp);
      setMobileOtp("");
      setStep("forgot_pin_mobile_otp");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to start PIN reset.");
    } finally {
      setLoading(false);
    }
  };

  const onForgotPinMobileOtp = async (
    event?: React.FormEvent,
    code?: string,
  ) => {
    event?.preventDefault();
    const otpValue = (code ?? mobileOtp).replace(/\D/g, "").slice(0, 6);
    if (otpValue.length !== 6) {
      setError("Enter the 6-digit mobile code.");
      return;
    }
    setMobileOtp(otpValue);
    setError(null);
    setLoading(true);
    try {
      const verified = await verifyStaffPinResetOtp({
        instituteId: instituteId.trim(),
        identifier: identifier.trim(),
        channel: "mobile",
        otp: otpValue,
      });
      setResetMobileGrant(verified.grant);
      // Mobile OTP is enough until Resend email OTP is configured.
      setResetEmailGrant("firebase-email-skipped");
      setNewPin("");
      setConfirmPin("");
      setStep("forgot_pin_set");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Mobile OTP failed.");
    } finally {
      setLoading(false);
    }
  };

  const onForgotPinEmailOtp = async (
    event?: React.FormEvent,
    code?: string,
  ) => {
    event?.preventDefault();
    const otpValue = (code ?? emailOtp).replace(/\D/g, "").slice(0, 6);
    if (otpValue.length !== 6) {
      setError("Enter the 6-digit email code.");
      return;
    }
    setEmailOtp(otpValue);
    setError(null);
    setLoading(true);
    try {
      const verified = await verifyStaffPinResetOtp({
        instituteId: instituteId.trim(),
        identifier: identifier.trim(),
        channel: "email",
        otp: otpValue,
      });
      setResetEmailGrant(verified.grant);
      setStep("forgot_pin_set");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Email OTP failed.");
    } finally {
      setLoading(false);
    }
  };

  const onForgotPinSet = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!/^\d{4,8}$/.test(newPin.trim())) throw new Error("PIN must be 4–8 digits.");
      if (newPin !== confirmPin) throw new Error("PINs do not match.");
      await completeStaffPinReset({
        instituteId: instituteId.trim(),
        identifier: identifier.trim(),
        mobileOtpGrant: resetMobileGrant,
        emailOtpGrant: resetEmailGrant,
        newPin: newPin.trim(),
      });
      const nextPin = newPin.trim();
      setPin(nextPin);
      setRequiresOtp(false);

      // Diagram: set PIN → enter PIN → dashboard. Prefer immediate login when
      // password was already collected earlier in this session.
      if (password.trim()) {
        try {
          await signInWithStaffPassword({
            instituteId: instituteId.trim(),
            identifier: identifier.trim(),
            password,
            pin: nextPin,
            remember: rememberMe,
          });
          navigate({ to: "/", replace: true });
          return;
        } catch (loginErr) {
          const message =
            loginErr instanceof Error ? loginErr.message : "Unable to sign in.";
          // Password may be stale after recovery — collect it again, then PIN.
          if (/password/i.test(message)) {
            setError("PIN updated. Enter your password again, then your new PIN.");
            setPassword("");
            setStep("password");
            return;
          }
          throw loginErr;
        }
      }

      setError("PIN updated. Enter your password, then confirm with your new PIN.");
      setStep("password");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to set PIN.");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setError(null);
    if (step === "pin") {
      setPin("");
      setStep("password");
      return;
    }
    if (step === "password") {
      setPassword("");
      if (requiresDualOtp) setStep("email_otp");
      else if (requiresOtp) setStep("mobile_otp");
      else setStep("identifier");
      return;
    }
    if (step === "email_otp" || step === "forgot_password_email_otp" || step === "forgot_pin_email_otp") {
      setEmailOtp("");
      setStep(
        step === "email_otp"
          ? "mobile_otp"
          : step === "forgot_password_email_otp"
            ? "forgot_password_mobile_otp"
            : "forgot_pin_mobile_otp",
      );
      return;
    }
    if (step === "mobile_otp") {
      setMobileOtp("");
      setDevOtp(undefined);
      setStep("identifier");
      return;
    }
    if (step.startsWith("forgot_")) {
      setStep("password");
      return;
    }
    if (step === "identifier") {
      setIdentifier("");
      setRequiresOtp(true);
      setRequiresDualOtp(false);
      setStep("institute");
    }
  };

  const stepLabels: LoginStep[] = requiresDualOtp
    ? ["institute", "identifier", "mobile_otp", "email_otp", "password", "pin"]
    : requiresOtp
      ? ["institute", "identifier", "mobile_otp", "password", "pin"]
      : ["institute", "identifier", "password", "pin"];

  const visibleSteps = stepLabels.filter((item) => !item.startsWith("forgot_"));
  const showProgress = visibleSteps.includes(step as (typeof visibleSteps)[number]);

  return (
    <AuthLayout
      title={
        step === "institute"
          ? "Sign in"
          : step === "identifier"
            ? "Your ID"
            : step === "mobile_otp" || step === "email_otp"
              ? "Enter code"
              : step === "password"
                ? "Password"
                : step === "pin"
                  ? "PIN"
                  : step.startsWith("forgot_password")
                    ? "Reset password"
                    : step.startsWith("forgot_pin")
                      ? "Reset PIN"
                      : "Sign in"
      }
      subtitle={
        step === "institute"
          ? "Choose your institute"
          : step === "identifier"
            ? "Username, email, or mobile"
            : step === "mobile_otp"
              ? maskedDestination
                ? `Sent to ${maskedDestination}`
                : undefined
              : step === "email_otp"
                ? maskedEmailDestination
                  ? `Sent to ${maskedEmailDestination}`
                  : undefined
                : step === "password"
                  ? displayName || undefined
                  : step === "pin"
                    ? "Unlock Admin"
                    : undefined
      }
      showBack={step === "institute"}
      backTo="/welcome"
      backLabel="Back"
      footer={
        step === "institute" ? (
          <>
            New institute?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Register
            </Link>
          </>
        ) : undefined
      }
    >
      {showProgress && (
        <div
          className="mb-5 h-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={visibleSteps.length}
          aria-valuenow={Math.max(1, visibleSteps.indexOf(step) + 1)}
          aria-label={`Step ${Math.max(1, visibleSteps.indexOf(step) + 1)} of ${visibleSteps.length}`}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{
              width: `${
                visibleSteps.length <= 0
                  ? 0
                  : ((Math.max(0, visibleSteps.indexOf(step)) + 1) /
                      visibleSteps.length) *
                    100
              }%`,
            }}
          />
        </div>
      )}

      {step === "institute" && (
        <form onSubmit={handleInstitute} className="space-y-4" noValidate>
          <div>
            <label
              id="institute-picker-label"
              className="mb-1.5 block text-xs font-medium text-foreground"
            >
              Institute
            </label>
            <div className="relative" ref={institutePickerRef}>
              <button
                type="button"
                id="instituteId"
                aria-labelledby="institute-picker-label"
                aria-haspopup="listbox"
                aria-expanded={institutePickerOpen}
                disabled={institutesLoading}
                onClick={() => setInstitutePickerOpen((open) => !open)}
                className={cn(
                  "flex h-11 w-full items-center gap-2.5 rounded-md border border-input bg-background px-2.5 text-left text-sm shadow-sm transition-colors",
                  "hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  institutePickerOpen && "ring-2 ring-ring",
                  institutesLoading && "opacity-60",
                )}
              >
                <LoginInstituteMark
                  name={selectedInstitute?.name ?? "Institute"}
                  logoUrl={selectedInstitute?.logoUrl}
                />
                <span className="min-w-0 flex-1 truncate">
                  {institutesLoading
                    ? "Loading institutes…"
                    : selectedInstitute
                      ? `${selectedInstitute.name} · ${selectedInstitute.code}`
                      : "Select institute"}
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform",
                    institutePickerOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>

              {institutePickerOpen && !institutesLoading ? (
                <ul
                  role="listbox"
                  aria-labelledby="institute-picker-label"
                  className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-60 overflow-auto rounded-md border border-border bg-popover py-1 shadow-md"
                >
                  {institutes.length === 0 ? (
                    <li className="px-3 py-2 text-xs text-muted-foreground">
                      No institutes available
                    </li>
                  ) : (
                    institutes.map((institute) => {
                      const selected = institute.id === instituteId;
                      return (
                        <li key={institute.id} role="presentation">
                          <button
                            type="button"
                            role="option"
                            aria-selected={selected}
                            className={cn(
                              "flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-sm hover:bg-muted",
                              selected && "bg-primary/10",
                            )}
                            onClick={() => {
                              setInstituteId(institute.id);
                              setError(null);
                              setInstitutePickerOpen(false);
                            }}
                          >
                            <LoginInstituteMark
                              name={institute.name}
                              logoUrl={institute.logoUrl}
                              size="md"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-foreground">
                                {institute.name}
                              </span>
                              <span className="block truncate text-[11px] text-muted-foreground">
                                {institute.code}
                              </span>
                            </span>
                            {selected ? (
                              <Check className="size-4 shrink-0 text-primary" aria-hidden />
                            ) : null}
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              ) : null}
            </div>
            {selectedInstitute ? (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {selectedInstitute.kind} · code {selectedInstitute.code}
              </p>
            ) : null}
          </div>
          {error && <AuthFormError message={error} />}
          <AuthButton type="submit" disabled={institutesLoading || !instituteId}>
            Continue
            <ArrowRight className="size-4" />
          </AuthButton>
        </form>
      )}

      {step === "identifier" && (
        <form onSubmit={handleIdentifier} className="space-y-4" noValidate>
          <AuthInput
            label="Username, email, or mobile"
            name="identifier"
            type="text"
            icon={AtSign}
            placeholder="username, name@institute.edu or 9876543210"
            value={identifier}
            onChange={(event) => {
              setIdentifier(event.target.value);
              setError(null);
            }}
            autoComplete="username"
            required
          />
          {error && <AuthFormError message={error} />}
          <AuthButton type="submit" loading={loading}>
            Continue
            <ArrowRight className="size-4" />
          </AuthButton>
          <AuthButton variant="outline" onClick={goBack}>
            <ArrowLeft className="size-4" /> Change institute
          </AuthButton>
        </form>
      )}

      {step === "mobile_otp" && requiresOtp && (
        <form onSubmit={handleApiMobileOtpContinue} className="space-y-4" noValidate>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Mobile OTP{maskedDestination ? ` (${maskedDestination})` : ""}
            </p>
            <OtpInput
              value={mobileOtp}
              onChange={(value) => {
                setMobileOtp(value);
                setError(null);
              }}
              onComplete={(value) => {
                void handleApiMobileOtpContinue(undefined, value);
              }}
              error={error ?? undefined}
              disabled={loading}
            />
          </div>
          {devOtp && <DemoOtpHint otp={devOtp} channel="mobile" onUse={setMobileOtp} />}
          <AuthButton type="submit" loading={loading} disabled={mobileOtp.length !== 6}>
            Verify mobile code
            <ArrowRight className="size-4" />
          </AuthButton>
          <AuthButton variant="outline" onClick={goBack}>
            <ArrowLeft className="size-4" /> Use another account
          </AuthButton>
        </form>
      )}

      {step === "email_otp" && requiresDualOtp && (
        <form onSubmit={handleApiEmailOtpContinue} className="space-y-4" noValidate>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Email OTP{maskedEmailDestination ? ` (${maskedEmailDestination})` : ""}
            </p>
            <OtpInput
              value={emailOtp}
              onChange={(value) => {
                setEmailOtp(value);
                setError(null);
              }}
              onComplete={(value) => {
                void handleApiEmailOtpContinue(undefined, value);
              }}
              error={error ?? undefined}
              disabled={loading}
            />
          </div>
          {devEmailOtp && (
            <DemoOtpHint otp={devEmailOtp} channel="email" onUse={setEmailOtp} />
          )}
          <AuthButton type="submit" loading={loading} disabled={emailOtp.length !== 6}>
            Verify email code
            <ArrowRight className="size-4" />
          </AuthButton>
          <AuthButton variant="outline" onClick={goBack}>
            <ArrowLeft className="size-4" /> Back
          </AuthButton>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={handlePassword} className="space-y-4" noValidate>
          <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Account
            </div>
            {displayName && (
              <div className="mt-1 text-sm font-semibold">{displayName}</div>
            )}
            <div
              className={`text-xs text-muted-foreground ${!displayName ? "mt-1 text-sm font-semibold text-foreground" : ""}`}
            >
              {identifier}
            </div>
          </div>
          <AuthInput
            label="Password"
            name="password"
            type="password"
            icon={Lock}
            placeholder="Enter your password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError(null);
            }}
            autoComplete="current-password"
            required
          />
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="mt-0.5 size-4 rounded border-border accent-primary"
            />
            <span className="text-xs text-muted-foreground">
              Stay signed in
            </span>
          </label>
          <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => startForgotPassword()}
            >
              Forgotten password?
          </button>
          {error && <AuthFormError message={error} />}
          <AuthButton type="submit" loading={loading}>
            Continue
            <ArrowRight className="size-4" />
          </AuthButton>
          <AuthButton variant="outline" onClick={goBack}>
            <ArrowLeft className="size-4" /> Back
          </AuthButton>
        </form>
      )}

      {step === "pin" && (
        <form onSubmit={handlePin} className="space-y-4" noValidate>
          <AuthInput
            label="PIN"
            name="pin"
            type="password"
            icon={ShieldCheck}
            placeholder="4–8 digit PIN"
            value={pin}
            onChange={(event) => {
              setPin(event.target.value.replace(/\D/g, "").slice(0, 8));
              setError(null);
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            required
          />
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={startForgotPin}
          >
            Forgotten PIN?
          </button>
          {error && <AuthFormError message={error} />}
          <AuthButton type="submit" loading={loading} disabled={!/^\d{4,8}$/.test(pin)}>
            Sign in
            <ArrowRight className="size-4" />
          </AuthButton>
          <AuthButton variant="outline" onClick={goBack}>
            <ArrowLeft className="size-4" /> Back
          </AuthButton>
        </form>
      )}

      {step === "forgot_password_ids" && (
        <form onSubmit={onForgotPasswordIds} className="space-y-4" noValidate>
          <p className="text-sm text-muted-foreground">
            We will send OTP codes to the mobile and email on this Admin account.
          </p>
          {error && <AuthFormError message={error} />}
          <AuthButton type="submit" loading={loading}>
            Send reset OTPs
          </AuthButton>
          <AuthButton variant="outline" onClick={goBack}>
            Cancel
          </AuthButton>
        </form>
      )}

      {step === "forgot_password_mobile_otp" && (
        <form onSubmit={onForgotPasswordMobileOtp} className="space-y-4" noValidate>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Mobile OTP ({maskedDestination})
            </p>
            <OtpInput
              value={mobileOtp}
              onChange={(value) => {
                setMobileOtp(value);
                setError(null);
              }}
              onComplete={(value) => {
                void onForgotPasswordMobileOtp(undefined, value);
              }}
              error={error ?? undefined}
              disabled={loading}
            />
          </div>
          {devOtp && <DemoOtpHint otp={devOtp} channel="mobile" onUse={setMobileOtp} />}
          <AuthButton type="submit" loading={loading} disabled={mobileOtp.length !== 6}>
            Continue
          </AuthButton>
        </form>
      )}

      {step === "forgot_password_email_otp" && (
        <form onSubmit={onForgotPasswordEmailOtp} className="space-y-4" noValidate>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Email OTP ({maskedEmailDestination})
            </p>
            <OtpInput
              value={emailOtp}
              onChange={(value) => {
                setEmailOtp(value);
                setError(null);
              }}
              onComplete={(value) => {
                void onForgotPasswordEmailOtp(undefined, value);
              }}
              error={error ?? undefined}
              disabled={loading}
            />
          </div>
          {devEmailOtp && (
            <DemoOtpHint otp={devEmailOtp} channel="email" onUse={setEmailOtp} />
          )}
          <AuthButton type="submit" loading={loading} disabled={emailOtp.length !== 6}>
            Continue
          </AuthButton>
        </form>
      )}

      {step === "forgot_password_set" && (
        <form onSubmit={onForgotPasswordSet} className="space-y-4" noValidate>
          <AuthInput
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <AuthInput
            label="Re-enter new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {error && <AuthFormError message={error} />}
          <AuthButton type="submit" loading={loading}>
            Save password & continue
          </AuthButton>
        </form>
      )}

      {step === "forgot_pin_ids" && (
        <form onSubmit={onForgotPinIds} className="space-y-4" noValidate>
          <p className="text-sm text-muted-foreground">
            We will send OTP codes to the mobile and email on this Admin account.
          </p>
          {error && <AuthFormError message={error} />}
          <AuthButton type="submit" loading={loading}>
            Send PIN reset OTPs
          </AuthButton>
          <AuthButton variant="outline" onClick={goBack}>
            Cancel
          </AuthButton>
        </form>
      )}

      {step === "forgot_pin_mobile_otp" && (
        <form onSubmit={onForgotPinMobileOtp} className="space-y-4" noValidate>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Mobile OTP ({maskedDestination})
            </p>
            <OtpInput
              value={mobileOtp}
              onChange={(value) => {
                setMobileOtp(value);
                setError(null);
              }}
              onComplete={(value) => {
                void onForgotPinMobileOtp(undefined, value);
              }}
              error={error ?? undefined}
              disabled={loading}
            />
          </div>
          {devOtp && <DemoOtpHint otp={devOtp} channel="mobile" onUse={setMobileOtp} />}
          <AuthButton type="submit" loading={loading} disabled={mobileOtp.length !== 6}>
            Continue
          </AuthButton>
        </form>
      )}

      {step === "forgot_pin_email_otp" && (
        <form onSubmit={onForgotPinEmailOtp} className="space-y-4" noValidate>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Email OTP ({maskedEmailDestination})
            </p>
            <OtpInput
              value={emailOtp}
              onChange={(value) => {
                setEmailOtp(value);
                setError(null);
              }}
              onComplete={(value) => {
                void onForgotPinEmailOtp(undefined, value);
              }}
              error={error ?? undefined}
              disabled={loading}
            />
          </div>
          {devEmailOtp && (
            <DemoOtpHint otp={devEmailOtp} channel="email" onUse={setEmailOtp} />
          )}
          <AuthButton type="submit" loading={loading} disabled={emailOtp.length !== 6}>
            Continue
          </AuthButton>
        </form>
      )}

      {step === "forgot_pin_set" && (
        <form onSubmit={onForgotPinSet} className="space-y-4" noValidate>
          <AuthInput
            label="New PIN"
            type="password"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            inputMode="numeric"
            required
          />
          <AuthInput
            label="Re-enter new PIN"
            type="password"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            inputMode="numeric"
            required
          />
          {error && <AuthFormError message={error} />}
          <AuthButton type="submit" loading={loading}>
            Save PIN & continue
          </AuthButton>
        </form>
      )}

    </AuthLayout>
  );
}
