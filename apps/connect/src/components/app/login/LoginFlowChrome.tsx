import { ArrowLeft } from "lucide-react";
import { cn } from "@lumenx/ui";

export type LoginStep =
  | "institute"
  | "role"
  | "phone"
  | "portalOtp"
  | "portalPinSetup"
  | "portalPinVerify";

export function LoginStepper({
  step,
}: {
  step: LoginStep;
}) {
  const order: LoginStep[] = ["institute", "role", "phone", "portalOtp"];

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
