import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useCallback } from "react";
import {
  ArrowRight, ChevronLeft, Check,
  Building2, Globe, Mail, Phone, User, MapPin, Hash,
  Lock, X, ShieldCheck, Image as ImageIcon,
  BookOpen, GraduationCap,
} from "lucide-react";
import { AuthLayout } from "@/auth/components/AuthLayout";
import { AuthInput } from "@/auth/components/AuthInput";
import { AuthButton } from "@/auth/components/AuthButton";
import { AuthSelect } from "@/auth/components/AuthSelect";
import { AuthSectionHeader } from "@/auth/components/AuthSectionHeader";
import { AuthStepBar } from "@/auth/components/AuthStepBar";
import { PasswordStrength } from "@/auth/components/PasswordStrength";
import { PinInput } from "@/auth/components/PinInput";
import { DemoOtpHint } from "@/auth/components/DemoOtpHint";
import { OtpInput } from "@/auth/components/OtpInput";
import { useAuth } from "@/auth/AuthContext";
import { isApiAuthMode } from "@/auth/auth-mode";
import { resolvePostSignupRoute } from "@/auth/signup-routing";
import {
  requestSignupOtp,
  verifySignupOtp,
} from "@lumenx/auth";
import { IconChip } from "@/components/IconChip";
import {
  getPasswordErrors,
  isValidEmail,
  isValidPhone,
  hasErrors,
} from "@/auth/validation";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Register Institute — LumenX Admin" }] }),
  component: SignUpPage,
});

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════ */

const INSTITUTE_TYPES = [
  "School (K-12)", "High School (up to Grade 10)", "Junior College", "Degree College",
  "University", "Coaching Institute", "Vocational Training", "Montessori / Pre-school",
];

const EDUCATION_BOARDS = [
  "CBSE", "ICSE / ISC", "State Board", "IB (International Baccalaureate)",
  "Cambridge (IGCSE)", "NIOS", "Other",
];

const COUNTRIES = [
  "India", "United States", "United Kingdom", "Canada",
  "Australia", "UAE", "Singapore", "Others",
];

const INDIA_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Delhi", "Jammu & Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
];

const DEMO_STEP_META = [
  { label: "Institute", short: "Profile" },
  { label: "Contact",   short: "Contact" },
  { label: "Security",  short: "Security" },
] as const;

const API_STEP_META = [
  { label: "Institute", short: "Profile" },
  { label: "Contact",   short: "Contact" },
  { label: "Verify",    short: "Verify" },
  { label: "Security",  short: "Security" },
] as const;

/* ══════════════════════════════════════════════════════════════
   LOCAL TYPES
══════════════════════════════════════════════════════════════ */

interface Step1 {
  instituteName: string;
  instituteCode: string;
  logoFile: File | null;
  logoPreview: string;
  instituteType: string;
  educationBoard: string;
}

interface Step2 {
  principalName: string;
  email: string;
  mobile: string;
  country: string;
  state: string;
  district: string;
  city: string;
  address: string;
  pincode: string;
  website: string;
}

interface Step3 {
  password: string;
  confirmPassword: string;
  pin: string;
  confirmPin: string;
  acceptTerms: boolean;
}

type Errors<T> = Partial<Record<keyof T, string>>;

/* ══════════════════════════════════════════════════════════════
   VALIDATION
══════════════════════════════════════════════════════════════ */

function validateStep1(d: Step1): Errors<Step1> {
  const e: Errors<Step1> = {};
  if (!d.instituteName.trim())        e.instituteName  = "Institute name is required";
  else if (d.instituteName.trim().length < 3)  e.instituteName  = "Must be at least 3 characters";
  const code = d.instituteCode.trim();
  if (!code) e.instituteCode = "Institute code is required";
  else if (!/^[A-Za-z0-9][A-Za-z0-9_-]{2,31}$/.test(code)) {
    e.instituteCode = "3–32 characters: letters, numbers, - or _";
  }
  if (!d.instituteType)               e.instituteType  = "Please select institute type";
  if (!d.educationBoard)              e.educationBoard = "Please select education board";
  return e;
}

