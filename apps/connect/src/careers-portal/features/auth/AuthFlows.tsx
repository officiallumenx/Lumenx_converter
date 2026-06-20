import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button, Input, InputOTP, InputOTPGroup, InputOTPSlot, Label } from "@lumenx/ui";
import { cn } from "@lumenx/ui";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Eye, EyeOff, Mail, Phone, UserRound } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { DEMO_CONNECT_OTP } from "@lumenx/auth";
import { PhoneInput, COUNTRIES, validatePhone, type Country } from "@/components/app/PhoneInput";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import { SignupStepper } from "@/careers-portal/features/auth/SignupStepper";
import { passwordSchema, signupContactSchema, signupPasswordSchema, signupProfileSchema } from "@/lib/careers/schemas";
import { careersDefaultRoute, ORGANIZATION_TYPE_OPTIONS } from "@/lib/careers/auth-utils";
import { createInitialCandidateProfile } from "@/lib/careers/profile-repository";
import { getAllInstituteProfiles } from "@/lib/careers/institute-profiles";
import type { CareersAccountType, OrganizationType } from "@/lib/careers/types";

type Step = "identifier" | "password";

export function SignInFlow({ redirect, job }: { redirect?: string; job?: string }) {
  const { signIn } = useCareersAuth();
  const nav = useNavigate();
  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = () => {
    if (step === "identifier") {
      const r = z.object({ identifier: z.string().min(3) }).safeParse({ identifier });
      if (!r.success) return toast.error("Enter mobile or email");
      setStep("password");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const loggedIn = signIn(identifier, password);
      setLoading(false);
      if (loggedIn) {
        toast.success("Welcome back!");
        if (redirect) {
          nav({
            to: redirect as "/",
            search: redirect === "/careers/apply" && job ? { job } : undefined,
          });
        } else {
          nav({ to: careersDefaultRoute(loggedIn) });
        }
      } else {
        toast.error("Invalid credentials");
      }
    }, 400);
  };

  return (
    <div className="mx-auto max-w-md animate-in fade-in duration-300">
      <h1 className="font-display text-2xl font-bold">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">Use your mobile number or email — we route you to the right workspace automatically.</p>

      <div className="mt-8 space-y-4">
        {step === "identifier" ? (
          <div className="space-y-2">
            <Label>Mobile or email</Label>
            <Input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="9876543210 or you@email.com"
              autoComplete="username"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Password</Label>
            <div className="relative">
              <Input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPwd(!showPwd)}
              >
                {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <button type="button" className="text-xs text-primary" onClick={() => setStep("identifier")}>
              Change account
            </button>
          </div>
        )}
        <Button className="w-full h-11" onClick={submit} disabled={loading}>
          {loading ? "Signing in…" : step === "identifier" ? "Continue" : "Sign in"}
        </Button>
      </div>

      <details className="mt-6 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">Demo credentials</summary>
        <p className="mt-2">Job seeker: priya.candidate@example.com / demo123</p>
        <p className="mt-1">Recruiter: hr@lumenx.edu / demo123</p>
      </details>

      <p className="mt-4 text-center text-sm">
        <Link to="/careers/forgot-password" className="text-muted-foreground hover:text-primary">
          Forgot password?
        </Link>
      </p>

      <div className="mt-8 rounded-2xl border border-border p-4">
        <p className="text-sm font-medium">New to Careers?</p>
        <p className="mt-1 text-xs text-muted-foreground">Create an account — you will choose job seeker or recruiter on the next screen.</p>
        <Button className="w-full h-11 mt-4 justify-between" asChild>
          <Link to="/careers/signup">
            <span>Create account</span>
            <ArrowRight className="size-4 opacity-70" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

type SignUpStep = "accountType" | "contact" | "verifyPhone" | "verifyEmail" | "profile" | "organization" | "password" | "complete";

function AccountTypeCard({
  selected,
  onSelect,
  type,
  title,
  description,
  icon: Icon,
}: {
  selected: boolean;
  onSelect: () => void;
  type: CareersAccountType;
  title: string;
  description: string;
  icon: typeof UserRound;
}) {
  void type;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-2xl border-2 p-4 text-left transition-colors",
        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40",
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
        </div>
        <div className={cn("size-5 rounded-full border-2 shrink-0 mt-0.5", selected ? "border-primary bg-primary" : "border-muted-foreground/40")} />
      </div>
    </button>
  );
}

