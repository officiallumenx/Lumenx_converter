import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button, Input, InputOTP, InputOTPGroup, InputOTPSlot, Label } from "@lumenx/ui";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { DEMO_CONNECT_OTP } from "@lumenx/auth";
import { INSTITUTE_KIND_LABEL, type InstituteKind } from "@lumenx/types";
import type { DemoInstituteProfile } from "@lumenx/types";
import { PhoneInput, COUNTRIES, validatePhone, type Country } from "@/components/app/PhoneInput";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { TermsAcceptCheckbox } from "@/components/legal/TermsAcceptCheckbox";
import { PasswordCreateFields } from "@/admissions-portal/features/auth/PasswordCreateFields";
import { LumenxAdminContinueCard } from "@/admissions-portal/features/auth/LumenxAdminContinueCard";
import {
  signupPasswordSchema,
  signupWithTermsSchema,
  SYLLABUS_OPTIONS,
} from "@/lib/admissions/schemas";
import { registerCustomInstitute } from "@/lib/admissions/institutes-data";
import { saveAdmissionsInstituteProfile } from "@/lib/admissions/shared-institute-profile";
import type { AdmissionsAccountType } from "@/lib/admissions/types";
import { useSafeTimeout } from "@/lib/use-safe-timeout";

type AccountChoice = "parent" | "institute";

const INSTITUTE_KIND_OPTIONS = Object.entries(INSTITUTE_KIND_LABEL) as [InstituteKind, string][];

