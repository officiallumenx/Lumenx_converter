import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { DEMO_TRANSPORT_OTP } from "@lumenx/auth";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@lumenx/ui";
import { toast } from "sonner";

import { AuthDemoCard, AuthHeader, AuthScreen } from "@/components/auth/auth-screen";
import { DriverMark } from "@/components/app/driver-mark";
import { COUNTRIES, PhoneInput, validatePhone } from "@/components/auth/phone-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  findDriverByPhone,
  isValidTransportOtp,
  useOtpAutofill,
  useTransportAuth,
} from "@/lib/auth";
import { listDemoDriverHints } from "@/lib/transport/driver-assignment";

type Step = "phone" | "otp";

const OTP_LENGTH = 6;
const DEMO_OTP_DELAY_MS = 1400;
const AUTH_TOAST_ID = "transport-auth";

export function DriverLoginPage() {
  const navigate = useNavigate();
  const { user, hydrated, signIn, signInWithPassword, apiMode } = useTransportAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("phone");
  const [country] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const demoOtpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const verifyingRef = useRef(false);

  const demoHints = useMemo(() => listDemoDriverHints(), []);
  const primaryDemo = demoHints[0] ?? null;

  const cleanPhone = useMemo(() => phone.replace(/\D/g, ""), [phone]);
  const phoneValid = validatePhone(cleanPhone, country);
  const displayPhone = `${country.code} ${cleanPhone}`;

  useEffect(() => {
    if (hydrated && user) void navigate({ to: "/" });
  }, [hydrated, user, navigate]);

  useEffect(() => {
    return () => {
      if (demoOtpTimerRef.current) clearTimeout(demoOtpTimerRef.current);
    };
  }, []);

  const handleOtpAutofill = useCallback((code: string) => {
    setOtp(code);
    setOtpError(null);
  }, []);

  useOtpAutofill(handleOtpAutofill, step === "otp" && otpSent && !apiMode);

  const scheduleDemoOtp = useCallback(() => {
    if (demoOtpTimerRef.current) clearTimeout(demoOtpTimerRef.current);
    demoOtpTimerRef.current = setTimeout(() => {
      setOtp(DEMO_TRANSPORT_OTP);
      toast.message("OTP received", {
        id: AUTH_TOAST_ID,
        description: "Code auto-filled. You can edit it if needed.",
      });
    }, DEMO_OTP_DELAY_MS);
  }, []);

  const handleApiSignIn = async () => {
    setApiError(null);
    setLoading(true);
    try {
      await signInWithPassword(email, password);
      toast.success("Signed in");
      void navigate({ to: "/" });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = () => {
    setPhoneError(null);
    if (!phoneValid) {
      setPhoneError("Enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setStep("otp");
      setOtpSent(true);
      setOtp("");
      setOtpError(null);
      scheduleDemoOtp();
      toast.message("OTP sent", {
        id: AUTH_TOAST_ID,
        description: `Code sent to ${displayPhone}.`,
      });
    }, 500);
  };

  const verifyOtp = useCallback(() => {
    if (verifyingRef.current) return;
    setOtpError(null);

    if (otp.length !== OTP_LENGTH) {
      setOtpError("Enter the 6-digit OTP.");
      return;
    }

    if (!isValidTransportOtp(otp)) {
      setOtpError("Incorrect OTP. Try again.");
      return;
    }

    const driver = findDriverByPhone(cleanPhone);
    if (!driver) {
      setOtpError("This number isn’t on Transport. Ask Admin to add you, then try again.");
      setStep("phone");
      return;
    }

    verifyingRef.current = true;
    setLoading(true);
    window.setTimeout(() => {
      signIn(driver);
      toast.success(`Welcome, ${driver.name}`, { id: AUTH_TOAST_ID });
      void navigate({ to: "/" });
    }, 400);
  }, [cleanPhone, navigate, otp, signIn]);

  useEffect(() => {
    if (step !== "otp" || otp.length !== OTP_LENGTH || loading) return;
    verifyOtp();
  }, [step, otp, loading, verifyOtp]);

  if (!hydrated || user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (apiMode) {
    return (
      <AuthScreen>
        <AuthHeader
          title="Driver sign in"
          subtitle="Use your institute email and password"
          icon={<DriverMark className="h-12 w-12" />}
        />
        <div className="space-y-3">
          <Input
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {apiError ? <p className="text-sm text-destructive">{apiError}</p> : null}
          <Button className="w-full" disabled={loading} onClick={() => void handleApiSignIn()}>
            {loading ? <Loader2 className="animate-spin" /> : "Sign in"}
          </Button>
        </div>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <AuthHeader
        icon={<DriverMark className="size-14 rounded-2xl text-xl" />}
        title="Driver login"
        subtitle="Sign in with your mobile number and OTP."
      />

      {step === "phone" ? (
        <div className="w-full min-w-0 space-y-4">
          <PhoneInput
            id="driver-phone"
            country={country}
            value={phone}
            onChange={(digits) => {
              setPhone(digits);
              setPhoneError(null);
            }}
            error={phoneError}
            hint="We send a one-time password by SMS."
            autoFocus
            onEnter={sendOtp}
          />
          <Button
            type="button"
            variant="transport"
            size="lg"
            expanded
            disabled={!phoneValid || loading}
            onClick={sendOtp}
          >
            {loading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
            Send OTP
          </Button>
        </div>
      ) : (
        <div className="w-full min-w-0 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <p className="text-sm text-muted-foreground">OTP sent to</p>
            <p className="mt-1 font-display text-lg font-semibold tabular-nums text-foreground">
              {displayPhone}
            </p>
          </div>

          <div className="w-full min-w-0 space-y-3">
            <p className="text-sm font-medium text-foreground">Enter OTP</p>
            <div className="w-full overflow-x-auto pb-1">
              <InputOTP
                maxLength={OTP_LENGTH}
                value={otp}
                onChange={(value) => {
                  setOtp(value);
                  setOtpError(null);
                }}
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                containerClassName="w-max min-w-full justify-center"
              >
                <InputOTPGroup className="flex-nowrap gap-2">
                  {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                    <InputOTPSlot key={index} index={index} className="size-11 shrink-0 text-base" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            {otpError ? (
              <p className="text-sm text-destructive" role="alert">
                {otpError}
              </p>
            ) : (
              <p className="text-sm leading-normal text-muted-foreground">
                Type the code from SMS or wait for auto-fill.
              </p>
            )}
          </div>

          <Button
            type="button"
            variant="transport"
            size="lg"
            expanded
            disabled={otp.length !== OTP_LENGTH || loading}
            onClick={verifyOtp}
          >
            {loading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
            Verify and login
          </Button>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => {
                if (demoOtpTimerRef.current) clearTimeout(demoOtpTimerRef.current);
                setStep("phone");
                setOtp("");
                setOtpError(null);
                setOtpSent(false);
              }}
            >
              <ArrowLeft className="size-4 shrink-0" aria-hidden />
              Change number
            </button>
            <button
              type="button"
              className="font-medium text-transport transition-colors hover:text-transport/80"
              onClick={() => {
                setOtp("");
                setOtpError(null);
                scheduleDemoOtp();
                toast.message("OTP resent", { id: AUTH_TOAST_ID });
              }}
            >
              Resend OTP
            </button>
          </div>
        </div>
      )}

      <AuthDemoCard>
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-transport" aria-hidden />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="font-semibold text-foreground">Demo drivers</p>
            <dl className="space-y-1.5 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">OTP</dt>
                <dd className="font-medium tabular-nums text-foreground">{DEMO_TRANSPORT_OTP}</dd>
              </div>
            </dl>
            {demoHints.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No active driver accounts in local ops data yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {demoHints.map((hint) => (
                  <li
                    key={hint.phoneDigits}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-background/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{hint.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {hint.busNumber} · {hint.routeLabel}
                      </p>
                      <p className="tabular-nums text-xs text-muted-foreground">{hint.phoneDisplay}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPhone(hint.phoneDigits);
                        setPhoneError(null);
                      }}
                    >
                      Use
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {primaryDemo ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                After login → Home shows that driver&apos;s bus, route, and students. Switch numbers
                to verify multi-driver assignment.
              </p>
            ) : null}
          </div>
        </div>
      </AuthDemoCard>
    </AuthScreen>
  );
}
