/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — Email OTP Verification
 *  Step 1 of 2 in the OTP verification workflow.
 * ───────────────────────────────────────────────────────────── */

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Mail, ArrowLeft } from "lucide-react";

import { useAuth } from "@/auth/AuthContext";
import { resolveDemoAuthRouteBlock } from "@/auth/demo-auth-guard";
import {
  AuthOtpLayout,
  AuthPageHeader,
  OtpStepIndicator,
  OtpVerificationStep,
} from "@/auth/components";
import {
  loadOtpPending,
  saveOtpPending,
  maskEmail,
} from "@/auth/otp-service";

export const Route = createFileRoute("/verify-email-otp")({
  head: () => ({ meta: [{ title: "Verify Email — LumenX Admin" }] }),
  component: VerifyEmailOtpPage,
});

function VerifyEmailOtpPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const redirect = resolveDemoAuthRouteBlock("/verify-email-otp");
    if (redirect) {
      navigate({ to: redirect, replace: true });
    }
  }, [navigate]);

  const pending = loadOtpPending();
  const email = pending?.email || user?.email || "";

  useEffect(() => {
    if (!email) {
      navigate({ to: "/pending-verification", replace: true });
    }
  }, [email, navigate]);

  const maskedEmail = maskEmail(email);

  return (
    <AuthOtpLayout
      brand={{
        badge: "Two-Step Verification",
        title: (
          <>
            Keeping your
            <br />
            account safe
          </>
        ),
        description:
          "OTP verification adds an extra layer of protection. Even if someone knows your password, they can't access your account without your verified email.",
        steps: [
          { icon: "1", text: "Verify your email address" },
          { icon: "2", text: "Verify your mobile number" },
          { icon: "✓", text: "Access your dashboard" },
        ],
      }}
    >
      <Link
        to="/pending-verification"
        className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back
      </Link>

      <AuthPageHeader
        icon={Mail}
        title="Verify your email"
        description="Enter the 6-digit code sent to"
        highlight={maskedEmail}
      />

      <OtpStepIndicator current={1} />

      <OtpVerificationStep
        channel="email"
        destination={email}
        maskedDestination={maskedEmail}
        sendOnMount={false}
        onVerified={async () => {
          saveOtpPending({ emailVerified: true });
          navigate({ to: "/verify-mobile-otp" });
        }}
      />
    </AuthOtpLayout>
  );
}
