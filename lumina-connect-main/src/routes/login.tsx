import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useApp } from "@/lib/app-state";
import type { Role } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PhoneInput, COUNTRIES, validatePhone, type Country } from "@/components/app/PhoneInput";
import { registeredInstitutes } from "@/lib/mock-data";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Unify" }] }),
  component: LoginPage,
});

type Step = "institute" | "role" | "phone" | "password" | "otp";

const INSTITUTE_KIND_LABEL: Record<string, string> = {
  school: "School",
  junior_college: "Junior college",
  degree_college: "Degree college",
  engineering: "Engineering",
  university: "University",
};
const DEMO_PASSWORD = "unify123";
const DEMO_OTP = "123456";

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

function LoginPage() {
  const { user, signIn } = useApp();
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
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) nav({ to: "/" });
  }, [user, nav]);

  useEffect(() => {
    try {
      const last = localStorage.getItem("ues_last_institute");
      if (last && registeredInstitutes.some((i) => i.id === last)) setInstituteId(last);
    } catch {
      void 0;
    }
  }, []);

  const cleanPhone = useMemo(() => phone.replace(/\D/g, ""), [phone]);
  const phoneValid = validatePhone(cleanPhone, country);
  const fullPhone = `${country.code} ${cleanPhone}`;

  const selectedInstitute = useMemo(
    () => registeredInstitutes.find((i) => i.id === instituteId) ?? null,
    [instituteId],
  );

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
        if (password !== DEMO_PASSWORD)
          return toast.error(`Incorrect password (demo: ${DEMO_PASSWORD})`);
        setOtp("");
        setStep("otp");
        toast.success(`OTP sent to ${fullPhone} — use ${DEMO_OTP}`);
      }, 500);
      return;
    }
    if (step === "otp") {
      if (otp.length !== 6) return toast.error("Enter the 6-digit code");
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        if (otp !== DEMO_OTP) return toast.error(`Incorrect OTP (demo: ${DEMO_OTP})`);
        if (!instituteId) return toast.error("Missing institute — go back and select your campus");
        try {
          if (rememberInstitute) localStorage.setItem("ues_last_institute", instituteId);
          else localStorage.removeItem("ues_last_institute");
        } catch {
          void 0;
        }
        signIn(fullPhone, role!, instituteId);
        toast.success(`Welcome to ${ROLES.find((r) => r.id === role)!.label}`);
      }, 400);
      return;
    }
  };

  const back = () => {
    if (step === "role") setStep("institute");
    else if (step === "phone") setStep("role");
    else if (step === "password") setStep("phone");
    else if (step === "otp") setStep("password");
  };

  return (
    <div className="min-h-[100dvh] relative bg-background overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
      <div className="relative grid min-h-[100dvh] lg:grid-cols-2">
        <aside className="hidden lg:flex flex-col justify-between p-12 bg-gradient-primary text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-white/15 grid place-items-center font-bold">
              U
            </div>
            <div className="font-display text-lg font-semibold">Unify</div>
          </div>
          <div className="space-y-6 max-w-md">
            <h1 className="font-display text-4xl font-bold leading-tight lg:text-5xl">
              One quiet place for your school life.
            </h1>
            <p className="text-base text-primary-foreground/80 lg:text-lg">
              Real-time awareness for parents. Less friction for teachers. A clearer path for
              students.
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
          <div className="text-xs text-primary-foreground/60">© Unify Education</div>
        </aside>

        <div className="flex items-center justify-center p-5 sm:p-8 md:p-12">
          <div className="w-full max-w-sm">
            <div className="lg:hidden flex items-center gap-2 mb-8">
              <div className="size-10 rounded-2xl bg-gradient-primary shadow-glow grid place-items-center text-primary-foreground font-bold">
                U
              </div>
              <div className="font-display font-semibold text-lg">Unify</div>
            </div>

            <Stepper step={step} />

            {step === "institute" && (
              <div className="space-y-6 animate-in-up">
                <div>
                  <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                    Select institute
                  </h2>
                  <p className="mt-1.5 text-muted-foreground">
                    Search by campus name or institute code. Only registered institutions appear.
                  </p>
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
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                  <Checkbox
                    id="remember-inst"
                    checked={rememberInstitute}
                    onCheckedChange={(v) => setRememberInstitute(v === true)}
                  />
                  <Label htmlFor="remember-inst" className="text-sm font-normal leading-snug">
                    Remember this institute on this device
                  </Label>
                </div>
                <Button
                  onClick={next}
                  disabled={!instituteId}
                  className="h-12 w-full rounded-xl shadow-glow"
                >
                  Continue
                </Button>
              </div>
            )}

            {step === "role" && (
              <div className="space-y-6 animate-in-up">
                <div>
                  <h2 className="font-display text-2xl font-semibold sm:text-3xl">Choose portal</h2>
                  <p className="text-muted-foreground mt-1.5">
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
                        onClick={() => setRole(r.id)}
                        className={cn(
                          "w-full text-left rounded-2xl border p-4 flex items-center gap-3 transition-all touch-manipulation active:scale-[0.99]",
                          active
                            ? "border-primary bg-primary/5 shadow-glow"
                            : "border-border hover:border-primary/40 bg-card",
                        )}
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
                <Button
                  onClick={next}
                  disabled={!role}
                  className="w-full h-12 rounded-xl shadow-glow"
                >
                  Continue
                </Button>
              </div>
            )}

            {step === "phone" && (
              <div className="space-y-6 animate-in-up">
                <BackButton onClick={back} />
                <div>
                  <h2 className="font-display text-2xl font-semibold sm:text-3xl">Welcome</h2>
                  <p className="text-muted-foreground mt-1.5">
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
                    error={
                      phoneTouched && !phoneValid
                        ? `Enter a valid ${country.maxLen}-digit number`
                        : null
                    }
                  />
                </div>
                <Button
                  onClick={next}
                  disabled={!phoneValid}
                  className="w-full h-12 rounded-xl text-base shadow-glow"
                >
                  Continue
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  By continuing you agree to Unify's Terms & Privacy.
                </p>
              </div>
            )}

            {step === "password" && (
              <div className="space-y-6 animate-in-up">
                <BackButton onClick={back} />
                <div>
                  <h2 className="font-display text-2xl font-semibold sm:text-3xl">Password</h2>
                  <p className="text-muted-foreground mt-1.5">
                    Enter your password for {fullPhone}.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      type={showPwd ? "text" : "password"}
                      placeholder="Your password"
                      autoFocus
                      className="pl-10 pr-10 h-12 rounded-xl text-base"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && next()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Demo password: <span className="font-mono">{DEMO_PASSWORD}</span>
                  </p>
                </div>
                <Button
                  onClick={next}
                  disabled={loading}
                  className="w-full h-12 rounded-xl shadow-glow"
                >
                  {loading ? "Verifying…" : "Continue"}
                </Button>
              </div>
            )}

            {step === "otp" && (
              <div className="space-y-6 animate-in-up">
                <BackButton onClick={back} />
                <div>
                  <h2 className="font-display text-2xl font-semibold sm:text-3xl">Verify</h2>
                  <p className="text-muted-foreground mt-1.5">
                    We sent a 6-digit code to {fullPhone}.
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
                  className="w-full h-12 rounded-xl shadow-glow"
                >
                  {loading ? "Verifying…" : "Verify & continue"}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Demo OTP: <span className="font-mono">{DEMO_OTP}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const order: Step[] = ["institute", "role", "phone", "password", "otp"];
  const idx = order.indexOf(step);
  return (
    <div className="flex items-center gap-1.5 mb-8">
      {order.map((s, i) => (
        <div
          key={s}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors",
            i <= idx ? "bg-primary" : "bg-muted",
          )}
        />
      ))}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground -mt-2"
    >
      <ArrowLeft className="size-4" /> Back
    </button>
  );
}
