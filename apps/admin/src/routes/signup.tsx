import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useCallback } from "react";
import {
  Sparkles, ArrowLeft, ArrowRight, ChevronLeft, Check,
  Building2, Globe, Mail, Phone, User, MapPin, Hash,
  Lock, Upload, X, ShieldCheck, Image as ImageIcon,
  BookOpen, GraduationCap,
} from "lucide-react";
import { AuthInput } from "@/auth/components/AuthInput";
import { AuthButton } from "@/auth/components/AuthButton";
import { AuthSelect } from "@/auth/components/AuthSelect";
import { AuthSectionHeader } from "@/auth/components/AuthSectionHeader";
import { AuthStepBar } from "@/auth/components/AuthStepBar";
import { PasswordStrength } from "@/auth/components/PasswordStrength";
import { PinInput } from "@/auth/components/PinInput";
import { useAuth } from "@/auth/AuthContext";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isAppLockRequired } from "@/auth/app-lock-policy";
import { resolvePostSignupRoute } from "@/auth/signup-routing";
import { useTheme } from "@/components/theme-provider";
import { IconChip } from "@/components/IconChip";
import {
  getPasswordStrength,
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
  "School (K-12)", "Junior College", "Degree College",
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

const STEP_META = [
  { label: "Institute Profile",    short: "Profile"  },
  { label: "Contact & Location",   short: "Contact"  },
  { label: "Security",             short: "Security" },
] as const;

/* ══════════════════════════════════════════════════════════════
   LOCAL TYPES
══════════════════════════════════════════════════════════════ */

interface Step1 {
  instituteName: string;
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
  if (isAppLockRequired()) {
    if (!d.pin)                             e.pin             = "Security PIN is required";
    else if (d.pin.length < 6)              e.pin             = "PIN must be exactly 6 digits";
    else if (!/^\d{6}$/.test(d.pin))        e.pin             = "PIN must contain only digits";
    if (!d.confirmPin)                      e.confirmPin      = "Please confirm your PIN";
    else if (d.pin !== d.confirmPin)        e.confirmPin      = "PINs do not match";
  }
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

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
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
            <div className="text-[10px] text-muted-foreground mt-0.5">Looking good! Shown on documents and portals.</div>
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
              Click to upload <span className="text-primary underline">or drag &amp; drop</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG, SVG up to 2 MB · Recommended 400×400</div>
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
        title="Institute Profile"
        subtitle="Basic information about your educational institution"
      />

      <AuthInput
        label="Institute Name"
        name="instituteName"
        icon={Building2}
        placeholder="e.g. LumenX International School"
        value={data.instituteName}
        onChange={(e) => onChange("instituteName", e.target.value)}
        error={errors.instituteName}
        required
      />

      <LogoUpload
        preview={data.logoPreview}
        onChange={onLogoChange}
        onClear={onLogoClear}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        title="Principal / Admin Details"
        subtitle="The primary contact person for this institute account"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          title="Institute Location"
          subtitle="Official registered address of the institute"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
  const pwdStrength = getPasswordStrength(data.password);
  const pinMatch    = data.pin.length === 6 && data.confirmPin.length === 6 && data.pin === data.confirmPin;

  return (
    <div className="space-y-4">
      {/* Password section */}
      <AuthSectionHeader
        icon={Lock}
        title="Password"
        subtitle="Set a strong password for your admin account"
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

      {/* PIN section — demo mode local app lock only */}
      {isAppLockRequired() && (
      <>
      <div className="pt-2">
        <AuthSectionHeader
          icon={ShieldCheck}
          title="6-Digit Security PIN"
          subtitle="Used for sensitive actions (approvals, document publishing, bulk operations)"
        />
      </div>

      <PinInput
        label="Create Security PIN"
        value={data.pin}
        onChange={(v) => onChange("pin", v)}
        error={errors.pin}
        hint="Use 6 unique digits — do not use birth year or repeating numbers"
        required
        autoFocus
      />

      <PinInput
        label="Confirm Security PIN"
        value={data.confirmPin}
        onChange={(v) => onChange("confirmPin", v)}
        error={errors.confirmPin}
        hint={pinMatch ? "PINs match" : "Re-enter the same 6-digit PIN"}
        required
      />

      {pinMatch && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-success/30 bg-success/[0.04] text-xs text-success">
          <Check className="size-3.5 shrink-0" />
          PINs match — you&apos;re all set
        </div>
      )}

      {/* Security tips */}
      <div className="p-3.5 rounded-xl border border-border/50 bg-surface/50 space-y-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Security tips</div>
        {[
          "Never share your PIN with anyone, including support staff",
          "Your PIN is separate from your login password",
          "You can change your PIN anytime from Settings → Security",
        ].map((tip) => (
          <div key={tip} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3 text-primary shrink-0 mt-0.5" />
            {tip}
          </div>
        ))}
      </div>
      </>
      )}

      {/* Password strength reminder */}
      {pwdStrength < 3 && data.password && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-warning/30 bg-warning/[0.05] text-[11px] text-warning">
          <svg className="size-3.5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
          <span>Consider a stronger password — add uppercase letters, numbers, and special characters.</span>
        </div>
      )}

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
            <span className="text-primary hover:underline cursor-pointer">Terms of Service</span>
            {" "}and{" "}
            <span className="text-primary hover:underline cursor-pointer">Privacy Policy</span>
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
  const { theme } = useTheme();
  const [step,    setStep]    = useState(1);
  const [loading, setLoading] = useState(false);

  /* ─ form state ─ */
  const [s1, setS1] = useState<Step1>({
    instituteName: "", logoFile: null, logoPreview: "", instituteType: "", educationBoard: "",
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

  const handleNext = () => {
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
      setStep(3);
      scrollTop();
    }
  };

  const handleBack = () => {
    if (step > 1) { setStep((s) => s - 1); scrollTop(); }
    else navigate({ to: "/welcome" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateStep3(s3);
    if (hasErrors(errs)) { setE3(errs); return; }
    setE3({});
    setLoading(true);
    clearError();
    try {
      const registrationPayload = {
        instituteName: s1.instituteName.trim(),
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
        securityPin:     isAppLockRequired() ? s3.pin : undefined,
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
      setLoading(false);
    }
  };

  /* ── RENDER ──────────────────────────────────────────────── */
  return (
    <div className="min-h-screen-dvh flex bg-background text-foreground">
      {/* ── Left brand panel ───────────────────────────── */}
      <aside className="hidden xl:flex xl:w-[36%] flex-col justify-between p-10 bg-gradient-to-br from-primary/[0.07] via-background to-chart-5/[0.05] border-r border-border relative overflow-hidden shrink-0">
        {/* Grid texture */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)", backgroundSize: "40px 40px" }}
        />
        <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-80 h-80 bg-chart-5/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3 mb-10">
            <div className="size-11 rounded-xl bg-primary flex items-center justify-center shadow-glow">
              <Sparkles className="size-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-bold text-[15px] tracking-tight">LUMENX ADMIN</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Institute Intelligence</div>
            </div>
          </Link>

          <h2 className="text-3xl font-bold tracking-tight leading-tight">
            Set up your<br />institute account
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
            Complete institute onboarding in a few steps — profile, contact, and security setup.
          </p>

          {/* Progress summary */}
          <div className="mt-8 space-y-3">
            {STEP_META.map((s, i) => {
              const n     = i + 1;
              const done  = n < step;
              const active = n === step;
              return (
                <div key={n} className={[
                  "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
                  active ? "border-primary/30 bg-primary/[0.04]" : done ? "border-success/20 bg-success/[0.03]" : "border-border/50 bg-transparent opacity-60",
                ].join(" ")}>
                  <div className={[
                    "size-6 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0",
                    active ? "bg-primary border-primary text-primary-foreground" : done ? "bg-success border-success text-white" : "bg-muted border-border text-muted-foreground",
                  ].join(" ")}>
                    {done ? <Check className="size-3" /> : n}
                  </div>
                  <div>
                    <div className={`text-xs font-medium ${active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {n === 1 ? "Name, logo, type, board" : n === 2 ? "Principal, contact, address" : "Password & security PIN"}
                    </div>
                  </div>
                  {active && <div className="ml-auto size-1.5 rounded-full bg-primary animate-pulse" />}
                  {done  && <Check className="ml-auto size-3.5 text-success" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 text-[10px] text-muted-foreground">
          &copy; {new Date().getFullYear()} LumenX Technologies · All rights reserved
        </div>
      </aside>

      {/* ── Right: form ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Top bar */}
        <div className="lx-auth-top-bar flex items-center justify-between border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile logo */}
            <div className="flex items-center gap-2 xl:hidden">
              <div className="size-7 rounded-lg bg-primary flex items-center justify-center shadow-glow">
                <Sparkles className="size-3.5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xs tracking-tight">LUMENX ADMIN</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              {step === 1 ? "Welcome" : `Step ${step - 1}`}
            </button>
            <span className="text-[11px] text-muted-foreground hidden sm:block">
              Step {step} of {STEP_META.length}
            </span>
            <Link to="/login" className="text-[11px] text-primary hover:underline">
              Login instead
            </Link>
          </div>
        </div>

        {/* Scrollable form content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 sm:px-8 py-8">

            {/* Heading */}
            <div className="mb-6">
              <h1 className="text-xl font-bold tracking-tight">
                {step === 1 ? "Institute Profile" : step === 2 ? "Contact & Location" : "Security Setup"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {step === 1 ? "Tell us about your institution" : step === 2 ? "How can we reach you?" : "Protect your account with a strong password and PIN"}
              </p>
            </div>

            {/* Step progress bar */}
            <AuthStepBar steps={STEP_META} current={step} />

            {/* Step content */}
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
            {step === 3 && (
              <form id="step3-form" onSubmit={handleSubmit}>
                <Step3 data={s3} errors={e3} onChange={change3} />
              </form>
            )}

            {/* Auth error */}
            {authError && (
              <div className="mt-4 p-3 rounded-lg border border-destructive/30 bg-destructive/[0.05] text-xs text-destructive">
                {authError}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="mt-6 flex items-center gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1.5 h-10 px-4 rounded-lg border border-border text-sm hover:bg-surface-hover transition-colors"
                >
                  <ChevronLeft className="size-4" /> Back
                </button>
              )}

              {step < 3 ? (
                <AuthButton type="button" onClick={handleNext} fullWidth={step === 1}>
                  Continue <ArrowRight className="size-4" />
                </AuthButton>
              ) : (
                <AuthButton
                  type="submit"
                  form="step3-form"
                  loading={loading}
                  fullWidth={false}
                  className="flex-1"
                >
                  Create account &amp; get started
                </AuthButton>
              )}
            </div>

            {/* Login link */}
            <p className="mt-5 text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Login
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 text-center text-[10px] text-muted-foreground/40 shrink-0 border-t border-border/30">
          {theme} mode
        </div>
      </div>
    </div>
  );
}
