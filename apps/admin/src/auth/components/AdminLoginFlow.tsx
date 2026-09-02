import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, AtSign, Building2, Lock, ShieldCheck } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

import { useAuth } from "@/auth/AuthContext";
import { AuthLayout } from "@/auth/components/AuthLayout";
import { AuthInput } from "@/auth/components/AuthInput";
import { AuthButton } from "@/auth/components/AuthButton";
import { AuthFormError } from "@/auth/components/AuthFormError";
import { AuthInfoCallout } from "@/auth/components/AuthInfoCallout";
import { OtpVerificationStep } from "@/auth/components/OtpVerificationStep";
import { DemoOtpHint } from "@/auth/components/DemoOtpHint";
import { mockLookupUserByIdentifier, mockSignIn } from "@/auth/auth-store";
import { getLoginAuthStrategy } from "@/auth/login-flow-auth";
import {
  listStaffLoginInstitutes,
  requestStaffLoginOtp,
  resolveStaffLoginMode,
  type StaffLoginInstituteDto,
} from "@/lib/access-roles";
import { isInstituteUuid } from "@/lib/active-institute";
import { maskEmail, maskMobile } from "@/auth/otp-service";
import {
  registrationGatePath,
  resolveRegistrationGate,
} from "@/auth/registration-gate";
import type { AuthUser } from "@/auth/types";
import { Select } from "@lumenx/ui-admin";

type LoginStep = "institute" | "identifier" | "otp" | "password";

const INSTITUTE_STORAGE_KEY = "lx_admin_login_institute_id";

function isDemoIdentifierValid(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  return /^\d{10}$/.test(trimmed);
}

function isApiIdentifierValid(value: string): boolean {
  return isDemoIdentifierValid(value);
}

