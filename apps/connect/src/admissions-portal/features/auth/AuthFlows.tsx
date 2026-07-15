import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button, Input, InputOTP, InputOTPGroup, InputOTPSlot, Label } from "@lumenx/ui";
import { ArrowLeft, Building2, Eye, EyeOff, Users } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { DEMO_CONNECT_OTP } from "@lumenx/auth";
import { PhoneInput, COUNTRIES, validatePhone, type Country } from "@/components/app/PhoneInput";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { TermsAcceptCheckbox } from "@/components/legal/TermsAcceptCheckbox";
import { passwordSchema, signInSchema, signupWithTermsSchema } from "@/lib/admissions/schemas";
import { ADMISSION_INSTITUTES } from "@/lib/admissions/institutes-data";
import type { AdmissionsAccountType } from "@/lib/admissions/types";

type Step = "identifier" | "password";

export function SignInFlow({
  redirect,
  program,
  institute,
}: {
  redirect?: string;
  program?: string;
  institute?: string;
}) {
  const { signIn } = useAdmissionsAuth();
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
      } else {
        toast.error("Invalid credentials");
      }
    }, 400);
  };

  return (
    <div className="mx-auto max-w-md animate-in fade-in duration-300">
      <h1 className="font-display text-2xl font-bold">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">Parent / applicant or institute admin</p>

      <div className="mt-4 space-y-2 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        <p>
          <strong>Parent:</strong> priya.sharma@example.com / demo123
        </p>
        <p>
          <strong>Institute:</strong> admin@lumenx.edu / demo123
        </p>
      </div>

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
            <button
              type="button"
              className="text-xs text-primary"
              onClick={() => setStep("identifier")}
            >
              Change account
            </button>
          </div>
        )}
        <Button className="w-full" onClick={submit} disabled={loading}>
          {loading ? "Signing in…" : step === "identifier" ? "Continue" : "Sign in"}
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link
          to="/admissions/signup"
          search={{ type: "parent" }}
          className="font-medium text-primary"
        >
          Parent sign up
        </Link>
        {" · "}
        <Link
          to="/admissions/signup"
          search={{ type: "institute" }}
          className="font-medium text-primary"
        >
          Institute sign up
        </Link>
      </p>
      <p className="mt-2 text-center text-sm">
        <Link to="/admissions/forgot-password" className="text-muted-foreground hover:text-primary">
          Forgot password?
        </Link>
      </p>
    </div>
  );
}

type SignUpStep = "method" | "otp" | "profile" | "institute" | "password";

