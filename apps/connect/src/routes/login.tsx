import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  Sparkles,
  Lock,
  Users,
  GraduationCap,
  User as UserIcon,
  ArrowRight,
  ChevronsUpDown,
  Check,
  School,
  Loader2,
  QrCode,
} from "lucide-react";
import { Button } from "@lumenx/ui";
import { Input } from "@lumenx/ui";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@lumenx/ui";
import {
  apiCompleteConnectForgotPin,
  apiCompleteConnectLogin,
  apiConnectLoginMode,
  apiCreateConnectPinAfterOtp,
  apiRequestConnectLoginOtp,
  apiVerifyConnectLoginOtp,
} from "@/auth/api-auth";
import { useApp } from "@/lib/app-state";
import {
  listConnectLoginInstitutes,
  type ConnectLoginInstitute,
} from "@/lib/login-institutes";
import { DEFAULT_DEMO_PROFILE_ID, getDemoProfile } from "@lumenx/types";
import { LumenXLogo } from "@/components/app/LumenXLogo";
import { careersPortalUrl } from "@/lib/careers-origin";
import type { Role } from "@lumenx/types";
import { INSTITUTE_KIND_LABEL } from "@lumenx/types";
import { toast } from "sonner";
import { cn } from "@lumenx/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@lumenx/ui";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@lumenx/ui";
import { Checkbox } from "@lumenx/ui";
import { Label } from "@lumenx/ui";
import {
  LoginBackButton,
  LoginStepper,
  type LoginStep,
} from "@/components/app/login/LoginFlowChrome";
import { PhoneInput, COUNTRIES, validatePhone, type Country } from "@/components/app/PhoneInput";
import { LoginKeyboardShell } from "@/components/app/LoginKeyboardShell";
import { scrollFieldIntoView } from "@/lib/use-keyboard-viewport-offset";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — LumenX Connect" }] }),
  component: LoginPage,
});

type Step = LoginStep;
const ROLES: { id: Role; label: string; tagline: string; icon: typeof Users }[] = [
  {
    id: "parent",
    label: "Parent Portal",
    tagline: "Track every child's growth in one place.",
    icon: Users,
  },
  {
    id: "teacher",
    label: "Teacher Portal",
    tagline: "Run your classes with less friction.",
    icon: UserIcon,
  },
  {
    id: "student",
    label: "Student Portal",
    tagline: "Your day, assignments and growth.",
    icon: GraduationCap,
  },
];

function roleLabel(role: Role | null): string {
  return ROLES.find((item) => item.id === role)?.label ?? "your portal";
}

const CONNECT_LOGIN = getDemoProfile(DEFAULT_DEMO_PROFILE_ID).connect;