export function AdminLoginFlow() {
  const navigate = useNavigate();
  const { completeSignIn, signInWithStaffOtp, signInWithStaffPassword, clearError } =
    useAuth();
  const strategy = getLoginAuthStrategy();
  const isApi = strategy === "api";

  const [step, setStep] = useState<LoginStep>(isApi ? "institute" : "identifier");
  const [institutes, setInstitutes] = useState<StaffLoginInstituteDto[]>([]);
  const [institutesLoading, setInstitutesLoading] = useState(false);
  const [instituteId, setInstituteId] = useState(() => {
    try {
      return localStorage.getItem(INSTITUTE_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [requiresOtp, setRequiresOtp] = useState(true);
  const [resolvedUser, setResolvedUser] = useState<AuthUser | null>(null);
  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);
  const [maskedDestination, setMaskedDestination] = useState("");
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const channel = identifier.includes("@") ? "email" : "mobile";

  useEffect(() => {
    if (!isApi) return;
    let cancelled = false;
    setInstitutesLoading(true);
    void listStaffLoginInstitutes()
      .then((rows) => {
        if (!cancelled) setInstitutes(rows);
      })
      .catch(() => {
        if (!cancelled) setInstitutes([]);
      })
      .finally(() => {
        if (!cancelled) setInstitutesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isApi]);

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

    if (isApi) {
      if (!isApiIdentifierValid(identifier)) {
        setError("Enter a registered email address or an exact 10-digit mobile number.");
        return;
      }
      setLoading(true);
      try {
        const mode = await resolveStaffLoginMode({
          instituteId: instituteId.trim(),
          identifier: identifier.trim(),
        });
        setDisplayName(mode.displayName);
        setRequiresOtp(mode.requiresOtp);
        if (mode.requiresOtp) {
          const result = await requestStaffLoginOtp({
            instituteId: instituteId.trim(),
            identifier: identifier.trim(),
          });
          setMaskedDestination(result.maskedDestination);
          setDevOtp(result.devOtp);
          setStep("otp");
        } else {
          setStep("password");
        }
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Unable to continue sign-in.");
      } finally {
        setLoading(false);
      }
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

  const handleApiOtpContinue = async (event: React.FormEvent) => {
    event.preventDefault();
    if (otp.trim().length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setError(null);
    setStep("password");
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
        if (requiresOtp) {
          await signInWithStaffOtp({
            instituteId: instituteId.trim(),
            identifier: identifier.trim(),
            otp: otp.trim(),
            password,
            remember: rememberMe,
          });
        } else {
          await signInWithStaffPassword({
            instituteId: instituteId.trim(),
            identifier: identifier.trim(),
            password,
            remember: rememberMe,
          });
        }
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

  const destination =
    channel === "email"
      ? pendingUser?.email || identifier.trim().toLowerCase()
      : pendingUser?.phone || identifier.trim();
  const demoMaskedDestination =
    channel === "email" ? maskEmail(destination) : maskMobile(destination);

  const finishLogin = () => {
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
    if (isApi) {
      if (step === "password") {
        setPassword("");
        if (requiresOtp) {
          setStep("otp");
        } else {
          setStep("identifier");
        }
        return;
      }
      if (step === "otp") {
        setOtp("");
        setDevOtp(undefined);
        setStep("identifier");
        return;
      }
      if (step === "identifier") {
        setIdentifier("");
        setRequiresOtp(true);
        setStep("institute");
        return;
      }
      return;
    }
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
    ? requiresOtp
      ? ["institute", "identifier", "otp", "password"]
      : ["institute", "identifier", "password"]
    : ["identifier", "password", "otp"];

  const visibleSteps = stepLabels.filter(
    (item) => !(item === "otp" && isApi && !requiresOtp),
  );

  return (
    <AuthLayout
      title={step === "otp" && !isApi ? "Verify" : "Login to LumenX Admin"}
      subtitle={
        step === "institute"
          ? "Select your institute to continue"
          : step === "identifier"
            ? isApi
              ? "Enter the email or mobile assigned by your administrator"
              : "First, confirm that your Admin account exists"
            : step === "otp" && isApi
              ? `We sent a 6-digit code to ${maskedDestination || "your contact"}.`
              : step === "password"
                ? isApi
                  ? `Continue as ${displayName || identifier.trim()}`
                  : `Continue as ${resolvedUser?.name ?? "assigned user"}`
                : `We sent a 6-digit code to ${demoMaskedDestination}.`
      }
      showBack={step === "institute" || (!isApi && step === "identifier")}
      backTo="/welcome"
      backLabel="Back"
    >
      {step !== "otp" || isApi ? (
        <AuthInfoCallout
          icon={ShieldCheck}
          title={isApi ? "Staff Admin sign-in" : "Roles & Access login"}
          variant="primary"
          className="mb-6"
        >
          {isApi
            ? requiresOtp
              ? "Institute · email or mobile · OTP · password every session"
              : "Institute · email or mobile · password (principal / institute-wide roles)"
            : "Registered email or mobile · Admin-controlled password · OTP verification"}
        </AuthInfoCallout>
      ) : null}

      <div className="mb-6 flex items-center gap-2">
        {visibleSteps.map((item, index) => {
          const activeIndex = visibleSteps.indexOf(step);
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
              {index < visibleSteps.length - 1 && (
                <span className="h-px flex-1 bg-border" />
              )}
            </div>
          );
        })}
      </div>

      {step === "institute" && (
        <form onSubmit={handleInstitute} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="instituteId"
              className="mb-1.5 block text-xs font-medium text-foreground"
            >
              Institute
            </label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Select
                id="instituteId"
                value={instituteId}
                onChange={(event) => {
                  setInstituteId(event.target.value);
                  setError(null);
                }}
                className="h-11 w-full pl-10"
                disabled={institutesLoading}
                required
              >
                <option value="">
                  {institutesLoading ? "Loading institutes…" : "Select institute"}
                </option>
                {institutes.map((institute) => (
                  <option key={institute.id} value={institute.id}>
                    {institute.name} · {institute.code}
                  </option>
                ))}
              </Select>
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
            label={isApi ? "Email or mobile number" : "Registered email or mobile number"}
            name="identifier"
            type="text"
            icon={AtSign}
            placeholder="name@institute.edu or 9876543210"
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
          {isApi && (
            <AuthButton variant="outline" onClick={goBack}>
              <ArrowLeft className="size-4" /> Change institute
            </AuthButton>
          )}
        </form>
      )}

      {isApi && step === "otp" && requiresOtp && (
        <form onSubmit={handleApiOtpContinue} className="space-y-4" noValidate>
          <AuthInput
            label="One-time code"
            name="otp"
            type="text"
            placeholder="6-digit code"
            value={otp}
            onChange={(event) => {
              setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
              setError(null);
            }}
            inputMode="numeric"
            required
          />
          {devOtp && <DemoOtpHint otp={devOtp} channel={channel} onUse={setOtp} />}
          {error && <AuthFormError message={error} />}
          <AuthButton type="submit" disabled={otp.length !== 6}>
            Verify code
            <ArrowRight className="size-4" />
          </AuthButton>
          <AuthButton variant="outline" onClick={goBack}>
            <ArrowLeft className="size-4" /> Use another account
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
            {isApi && displayName && (
              <div className="mt-1 text-sm font-semibold">{displayName}</div>
            )}
            <div
              className={`text-xs text-muted-foreground ${isApi && !displayName ? "mt-1 text-sm font-semibold text-foreground" : ""}`}
            >
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
            <ArrowLeft className="size-4" /> Back
          </AuthButton>
        </form>
      )}

      {!isApi && step === "otp" && pendingUser && (
        <OtpVerificationStep
          channel={channel}
          destination={destination}
          maskedDestination={demoMaskedDestination}
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