export function SignupFlow({ initialAccountType }: { initialAccountType?: CareersAccountType }) {
  const { signUp } = useCareersAuth();
  const nav = useNavigate();
  const employers = getAllInstituteProfiles();

  const [accountType, setAccountType] = useState<CareersAccountType | null>(initialAccountType ?? null);
  const [step, setStep] = useState<SignUpStep>(initialAccountType ? "contact" : "accountType");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [email, setEmail] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [existingOrgId, setExistingOrgId] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationCity, setOrganizationCity] = useState("");
  const [organizationState, setOrganizationState] = useState("");
  const [organizationType, setOrganizationType] = useState<OrganizationType>("education");
  const [loading, setLoading] = useState(false);
  const [createdRoute, setCreatedRoute] = useState<"/careers/dashboard" | "/careers/recruiter" | null>(null);

  const isRecruiter = accountType === "recruiter";
  const phoneFull = `${country.code} ${phone}`.trim();

  const stepLabels = useMemo(() => {
    const recruiter = accountType === "recruiter";
    const base = ["Account type", "Contact", "Verify phone", "Verify email", "Profile"];
    if (recruiter) base.push("Organization");
    base.push("Password");
    return base;
  }, [accountType]);

  const stepIndex = useMemo(() => {
    const map: Record<SignUpStep, number> = {
      accountType: 0,
      contact: 1,
      verifyPhone: 2,
      verifyEmail: 3,
      profile: 4,
      organization: isRecruiter ? 5 : 4,
      password: isRecruiter ? 6 : 5,
      complete: isRecruiter ? 6 : 5,
    };
    return map[step];
  }, [step, isRecruiter]);

  const goBack = () => {
    if (step === "contact") setStep("accountType");
    else if (step === "verifyPhone") setStep("contact");
    else if (step === "verifyEmail") setStep("verifyPhone");
    else if (step === "profile") setStep("verifyEmail");
    else if (step === "organization") setStep("profile");
    else if (step === "password") setStep(isRecruiter ? "organization" : "profile");
  };

  const continueFromAccountType = () => {
    if (!accountType) return toast.error("Select job seeker or recruiter");
    setStep("contact");
  };

  const continueFromContact = () => {
    const emailCheck = signupContactSchema.safeParse({ email: email.trim() });
    if (!emailCheck.success) return toast.error(emailCheck.error.errors[0]?.message ?? "Enter a valid email");
    if (!validatePhone(phone.replace(/\D/g, ""), country)) return toast.error("Enter a valid mobile number");
    toast.message(`OTP sent to ${phoneFull} (demo: ${DEMO_CONNECT_OTP})`);
    setPhoneOtp("");
    setStep("verifyPhone");
  };

  const verifyPhoneOtp = () => {
    if (phoneOtp !== DEMO_CONNECT_OTP) return toast.error("Invalid OTP");
    toast.success("Mobile number verified");
    toast.message(`OTP sent to ${email.trim()} (demo: ${DEMO_CONNECT_OTP})`);
    setEmailOtp("");
    setStep("verifyEmail");
  };

  const verifyEmailOtp = () => {
    if (emailOtp !== DEMO_CONNECT_OTP) return toast.error("Invalid OTP");
    toast.success("Email verified");
    setStep("profile");
  };

  const continueFromProfile = () => {
    const parsed = signupProfileSchema.safeParse({
      name: name.trim(),
      city: city.trim(),
      state: state.trim(),
      currentRole: isRecruiter ? (currentRole.trim() || "Recruiter") : currentRole.trim(),
    });
    if (!parsed.success) return toast.error(parsed.error.errors[0]?.message ?? "Complete all profile fields");
    if (isRecruiter) setStep("organization");
    else setStep("password");
  };

  const continueFromOrganization = () => {
    const linked = existingOrgId ? employers.find((e) => e.instituteId === existingOrgId) : undefined;
    const orgName = linked?.name ?? organizationName.trim();
    if (!orgName) return toast.error("Enter or select your organization");
    setStep("password");
  };

  const finish = () => {
    if (!accountType) return;
    const pw = signupPasswordSchema.safeParse({ password, confirmPassword });
    if (!pw.success) return toast.error(pw.error.errors[0]?.message ?? "Invalid password");

    const linked = existingOrgId ? employers.find((e) => e.instituteId === existingOrgId) : undefined;

    setLoading(true);
    setTimeout(() => {
      const user = signUp({
        name: name.trim(),
        email: email.trim(),
        phone: phoneFull,
        password,
        emailVerified: true,
        phoneVerified: true,
        accountType,
        organizationId: linked?.instituteId ?? (isRecruiter ? `org-${Date.now()}` : undefined),
        organizationName: linked?.name ?? (isRecruiter ? organizationName.trim() : undefined),
        organizationType: isRecruiter ? organizationType : undefined,
      });
      if (accountType === "job_seeker") {
        createInitialCandidateProfile({
          candidateId: user.id,
          name: name.trim(),
          headline: currentRole.trim(),
          city: city.trim(),
          state: state.trim(),
        });
      }
      setLoading(false);
      setCreatedRoute(careersDefaultRoute(user));
      setStep("complete");
      toast.success("Account created!");
    }, 400);
  };

  const stepTitle = (() => {
    switch (step) {
      case "accountType": return "Choose account type";
      case "contact": return "Contact details";
      case "verifyPhone": return "Verify mobile number";
      case "verifyEmail": return "Verify email address";
      case "profile": return "Complete your profile";
      case "organization": return "Organization details";
      case "password": return "Set your password";
      case "complete": return "You're all set!";
      default: return "Create account";
    }
  })();

  const stepSubtitle = (() => {
    switch (step) {
      case "accountType": return "Are you looking for a job or hiring talent?";
      case "contact": return "Mobile and email are required for all accounts.";
      case "verifyPhone": return `Enter the code sent to ${phoneFull || "your mobile"}.`;
      case "verifyEmail": return `Enter the code sent to ${email.trim() || "your email"}.`;
      case "profile": return "Basic details to personalize your account.";
      case "organization": return "Tell us about your company or institute.";
      case "password": return "Create and confirm a secure password.";
      case "complete": return "Your account is ready. Continue to your workspace.";
      default: return "";
    }
  })();

  return (
    <div className="mx-auto max-w-md animate-in fade-in duration-300">
      <Link to="/careers/login" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Back to sign in
      </Link>

      {step !== "complete" && (
        <SignupStepper steps={stepLabels} currentIndex={stepIndex} />
      )}

      <h1 className="font-display text-2xl font-bold">{stepTitle}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{stepSubtitle}</p>

      {step === "accountType" && (
        <div className="mt-8 space-y-3">
          <AccountTypeCard
            selected={accountType === "job_seeker"}
            onSelect={() => setAccountType("job_seeker")}
            type="job_seeker"
            title="Job seeker"
            description="Browse opportunities, apply online, and track your applications."
            icon={UserRound}
          />
          <AccountTypeCard
            selected={accountType === "recruiter"}
            onSelect={() => setAccountType("recruiter")}
            type="recruiter"
            title="Recruiter"
            description="Post roles, review applicants, and manage hiring for your organization."
            icon={Building2}
          />
          <Button className="w-full h-11 mt-4" onClick={continueFromAccountType} disabled={!accountType}>
            Continue
          </Button>
        </div>
      )}

      {step === "contact" && (
        <div className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Phone className="size-4 text-primary" />
              Mobile number <span className="text-destructive">*</span>
            </Label>
            <PhoneInput value={phone} onChange={setPhone} country={country} onCountryChange={setCountry} />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="size-4 text-primary" />
              Email address <span className="text-destructive">*</span>
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoComplete="email"
            />
          </div>
          <p className="text-xs text-muted-foreground">You will verify both with a one-time code on the next steps.</p>
          <div className="flex gap-2">
            <Button variant="outline" className="h-11" onClick={goBack}>Back</Button>
            <Button className="flex-1 h-11" onClick={continueFromContact}>Continue</Button>
          </div>
        </div>
      )}

      {step === "verifyPhone" && (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-muted-foreground rounded-xl bg-muted/50 px-3 py-2">
            Code sent to <span className="font-medium text-foreground">{phoneFull}</span>
          </p>
          <InputOTP maxLength={6} value={phoneOtp} onChange={setPhoneOtp}>
            <InputOTPGroup className="justify-center w-full">
              {Array.from({ length: 6 }).map((_, i) => (<InputOTPSlot key={i} index={i} />))}
            </InputOTPGroup>
          </InputOTP>
          <p className="text-xs text-center text-muted-foreground">Demo OTP: {DEMO_CONNECT_OTP}</p>
          <div className="flex gap-2">
            <Button variant="outline" className="h-11" onClick={goBack}>Back</Button>
            <Button className="flex-1 h-11" onClick={verifyPhoneOtp}>Verify mobile</Button>
          </div>
        </div>
      )}

      {step === "verifyEmail" && (
        <div className="mt-8 space-y-4">
          <div className="rounded-xl bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-muted-foreground">
            <span className="text-primary font-medium">Mobile verified</span> · {phoneFull}
          </div>
          <p className="text-sm text-muted-foreground rounded-xl bg-muted/50 px-3 py-2">
            Code sent to <span className="font-medium text-foreground">{email.trim()}</span>
          </p>
          <InputOTP maxLength={6} value={emailOtp} onChange={setEmailOtp}>
            <InputOTPGroup className="justify-center w-full">
              {Array.from({ length: 6 }).map((_, i) => (<InputOTPSlot key={i} index={i} />))}
            </InputOTPGroup>
          </InputOTP>
          <p className="text-xs text-center text-muted-foreground">Demo OTP: {DEMO_CONNECT_OTP}</p>
          <div className="flex gap-2">
            <Button variant="outline" className="h-11" onClick={goBack}>Back</Button>
            <Button className="flex-1 h-11" onClick={verifyEmailOtp}>Verify email</Button>
          </div>
        </div>
      )}

      {step === "profile" && (
        <div className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={isRecruiter ? "Kavitha Reddy" : "Priya Nair"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Hyderabad" />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="Telangana" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{isRecruiter ? "Your role (optional)" : "Current role or headline"}</Label>
            <Input
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value)}
              placeholder={isRecruiter ? "HR Manager" : "Software Engineer · 3 yrs exp"}
            />
          </div>
          <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 space-y-1 text-xs text-muted-foreground">
            <p className="flex items-center gap-2"><span className="text-primary font-medium">✓</span> Mobile verified · {phoneFull}</p>
            <p className="flex items-center gap-2"><span className="text-primary font-medium">✓</span> Email verified · {email.trim()}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="h-11" onClick={goBack}>Back</Button>
            <Button className="flex-1 h-11" onClick={continueFromProfile}>Continue</Button>
          </div>
        </div>
      )}

      {step === "organization" && isRecruiter && (
        <div className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label>Link existing employer (optional)</Label>
            <select
              value={existingOrgId}
              onChange={(e) => {
                setExistingOrgId(e.target.value);
                const picked = employers.find((x) => x.instituteId === e.target.value);
                if (picked) {
                  setOrganizationName(picked.name);
                  setOrganizationCity(picked.city);
                  setOrganizationState(picked.state);
                }
              }}
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">Register a new organization</option>
              {employers.map((e) => (
                <option key={e.instituteId} value={e.instituteId}>{e.name}</option>
              ))}
            </select>
          </div>
          {!existingOrgId && (
            <>
              <div className="space-y-2">
                <Label>Organization name</Label>
                <Input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Acme Corp" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>City</Label><Input value={organizationCity} onChange={(e) => setOrganizationCity(e.target.value)} /></div>
                <div className="space-y-2"><Label>State</Label><Input value={organizationState} onChange={(e) => setOrganizationState(e.target.value)} /></div>
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <select
                  value={organizationType}
                  onChange={(e) => setOrganizationType(e.target.value as OrganizationType)}
                  className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                >
                  {ORGANIZATION_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="h-11" onClick={goBack}>Back</Button>
            <Button className="flex-1 h-11" onClick={continueFromOrganization}>Continue</Button>
          </div>
        </div>
      )}

      {step === "password" && (
        <div className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label>New password</Label>
            <div className="relative">
              <Input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                autoComplete="new-password"
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPwd(!showPwd)}>
                {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Confirm password</Label>
            <div className="relative">
              <Input
                type={showConfirmPwd ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowConfirmPwd(!showConfirmPwd)}>
                {showConfirmPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="h-11" onClick={goBack}>Back</Button>
            <Button className="flex-1 h-11" onClick={finish} disabled={loading || password !== confirmPassword}>
              {loading ? "Creating…" : "Create account"}
            </Button>
          </div>
        </div>
      )}

      {step === "complete" && (
        <div className="mt-8 text-center space-y-4">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="size-8" />
          </div>
          <p className="text-sm text-muted-foreground">
            {isRecruiter
              ? "Your recruiter workspace is ready. Start exploring hiring tools."
              : "Your job seeker profile is created. Browse roles and apply when ready."}
          </p>
          {createdRoute && (
            <p className="text-xs text-muted-foreground capitalize">{isRecruiter ? "Recruiter" : "Job seeker"} account created</p>
          )}
          <Button
            className="w-full h-11"
            onClick={() => createdRoute && nav({ to: createdRoute })}
            disabled={!createdRoute}
          >
            Go to {isRecruiter ? "Recruiter Workspace" : "Dashboard"}
          </Button>
        </div>
      )}

      {step !== "complete" && step !== "accountType" && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/careers/login" className="text-primary font-medium">Sign in</Link>
        </p>
      )}

      {step === "accountType" && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/careers/login" className="text-primary font-medium">Sign in</Link>
        </p>
      )}
    </div>
  );
}