export function SignupFlow({ accountType }: { accountType: AdmissionsAccountType }) {
  const { signUp } = useAdmissionsAuth();
  const nav = useNavigate();
  const isInstitute = accountType === "institute_admin";
  const [mode, setMode] = useState<"mobile" | "email">("mobile");
  const [step, setStep] = useState<SignUpStep>("method");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [instituteName, setInstituteName] = useState("");
  const [instituteCode, setInstituteCode] = useState("");
  const [instituteCity, setInstituteCity] = useState("");
  const [instituteState, setInstituteState] = useState("");
  const [existingInstituteId, setExistingInstituteId] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const identifier = mode === "mobile" ? `${country.code} ${phone}` : email;

  const sendOtp = () => {
    if (mode === "mobile") {
      if (!validatePhone(phone.replace(/\D/g, ""), country))
        return toast.error("Enter a valid mobile number");
    } else if (!email.includes("@")) return toast.error("Enter a valid email");
    toast.message(`OTP sent (demo: ${DEMO_CONNECT_OTP})`);
    setStep("otp");
  };

  const verifyOtp = () => {
    if (otp !== DEMO_CONNECT_OTP) return toast.error("Invalid OTP");
    if (isInstitute) setStep("institute");
    else setStep(mode === "mobile" ? "profile" : "password");
  };

  const finish = () => {
    const validated = signupWithTermsSchema.safeParse({ password, acceptedTerms });
    if (!validated.success)
      return toast.error(validated.error.errors[0]?.message ?? "Invalid password");
    if (!name.trim() && !isInstitute) return toast.error("Enter your name");
    if (isInstitute && !existingInstituteId && !instituteName.trim())
      return toast.error("Enter institute details");

    setLoading(true);
    setTimeout(() => {
      const linked = ADMISSION_INSTITUTES.find((i) => i.id === existingInstituteId);
      signUp({
        name: name.trim() || instituteName.trim() || "Institute Admin",
        email: mode === "email" ? email : undefined,
        phone: mode === "mobile" ? identifier : undefined,
        password,
        accountType,
        instituteId: linked?.id ?? `ins-custom-${Date.now()}`,
        instituteName: linked?.name ?? instituteName.trim(),
      });
      setLoading(false);
      toast.success(isInstitute ? "Institute account created!" : "Account created!");
      nav({ to: isInstitute ? "/admissions/institute" : "/admissions/applications" });
    }, 400);
  };

  return (
    <div className="mx-auto max-w-md animate-in fade-in duration-300">
      <Link
        to="/admissions/login"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Back
      </Link>
      <div className="flex items-center gap-2">
        {isInstitute ? (
          <Building2 className="size-6 text-primary" />
        ) : (
          <Users className="size-6 text-primary" />
        )}
        <h1 className="font-display text-2xl font-bold">
          {isInstitute ? "Institute registration" : "Parent / applicant sign up"}
        </h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {isInstitute
          ? "Register your school or college on LumenX Admissions"
          : "Apply to any institute — no school account needed"}
      </p>

      {!isInstitute && (
        <p className="mt-3 text-xs text-muted-foreground">
          Institute admin?{" "}
          <Link
            to="/admissions/signup"
            search={{ type: "institute" }}
            className="text-primary font-medium"
          >
            Register here
          </Link>
        </p>
      )}
      {isInstitute && (
        <p className="mt-3 text-xs text-muted-foreground">
          Parent applying for a child?{" "}
          <Link
            to="/admissions/signup"
            search={{ type: "parent" }}
            className="text-primary font-medium"
          >
            Parent sign up
          </Link>
        </p>
      )}

      {step === "method" && (
        <>
          <div className="mt-6 flex gap-2 rounded-xl bg-muted p-1">
            {(["mobile", "email"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize ${mode === m ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="mt-6 space-y-4">
            {mode === "mobile" ? (
              <PhoneInput
                value={phone}
                onChange={setPhone}
                country={country}
                onCountryChange={setCountry}
              />
            ) : (
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isInstitute ? "admin@school.edu" : "parent@example.com"}
                />
              </div>
            )}
            <Button className="w-full" onClick={sendOtp}>
              Send OTP
            </Button>
          </div>
        </>
      )}

      {step === "otp" && (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-muted-foreground">Enter OTP sent to {identifier}</p>
          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
            <InputOTPGroup className="justify-center">
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <Button className="w-full" onClick={verifyOtp}>
            Verify
          </Button>
        </div>
      )}

      {step === "institute" && (
        <div className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label>Link existing institute (optional)</Label>
            <select
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={existingInstituteId}
              onChange={(e) => setExistingInstituteId(e.target.value)}
            >
              <option value="">Register new institute…</option>
              {ADMISSION_INSTITUTES.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
          {!existingInstituteId && (
            <>
              <div className="space-y-2">
                <Label>Institute name</Label>
                <Input
                  value={instituteName}
                  onChange={(e) => setInstituteName(e.target.value)}
                  placeholder="LumenX Academy"
                />
              </div>
              <div className="space-y-2">
                <Label>Institute code</Label>
                <Input
                  value={instituteCode}
                  onChange={(e) => setInstituteCode(e.target.value)}
                  placeholder="LXA-HYD"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={instituteCity} onChange={(e) => setInstituteCity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={instituteState}
                    onChange={(e) => setInstituteState(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label>Your name (admin)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. Alistair Vance"
            />
          </div>
          <Button className="w-full" onClick={() => setStep("password")}>
            Continue
          </Button>
        </div>
      )}

      {step === "profile" && (
        <div className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label>Your full name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Priya Sharma"
            />
          </div>
          <Button className="w-full" onClick={() => setStep("password")}>
            Continue
          </Button>
        </div>
      )}

      {step === "password" && (
        <div className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label>Create password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
            />
          </div>
          <TermsAcceptCheckbox
            checked={acceptedTerms}
            onCheckedChange={setAcceptedTerms}
            termsTo="/admissions/terms"
            privacyTo="/admissions/privacy"
            id="admissions-accept-terms"
          />
          <Button className="w-full" onClick={finish} disabled={loading || !acceptedTerms}>
            {loading ? "Creating…" : "Create account"}
          </Button>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/admissions/login" className="text-primary font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}

type ForgotStep = "identifier" | "otp" | "password" | "success";

export function ForgotPasswordFlow() {
  const { resetPassword } = useAdmissionsAuth();
  const [step, setStep] = useState<ForgotStep>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="mx-auto max-w-md animate-in fade-in duration-300">
      <Link
        to="/admissions/login"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Back
      </Link>
      <h1 className="font-display text-2xl font-bold">Reset password</h1>

      {step === "identifier" && (
        <div className="mt-8 space-y-4">
          <Label>Mobile or email</Label>
          <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          <Button
            className="w-full"
            onClick={() => {
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
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
          />
          <Button
            className="w-full"
            onClick={() => {
              const pr = passwordSchema.safeParse(password);
              if (!pr.success) return toast.error(pr.error.errors[0]?.message);
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
          <Button className="mt-6 w-full" asChild>
            <Link to="/admissions/login">Sign in</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