function validateStep2(d: Step2): Errors<Step2> {
  const e: Errors<Step2> = {};
  if (!d.principalName.trim())        e.principalName = "Principal name is required";
  if (!d.email.trim())                e.email         = "Email is required";
  else if (!isValidEmail(d.email))    e.email         = "Enter a valid email address";
  if (!d.mobile.trim())               e.mobile        = "Mobile number is required";
  else if (!isValidPhone(d.mobile))   e.mobile        = "Enter a valid Indian mobile number";
  if (!d.country)                     e.country       = "Country is required";
  if (!d.state.trim())                e.state         = "State is required";
  if (!d.district.trim())             e.district      = "District is required";
  if (!d.city.trim())                 e.city          = "City is required";
  if (!d.address.trim())              e.address       = "Address is required";
  else if (d.address.trim().length < 10)  e.address   = "Enter a complete address (min 10 characters)";
  if (!d.pincode.trim())              e.pincode       = "Pincode is required";
  else if (!/^\d{6}$/.test(d.pincode))   e.pincode    = "Enter a valid 6-digit pincode";
  if (d.website.trim() && !/^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/.*)?$/.test(d.website.trim()))
                                      e.website       = "Enter a valid website URL";
  return e;
}

function validateStep3(d: Step3): Errors<Step3> {
  const e: Errors<Step3> = {};
  const pwdErrors = getPasswordErrors(d.password);
  if (!d.password)                        e.password        = "Password is required";
  else if (pwdErrors.length > 0)          e.password        = pwdErrors[0];
  if (!d.confirmPassword)                 e.confirmPassword = "Please confirm your password";
  else if (d.password !== d.confirmPassword) e.confirmPassword = "Passwords do not match";
  // Notebook: root signup always sets password + PIN (API and demo).
  // PinInput UI is 6 digits; backend accepts 4–8.
  if (!d.pin)                             e.pin             = "Security PIN is required";
  else if (!/^\d{6}$/.test(d.pin))        e.pin             = "PIN must be exactly 6 digits";
  if (!d.confirmPin)                      e.confirmPin      = "Please confirm your PIN";
  else if (d.pin !== d.confirmPin)        e.confirmPin      = "PINs do not match";
  if (!d.acceptTerms)                     e.acceptTerms     = "You must accept the terms to continue";
  return e;
}

