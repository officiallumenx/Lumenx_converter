import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Users,
  GraduationCap,
  User as UserIcon,
  ArrowRight,
  ChevronsUpDown,
  Check,
  School,
  Loader2,
} from "lucide-react";
import { Button } from "@lumenx/ui";
import { Input } from "@lumenx/ui";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@lumenx/ui";
import { useApp } from "@/lib/app-state";
import { registeredInstitutes } from "@/lib/mock-data";
import { DEFAULT_DEMO_PROFILE_ID, getDemoProfile } from "@lumenx/types";
import { LumenXLogo } from "@/components/app/LumenXLogo";
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
import { DEMO_CONNECT_OTP, DEMO_CONNECT_PASSWORD } from "@lumenx/auth";
import { PhoneInput, COUNTRIES, validatePhone, type Country } from "@/components/app/PhoneInput";
import { ConnectDemoCredentialsCard } from "@/components/app/ConnectDemoCredentialsCard";
import { LoginKeyboardShell } from "@/components/app/LoginKeyboardShell";
import { scrollFieldIntoView } from "@/lib/use-keyboard-viewport-offset";
import {
  attemptStudentPassword,
  clearStudentPendingSetup,
  DEMO_FIRST_TIME_STUDENT_PHONE,
  DEMO_RETURNING_STUDENT_PHONE,
  finalizeStudentFirstLogin,
  getStudentAccountDisplayName,
  resetStudentPassword,
  stageStudentNewPassword,
  STUDENT_DEFAULT_PASSWORD,
  studentAccountExists,
  validateNewStudentPassword,
} from "@/lib/student-auth-store";
import { DUAL_ROLE_DEMO_TEACHER } from "@/lib/connect-demo-credentials";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — LumenX Connect" }] }),
  component: LoginPage,
});

type Step =
  | "institute"
  | "role"
  | "phone"
  | "password"
  | "otp"
  | "setPassword"
  | "confirmOtp"
  | "confirmPassword"
  | "forgotPassword"
  | "forgotOtp";

type LoginMode = "signIn" | "firstSetup" | "forgotPassword";

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

const CONNECT_LOGIN = getDemoProfile(DEFAULT_DEMO_PROFILE_ID).connect;

