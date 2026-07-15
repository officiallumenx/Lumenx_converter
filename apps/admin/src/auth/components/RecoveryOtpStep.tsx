/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — Recovery OTP Step
 *  Thin wrapper around OtpVerificationStep for recovery wizards.
 * ───────────────────────────────────────────────────────────── */

import { OtpVerificationStep } from "./OtpVerificationStep";

interface RecoveryOtpStepProps {
  channel: "email" | "mobile";
  destination: string;
  maskedDestination: string;
  onVerified: () => void;
  onBack: () => void;
}

export function RecoveryOtpStep(props: RecoveryOtpStepProps) {
  return (
    <OtpVerificationStep
      {...props}
      variant="embedded"
      persist={false}
      demoCompact
    />
  );
}