/** Logo upload drop zone */
function LogoUpload({
  preview,
  onChange,
  onClear,
}: {
  preview: string;
  onChange: (file: File, url: string) => void;
  onClear: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        setFileError("Choose a PNG, JPG, or SVG image.");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setFileError("Logo must be 2 MB or smaller.");
        return;
      }
      setFileError(null);
      const reader = new FileReader();
      reader.onload = (e) => onChange(file, e.target?.result as string);
      reader.readAsDataURL(file);
    },
    [onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-foreground">
        Institute Logo
        <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">(optional)</span>
      </label>

      {preview ? (
        /* Preview state */
        <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/25 bg-primary/[0.03]">
          <div className="size-14 rounded-xl border border-border bg-background flex items-center justify-center overflow-hidden shrink-0">
            <img src={preview} alt="Institute logo" className="size-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium">Logo uploaded</div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="size-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            aria-label="Remove logo"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        /* Upload zone */
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="w-full flex flex-col items-center gap-2 py-5 px-4 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/[0.02] transition-all group"
        >
          <IconChip icon={ImageIcon} size="md" variant="soft" />
          <div className="text-center">
            <div className="text-xs font-medium group-hover:text-primary transition-colors">
              Upload logo
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">PNG or JPG · optional</div>
          </div>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      {fileError ? (
        <p className="text-[11px] text-destructive" role="alert">
          {fileError}
        </p>
      ) : null}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STEP 1 — INSTITUTE PROFILE
══════════════════════════════════════════════════════════════ */

function Step1({
  data, errors, onChange, onLogoChange, onLogoClear,
}: {
  data: Step1;
  errors: Errors<Step1>;
  onChange: (field: keyof Step1, value: string) => void;
  onLogoChange: (file: File, url: string) => void;
  onLogoClear: () => void;
}) {
  return (
    <div className="space-y-4">
      <AuthSectionHeader
        icon={Building2}
        title="Institute"
      />

      <AuthInput
        label="Institute Name"
        name="instituteName"
        icon={Building2}
        placeholder="e.g. Test1School"
        value={data.instituteName}
        onChange={(e) => onChange("instituteName", e.target.value)}
        error={errors.instituteName}
        required
      />

      <AuthInput
        label="Institute Code"
        name="instituteCode"
        icon={Hash}
        placeholder="e.g. lumenx-001"
        value={data.instituteCode}
        onChange={(e) =>
          onChange(
            "instituteCode",
            e.target.value.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32),
          )
        }
        error={errors.instituteCode}
        hint="Shown on login · must be unique"
        required
      />

      <LogoUpload
        preview={data.logoPreview}
        onChange={onLogoChange}
        onClear={onLogoClear}
      />

      <div className="grid grid-cols-1 gap-4">
        <AuthSelect
          label="Institute Type"
          name="instituteType"
          icon={Building2}
          placeholder="Select type…"
          options={INSTITUTE_TYPES}
          value={data.instituteType}
          onChange={(e) => onChange("instituteType", e.target.value)}
          error={errors.instituteType}
          required
        />
        <AuthSelect
          label="Education Board"
          name="educationBoard"
          icon={BookOpen}
          placeholder="Select board…"
          options={EDUCATION_BOARDS}
          value={data.educationBoard}
          onChange={(e) => onChange("educationBoard", e.target.value)}
          error={errors.educationBoard}
          required
        />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STEP 2 — CONTACT & LOCATION
══════════════════════════════════════════════════════════════ */

function Step2({
  data, errors, onChange,
}: {
  data: Step2;
  errors: Errors<Step2>;
  onChange: (field: keyof Step2, value: string) => void;
}) {
  const stateOptions = data.country === "India" ? INDIA_STATES : [];

  return (
    <div className="space-y-4">
      {/* Admin info */}
      <AuthSectionHeader
        icon={GraduationCap}
        title="Principal"
      />
      <div className="grid grid-cols-1 gap-4">
        <AuthInput
          label="Principal Name"
          name="principalName"
          icon={User}
          placeholder="Dr. Ananya Verma"
          value={data.principalName}
          onChange={(e) => onChange("principalName", e.target.value)}
          error={errors.principalName}
          required
        />
        <AuthInput
          label="Email Address"
          name="email"
          type="email"
          icon={Mail}
          placeholder="principal@institute.edu"
          value={data.email}
          onChange={(e) => onChange("email", e.target.value)}
          error={errors.email}
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-4">
        <AuthInput
          label="Mobile Number"
          name="mobile"
          type="tel"
          icon={Phone}
          placeholder="+91 98765 43210"
          value={data.mobile}
          onChange={(e) => onChange("mobile", e.target.value)}
          error={errors.mobile}
          required
        />
        <AuthInput
          label="Website"
          name="website"
          icon={Globe}
          placeholder="www.institute.edu"
          value={data.website}
          onChange={(e) => onChange("website", e.target.value)}
          error={errors.website}
          hint="Optional"
        />
      </div>

      {/* Location */}
      <div className="pt-2">
        <AuthSectionHeader
          icon={MapPin}
          title="Location"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AuthSelect
          label="Country"
          name="country"
          icon={Globe}
          placeholder="Select country…"
          options={COUNTRIES}
          value={data.country}
          onChange={(e) => onChange("country", e.target.value)}
          error={errors.country}
          required
        />
        {stateOptions.length > 0 ? (
          <AuthSelect
            label="State"
            name="state"
            icon={MapPin}
            placeholder="Select state…"
            options={stateOptions}
            value={data.state}
            onChange={(e) => onChange("state", e.target.value)}
            error={errors.state}
            required
          />
        ) : (
          <AuthInput
            label="State / Province"
            name="state"
            icon={MapPin}
            placeholder="Enter state or province"
            value={data.state}
            onChange={(e) => onChange("state", e.target.value)}
            error={errors.state}
            required
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AuthInput
          label="District"
          name="district"
          icon={MapPin}
          placeholder="e.g. Hyderabad"
          value={data.district}
          onChange={(e) => onChange("district", e.target.value)}
          error={errors.district}
          required
        />
        <AuthInput
          label="City"
          name="city"
          icon={MapPin}
          placeholder="e.g. Hyderabad"
          value={data.city}
          onChange={(e) => onChange("city", e.target.value)}
          error={errors.city}
          required
        />
      </div>

      <AuthInput
        label="Full Address"
        name="address"
        icon={MapPin}
        placeholder="Street name, Area, Landmark"
        value={data.address}
        onChange={(e) => onChange("address", e.target.value)}
        error={errors.address}
        required
      />

      <div className="grid grid-cols-1 gap-4">
        <AuthInput
          label="Pincode"
          name="pincode"
          icon={Hash}
          placeholder="e.g. 500032"
          value={data.pincode}
          onChange={(e) => onChange("pincode", e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          error={errors.pincode}
          required
          inputMode="numeric"
          pattern="\d*"
          maxLength={6}
        />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STEP 3 — SECURITY
══════════════════════════════════════════════════════════════ */

function Step3({
  data, errors, onChange,
}: {
  data: Step3;
  errors: Errors<Step3>;
  onChange: (field: keyof Step3, value: string | boolean) => void;
}) {
  const pinMatch    = data.pin.length === 6 && data.confirmPin.length === 6 && data.pin === data.confirmPin;

  return (
    <div className="space-y-4">
      {/* Password section */}
      <AuthSectionHeader
        icon={Lock}
        title="Password"
      />

      <div>
        <AuthInput
          label="Password"
          name="password"
          type="password"
          icon={Lock}
          placeholder="Min 8 characters"
          value={data.password}
          onChange={(e) => onChange("password", e.target.value)}
          error={errors.password}
          required
        />
        <PasswordStrength password={data.password} />
      </div>

      <AuthInput
        label="Confirm Password"
        name="confirmPassword"
        type="password"
        icon={Lock}
        placeholder="Re-enter your password"
        value={data.confirmPassword}
        onChange={(e) => onChange("confirmPassword", e.target.value)}
        error={errors.confirmPassword}
        required
        trailing={
          data.password && data.confirmPassword && data.password === data.confirmPassword ? (
            <span className="flex items-center gap-1 text-success text-[10px] font-medium">
              <Check className="size-3" /> Match
            </span>
          ) : undefined
        }
      />

      {/* PIN section — required for Admin root notebook signup */}
      <>
      <div className="pt-2">
        <AuthSectionHeader
          icon={ShieldCheck}
          title="Security PIN"
        />
      </div>

      <PinInput
        label="Create Security PIN"
        value={data.pin}
        onChange={(v) => onChange("pin", v)}
        error={errors.pin}
        hint="6 digits"
        required
        autoFocus
      />

      <PinInput
        label="Confirm Security PIN"
        value={data.confirmPin}
        onChange={(v) => onChange("confirmPin", v)}
        error={errors.confirmPin}
        hint={pinMatch ? "Match" : "Re-enter PIN"}
        required
      />
      </>

      {/* Terms */}
      <div className="pt-1">
        <label className="flex items-start gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={data.acceptTerms}
            onChange={(e) => onChange("acceptTerms", e.target.checked)}
            className="size-4 mt-0.5 rounded border-border accent-primary shrink-0"
          />
          <span className="text-xs text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
            I agree to the{" "}
            <Link to="/terms" className="text-primary hover:underline">
              Terms & Conditions
            </Link>
            ,{" "}
            <Link to="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            , and{" "}
            <Link to="/cookies" className="text-primary hover:underline">
              Cookie Policy
            </Link>
            . I confirm the information provided is accurate.
          </span>
        </label>
        {errors.acceptTerms && (
          <p role="alert" className="text-[11px] text-destructive flex items-center gap-1 mt-1.5">
            <span className="size-1.5 rounded-full bg-destructive shrink-0" />{errors.acceptTerms}
          </p>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */

function SignUpPage() {
  const navigate = useNavigate();
  const { signUp, error: authError, clearError } = useAuth();
  const apiMode = isApiAuthMode();
  const STEP_META = apiMode ? API_STEP_META : DEMO_STEP_META;
  const securityStep = apiMode ? 4 : 3;
  const verifyStep = apiMode ? 3 : -1;
  const [step,    setStep]    = useState(1);
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const [verifyChannel, setVerifyChannel] = useState<"mobile" | "email">("mobile");
  const [signupOtp, setSignupOtp] = useState("");
  const [maskedOtpDest, setMaskedOtpDest] = useState("");
  const [devSignupOtp, setDevSignupOtp] = useState<string | undefined>();
  const [mobileGrant, setMobileGrant] = useState("");
  const [emailGrant, setEmailGrant] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);

  /* ─ form state ─ */
  const [s1, setS1] = useState<Step1>({
    instituteName: "", instituteCode: "", logoFile: null, logoPreview: "", instituteType: "", educationBoard: "",
  });
  const [s2, setS2] = useState<Step2>({
    principalName: "", email: "", mobile: "", country: "India",
    state: "", district: "", city: "", address: "", pincode: "", website: "",
  });
  const [s3, setS3] = useState<Step3>({
    password: "", confirmPassword: "", pin: "", confirmPin: "", acceptTerms: false,
  });

  /* ─ error state ─ */
  const [e1, setE1] = useState<Errors<Step1>>({});
  const [e2, setE2] = useState<Errors<Step2>>({});
  const [e3, setE3] = useState<Errors<Step3>>({});

  /* ─ helpers ─ */
  const change1 = (field: keyof Step1, value: string) => {
    setS1((p) => ({ ...p, [field]: value }));
    if (e1[field]) setE1((p) => ({ ...p, [field]: undefined }));
  };
  const change2 = (field: keyof Step2, value: string) => {
    setS2((p) => ({ ...p, [field]: value }));
    if (e2[field]) setE2((p) => ({ ...p, [field]: undefined }));
  };
  const change3 = (field: keyof Step3, value: string | boolean) => {
    setS3((p) => ({ ...p, [field]: value }));
    setE3((p) => {
      const next = { ...p, [field]: undefined };
      if (field === "pin" || field === "confirmPin") {
        next.pin = undefined;
        next.confirmPin = undefined;
      }
      return next;
    });
  };

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787").replace(
    /\/+$/,
    "",
  );
  const subjectKey = s2.email.trim().toLowerCase();

  const startMobileVerify = async () => {
    setVerifyError(null);
    setSignupOtp("");
    setVerifyChannel("mobile");
    const sent = await requestSignupOtp({
      subjectKey,
      channel: "mobile",
      destination: s2.mobile,
      apiBaseUrl,
    });
    setMaskedOtpDest(sent.maskedDestination);
    setDevSignupOtp(sent.devOtp);
  };

  const handleNext = async () => {
    if (step === 1) {
      const errs = validateStep1(s1);
      if (hasErrors(errs)) { setE1(errs); return; }
      setE1({});
      setStep(2);
      scrollTop();
    } else if (step === 2) {
      const errs = validateStep2(s2);
      if (hasErrors(errs)) { setE2(errs); return; }
      setE2({});
      if (apiMode) {
        setLoading(true);
        try {
          await startMobileVerify();
          setStep(verifyStep);
          scrollTop();
        } catch (reason) {
          setVerifyError(reason instanceof Error ? reason.message : "Unable to send mobile OTP.");
        } finally {
          setLoading(false);
        }
        return;
      }
      setStep(securityStep);
      scrollTop();
    }
  };

  const handleVerifyOtpContinue = async (code?: string) => {
    const otpValue = (code ?? signupOtp).replace(/\D/g, "").slice(0, 6);
    if (otpValue.length !== 6) {
      setVerifyError("Enter the 6-digit code.");
      return;
    }
    setSignupOtp(otpValue);
    setLoading(true);
    setVerifyError(null);
    try {
      if (verifyChannel === "mobile") {
        const verified = await verifySignupOtp({
          subjectKey,
          channel: "mobile",
          otp: otpValue,
          apiBaseUrl,
        });
        setMobileGrant(verified.grant);
        const emailSent = await requestSignupOtp({
          subjectKey,
          channel: "email",
          destination: s2.email.trim().toLowerCase(),
          apiBaseUrl,
        });
        setMaskedOtpDest(emailSent.maskedDestination);
        setDevSignupOtp(emailSent.devOtp);
        setSignupOtp("");
        setVerifyChannel("email");
        return;
      }
      const verified = await verifySignupOtp({
        subjectKey,
        channel: "email",
        otp: otpValue,
        apiBaseUrl,
      });
      setEmailGrant(verified.grant);
      setStep(securityStep);
      scrollTop();
    } catch (reason) {
      setVerifyError(reason instanceof Error ? reason.message : "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) { setStep((s) => s - 1); scrollTop(); }
    else navigate({ to: "/welcome" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (apiMode && !mobileGrant) {
      setVerifyError("Verify mobile OTP before creating the account.");
      setStep(verifyStep);
      return;
    }
    if (apiMode && !emailGrant) {
      setVerifyError("Verify mobile and email OTP before creating the account.");
      setStep(verifyStep);
      return;
    }
    const errs = validateStep3(s3);
    if (hasErrors(errs)) { setE3(errs); return; }
    setE3({});
    submittingRef.current = true;
    setLoading(true);
    clearError();
    try {
      const registrationPayload = {
        instituteName: s1.instituteName.trim(),
        instituteCode: s1.instituteCode.trim(),
        instituteType: s1.instituteType || undefined,
        educationBoard: s1.educationBoard || undefined,
        country: s2.country || undefined,
        state: s2.state || undefined,
        district: s2.district || undefined,
        city: s2.city || undefined,
        address: s2.address || undefined,
        pincode: s2.pincode || undefined,
        website: s2.website || undefined,
        principalName: s2.principalName.trim(),
        principalEmail: s2.email.trim().toLowerCase(),
        principalMobile: s2.mobile.trim(),
        principalDesignation: "Principal",
        logoPreview: s1.logoPreview || undefined,
      };
      await signUp({
        fullName:        s2.principalName,
        email:           s2.email,
        phone:           s2.mobile,
        role:            "principal",
        designation:     "Principal",
        password:        s3.password,
        confirmPassword: s3.confirmPassword,
        acceptTerms:     s3.acceptTerms,
        securityPin:     s3.pin,
        instituteName:   s1.instituteName,
        registrationPayload,
      });
      if (isApiAuthMode()) {
        navigate({ to: resolvePostSignupRoute(true), replace: true });
        return;
      }
      const { saveOtpPending } = await import("@/auth/otp-service");
      const { saveSetupDraft, createEmptySetupForm } = await import("@/auth/institute-setup-store");
      saveOtpPending({
        email: s2.email.trim().toLowerCase(),
        mobile: s2.mobile.trim(),
        emailVerified: false,
        mobileVerified: false,
      });
      const draftForm = createEmptySetupForm();
      saveSetupDraft({
        form: {
          ...draftForm,
          instituteName: s1.instituteName,
          instituteType: s1.instituteType || draftForm.instituteType,
          educationBoard: s1.educationBoard || draftForm.educationBoard,
          logoPreview: s1.logoPreview || "",
          country: s2.country || "India",
          state: s2.state || "",
          district: s2.district || "",
          city: s2.city || "",
          address: s2.address || "",
          pincode: s2.pincode || "",
          website: s2.website || "",
          principalName: s2.principalName,
          principalEmail: s2.email.trim().toLowerCase(),
          principalMobile: s2.mobile.trim(),
        },
        currentStep: 1,
        lastSavedAt: null,
      });
      navigate({ to: "/verify-email-otp", replace: true });
    } catch {
      // authError set by context
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  /* ── RENDER ──────────────────────────────────────────────── */
  const pageTitle =
    step === 1
      ? "Register"
      : step === 2
        ? "Contact"
        : step === verifyStep
          ? "Verify"
          : "Security";
  const pageSubtitle =
    step === 1
      ? "Institute details"
      : step === 2
        ? "Principal and address"
        : step === verifyStep
          ? maskedOtpDest
            ? `Code sent to ${maskedOtpDest}`
            : "Enter the code we sent"
          : "Password and PIN";

  return (
    <AuthLayout
      title={pageTitle}
      subtitle={pageSubtitle}
      showBack
      onBack={handleBack}
      backLabel="Back"
      footer={
        <>
          Already registered?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <AuthStepBar steps={[...STEP_META]} current={step} />

      <div className="mt-5 space-y-4">
        {step === 1 && (
          <Step1
            data={s1}
            errors={e1}
            onChange={change1}
            onLogoChange={(file, url) => setS1((p) => ({ ...p, logoFile: file, logoPreview: url }))}
            onLogoClear={() => setS1((p) => ({ ...p, logoFile: null, logoPreview: "" }))}
          />
        )}
        {step === 2 && (
          <Step2 data={s2} errors={e2} onChange={change2} />
        )}
        {step === verifyStep && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                {verifyChannel === "mobile" ? "Mobile OTP" : "Email OTP"}
              </p>
              <OtpInput
                value={signupOtp}
                onChange={(value) => {
                  setSignupOtp(value);
                  setVerifyError(null);
                }}
                onComplete={(value) => {
                  void handleVerifyOtpContinue(value);
                }}
                error={verifyError ?? undefined}
                disabled={loading}
              />
            </div>
            {devSignupOtp && (
              <DemoOtpHint
                otp={devSignupOtp}
                channel={verifyChannel}
                onUse={setSignupOtp}
              />
            )}
          </div>
        )}
        {step === securityStep && (
          <form id="step3-form" onSubmit={handleSubmit}>
            <Step3 data={s3} errors={e3} onChange={change3} />
          </form>
        )}

        {authError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/[0.05] p-3 text-xs text-destructive">
            {authError}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className="flex h-10 items-center gap-1.5 rounded-lg border border-border px-4 text-sm transition-colors hover:bg-surface-hover"
            >
              <ChevronLeft className="size-4" /> Back
            </button>
          )}

          {step < securityStep ? (
            step === verifyStep ? (
              <AuthButton
                type="button"
                onClick={() => void handleVerifyOtpContinue()}
                loading={loading}
                fullWidth={false}
                className="flex-1"
                disabled={signupOtp.length !== 6}
              >
                Continue <ArrowRight className="size-4" />
              </AuthButton>
            ) : (
              <AuthButton
                type="button"
                onClick={() => void handleNext()}
                loading={loading}
                fullWidth={step === 1}
              >
                Continue <ArrowRight className="size-4" />
              </AuthButton>
            )
          ) : (
            <AuthButton
              type="submit"
              form="step3-form"
              loading={loading}
              fullWidth={false}
              className="flex-1"
            >
              Create account
            </AuthButton>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
