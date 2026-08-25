/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — Mobile OTP Verification
 *  Step 2 of 2 in the OTP verification workflow.
 * ───────────────────────────────────────────────────────────── */

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Smartphone, ArrowLeft, CheckCircle2 } from "lucide-react";

import {
  AuthButton,
  AuthOtpLayout,
  AuthPageHeader,
  AuthSuccessScreen,
  OtpStepIndicator,
  OtpVerificationStep,
} from "@/auth/components";
import { useAuth } from "@/auth/AuthContext";
import {
  loadOtpPending,
  saveOtpPending,
  maskMobile,
} from "@/auth/otp-service";

export const Route = createFileRoute("/verify-mobile-otp")({
  head: () => ({ meta: [{ title: "Verify Mobile — LumenX Admin" }] }),
  component: VerifyMobileOtpPage,
});

function VerifyMobileOtpPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [completed, setCompleted] = useState(false);

  const pending = loadOtpPending();
  const mobile = pending?.mobile || user?.phone || "";
  const maskedMobile = mobile ? maskMobile(mobile) : "";

  useEffect(() => {
    if (!mobile) {
      void navigate({ to: "/login", replace: true });
    }
  }, [mobile, navigate]);

  if (!mobile) return null;

  if (completed) {
    return (
      <AuthOtpLayout
        brand={{
          badge: "Almost there!",
          title: (
            <>
              One last step
              <br />
              to get in
            </>
          ),
          description:
            "Verifying your mobile number ensures you can always recover your account and receive critical alerts instantly.",
          steps: [
            { icon: "✓", text: "Email address verified", done: true },
            { icon: "✓", text: "Mobile number verified", done: true },
            { icon: "→", text: "Access your dashboard" },
          ],
        }}
      >
        <AuthSuccessScreen
          title="Account verified!"
          description={
            <>
              Both your email and mobile number are verified.
              <br />
              Next, set up your institute profile to access LumenX Admin.
            </>
          }
        >
          <AuthButton
            variant="primary"
            onClick={() => navigate({ to: "/institute-setup", replace: true })}
          >
            Continue to profile setup
          </AuthButton>
        </AuthSuccessScreen>
        <div className="flex justify-center gap-3 text-xs text-muted-foreground mt-4">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
            Email verified
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
            Mobile verified
          </span>
        </div>
      </AuthOtpLayout>
    );
  }

  return (
    <AuthOtpLayout
      brand={{
        badge: "Almost there!",
        title: (
          <>
            One last step
            <br />
            to get in
          </>
        ),
        description:
          "Verifying your mobile number ensures you can always recover your account and receive critical alerts instantly.",
        steps: [
          { icon: "✓", text: "Email address verified", done: true },
          { icon: "2", text: "Verify your mobile number" },
          { icon: "→", text: "Access your dashboard" },
        ],
      }}
    >
      <Link
        to="/verify-email-otp"
        className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to email verification
      </Link>

      <AuthPageHeader
        icon={Smartphone}
        title="Verify your mobile"
        description="Enter the 6-digit code sent to"
        highlight={maskedMobile}
      />

      <OtpStepIndicator current={2} />

      <OtpVerificationStep
        channel="mobile"
        destination={mobile}
        maskedDestination={maskedMobile}
        sendOnMount={false}
        onVerified={async () => {
          saveOtpPending({ mobileVerified: true });
          setCompleted(true);
        }}
      />
    </AuthOtpLayout>
  );
}