function AccountTypePicker({
  onSelect,
}: {
  onSelect: (type: AccountChoice) => void;
}) {
  return (
    <div className="mx-auto max-w-md animate-in fade-in duration-300">
      <h1 className="font-display text-2xl font-bold">Admissions sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose how you want to continue — parent / applicant or institute.
      </p>

      <div className="mt-8 space-y-3">
        <button
          type="button"
          onClick={() => onSelect("parent")}
          className="flex w-full items-start gap-3 rounded-2xl border-2 border-border p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
        >
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Parent / applicant</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Apply to schools, track applications, upload documents
            </span>
          </span>
          <ArrowRight className="mt-2 size-4 shrink-0 text-muted-foreground" />
        </button>

        <button
          type="button"
          onClick={() => onSelect("institute")}
          className="flex w-full items-start gap-3 rounded-2xl border-2 border-border p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
        >
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Institute</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              LumenX Admin, standalone signup, or institute login
            </span>
          </span>
          <ArrowRight className="mt-2 size-4 shrink-0 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

function MobileLoginForm({
  accountType,
  title,
  subtitle,
  demoHint,
  signupSearch,
  signupLabel,
  redirect,
  program,
  institute,
  onBack,
}: {
  accountType: AdmissionsAccountType;
  title: string;
  subtitle: string;
  demoHint: string;
  signupSearch: { type: "parent" | "institute" };
  signupLabel: string;
  redirect?: string;
  program?: string;
  institute?: string;
  onBack: () => void;
}) {
  const { signIn } = useAdmissionsAuth();
  const nav = useNavigate();
  const safeTimeout = useSafeTimeout();
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = () => {
    const digits = phone.replace(/\D/g, "");
    if (!validatePhone(digits, country)) return toast.error("Enter a valid mobile number");
    if (!password.trim()) return toast.error("Enter your password");

    const identifier = `${country.code} ${phone}`;
    setLoading(true);
    safeTimeout(() => {
      const loggedIn = signIn(identifier, password, accountType);
      setLoading(false);
      if (!loggedIn) {
        toast.error(
          accountType === "parent"
            ? "Invalid parent credentials"
            : "Invalid institute credentials",
        );
        return;
      }
      toast.success("Welcome back!");
      if (redirect) {
        nav({
          to: redirect as "/",
          search: redirect === "/admissions/apply" ? { program, institute } : undefined,
        });
      } else {
        nav({
          to:
            loggedIn.accountType === "institute_admin"
              ? "/admissions/institute"
              : "/admissions/applications",
        });
      }
    }, 400);
  };

  return (
    <div className="mx-auto max-w-md animate-in fade-in duration-300">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Back
      </button>
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

      <div className="mt-4 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        {demoHint}
      </div>

      <div className="mt-6 space-y-4">
        <PhoneInput
          value={phone}
          onChange={setPhone}
          country={country}
          onCountryChange={setCountry}
        />
        <div className="space-y-2">
          <Label>Password</Label>
          <div className="relative">
            <Input
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowPwd(!showPwd)}
              aria-label={showPwd ? "Hide password" : "Show password"}
            >
              {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
        <Button className="w-full" onClick={submit} disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </div>

      <p className="mt-4 text-center text-sm">
        <Link to="/admissions/forgot-password" className="text-muted-foreground hover:text-primary">
          Forgot password?
        </Link>
      </p>

      <div className="mt-8 rounded-2xl border border-border p-4">
        <p className="text-sm font-medium">New here?</p>
        <p className="mt-1 text-xs text-muted-foreground">{signupLabel}</p>
        <Button className="mt-4 w-full justify-between" asChild>
          <Link to="/admissions/signup" search={signupSearch}>
            <span>Create account</span>
            <ArrowRight className="size-4 opacity-70" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function InstituteHub({
  onBack,
  onLogin,
  redirect,
  program,
  institute,
}: {
  onBack: () => void;
  onLogin: () => void;
  redirect?: string;
  program?: string;
  institute?: string;
}) {
  void redirect;
  void program;
  void institute;
  return (
    <div className="mx-auto max-w-md animate-in fade-in duration-300">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Back
      </button>
      <h1 className="font-display text-2xl font-bold">Institute access</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose LumenX Admin, create a standalone institute account, or sign in.
      </p>

      <div className="mt-6 space-y-3">
        <LumenxAdminContinueCard mode="sign-in" />

        <button
          type="button"
          onClick={onLogin}
          className="flex w-full items-start gap-3 rounded-2xl border border-border p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
        >
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
            <LogIn className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Institute login</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Mobile number and password for your Admissions institute account
            </span>
          </span>
          <ArrowRight className="mt-2 size-4 shrink-0 text-muted-foreground" />
        </button>

        <Link
          to="/admissions/signup"
          search={{ type: "institute" }}
          className="flex w-full items-start gap-3 rounded-2xl border border-border p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
        >
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
            <UserPlus className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Standalone institute signup</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Verify mobile & email with OTP, add institute details, set a strong password
            </span>
          </span>
          <ArrowRight className="mt-2 size-4 shrink-0 text-muted-foreground" />
        </Link>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <ShieldCheck className="mr-1 inline size-3.5 align-text-bottom" />
        LumenX Admin uses the same credentials as the Admin app (demo: principal@lumenx.edu)
      </p>
    </div>
  );
}

export function SignInFlow({
  redirect,
  program,
  institute,
  initialType,
}: {
  redirect?: string;
  program?: string;
  institute?: string;
  initialType?: AccountChoice;
}) {
  const [accountType, setAccountType] = useState<AccountChoice | null>(initialType ?? null);
  const [instituteView, setInstituteView] = useState<"hub" | "login">(
    initialType === "institute" ? "hub" : "hub",
  );

  if (!accountType) {
    return <AccountTypePicker onSelect={setAccountType} />;
  }

  if (accountType === "parent") {
    return (
      <MobileLoginForm
        accountType="parent"
        title="Parent login"
        subtitle="Sign in with your mobile number and password."
        demoHint="Demo: 9876543210 / demo123"
        signupSearch={{ type: "parent" }}
        signupLabel="Create a parent account with mobile OTP verification."
        redirect={redirect}
        program={program}
        institute={institute}
        onBack={() => setAccountType(null)}
      />
    );
  }

  if (instituteView === "login") {
    return (
      <MobileLoginForm
        accountType="institute_admin"
        title="Institute login"
        subtitle="Sign in with your institute mobile number and password."
        demoHint="Demo: 4044558801 / demo123 (or use LumenX Admin)"
        signupSearch={{ type: "institute" }}
        signupLabel="Register a standalone institute on LumenX Admissions."
        redirect={redirect}
        program={program}
        institute={institute}
        onBack={() => setInstituteView("hub")}
      />
    );
  }

  return (
    <InstituteHub
      onBack={() => setAccountType(null)}
      onLogin={() => setInstituteView("login")}
      redirect={redirect}
      program={program}
      institute={institute}
    />
  );
}

type ParentSignUpStep = "contact" | "otp" | "password";

export function ParentSignupFlow() {
  const { signUp } = useAdmissionsAuth();
  const nav = useNavigate();
  const safeTimeout = useSafeTimeout();
  const [step, setStep] = useState<ParentSignUpStep>("contact");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const phoneDisplay = `${country.code} ${phone}`;

  const sendOtp = () => {
    const digits = phone.replace(/\D/g, "");
    if (!validatePhone(digits, country)) return toast.error("Enter a valid mobile number");
    if (email.trim() && !email.includes("@")) return toast.error("Enter a valid email or leave blank");
    toast.message(`OTP sent to mobile (demo: ${DEMO_CONNECT_OTP})`);
    setStep("otp");
  };

  const verifyOtp = () => {
    if (otp !== DEMO_CONNECT_OTP) return toast.error("Invalid OTP");
    setStep("password");
  };

  const finish = () => {
    const validated = signupWithTermsSchema.safeParse({
      password,
      confirmPassword,
      acceptedTerms,
    });
    if (!validated.success) {
      return toast.error(validated.error.errors[0]?.message ?? "Check password and terms");
    }
    setLoading(true);
    safeTimeout(() => {
      signUp({
        name: name.trim() || `Parent ${phone.replace(/\D/g, "").slice(-4)}`,
        email: email.trim() || undefined,
        phone: phoneDisplay,
        password,
        accountType: "parent",
      });
      setLoading(false);
      toast.success("Parent account created!");
      nav({ to: "/admissions/applications" });
    }, 400);
  };

  return (
    <div className="mx-auto max-w-md animate-in fade-in duration-300">
      <Link
        to="/admissions/login"
        search={{ type: "parent" }}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Back to login
      </Link>
      <div className="flex items-center gap-2">
        <Users className="size-6 text-primary" />
        <h1 className="font-display text-2xl font-bold">Parent sign up</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Mobile is required. Email is optional. We verify your mobile with OTP.
      </p>

      {step === "contact" && (
        <div className="mt-8 space-y-4">
          <PhoneInput
            value={phone}
            onChange={setPhone}
            country={country}
            onCountryChange={setCountry}
          />
          <div className="space-y-2">
            <Label>
              Email <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@example.com"
              autoComplete="email"
            />
          </div>
          <Button className="w-full" onClick={sendOtp}>
            Send OTP to mobile
          </Button>
        </div>
      )}

      {step === "otp" && (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-muted-foreground">Enter OTP sent to {phoneDisplay}</p>
          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
            <InputOTPGroup className="justify-center">
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <Button className="w-full" onClick={verifyOtp}>
            Verify mobile
          </Button>
          <button
            type="button"
            className="w-full text-center text-xs text-primary"
            onClick={() => setStep("contact")}
          >
            Change number
          </button>
        </div>
      )}

      {step === "password" && (
        <div className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label>Your full name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Priya Sharma"
              autoComplete="name"
            />
          </div>
          <PasswordCreateFields
            password={password}
            confirmPassword={confirmPassword}
            onPasswordChange={setPassword}
            onConfirmChange={setConfirmPassword}
            showPwd={showPwd}
            showConfirmPwd={showConfirmPwd}
            onToggleShowPwd={() => setShowPwd((v) => !v)}
            onToggleShowConfirmPwd={() => setShowConfirmPwd((v) => !v)}
            idPrefix="parent-signup"
          />
          <TermsAcceptCheckbox
            checked={acceptedTerms}
            onCheckedChange={setAcceptedTerms}
            termsTo="/admissions/terms"
            privacyTo="/admissions/privacy"
            cookiesTo="/cookies"
            id="admissions-parent-terms"
          />
          <Button
            className="w-full"
            onClick={finish}
            disabled={loading || !acceptedTerms || password !== confirmPassword}
          >
            {loading ? "Creating…" : "Create parent account"}
          </Button>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          to="/admissions/login"
          search={{ type: "parent" }}
          className="font-medium text-primary"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

type InstituteSignUpStep =
  | "contact"
  | "verifyPhone"
  | "verifyEmail"
  | "details"
  | "password";

export function InstituteSignupFlow() {
  const { signUp } = useAdmissionsAuth();
  const nav = useNavigate();
  const safeTimeout = useSafeTimeout();
  const [step, setStep] = useState<InstituteSignUpStep>("contact");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [email, setEmail] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [adminName, setAdminName] = useState("");
  const [instituteName, setInstituteName] = useState("");
  const [instituteCode, setInstituteCode] = useState("");
  const [instituteKind, setInstituteKind] = useState<InstituteKind>("school");
  const [syllabus, setSyllabus] = useState<string>(SYLLABUS_OPTIONS[1]!);
  const [address, setAddress] = useState("");
  const [instituteCity, setInstituteCity] = useState("");
  const [instituteState, setInstituteState] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const phoneDisplay = `${country.code} ${phone}`;

  const sendPhoneOtp = () => {
    const digits = phone.replace(/\D/g, "");
    if (!validatePhone(digits, country)) return toast.error("Enter a valid mobile number");
    if (!email.trim() || !email.includes("@")) return toast.error("Email is required for institute signup");
    toast.message(`Mobile OTP (demo: ${DEMO_CONNECT_OTP})`);
    setStep("verifyPhone");
  };

  const verifyPhone = () => {
    if (phoneOtp !== DEMO_CONNECT_OTP) return toast.error("Invalid mobile OTP");
    toast.message(`Email OTP sent to ${email} (demo: ${DEMO_CONNECT_OTP})`);
    setStep("verifyEmail");
  };

  const verifyEmail = () => {
    if (emailOtp !== DEMO_CONNECT_OTP) return toast.error("Invalid email OTP");
    setStep("details");
  };

  const continueDetails = () => {
    if (!instituteName.trim()) return toast.error("Institute name is required");
    if (!instituteCode.trim()) return toast.error("Institute code is required");
    if (!syllabus.trim()) return toast.error("Select syllabus / board");
    if (!address.trim()) return toast.error("Address is required");
    if (!instituteCity.trim() || !instituteState.trim())
      return toast.error("City and state are required");
    if (!adminName.trim()) return toast.error("Admin name is required");
    setStep("password");
  };

  const finish = () => {
    const validated = signupWithTermsSchema.safeParse({
      password,
      confirmPassword,
      acceptedTerms,
    });
    if (!validated.success) {
      return toast.error(validated.error.errors[0]?.message ?? "Check password and terms");
    }

    setLoading(true);
    safeTimeout(() => {
      const newId = `ins-custom-${Date.now()}`;
      const newName = instituteName.trim();
      registerCustomInstitute({
        id: newId,
        name: newName,
        code: instituteCode,
        city: instituteCity,
        state: instituteState,
        kind: instituteKind,
        syllabus,
        address,
        phone: phoneDisplay,
        email: email.trim(),
      });
      const starterProfile: DemoInstituteProfile = {
        name: newName,
        founded: "",
        founder: "",
        principal: adminName.trim(),
        vision: "",
        mission: "Now accepting applications on LumenX Admissions",
        ranking: "",
        logo: newName.slice(0, 3).toUpperCase(),
        profilePhoto: "",
        phone: phoneDisplay,
        email: email.trim(),
        address: [address.trim(), instituteCity.trim(), instituteState.trim()]
          .filter(Boolean)
          .join(", "),
        history: [],
        awards: [],
        achievements: [],
        customFields: [
          {
            id: "syllabus",
            title: "Syllabus / board",
            entries: [
              {
                id: "syl-1",
                heading: syllabus,
                year: "",
                subheading: "",
                fields: [],
              },
            ],
          },
        ],
      };
      saveAdmissionsInstituteProfile(newId, starterProfile);

      signUp({
        name: adminName.trim(),
        email: email.trim(),
        phone: phoneDisplay,
        password,
        accountType: "institute_admin",
        instituteId: newId,
        instituteName: newName,
      });
      setLoading(false);
      toast.success("Institute registered · visible in Browse institutes");
      nav({ to: "/admissions/institute/openings" });
    }, 400);
  };

  return (
    <div className="mx-auto max-w-md animate-in fade-in duration-300">
      <Link
        to="/admissions/login"
        search={{ type: "institute" }}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Back to institute access
      </Link>
      <div className="flex items-center gap-2">
        <Building2 className="size-6 text-primary" />
        <h1 className="font-display text-2xl font-bold">Standalone institute signup</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Mobile and email are both required and verified by OTP.
      </p>

      <div className="mt-4">
        <LumenxAdminContinueCard mode="sign-up" />
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or register standalone</span>
        </div>
      </div>

      {step === "contact" && (
        <div className="space-y-4">
          <PhoneInput
            value={phone}
            onChange={setPhone}
            country={country}
            onCountryChange={setCountry}
          />
          <div className="space-y-2">
            <Label>Email (required)</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@school.edu"
              autoComplete="email"
            />
          </div>
          <Button className="w-full" onClick={sendPhoneOtp}>
            Continue · verify mobile
          </Button>
        </div>
      )}

      {step === "verifyPhone" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Mobile OTP · {phoneDisplay}</p>
          <InputOTP maxLength={6} value={phoneOtp} onChange={setPhoneOtp}>
            <InputOTPGroup className="justify-center">
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <Button className="w-full" onClick={verifyPhone}>
            Verify mobile
          </Button>
        </div>
      )}

      {step === "verifyEmail" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Email OTP · {email}</p>
          <InputOTP maxLength={6} value={emailOtp} onChange={setEmailOtp}>
            <InputOTPGroup className="justify-center">
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <Button className="w-full" onClick={verifyEmail}>
            Verify email
          </Button>
        </div>
      )}

      {step === "details" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Institute name</Label>
            <Input
              value={instituteName}
              onChange={(e) => setInstituteName(e.target.value)}
              placeholder="Test1School"
            />
          </div>
          <div className="space-y-2">
            <Label>School / institute type</Label>
            <select
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={instituteKind}
              onChange={(e) => setInstituteKind(e.target.value as InstituteKind)}
            >
              {INSTITUTE_KIND_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Institute code</Label>
            <Input
              value={instituteCode}
              onChange={(e) => setInstituteCode(e.target.value)}
              placeholder="LXA-HYD"
            />
          </div>
          <div className="space-y-2">
            <Label>Syllabus / board</Label>
            <select
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={syllabus}
              onChange={(e) => setSyllabus(e.target.value)}
            >
              {SYLLABUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, area"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={instituteCity} onChange={(e) => setInstituteCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={instituteState} onChange={(e) => setInstituteState(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Admin name</Label>
            <Input
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Dr. Alistair Vance"
            />
          </div>
          <Button className="w-full" onClick={continueDetails}>
            Continue
          </Button>
        </div>
      )}

      {step === "password" && (
        <div className="space-y-4">
          <PasswordCreateFields
            password={password}
            confirmPassword={confirmPassword}
            onPasswordChange={setPassword}
            onConfirmChange={setConfirmPassword}
            showPwd={showPwd}
            showConfirmPwd={showConfirmPwd}
            onToggleShowPwd={() => setShowPwd((v) => !v)}
            onToggleShowConfirmPwd={() => setShowConfirmPwd((v) => !v)}
            idPrefix="institute-signup"
          />
          <TermsAcceptCheckbox
            checked={acceptedTerms}
            onCheckedChange={setAcceptedTerms}
            termsTo="/admissions/terms"
            privacyTo="/admissions/privacy"
            cookiesTo="/cookies"
            id="admissions-institute-terms"
          />
          <Button
            className="w-full"
            onClick={finish}
            disabled={loading || !acceptedTerms || password !== confirmPassword}
          >
            {loading ? "Creating…" : "Create institute account"}
          </Button>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link
          to="/admissions/login"
          search={{ type: "institute" }}
          className="font-medium text-primary"
        >
          Institute access
        </Link>
      </p>
    </div>
  );
}

/** @deprecated Prefer ParentSignupFlow / InstituteSignupFlow */
export function SignupFlow({ accountType }: { accountType: AdmissionsAccountType }) {
  return accountType === "institute_admin" ? <InstituteSignupFlow /> : <ParentSignupFlow />;
}

type ForgotStep = "identifier" | "otp" | "password" | "success";

export function ForgotPasswordFlow() {
  const { resetPassword } = useAdmissionsAuth();
  const [step, setStep] = useState<ForgotStep>("identifier");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const identifier = `${country.code} ${phone}`;

  return (
    <div className="mx-auto max-w-md animate-in fade-in duration-300">
      <Link
        to="/admissions/login"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Back
      </Link>
      <h1 className="font-display text-2xl font-bold">Reset password</h1>
      <p className="mt-1 text-sm text-muted-foreground">Verify mobile with OTP, then set a strong password.</p>

      {step === "identifier" && (
        <div className="mt-8 space-y-4">
          <PhoneInput
            value={phone}
            onChange={setPhone}
            country={country}
            onCountryChange={setCountry}
          />
          <Button
            className="w-full"
            onClick={() => {
              const digits = phone.replace(/\D/g, "");
              if (!validatePhone(digits, country)) return toast.error("Enter a valid mobile number");
              toast.message(`OTP: ${DEMO_CONNECT_OTP}`);
              setStep("otp");
            }}
          >
            Send OTP
          </Button>
        </div>
      )}

      {step === "otp" && (
        <div className="mt-8 space-y-4">
          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
            <InputOTPGroup className="justify-center">
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <Button
            className="w-full"
            onClick={() =>
              otp === DEMO_CONNECT_OTP ? setStep("password") : toast.error("Invalid OTP")
            }
          >
            Verify
          </Button>
        </div>
      )}

      {step === "password" && (
        <div className="mt-8 space-y-4">
          <PasswordCreateFields
            password={password}
            confirmPassword={confirmPassword}
            onPasswordChange={setPassword}
            onConfirmChange={setConfirmPassword}
            showPwd={showPwd}
            showConfirmPwd={showConfirmPwd}
            onToggleShowPwd={() => setShowPwd((v) => !v)}
            onToggleShowConfirmPwd={() => setShowConfirmPwd((v) => !v)}
            idPrefix="forgot"
          />
          <Button
            className="w-full"
            disabled={password !== confirmPassword}
            onClick={() => {
              const validated = signupPasswordSchema.safeParse({ password, confirmPassword });
              if (!validated.success)
                return toast.error(validated.error.errors[0]?.message ?? "Invalid password");
              if (resetPassword(identifier, password)) {
                toast.success("Password updated");
                setStep("success");
              } else toast.error("Account not found for this mobile");
            }}
          >
            Update password
          </Button>
        </div>
      )}

      {step === "success" && (
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">Your password has been updated.</p>
          <Button className="mt-6 w-full" asChild>
            <Link to="/admissions/login">Sign in</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