type ForgotStep = "identifier" | "otp" | "password" | "success";

export function ForgotPasswordFlow() {
  const { resetPassword } = useCareersAuth();
  const [step, setStep] = useState<ForgotStep>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <div className="mx-auto max-w-md animate-in fade-in duration-300">
      <Link to="/careers/login" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Back
      </Link>
      <h1 className="font-display text-2xl font-bold">Reset password</h1>

      {step === "identifier" && (
        <div className="mt-8 space-y-4">
          <Label>Mobile or email</Label>
          <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          <Button className="w-full h-11" onClick={() => { toast.message(`OTP: ${DEMO_CONNECT_OTP}`); setStep("otp"); }}>Send OTP</Button>
        </div>
      )}

      {step === "otp" && (
        <div className="mt-8 space-y-4">
          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
            <InputOTPGroup className="justify-center">
              {Array.from({ length: 6 }).map((_, i) => (<InputOTPSlot key={i} index={i} />))}
            </InputOTPGroup>
          </InputOTP>
          <Button className="w-full h-11" onClick={() => (otp === DEMO_CONNECT_OTP ? setStep("password") : toast.error("Invalid OTP"))}>Verify</Button>
        </div>
      )}

      {step === "password" && (
        <div className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label>New password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" autoComplete="new-password" />
          </div>
          <div className="space-y-2">
            <Label>Confirm password</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" autoComplete="new-password" />
          </div>
          <Button
            className="w-full h-11"
            onClick={() => {
              const pw = signupPasswordSchema.safeParse({ password, confirmPassword });
              if (!pw.success) return toast.error(pw.error.errors[0]?.message);
              if (resetPassword(identifier, password)) {
                toast.success("Password updated");
                setStep("success");
              } else toast.error("Account not found");
            }}
          >
            Update password
          </Button>
        </div>
      )}

      {step === "success" && (
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">Your password has been updated.</p>
          <Button className="mt-6 w-full h-11" asChild><Link to="/careers/login">Sign in</Link></Button>
        </div>
      )}
    </div>
  );
}