function LoginPage() {
  const { user, signInApi, hydrated } = useApp();
  const nav = useNavigate();
  const [step, setStep] = useState<Step>("institute");
  const [instituteId, setInstituteId] = useState<string | null>(null);
  const [instituteOpen, setInstituteOpen] = useState(false);
  const [rememberInstitute, setRememberInstitute] = useState(true);
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [otp, setOtp] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginInstitutes, setLoginInstitutes] = useState<ConnectLoginInstitute[]>([]);
  const [institutesLoading, setInstitutesLoading] = useState(true);
  const [institutesError, setInstitutesError] = useState<string | null>(null);

  // Portal (parent / student / teacher) OTP-only flow state
  const [portalDisplayName, setPortalDisplayName] = useState<string | undefined>(undefined);
  const [portalOtpError, setPortalOtpError] = useState<string | null>(null);
  const [portalPinError, setPortalPinError] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [apiConnectPin, setApiConnectPin] = useState("");
  const [apiConnectConfirmPin, setApiConnectConfirmPin] = useState("");
  const [otpGrant, setOtpGrant] = useState("");
  /** Chart: normal sign-in vs forgotten-PIN recovery. */
  const [loginIntent, setLoginIntent] = useState<"signIn" | "forgotPin">("signIn");

  useEffect(() => {
    if (hydrated && user) nav({ to: "/" });
  }, [hydrated, user, nav]);

  useEffect(() => {
    let cancelled = false;
    setInstitutesLoading(true);
    setInstitutesError(null);
    void listConnectLoginInstitutes()
      .then((rows) => {
        if (cancelled) return;
        setLoginInstitutes(rows);
        try {
          const last = localStorage.getItem("ues_last_institute");
          if (last && rows.some((i) => i.id === last)) setInstituteId(last);
        } catch {
          // ignore
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoginInstitutes([]);
          setInstitutesError(
            err instanceof Error ? err.message : "Unable to load institutes.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setInstitutesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 30-second resend countdown for portal OTP
  useEffect(() => {
    if (resendSeconds <= 0) return;
    const t = window.setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendSeconds]);

  const cleanPhone = useMemo(() => phone.replace(/\D/g, ""), [phone]);
  const phoneValid = validatePhone(cleanPhone, country);
  const fullPhone = `${country.code} ${cleanPhone}`;

  const selectedInstitute = useMemo(
    () => loginInstitutes.find((i) => i.id === instituteId) ?? null,
    [instituteId, loginInstitutes],
  );

  if (!hydrated || user) {
    return (
      <div
        className="min-h-screen-dvh flex flex-col items-center justify-center gap-3 bg-background"
        role="status"
        aria-live="polite"
        aria-label="Loading sign-in"
      >
        <div className="login-hydrating-spinner" aria-hidden />
        <span className="sr-only">Loading sign-in</span>
      </div>
    );
  }

  const resetAuthFlow = () => {
    setOtp("");
    setApiConnectPin("");
    setApiConnectConfirmPin("");
    setOtpGrant("");
    setPortalOtpError(null);
    setPortalPinError(null);
  };

  const startForgotPin = () => {
    resetAuthFlow();
    setLoginIntent("forgotPin");
    setResendSeconds(0);
    setStep("phone");
    toast.message("Confirm your mobile number to reset your Login PIN");
  };

  const handleResendOtp = () => {
    if (resendSeconds > 0 || !instituteId) return;
    if (role) {
      setLoading(true);
      void apiRequestConnectLoginOtp({ phone: cleanPhone, instituteId, role })
        .then((result) => {
          setPortalDisplayName(result.displayName);
          setOtp("");
          setPortalOtpError(null);
          setResendSeconds(30);
          toast.success(
            result.devOtp
              ? `New code sent to ${result.maskedDestination} (dev: ${result.devOtp})`
              : `SMS code sent to ${result.maskedDestination}`,
          );
        })
        .catch((err) => {
          toast.error(err instanceof Error ? err.message : "Failed to resend code");
        })
        .finally(() => setLoading(false));
      return;
    }
  };

  const next = () => {
    if (step === "institute") {
      if (!instituteId) return toast.error("Select your institute to continue");
      try {
        if (rememberInstitute) localStorage.setItem("ues_last_institute", instituteId);
        else localStorage.removeItem("ues_last_institute");
      } catch {
        // Device preference is optional.
      }
      setLoginIntent("signIn");
      setStep("role");
      return;
    }
    if (step === "role") {
      if (!role) return toast.error("Pick a portal to continue");
      setLoginIntent("signIn");
      setStep("phone");
      return;
    }
    if (step === "phone") {
      setPhoneTouched(true);
      if (!phoneValid) return toast.error(`Enter a valid ${country.maxLen}-digit mobile number`);
      if (role && instituteId) {
        setLoading(true);
        void (async () => {
          try {
            setPortalDisplayName(roleLabel(role));
            setApiConnectPin("");
            setApiConnectConfirmPin("");
            setOtpGrant("");

            if (loginIntent === "forgotPin") {
              const result = await apiRequestConnectLoginOtp({
                phone: cleanPhone,
                instituteId,
                role,
              });
              setOtp("");
              setPortalOtpError(null);
              setResendSeconds(30);
              setStep("portalOtp");
              toast.success(
                result.devOtp
                  ? `Code sent to ${result.maskedDestination} (dev: ${result.devOtp})`
                  : `SMS code sent to ${result.maskedDestination}`,
              );
              return;
            }

            const mode = await apiConnectLoginMode({ phone: cleanPhone, instituteId, role });
            if (mode.mode === "first_login_otp" || mode.firstLogin || mode.requiresOtp) {
              const result = await apiRequestConnectLoginOtp({
                phone: cleanPhone,
                instituteId,
                role,
              });
              setOtp("");
              setPortalOtpError(null);
              setResendSeconds(30);
              setStep("portalOtp");
              toast.success(
                result.devOtp
                  ? `Code sent to ${result.maskedDestination} (dev: ${result.devOtp})`
                  : `SMS code sent to ${result.maskedDestination}`,
              );
              return;
            }
            if (!mode.requiresPin) {
              throw new Error("This account is not ready for PIN sign-in. Contact your institute.");
            }
            setStep("portalPinVerify");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Account not found");
          } finally {
            setLoading(false);
          }
        })();
        return;
      }
    }
    // ── Portal OTP-only steps ─────────────────────────────────────────────────
    if (step === "portalOtp") {
      if (otp.length !== 6) return toast.error("Enter the 6-digit code");
      if (role && instituteId) {
        setLoading(true);
        void apiVerifyConnectLoginOtp({
          instituteId,
          phone: cleanPhone,
          role,
          otp,
        })
          .then((proof) => {
            setOtpGrant(proof.otpGrant ?? "");
            setApiConnectPin("");
            setApiConnectConfirmPin("");
            setPortalOtpError(null);
            setStep("portalPinSetup");
          })
          .catch((err) => {
            const message = err instanceof Error ? err.message : "Verification failed";
            setPortalOtpError(message);
            toast.error(message);
          })
          .finally(() => setLoading(false));
        return;
      }
    }
    if (step === "portalPinSetup") {
      if (!role || !instituteId || !otpGrant) {
        return toast.error("Verification expired. Request a new code.");
      }
      if (!/^\d{4,8}$/.test(apiConnectPin)) {
        return toast.error("Create a 4–8 digit PIN.");
      }
      if (apiConnectPin !== apiConnectConfirmPin) {
        return toast.error("PINs do not match.");
      }
      setLoading(true);
      if (loginIntent === "forgotPin") {
        void apiCompleteConnectForgotPin({
          instituteId,
          phone: cleanPhone,
          role,
          otpGrant,
          pin: apiConnectPin,
        })
          .then((session) => {
            signInApi(session.user, role, session.instituteId);
            setOtpGrant("");
            setLoginIntent("signIn");
            toast.success("Login PIN updated");
            nav({ to: "/" });
          })
          .catch((err) => {
            toast.error(err instanceof Error ? err.message : "Unable to reset PIN");
          })
          .finally(() => setLoading(false));
        return;
      }
      void apiCreateConnectPinAfterOtp({
        instituteId,
        phone: cleanPhone,
        role,
        otpGrant,
        pin: apiConnectPin,
      })
        .then(() => {
            setOtpGrant("");
            setApiConnectPin("");
            setApiConnectConfirmPin("");
            setPortalPinError(null);
            setStep("portalPinVerify");
            toast.success("PIN created. Enter it to sign in.");
        })
        .catch((err) => {
          toast.error(err instanceof Error ? err.message : "Unable to create PIN");
        })
        .finally(() => setLoading(false));
      return;
    }
    if (step === "portalPinVerify") {
      if (role && instituteId) {
        if (!/^\d{4,8}$/.test(apiConnectPin)) {
          setPortalPinError("Enter your 4–8 digit Login PIN");
          return;
        }
        setLoading(true);
        void apiCompleteConnectLogin({
          instituteId,
          phone: cleanPhone,
          role,
          pin: apiConnectPin,
        })
          .then((session) => {
            signInApi(session.user, role, session.instituteId);
            setLoginIntent("signIn");
            toast.success(`Welcome to ${roleLabel(role)}`);
            nav({ to: "/" });
          })
          .catch((err) => {
            const message = err instanceof Error ? err.message : "Sign-in failed";
            setPortalPinError(message);
            toast.error(message);
          })
          .finally(() => setLoading(false));
        return;
      }
    }
  };

  const back = () => {
    if (step === "role") {
      setLoginIntent("signIn");
      setStep("institute");
    } else if (step === "phone") {
      if (loginIntent === "forgotPin") {
        resetAuthFlow();
        setLoginIntent("signIn");
        setStep("portalPinVerify");
        return;
      }
      setStep("role");
    } else if (step === "portalOtp") {
      resetAuthFlow();
      setStep("phone");
    } else if (step === "portalPinSetup") {
      resetAuthFlow();
      setResendSeconds(0);
      setStep("phone");
    } else if (step === "portalPinVerify") {
      resetAuthFlow();
      setLoginIntent("signIn");
      setStep("phone");
    }
  };

  return (
    <div className="min-h-screen-dvh relative bg-background overflow-hidden">
      <Link
        to="/verify-certificate"
        className="absolute right-4 top-4 z-20 inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/90 px-3 py-2 text-xs font-medium text-foreground shadow-soft backdrop-blur-sm hover:bg-muted/50"
      >
        <QrCode className="size-4 text-primary" />
        Verify certificate
      </Link>
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
      <div className="relative grid min-h-screen-dvh lg:grid-cols-2">
        <aside className="hidden lg:flex flex-col justify-between p-12 bg-gradient-primary text-primary-foreground">
          <div className="flex flex-col items-center gap-2 text-center">
            <LumenXLogo size="md" className="h-10 w-auto" />
            <div>
              <p className="font-display text-sm font-semibold leading-tight text-primary-foreground">
                LumenX Connect
              </p>
              <p className="mt-0.5 text-xs text-primary-foreground/75">Your school, connected</p>
            </div>
          </div>
          <div className="space-y-6 max-w-md">
            <h1 className="font-display text-4xl font-bold leading-tight lg:text-5xl">
              {CONNECT_LOGIN.loginHeroTitle}
            </h1>
            <p className="text-base text-primary-foreground/80 lg:text-lg">
              {CONNECT_LOGIN.loginHeroSubtitle}
            </p>
            <div className="grid gap-3 pt-4">
              {[
                { icon: Sparkles, t: "Built around clarity, not clutter" },
                { icon: ShieldCheck, t: "Private, secure & role-aware" },
                { icon: Lock, t: "Institute → portal → phone, OTP & PIN" },
              ].map((f) => (
                <div
                  key={f.t}
                  className="flex items-center gap-3 text-sm text-primary-foreground/90"
                >
                  <div className="size-8 rounded-lg bg-white/15 grid place-items-center">
                    <f.icon className="size-4" />
                  </div>
                  {f.t}
                </div>
              ))}
            </div>
          </div>
          <div className="text-xs text-primary-foreground/60">© LumenX Education</div>
        </aside>

        <LoginKeyboardShell
          className="lg:justify-center"
          stepKey={step}
          header={
            <>
              <div className="login-keyboard-brand lg:hidden">
                <LumenXLogo size="md" className="h-10 w-auto" />
                <div className="text-center">
                  <p className="font-display text-base font-semibold leading-tight text-foreground">
                    LumenX Connect
                  </p>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">
                    Your school, connected
                  </p>
                </div>
              </div>
              <LoginStepper step={step} />
            </>
          }
        >
          <div className="w-full">
            {step === "institute" && (
              <div className="login-step-body connect-step-enter">
                <div>
                  <h2 className="login-step-title font-display text-2xl font-semibold sm:text-[1.75rem]">
                    {CONNECT_LOGIN.institutePickerTitle}
                  </h2>
                  <p className="login-step-subtitle">{CONNECT_LOGIN.institutePickerHint}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Institute</Label>
                  {institutesLoading ? (
                    <p className="text-sm text-muted-foreground">Loading institutes…</p>
                  ) : institutesError ? (
                    <p className="text-sm text-destructive">{institutesError}</p>
                  ) : loginInstitutes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No active institutes are available for login yet.
                    </p>
                  ) : (
                  <Popover open={instituteOpen} onOpenChange={setInstituteOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={instituteOpen}
                        className="h-12 w-full justify-between rounded-xl font-normal"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <School className="size-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">
                            {selectedInstitute ? selectedInstitute.name : "Search name or code…"}
                          </span>
                        </span>
                        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[min(100vw-2.5rem,24rem)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Type name or code…" />
                        <CommandList>
                          <CommandEmpty>No institute found.</CommandEmpty>
                          <CommandGroup>
                            {loginInstitutes.map((ins) => (
                              <CommandItem
                                key={ins.id}
                                value={`${ins.name} ${ins.code}`.toLowerCase()}
                                onSelect={() => {
                                  setInstituteId(ins.id);
                                  setInstituteOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 size-4 shrink-0",
                                    instituteId === ins.id ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-medium">{ins.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {ins.code} ·{" "}
                                    {INSTITUTE_KIND_LABEL[
                                      ins.kind as keyof typeof INSTITUTE_KIND_LABEL
                                    ] ?? ins.kind}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  )}
                </div>
                <div className="login-remember-row">
                  <Checkbox
                    id="remember-inst"
                    checked={rememberInstitute}
                    onCheckedChange={(v) => setRememberInstitute(v === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="remember-inst" className="text-sm font-normal leading-snug">
                    Remember this institute on this device
                  </Label>
                </div>
                <Button onClick={next} disabled={!instituteId} className="login-primary-action">
                  Continue
                </Button>
                <div className="login-portal-links">
                  <p>
                    New to {selectedInstitute?.name ?? "this institute"}?{" "}
                    <Link to="/admissions/login" className="font-medium text-primary hover:underline">
                      Apply for admission
                    </Link>
                  </p>
                  <p>
                    Looking for a job?{" "}
                    <a
                      href={careersPortalUrl("/")}
                      className="font-medium text-primary hover:underline"
                    >
                      Careers
                    </a>
                  </p>
                </div>
              </div>
            )}

            {step === "role" && (
              <div className="login-step-body connect-step-enter">
                <div>
                  <h2 className="login-step-title font-display text-2xl font-semibold sm:text-[1.75rem]">
                    Choose portal
                  </h2>
                  <p className="login-step-subtitle">
                    {selectedInstitute ? (
                      <>
                        Signing in to{" "}
                        <span className="font-medium text-foreground">
                          {selectedInstitute.name}
                        </span>
                        . Pick your portal — each has its own session.
                      </>
                    ) : (
                      <>
                        Pick how you&apos;ll be signing in. Each portal has its own private session.
                      </>
                    )}
                  </p>
                </div>
                <div className="space-y-2.5">
                  {ROLES.map((r) => {
                    const Icon = r.icon;
                    const active = role === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setRole(r.id);
                          resetAuthFlow();
                        }}
                        className={cn("login-role-card bg-card", active && "is-active")}
                      >
                        <div
                          className={cn(
                            "size-11 rounded-xl grid place-items-center shrink-0",
                            active
                              ? "bg-gradient-primary text-primary-foreground"
                              : "bg-muted text-foreground",
                          )}
                        >
                          <Icon className="size-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{r.label}</div>
                          <div className="text-xs text-muted-foreground truncate">{r.tagline}</div>
                        </div>
                        <ArrowRight
                          className={cn(
                            "size-4 transition-opacity",
                            active ? "opacity-100 text-primary" : "opacity-30",
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
                <Button onClick={next} disabled={!role} className="login-primary-action">
                  Continue
                </Button>
              </div>
            )}

            {step === "phone" && (
              <div className="login-step-body connect-step-enter">
                <LoginBackButton onClick={back} />
                <div>
                  <h2 className="login-step-title font-display text-2xl font-semibold sm:text-[1.75rem]">
                    {loginIntent === "forgotPin" ? "Reset Login PIN" : "Welcome"}
                  </h2>
                  <p className="login-step-subtitle">
                    {loginIntent === "forgotPin" ? (
                      <>
                        Enter the registered mobile for{" "}
                        <span className="text-foreground font-medium">
                          {ROLES.find((r) => r.id === role)?.label}
                        </span>{" "}
                        to verify and set a new PIN.
                      </>
                    ) : (
                      <>
                        Signing in to{" "}
                        <span className="text-foreground font-medium">
                          {ROLES.find((r) => r.id === role)?.label}
                        </span>
                        .{" "}
                        {role === "parent"
                          ? "Parents sign in with their registered mobile number only."
                          : "Enter your mobile number."}
                      </>
                    )}
                  </p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="login-phone" className="text-sm font-medium">
                    Mobile number
                  </label>
                  <PhoneInput
                    id="login-phone"
                    autoFocus
                    country={country}
                    onCountryChange={(c) => {
                      setCountry(c);
                      setPhone("");
                      setPhoneTouched(false);
                    }}
                    value={phone}
                    onChange={(v) => {
                      setPhone(v);
                      if (!phoneTouched) setPhoneTouched(true);
                    }}
                    onEnter={next}
                    onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                    error={
                      phoneTouched && !phoneValid
                        ? `Enter a valid ${country.maxLen}-digit number`
                        : null
                    }
                  />
                </div>
                <Button onClick={next} disabled={!phoneValid} className="login-primary-action">
                  Continue
                </Button>
                <p className="text-xs leading-relaxed text-muted-foreground text-center">
                  By continuing you agree to LumenX Connect&apos;s{" "}
                  <Link to="/terms" className="text-primary font-medium hover:underline">
                    Terms & Conditions
                  </Link>
                  ,{" "}
                  <Link to="/privacy" className="text-primary font-medium hover:underline">
                    Privacy Policy
                  </Link>
                  , and{" "}
                  <Link to="/cookies" className="text-primary font-medium hover:underline">
                    Cookie Policy
                  </Link>
                  .
                </p>
              </div>
            )}

            {/* ── Portal OTP step (parent / student / teacher) ─────────────── */}
            {step === "portalOtp" && (
              <div className="login-step-body connect-step-enter">
                <LoginBackButton onClick={back} />
                <div>
                  <h2 className="login-step-title font-display text-2xl font-semibold sm:text-[1.75rem]">
                    {loginIntent === "forgotPin" ? "Verify to reset PIN" : "Verify mobile"}
                  </h2>
                  <p className="login-step-subtitle">
                    We sent a 6-digit code to{" "}
                    <span className="text-foreground font-medium">{fullPhone}</span>.
                  </p>
                </div>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(v) => {
                      setOtp(v);
                      setPortalOtpError(null);
                    }}
                    autoFocus
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="size-11 sm:size-12 text-base sm:text-lg rounded-xl"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {portalOtpError && (
                  <p className="text-sm text-destructive text-center">{portalOtpError}</p>
                )}
                <Button
                  onClick={next}
                  disabled={loading || otp.length !== 6}
                  className="login-primary-action"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Verifying…
                    </>
                  ) : (
                    "Verify & continue"
                  )}
                </Button>
                <div className="flex flex-col items-center gap-2">
                  {resendSeconds > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Resend code in{" "}
                      <span className="tabular-nums font-medium text-foreground">
                        {resendSeconds}s
                      </span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="text-sm text-primary font-medium hover:underline touch-manipulation"
                    >
                      Resend OTP
                    </button>
                  )}
                  <p className="login-demo-hint text-center text-muted-foreground">
                    Enter the code sent by the server. Development codes appear in the toast.
                  </p>                </div>
              </div>
            )}

            {step === "portalPinSetup" && (
              <div className="login-step-body connect-step-enter">
                <LoginBackButton onClick={back} />
                <div>
                  <h2 className="login-step-title font-display text-2xl font-semibold sm:text-[1.75rem]">
                    {loginIntent === "forgotPin" ? "Set a new Login PIN" : "Create your Login PIN"}
                  </h2>
                  <p className="login-step-subtitle">
                    {loginIntent === "forgotPin"
                      ? "Choose a new PIN, re-enter it, then you’ll sign in."
                      : "Choose a PIN, re-enter it, then enter it once more to sign in."}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label htmlFor="connect-pin-new" className="text-sm font-medium">
                      New Login PIN
                    </label>
                    <Input
                      id="connect-pin-new"
                      type="password"
                      inputMode="numeric"
                      autoFocus
                      placeholder="4–8 digits"
                      value={apiConnectPin}
                      onChange={(e) =>
                        setApiConnectPin(
                          e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 8),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="connect-pin-confirm" className="text-sm font-medium">
                      Re-enter Login PIN
                    </label>
                    <Input
                      id="connect-pin-confirm"
                      type="password"
                      inputMode="numeric"
                      placeholder="Re-enter PIN"
                      value={apiConnectConfirmPin}
                      onChange={(e) =>
                        setApiConnectConfirmPin(
                          e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 8),
                        )
                      }
                      onKeyDown={(e) => e.key === "Enter" && next()}
                    />
                  </div>
                </div>
                <Button
                  onClick={next}
                  disabled={
                    loading ||
                    !/^\d{4,8}$/.test(apiConnectPin) ||
                    apiConnectPin !== apiConnectConfirmPin
                  }
                  className="login-primary-action"
                >
                  {loading
                    ? loginIntent === "forgotPin"
                      ? "Updating PIN…"
                      : "Creating PIN…"
                    : loginIntent === "forgotPin"
                      ? "Save PIN & sign in"
                      : "Save PIN & continue"}
                </Button>
              </div>
            )}

            {/* ── Portal PIN verify (two-step verification) ────────────────── */}
            {step === "portalPinVerify" && (
              <div className="login-step-body connect-step-enter">
                <LoginBackButton onClick={back} />
                <div>
                  <h2 className="login-step-title font-display text-2xl font-semibold sm:text-[1.75rem]">
                    Enter your Login PIN
                  </h2>
                  <p className="login-step-subtitle">
                    Use the 4–8 digit PIN you created for this portal.
                  </p>
                </div>
                <div className="space-y-2">
                  <input
                    id="portal-pin-verify"
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="••••"
                    autoFocus
                    className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-base text-center tracking-widest shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={apiConnectPin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 8);
                      setApiConnectPin(value);
                      setPortalPinError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && next()}
                  />
                  {portalPinError && (
                    <p className="text-sm text-destructive">{portalPinError}</p>
                  )}
                </div>
                <Button
                  onClick={next}
                  disabled={
                    loading ||
                    !/^\d{4,8}$/.test(apiConnectPin)
                  }
                  className="login-primary-action"
                >
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
                <button
                  type="button"
                  className="w-full text-center text-sm text-primary font-medium hover:underline"
                  onClick={startForgotPin}
                >
                  Forgotten PIN?
                </button>
              </div>
            )}
          </div>
        </LoginKeyboardShell>
      </div>
    </div>
  );
}


