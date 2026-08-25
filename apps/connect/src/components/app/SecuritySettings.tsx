/**
 * Shared Security block for Parent / Student / Teacher settings.
 * Two-step verification (Login PIN) and App Lock stay independent.
 */
import type { ReactNode } from "react";
import { AppLockSettings } from "@/components/app/AppLockSettings";
import { TwoStepVerificationSettings } from "@/components/app/TwoStepVerificationSettings";

export function SecuritySettings({ children }: { children?: ReactNode }) {
  return (
    <>
      <TwoStepVerificationSettings />
      <AppLockSettings />
      {children}
    </>
  );
}
