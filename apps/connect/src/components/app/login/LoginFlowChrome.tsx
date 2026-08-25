import { ArrowLeft } from "lucide-react";
import { cn } from "@lumenx/ui";
import type { Role } from "@lumenx/types";

export type LoginStep =
  | "institute"
  | "role"
  | "phone"
  | "password"
  | "otp"
  | "setPassword"
  | "confirmOtp"
  | "confirmPassword"
  | "forgotPassword"
  | "forgotOtp"
  // Portal (parent/student/teacher) OTP-only flow
  | "portalOtp"
  | "portalPinSetup"
  | "portalPinVerify";

export type LoginMode = "signIn" | "firstSetup" | "forgotPassword";

export function LoginStepper({
  step,
  role,
  loginMode,
}: {
  step: LoginStep;
  role: Role | null;
  loginMode: LoginMode;
}) {
  const isPortalRole = role === "parent" || role === "teacher" || role === "student";

  const order: LoginStep[] = isPortalRole
    ? ["institute", "role", "phone", "portalOtp"]
    : role === "student" && loginMode === "firstSetup"
      ? ["institute", "role", "phone", "password", "otp", "setPassword", "confirmOtp", "confirmPassword"]
      : role === "student" && loginMode === "forgotPassword"
        ? ["institute", "role", "phone", "password", "forgotPassword", "forgotOtp"]
        : ["institute", "role", "phone", "password", "otp"];

  // Map portalPinVerify to the otp slot for stepper display purposes
  const displayStep: LoginStep =
    step === "portalPinVerify" || step === "portalPinSetup" ? "portalOtp" : step;

  const idx = Math.max(0, order.indexOf(displayStep));
  const progressLabel = `Step ${idx + 1} of ${order.length}`;
  return (
    <div
      className="login-stepper flex items-center gap-1.5 mb-6 sm:mb-8"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={order.length}
      aria-valuenow={idx + 1}
      aria-label={progressLabel}
    >
      {order.map((s, i) => (
        <div
          key={s}
          className={cn(
            "login-stepper-segment",
            i < idx ? "is-complete" : i === idx ? "is-current" : "is-upcoming",
          )}
          aria-hidden
        />
      ))}
    </div>
  );
}

export function LoginBackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="login-back-btn">
      <ArrowLeft className="size-4 shrink-0" aria-hidden /> Back
    </button>
  );
}