function LoginPage() {
  const { user, signIn, hydrated } = useApp();
  const nav = useNavigate();
  const [step, setStep] = useState<Step>("institute");
  const [instituteId, setInstituteId] = useState<string | null>(null);
  const [instituteOpen, setInstituteOpen] = useState(false);
  const [rememberInstitute, setRememberInstitute] = useState(true);
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>("signIn");
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hydrated && user) nav({ to: "/" });
  }, [hydrated, user, nav]);

  useEffect(() => {
    try {
      const last = localStorage.getItem("ues_last_institute");
      if (last && registeredInstitutes.some((i) => i.id === last)) setInstituteId(last);
      else setInstituteId(CONNECT_LOGIN.defaultInstituteId);
    } catch {
      void 0;
    }
  }, []);

  const cleanPhone = useMemo(() => phone.replace(/\D/g, ""), [phone]);
  const phoneValid = validatePhone(cleanPhone, country);
  const fullPhone = `${country.code} ${cleanPhone}`;

  const selectedInstitute = useMemo(
    () => registeredInstitutes.find((i) => i.id === instituteId) ?? null,
    [instituteId, registeredInstitutes],
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

  const resetStudentFlow = () => {
    setLoginMode("signIn");
    clearStudentPendingSetup();
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setOtp("");
  };

  const finishSignIn = () => {
    if (!instituteId || !role) return;
    try {
      if (rememberInstitute) localStorage.setItem("ues_last_institute", instituteId);
      else localStorage.removeItem("ues_last_institute");
    } catch {
      void 0;
    }
    const displayName =
      role === "student" ? getStudentAccountDisplayName(fullPhone, instituteId) : undefined;
    signIn(fullPhone, role, instituteId, displayName ? { displayName } : undefined);
    toast.success(`Welcome to ${ROLES.find((r) => r.id === role)!.label}`);
  };

  const next = () => {
    if (step === "institute") {
      if (!instituteId) return toast.error("Select your institute to continue");
      setStep("role");
      return;
    }
    if (step === "role") {
      if (!role) return toast.error("Pick a portal to continue");
      setStep("phone");
      return;
    }
    if (step === "phone") {
      setPhoneTouched(true);
      if (!phoneValid) return toast.error(`Enter a valid ${country.maxLen}-digit mobile number`);
      setStep("password");
      return;
    }
    if (step === "password") {
      if (password.length < 4) return toast.error("Enter your password");
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        if (role === "student" && instituteId) {
          const result = attemptStudentPassword(fullPhone, instituteId, password);
          if (!result.ok) {
            if ("notFound" in result && result.notFound) {
              toast.error("No details found. Register with your institute demo password.");
              resetStudentFlow();
              setStep("phone");
              return;
            }
            return toast.error(result.error);
          }
          setLoginMode(result.isFirstLogin ? "firstSetup" : "signIn");
          setOtp("");
          setStep("otp");
          toast.success(
            result.isFirstLogin
              ? `First-time sign-in — OTP sent to ${fullPhone} (demo: ${DEMO_CONNECT_OTP})`
              : `OTP sent to ${fullPhone} — use ${DEMO_CONNECT_OTP}`,
          );
          return;
        }
        if (password !== DEMO_CONNECT_PASSWORD)
          return toast.error(`Incorrect password (demo: ${DEMO_CONNECT_PASSWORD})`);
        resetStudentFlow();
        setOtp("");
        setStep("otp");
        toast.success(`OTP sent to ${fullPhone} — use ${DEMO_CONNECT_OTP}`);
      }, 500);
      return;
    }
    if (step === "otp") {
      if (otp.length !== 6) return toast.error("Enter the 6-digit code");
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        if (otp !== DEMO_CONNECT_OTP)
          return toast.error(`Incorrect OTP (demo: ${DEMO_CONNECT_OTP})`);
        if (!instituteId) return toast.error("Missing institute — go back and select your campus");
        if (role === "student" && loginMode === "firstSetup") {
          setNewPassword("");
          setConfirmPassword("");
          setStep("setPassword");
          return;
        }
        finishSignIn();
      }, 400);
      return;
    }
    if (step === "setPassword") {
      if (!instituteId) return toast.error("Missing institute — go back and select your campus");
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        const result = stageStudentNewPassword(
          fullPhone,
          instituteId,
          newPassword,
          confirmPassword,
        );
        if (!result.ok) return toast.error(result.error);
        setOtp("");
        setStep("confirmOtp");
        toast.success(`Confirm with OTP sent to ${fullPhone} (demo: ${DEMO_CONNECT_OTP})`);
      }, 400);
      return;
    }
    if (step === "confirmOtp") {
      if (otp.length !== 6) return toast.error("Enter the 6-digit code");
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        if (otp !== DEMO_CONNECT_OTP)
          return toast.error(`Incorrect OTP (demo: ${DEMO_CONNECT_OTP})`);
        setPassword("");
        setStep("confirmPassword");
      }, 400);
      return;
    }
    if (step === "confirmPassword") {
      if (!instituteId) return toast.error("Missing institute — go back and select your campus");
      if (password.length < 4) return toast.error("Enter your password");
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        const result = finalizeStudentFirstLogin(fullPhone, instituteId, password);
        if (!result.ok) return toast.error(result.error);
        resetStudentFlow();
        finishSignIn();
      }, 400);
      return;
    }
    if (step === "forgotPassword") {
      const err = validateNewStudentPassword(newPassword, confirmPassword);
      if (err) return toast.error(err);
      setOtp("");
      setStep("forgotOtp");
      toast.success(`OTP sent to ${fullPhone} (demo: ${DEMO_CONNECT_OTP})`);
      return;
    }
    if (step === "forgotOtp") {
      if (otp.length !== 6) return toast.error("Enter the 6-digit code");
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        if (otp !== DEMO_CONNECT_OTP)
          return toast.error(`Incorrect OTP (demo: ${DEMO_CONNECT_OTP})`);
        if (!instituteId) return toast.error("Missing institute");
        const result = resetStudentPassword(
          fullPhone,
          instituteId,
          newPassword,
          confirmPassword,
        );
        if (!result.ok) return toast.error(result.error);
        clearStudentPendingSetup();
        setLoginMode("signIn");
        finishSignIn();
      }, 400);
      return;
    }
  };

  const back = () => {
    if (step === "role") setStep("institute");
    else if (step === "phone") setStep("role");
    else if (step === "password") {
      resetStudentFlow();
      setStep("phone");
    } else if (step === "otp") {
      if (loginMode === "forgotPassword") setStep("forgotPassword");
      else setStep("password");
    } else if (step === "setPassword") setStep("otp");
    else if (step === "confirmOtp") setStep("setPassword");
    else if (step === "confirmPassword") setStep("confirmOtp");
    else if (step === "forgotPassword") {
      setLoginMode("signIn");
      setStep("password");
    } else if (step === "forgotOtp") setStep("forgotPassword");
  };

  const startForgotPassword = () => {
    if (role !== "student" || !instituteId || !phoneValid) {
      toast.error("Enter your mobile number first");
      return;
    }
    if (!studentAccountExists(fullPhone, instituteId)) {
      toast.error("No account found. Use your institute demo password for first-time sign-in.");
      return;
    }
    setLoginMode("forgotPassword");
    setNewPassword("");
    setConfirmPassword("");
    setStep("forgotPassword");
  };

  return (
    <div className="min-h-screen-dvh relative bg-background overflow-hidden">
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
                { icon: Lock, t: "Institute → portal → phone, password & OTP" },
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
          stepKey={`${step}:${loginMode}`}
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
              <Stepper step={step} role={role} loginMode={loginMode} />
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
                            {registeredInstitutes.map((ins) => (
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
                                    {ins.code} · {INSTITUTE_KIND_LABEL[ins.kind] ?? ins.kind}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
                    <Link to="/admissions" className="font-medium text-primary hover:underline">
                      Apply for admission
                    </Link>
                  </p>
                  <p>
                    Looking for a job?{" "}
                    <Link to="/careers" className="font-medium text-primary hover:underline">
                      Careers
                    </Link>
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
                          resetStudentFlow();
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
                {role === "teacher" ? (
                  <ConnectDemoCredentialsCard emphasizeDualTeacher className="pt-1" />
                ) : null}
              </div>
            )}

            {step === "phone" && (
              <div className="login-step-body connect-step-enter">
                <BackButton onClick={back} />
                <div>
                  <h2 className="login-step-title font-display text-2xl font-semibold sm:text-[1.75rem]">
                    Welcome
                  </h2>
                  <p className="login-step-subtitle">
                    Signing in to{" "}
                    <span className="text-foreground font-medium">
                      {ROLES.find((r) => r.id === role)?.label}
                    </span>
                    . Enter your mobile number.
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
                  {role === "teacher" ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-full rounded-xl text-sm"
                      onClick={() => {
                        setPhone(DUAL_ROLE_DEMO_TEACHER.phone);
                        setCountry(COUNTRIES.find((c) => c.code === "IN") ?? COUNTRIES[0]);
                        setPhoneTouched(false);
                      }}
                    >
                      Use dual-role demo teacher ({DUAL_ROLE_DEMO_TEACHER.phone})
                    </Button>
                  ) : null}
                </div>
                <Button onClick={next} disabled={!phoneValid} className="login-primary-action">
                  Continue
                </Button>
                <p className="text-xs leading-relaxed text-muted-foreground text-center">
                  By continuing you agree to LumenX Connect&apos;s{" "}
                  <Link to="/terms" className="text-primary font-medium hover:underline">
                    Terms & Conditions
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-primary font-medium hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            )}

            {step === "password" && (
              <div className="login-step-body connect-step-enter">
                <BackButton onClick={back} />
                <div>
                  <h2 className="login-step-title font-display text-2xl font-semibold sm:text-[1.75rem]">
                    Password
                  </h2>
                  <p className="login-step-subtitle">
                    Enter your password for {fullPhone}.
                  </p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="login-password" className="text-sm font-medium">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="login-password"
                      type={showPwd ? "text" : "password"}
                      placeholder="Your password"
                      autoFocus
                      className="pl-10 pr-11 h-12 rounded-xl text-base"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                      onKeyDown={(e) => e.key === "Enter" && next()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      className="login-field-toggle"
                      aria-label={showPwd ? "Hide password" : "Show password"}
                    >
                      {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <p className="login-demo-hint">
                    {role === "student" ? (
                      <>
                        Returning student ({DEMO_RETURNING_STUDENT_PHONE}):{" "}
                        <span className="font-mono">{DEMO_CONNECT_PASSWORD}</span>
                        <br />
                        First-time student ({DEMO_FIRST_TIME_STUDENT_PHONE}):{" "}
                        <span className="font-mono">{STUDENT_DEFAULT_PASSWORD}</span>
                      </>
                    ) : (
                      <>
                        Demo password: <span className="font-mono">{DEMO_CONNECT_PASSWORD}</span>
                      </>
                    )}
                  </p>
                </div>
                <Button onClick={next} disabled={loading} className="login-primary-action">
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Verifying…
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
                {role === "student" && loginMode === "signIn" && (
                  <button
                    type="button"
                    onClick={startForgotPassword}
                    className="min-h-[2.75rem] w-full text-center text-sm text-primary font-medium hover:underline touch-manipulation"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            )}

            {step === "otp" && (
              <div className="login-step-body connect-step-enter">
                <BackButton onClick={back} />
                <div>
                  <h2 className="login-step-title font-display text-2xl font-semibold sm:text-[1.75rem]">
                    Verify
                  </h2>
                  <p className="login-step-subtitle">We sent a 6-digit code to {fullPhone}.</p>
                </div>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
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
                  ) : loginMode === "firstSetup" ? (
                    "Verify & set password"
                  ) : (
                    "Verify & continue"
                  )}
                </Button>
                <p className="login-demo-hint text-center">
                  Demo OTP: <span className="font-mono">{DEMO_CONNECT_OTP}</span>
                </p>
              </div>
            )}

            {step === "setPassword" && (
              <div className="login-step-body connect-step-enter">
                <BackButton onClick={back} />
                <div>
                  <h2 className="login-step-title font-display text-2xl font-semibold sm:text-[1.75rem]">
                    Create password
                  </h2>
                  <p className="login-step-subtitle">
                    Choose a secure password for{" "}
                    <span className="text-foreground font-medium">
                      {instituteId
                        ? getStudentAccountDisplayName(fullPhone, instituteId)
                        : "your account"}
                    </span>
                    . You&apos;ll use this on future sign-ins.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label htmlFor="login-new-password" className="text-sm font-medium">
                      New password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="login-new-password"
                        type={showNewPwd ? "text" : "password"}
                        placeholder="At least 8 characters"
                        autoFocus
                        className="pl-10 pr-11 h-12 rounded-xl text-base"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPwd((s) => !s)}
                        className="login-field-toggle"
                        aria-label={showNewPwd ? "Hide new password" : "Show new password"}
                      >
                        {showNewPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="login-confirm-password" className="text-sm font-medium">
                      Confirm password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="login-confirm-password"
                        type={showConfirmPwd ? "text" : "password"}
                        placeholder="Re-enter password"
                        className="pl-10 pr-11 h-12 rounded-xl text-base"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                        onKeyDown={(e) => e.key === "Enter" && next()}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPwd((s) => !s)}
                        className="login-field-toggle"
                        aria-label={showConfirmPwd ? "Hide confirm password" : "Show confirm password"}
                      >
                        {showConfirmPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="login-demo-hint">
                    Include an uppercase letter and a number.
                  </p>
                </div>
                <Button
                  onClick={next}
                  disabled={loading || !newPassword || !confirmPassword}
                  className="login-primary-action"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Saving…
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </div>
            )}

            {step === "confirmOtp" && (
              <div className="login-step-body connect-step-enter">
                <BackButton onClick={back} />
                <div>
                  <h2 className="login-step-title font-display text-2xl font-semibold sm:text-[1.75rem]">
                    Verify again
                  </h2>
                  <p className="login-step-subtitle">
                    Enter the OTP sent to {fullPhone} to confirm your new password.
                  </p>
                </div>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
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
                    "Verify OTP"
                  )}
                </Button>
                <p className="login-demo-hint text-center">
                  Demo OTP: <span className="font-mono">{DEMO_CONNECT_OTP}</span>
                </p>
              </div>
            )}

            {step === "confirmPassword" && (
              <div className="login-step-body connect-step-enter">
                <BackButton onClick={back} />
                <div>
                  <h2 className="login-step-title font-display text-2xl font-semibold sm:text-[1.75rem]">
                    Confirm password
                  </h2>
                  <p className="login-step-subtitle">
                    Enter the password you just created to complete sign-in.
                  </p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="login-confirm-final-password" className="text-sm font-medium">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="login-confirm-final-password"
                      type={showPwd ? "text" : "password"}
                      placeholder="Your new password"
                      autoFocus
                      className="pl-10 pr-11 h-12 rounded-xl text-base"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                      onKeyDown={(e) => e.key === "Enter" && next()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      className="login-field-toggle"
                      aria-label={showPwd ? "Hide password" : "Show password"}
                    >
                      {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <Button onClick={next} disabled={loading || !password} className="login-primary-action">
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </div>
            )}

            {step === "forgotPassword" && (
              <div className="login-step-body connect-step-enter">
                <BackButton onClick={back} />
                <div>
                  <h2 className="login-step-title font-display text-2xl font-semibold sm:text-[1.75rem]">
                    Reset password
                  </h2>
                  <p className="login-step-subtitle">Choose a new password for {fullPhone}.</p>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label htmlFor="login-forgot-new-password" className="text-sm font-medium">
                      New password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="login-forgot-new-password"
                        type={showNewPwd ? "text" : "password"}
                        placeholder="At least 8 characters"
                        autoFocus
                        className="pl-10 pr-11 h-12 rounded-xl text-base"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPwd((s) => !s)}
                        className="login-field-toggle"
                        aria-label={showNewPwd ? "Hide new password" : "Show new password"}
                      >
                        {showNewPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="login-forgot-confirm-password" className="text-sm font-medium">
                      Re-enter password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="login-forgot-confirm-password"
                        type={showConfirmPwd ? "text" : "password"}
                        placeholder="Re-enter password"
                        className="pl-10 pr-11 h-12 rounded-xl text-base"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                        onKeyDown={(e) => e.key === "Enter" && next()}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPwd((s) => !s)}
                        className="login-field-toggle"
                        aria-label={showConfirmPwd ? "Hide confirm password" : "Show confirm password"}
                      >
                        {showConfirmPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={next}
                  disabled={!newPassword || !confirmPassword}
                  className="login-primary-action"
                >
                  Continue
                </Button>
              </div>
            )}

            {step === "forgotOtp" && (
              <div className="login-step-body connect-step-enter">
                <BackButton onClick={back} />
                <div>
                  <h2 className="login-step-title font-display text-2xl font-semibold sm:text-[1.75rem]">
                    Verify OTP
                  </h2>
                  <p className="login-step-subtitle">
                    Enter the code sent to {fullPhone} to confirm your new password.
                  </p>
                </div>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
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
                    "Reset & sign in"
                  )}
                </Button>
                <p className="login-demo-hint text-center">
                  Demo OTP: <span className="font-mono">{DEMO_CONNECT_OTP}</span>
                </p>
              </div>
            )}
          </div>
        </LoginKeyboardShell>
      </div>
    </div>
  );
}

function Stepper({
  step,
  role,
  loginMode,
}: {
  step: Step;
  role: Role | null;
  loginMode: LoginMode;
}) {
  const order: Step[] =
    role === "student" && loginMode === "firstSetup"
      ? ["institute", "role", "phone", "password", "otp", "setPassword", "confirmOtp", "confirmPassword"]
      : role === "student" && loginMode === "forgotPassword"
        ? ["institute", "role", "phone", "password", "forgotPassword", "forgotOtp"]
        : role === "student"
          ? ["institute", "role", "phone", "password", "otp"]
          : ["institute", "role", "phone", "password", "otp"];
  const idx = Math.max(0, order.indexOf(step));
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

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="login-back-btn">
      <ArrowLeft className="size-4 shrink-0" aria-hidden /> Back
    </button>
  );
}
