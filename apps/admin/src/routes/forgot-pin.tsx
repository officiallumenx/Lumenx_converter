import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { AuthButton } from "@/auth/components/AuthButton";
import { RecoveryLayout } from "@/auth/components/RecoveryLayout";

export const Route = createFileRoute("/forgot-pin")({
  head: () => ({ meta: [{ title: "Forgot PIN — LumenX Admin" }] }),
  component: ForgotPinPage,
});

function ForgotPinPage() {
  return (
    <RecoveryLayout
      type="forgot_pin"
      currentStep="identify"
      title="Reset your PIN from login"
      subtitle="The standalone demo recovery flow has been removed."
      backTo="/login"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/[0.04] p-3.5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Go to Login, select your institute and account, then choose Forgotten PIN? to use
            the secure staff API recovery flow.
          </p>
        </div>
        <Link to="/login">
          <AuthButton>
            Continue to login <ArrowRight className="size-4" />
          </AuthButton>
        </Link>
      </div>
    </RecoveryLayout>
  );
}
