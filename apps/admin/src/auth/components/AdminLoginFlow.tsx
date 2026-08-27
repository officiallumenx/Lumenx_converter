import { useState } from "react";
import { ArrowLeft, ArrowRight, AtSign, Lock, ShieldCheck } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

import { useAuth } from "@/auth/AuthContext";
import { AuthLayout } from "@/auth/components/AuthLayout";
import { AuthInput } from "@/auth/components/AuthInput";
import { AuthButton } from "@/auth/components/AuthButton";
import { AuthFormError } from "@/auth/components/AuthFormError";
import { AuthInfoCallout } from "@/auth/components/AuthInfoCallout";
import { OtpVerificationStep } from "@/auth/components/OtpVerificationStep";
import { mockLookupUserByIdentifier, mockSignIn } from "@/auth/auth-store";
import {
  getLoginAuthStrategy,
  requireApiLoginEmail,
} from "@/auth/login-flow-auth";
import { maskEmail, maskMobile } from "@/auth/otp-service";
import {
  registrationGatePath,
  resolveRegistrationGate,
} from "@/auth/registration-gate";
import type { AuthUser } from "@/auth/types";

type LoginStep = "identifier" | "password" | "otp";

function isDemoIdentifierValid(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  return /^\d{10}$/.test(trimmed);
}

export function AdminLoginFlow() {
  const navigate = useNavigate();
  const { completeSignIn, signIn, clearError } = useAuth();
  const strategy = getLoginAuthStrategy();
  const isApi = strategy === "api";

  const [step, setStep] = useState<LoginStep>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [resolvedUser, setResolvedUser] = useState<AuthUser | null>(null);
  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleIdentifier = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    clearError();

    if (isApi) {
      try {
        requireApiLoginEmail(identifier);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Enter a valid email address.");
        return;
      }
      setStep("password");
      return;
    }

    if (!isDemoIdentifierValid(identifier)) {
      setError("Enter a registered email address or an exact 10-digit mobile number.");
      return;
    }
    setLoading(true);
    try {
      const user = await mockLookupUserByIdentifier(identifier);
      setResolvedUser(user);
      setStep("password");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Account not found.");
    } finally {
      setLoading(false);
    }
  };

  const handlePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password) {
      setError(
        isApi
          ? "Enter your password."
          : "Enter the password assigned by your administrator.",
      );
      return;
    }
    setLoading(true);
    setError(null);
    clearError();
    try {
      if (isApi) {
        const email = requireApiLoginEmail(identifier);
        // Real Supabase + GET /api/v1/me via AuthContext.signIn — never mock.
        await signIn(email, password, rememberMe);
        navigate({ to: "/", replace: true });
        return;
      }

      const user = await mockSignIn(identifier, password);
      setPendingUser(user);
      setStep("otp");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Password verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const channel = identifier.includes("@") ? "email" : "mobile";
  const destination =
    channel === "email"
      ? pendingUser?.email || identifier.trim().toLowerCase()
      : pendingUser?.phone || identifier.trim();
  const maskedDestination =
    channel === "email" ? maskEmail(destination) : maskMobile(destination);

  const finishLogin = () => {
    // Demo OTP completion only — never reachable in API mode UI.
    if (!pendingUser || isApi) return;
    completeSignIn(pendingUser, rememberMe);
    const gate = resolveRegistrationGate(pendingUser);
    const path = registrationGatePath(gate.kind);
    if (gate.kind === "allow") {
      void import("@/lib/sync-admin-tenant").then(({ syncAdminTenantForUser }) => {
        syncAdminTenantForUser(pendingUser);
      });
    }
    navigate({ to: path ?? "/", replace: true });
  };

  const goBack = () => {
    setError(null);
    if (step === "otp") {
      setPendingUser(null);
      setStep("password");
      return;
    }
    setResolvedUser(null);
    setPassword("");
    setStep("identifier");
  };

  const stepLabels: LoginStep[] = isApi
    ? ["identifier", "password"]
    : ["identifier", "password", "otp"];

  return (
    <AuthLayout
      title={step === "otp" ? "Verify" : "Login to LumenX Admin"}
      subtitle={
        step === "identifier"
          ? isApi
            ? "Sign in with your institute email and password"
            : "First, confirm that your Admin account exists"
          : step === "password"
            ? isApi
              ? `Continue as ${identifier.trim().toLowerCase()}`
              : `Continue as ${resolvedUser?.name ?? "assigned user"}`
            : `We sent a 6-digit code to ${maskedDestination}.`
      }
      showBack={step === "identifier"}
      backTo="/welcome"
      backLabel="Back"
    >
      {step !== "otp" && (
        <AuthInfoCallout
          icon={ShieldCheck}
          title={isApi ? "API sign-in" : "Roles & Access login"}
          variant="primary"
          className="mb-6"
        >
          {isApi
            ? "Email and password · Supabase Auth · live Admin API identity"
            : "Registered email or mobile · Admin-controlled password · OTP verification"}
        </AuthInfoCallout>
      )}

      {step !== "otp" && (
        <div className="mb-6 flex items-center gap-2">
          {stepLabels.map((item, index) => {
            const activeIndex = stepLabels.indexOf(step);
            const isActive = item === step;
            const isComplete = index < activeIndex;
            return (
              <div key={item} className="flex flex-1 items-center gap-2">
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                    isActive || isComplete
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </span>
                <span
                  className={`hidden text-[10px] font-medium uppercase tracking-wider sm:block ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {item}
                </span>
                {index < stepLabels.length - 1 && (
                  <span className="h-px flex-1 bg-border" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {step === "identifier" && (
        <form onSubmit={handleIdentifier} className="space-y-4" noValidate>
          <AuthInput
            label={isApi ? "Email address" : "Registered email or mobile number"}
            name="identifier"
            type="text"
            icon={AtSign}
            placeholder={
              isApi ? "name@institute.edu" : "name@institute.edu or 9876543210"
            }
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
            {isApi ? "Continue" : "Check account"}
            <ArrowRight className="size-4" />
          </AuthButton>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={handlePassword} className="space-y-4" noValidate>
          <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {isApi ? "Account" : "Verified account"}
            </div>
            {!isApi && (
              <div className="mt-1 text-sm font-semibold">{resolvedUser?.name}</div>
            )}
            <div className={`text-xs text-muted-foreground ${isApi ? "mt-1 text-sm font-semibold text-foreground" : ""}`}>
              {identifier}
            </div>
          </div>
          <AuthInput
            label="Password"
            name="password"
            type="password"
            icon={Lock}
            placeholder={
              isApi ? "Enter your password" : "Enter the password set by Admin"
            }
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
              Keep me logged in on this device
            </span>
          </label>
          {!isApi && (
            <p className="text-[11px] text-muted-foreground">
              Password changes are managed only by your administrator.
            </p>
          )}
          {error && <AuthFormError message={error} />}
          <AuthButton type="submit" loading={loading}>
            {isApi ? "Sign in" : "Verify password"}
            <ArrowRight className="size-4" />
          </AuthButton>
          <AuthButton variant="outline" onClick={goBack}>
            <ArrowLeft className="size-4" /> Use another account
          </AuthButton>
        </form>
      )}

      {!isApi && step === "otp" && pendingUser && (
        <OtpVerificationStep
          channel={channel}
          destination={destination}
          maskedDestination={maskedDestination}
          persist={false}
          verifyLabel="Verify & continue"
          successLabel="Verified! Opening Admin…"
          onVerified={finishLogin}
          onBack={goBack}
          variant="minimal"
        />
      )}
    </AuthLayout>
  );
}
