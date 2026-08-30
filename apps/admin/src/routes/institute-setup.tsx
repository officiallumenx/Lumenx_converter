/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — Institute Profile Setup Wizard
 *  Shown after Email + Mobile OTP verification.
 * ───────────────────────────────────────────────────────────── */

import { IconChip } from "@/components/IconChip";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Check,
  Building2,
  Globe,
  Mail,
  Phone,
  User,
  MapPin,
  Hash,
  BookOpen,
  GraduationCap,
  Image as ImageIcon,
  X,
  Save,
  Pencil,
  CheckCircle2,
  ClipboardList,
  FileCheck,
} from "lucide-react";

import { AuthInput }   from "@/auth/components/AuthInput";
import { AuthButton }  from "@/auth/components/AuthButton";
import { AuthSelect } from "@/auth/components/AuthSelect";
import { AuthSectionHeader } from "@/auth/components/AuthSectionHeader";
import { AuthStepBar } from "@/auth/components/AuthStepBar";
import { useAuth }     from "@/auth/AuthContext";
import { useAdminToast } from "@/components/AdminActionToast";
import { useDemoProfile } from "@/lib/demo-profile-context";
import {
  type InstituteSetupForm,
  type SetupFormErrors,
  SETUP_STEP_META,
  TOTAL_SETUP_STEPS,
  INSTITUTE_TYPES,
  EDUCATION_BOARDS,
  COUNTRIES,
  INDIA_STATES,
  PRINCIPAL_DESIGNATIONS,
  createEmptySetupForm,
  loadSetupDraft,
  saveSetupDraft,
  validateSetupStep,
  hasSetupErrors,
  buildInstituteProfileFromSetup,
  isSetupComplete,
  isRegistrationSubmitted,
  markRegistrationSubmitted,
  formatSetupAddress,
  REVIEW_STEP,
} from "@/auth/institute-setup-store";
import { saveOtpPending, loadOtpPending } from "@/auth/otp-service";
import { submitInstituteRegistration, compressInstituteLogoDataUrl } from "@lumenx/utils";
import { resolveRegistrationGate } from "@/auth/registration-gate";
import { isApiAuthMode } from "@/auth/auth-mode";

export const Route = createFileRoute("/institute-setup")({
  head: () => ({ meta: [{ title: "Institute Profile Setup — LumenX Admin" }] }),
  component: InstituteSetupPage,
});

function LogoUpload({
  preview,
  onChange,
  onClear,
}: {
  preview: string;
  onChange: (url: string) => void;
  onClear: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => onChange(e.target?.result as string);
      reader.readAsDataURL(file);
    },
    [onChange],
  );

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-foreground">
        Institute Logo
        <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">(optional)</span>
      </label>

      {preview ? (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/25 bg-primary/[0.03]">
          <div className="size-14 rounded-xl border border-border bg-background flex items-center justify-center overflow-hidden shrink-0">
            <img src={preview} alt="Institute logo" className="size-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium">Logo uploaded</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Shown on documents and portals.</div>
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
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onDragOver={(e) => e.preventDefault()}
          className="w-full flex flex-col items-center gap-2 py-5 px-4 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/[0.02] transition-all group"
        >
          <IconChip icon={ImageIcon} size="md" variant="soft" />
          <div className="text-center">
            <div className="text-xs font-medium group-hover:text-primary transition-colors">
              Click to upload <span className="text-primary underline">or drag &amp; drop</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG, SVG up to 2 MB</div>
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
   STEP PANELS
══════════════════════════════════════════════════════════════ */

function StepInstituteProfile({
  form,
  errors,
  onChange,
}: {
  form: InstituteSetupForm;
  errors: SetupFormErrors;
  onChange: (field: keyof InstituteSetupForm, value: string) => void;
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
        value={form.instituteName}
        onChange={(e) => onChange("instituteName", e.target.value)}
        error={errors.instituteName}
        required
      />
      <LogoUpload
        preview={form.logoPreview}
        onChange={(url) => onChange("logoPreview", url)}
        onClear={() => onChange("logoPreview", "")}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AuthSelect
          label="Institute Type"
          name="instituteType"
          icon={Building2}
          options={INSTITUTE_TYPES}
          value={form.instituteType}
          onChange={(e) => onChange("instituteType", e.target.value)}
          error={errors.instituteType}
          required
        />
        <AuthSelect
          label="Education Board"
          name="educationBoard"
          icon={BookOpen}
          options={EDUCATION_BOARDS}
          value={form.educationBoard}
          onChange={(e) => onChange("educationBoard", e.target.value)}
          error={errors.educationBoard}
          required
        />
      </div>
    </div>
  );
}

function StepLocation({
  form,
  errors,
  onChange,
}: {
  form: InstituteSetupForm;
  errors: SetupFormErrors;
  onChange: (field: keyof InstituteSetupForm, value: string) => void;
}) {
  const stateOptions = form.country === "India" ? INDIA_STATES : [];

  return (
    <div className="space-y-4">
      <AuthSectionHeader
        icon={MapPin}
        title="Institute Location"
        subtitle="Official registered address of the institute"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AuthSelect
          label="Country"
          name="country"
          icon={Globe}
          options={COUNTRIES}
          value={form.country}
          onChange={(e) => onChange("country", e.target.value)}
          error={errors.country}
          required
        />
        {stateOptions.length > 0 ? (
          <AuthSelect
            label="State"
            name="state"
            icon={MapPin}
            options={stateOptions}
            value={form.state}
            onChange={(e) => onChange("state", e.target.value)}
            error={errors.state}
            required
          />
        ) : (
          <AuthInput
            label="State / Province"
            name="state"
            icon={MapPin}
            placeholder="State or province"
            value={form.state}
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
          placeholder="e.g. Bengaluru Urban"
          value={form.district}
          onChange={(e) => onChange("district", e.target.value)}
          error={errors.district}
          required
        />
        <AuthInput
          label="City"
          name="city"
          icon={MapPin}
          placeholder="e.g. Bengaluru"
          value={form.city}
          onChange={(e) => onChange("city", e.target.value)}
          error={errors.city}
          required
        />
      </div>
      <AuthInput
        label="Full Address"
        name="address"
        icon={MapPin}
        placeholder="Building, street, area"
        value={form.address}
        onChange={(e) => onChange("address", e.target.value)}
        error={errors.address}
        required
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AuthInput
          label="Pincode"
          name="pincode"
          icon={Hash}
          placeholder="560001"
          value={form.pincode}
          onChange={(e) => onChange("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
          error={errors.pincode}
          required
        />
        <AuthInput
          label="Website"
          name="website"
          icon={Globe}
          placeholder="www.institute.edu"
          value={form.website}
          onChange={(e) => onChange("website", e.target.value)}
          error={errors.website}
          hint="Optional"
        />
      </div>
    </div>
  );
}

function StepPrincipal({
  form,
  errors,
  onChange,
}: {
  form: InstituteSetupForm;
  errors: SetupFormErrors;
  onChange: (field: keyof InstituteSetupForm, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <AuthSectionHeader
        icon={GraduationCap}
        title="Principal Details"
        subtitle="Primary administrator for this institute account"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AuthInput
          label="Principal Name"
          name="principalName"
          icon={User}
          placeholder="Dr. Ananya Verma"
          value={form.principalName}
          onChange={(e) => onChange("principalName", e.target.value)}
          error={errors.principalName}
          required
        />
        <AuthSelect
          label="Designation"
          name="principalDesignation"
          icon={GraduationCap}
          options={PRINCIPAL_DESIGNATIONS}
          value={form.principalDesignation}
          onChange={(e) => onChange("principalDesignation", e.target.value)}
          error={errors.principalDesignation}
          required
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AuthInput
          label="Email Address"
          name="principalEmail"
          type="email"
          icon={Mail}
          placeholder="principal@institute.edu"
          value={form.principalEmail}
          onChange={(e) => onChange("principalEmail", e.target.value)}
          error={errors.principalEmail}
          required
        />
        <AuthInput
          label="Mobile Number"
          name="principalMobile"
          type="tel"
          icon={Phone}
          placeholder="+91 98765 43210"
          value={form.principalMobile}
          onChange={(e) => onChange("principalMobile", e.target.value)}
          error={errors.principalMobile}
          required
        />
      </div>
      <AuthInput
        label="Employee ID"
        name="employeeId"
        icon={Hash}
        placeholder="LX-EMP-001"
        value={form.employeeId}
        onChange={(e) => onChange("employeeId", e.target.value)}
        error={errors.employeeId}
        hint="Optional · used for internal records"
      />

      <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground leading-relaxed">
        <strong className="text-foreground">Almost done.</strong>{" "}
        On the next step you can review all details before submitting your registration.
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   REVIEW & SUBMIT
══════════════════════════════════════════════════════════════ */

function ReviewRow({ label, value }: { label: string; value: string }) {
  const display = value.trim() || "—";
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2.5 border-b border-border/40 last:border-0">
      <dt className="text-[11px] font-medium text-muted-foreground sm:w-36 shrink-0">{label}</dt>
      <dd className="text-sm text-foreground break-words flex-1">{display}</dd>
    </div>
  );
}

function ReviewSection({
  title,
  icon: Icon,
  step,
  onEdit,
  children,
}: {
  title: string;
  icon: typeof Building2;
  step: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-2.5 min-w-0">
          <IconChip icon={Icon} size="sm" />
          <h3 className="text-sm font-semibold truncate">{title}</h3>
        </div>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors shrink-0"
        >
          <Pencil className="size-3" />
          Edit
        </button>
      </div>
      <dl className="px-4 py-1">{children}</dl>
    </section>
  );
}

function StepReview({
  form,
  onEdit,
  confirmChecked,
  onConfirmChange,
  confirmError,
}: {
  form: InstituteSetupForm;
  onEdit: (step: number) => void;
  confirmChecked: boolean;
  onConfirmChange: (checked: boolean) => void;
  confirmError?: string;
}) {
  return (
    <div className="space-y-4">
      <AuthSectionHeader
        icon={ClipboardList}
        title="Review & Submit"
        subtitle="Verify all institute details before submitting your registration"
      />

      {form.logoPreview && (
        <div className="flex items-center gap-4 p-4 rounded-xl border border-primary/20 bg-primary/[0.03]">
          <div className="size-16 rounded-xl border border-border bg-background overflow-hidden shrink-0">
            <img src={form.logoPreview} alt="Institute logo" className="size-full object-cover" />
          </div>
          <div>
            <div className="text-sm font-semibold">{form.instituteName || "Your institute"}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Logo attached</div>
          </div>
        </div>
      )}

      <ReviewSection title="Institute Profile" icon={Building2} step={1} onEdit={onEdit}>
        <ReviewRow label="Institute Name" value={form.instituteName} />
        <ReviewRow label="Institute Type" value={form.instituteType} />
        <ReviewRow label="Education Board" value={form.educationBoard} />
        {!form.logoPreview && <ReviewRow label="Logo" value="Not uploaded" />}
      </ReviewSection>

      <ReviewSection title="Location" icon={MapPin} step={2} onEdit={onEdit}>
        <ReviewRow label="Country" value={form.country} />
        <ReviewRow label="State" value={form.state} />
        <ReviewRow label="District" value={form.district} />
        <ReviewRow label="City" value={form.city} />
        <ReviewRow label="Address" value={form.address} />
        <ReviewRow label="Pincode" value={form.pincode} />
        <ReviewRow label="Website" value={form.website || "—"} />
        <ReviewRow label="Full Address" value={formatSetupAddress(form)} />
      </ReviewSection>

      <ReviewSection title="Principal Details" icon={GraduationCap} step={3} onEdit={onEdit}>
        <ReviewRow label="Principal Name" value={form.principalName} />
        <ReviewRow label="Designation" value={form.principalDesignation} />
        <ReviewRow label="Email" value={form.principalEmail} />
        <ReviewRow label="Mobile" value={form.principalMobile} />
        <ReviewRow label="Employee ID" value={form.employeeId || "—"} />
      </ReviewSection>

      <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 dark:border-amber-800/50 dark:bg-amber-950/20 px-4 py-3 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
        After submission, your registration will be reviewed. You will need to verify your email
        and mobile number before accessing the LumenX Admin dashboard.
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-border p-4 cursor-pointer hover:bg-muted/30 transition-colors">
        <input
          type="checkbox"
          checked={confirmChecked}
          onChange={(e) => onConfirmChange(e.target.checked)}
          className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary/40"
        />
        <span className="text-xs text-muted-foreground leading-relaxed">
          I confirm that all information provided is accurate and I am authorised to register
          this institute on LumenX Admin.
        </span>
      </label>
      {confirmError && (
        <p role="alert" className="text-[11px] text-destructive flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-destructive shrink-0" />
          {confirmError}
        </p>
      )}
    </div>
  );
}

function RegistrationSuccessScreen({
  referenceId,
  instituteName,
  onContinue,
}: {
  referenceId: string;
  instituteName: string;
  onContinue: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onContinue, 3200);
    return () => clearTimeout(t);
  }, [onContinue]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-emerald-500/[0.07] rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-primary/[0.06] rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 ring-4 ring-emerald-100/80 dark:ring-emerald-900/40">
          <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight">Registration complete</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">{instituteName}</strong> is registered.
          Continue to the dashboard to start managing your institute.
        </p>

        <div className="mt-6 rounded-xl border border-border bg-card p-4 text-left space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Reference ID</span>
            <span className="font-mono font-semibold text-primary">{referenceId}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Status</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-400 font-medium">
              <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
              Pending verification
            </span>
          </div>
        </div>

        <p className="mt-5 text-xs text-muted-foreground">
          Waiting for platform approval in Nexus…
        </p>

        <div className="mt-6">
          <AuthButton variant="primary" fullWidth onClick={onContinue}>
            View application status
            <ArrowRight className="size-3.5" />
          </AuthButton>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */

const STEP_HINTS = [
  "Name, logo, type, and education board",
  "Country, state, district, city, address, pincode, website",
  "Principal name, contact, and designation",
  "Review all details and submit registration",
] as const;

function InstituteSetupPage() {
  // API mode: demo registration wizard must not run (localStorage / Nexus cookie funnel).
  if (isApiAuthMode()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md space-y-3 text-center">
          <h1 className="text-lg font-semibold">Institute setup (demo only)</h1>
          <p className="text-sm text-muted-foreground">
            API auth mode uses platform institute create on the Institute page
            (platform operators) and memberships under Accounts. The demo
            registration wizard is disabled.
          </p>
          <Link to="/" className="text-sm text-primary hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <InstituteSetupDemoPage />;
}

function InstituteSetupDemoPage() {
  const navigate = useNavigate();
  const notify   = useAdminToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { instituteProfile, saveInstituteProfile } = useDemoProfile();

  const draftOnMount = loadSetupDraft();
  const [step, setStep]       = useState(draftOnMount?.currentStep ?? 1);
  const [form, setForm]       = useState<InstituteSetupForm>(
    () => draftOnMount?.form ?? createEmptySetupForm(),
  );
  const [errors, setErrors]   = useState<SetupFormErrors>({});
  const [loading, setLoading] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ referenceId: string; instituteName: string } | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(
    draftOnMount?.lastSavedAt ?? null,
  );

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate({ to: "/login", replace: true });
      return;
    }
    const gate = resolveRegistrationGate(user);
    if (gate.kind === "verify_email") {
      navigate({ to: "/verify-email-otp", replace: true });
      return;
    }
    if (gate.kind === "verify_mobile") {
      navigate({ to: "/verify-mobile-otp", replace: true });
      return;
    }
    if (gate.kind === "pending" || gate.kind === "rejected") {
      navigate({ to: "/pending-verification", replace: true });
      return;
    }
    if (gate.kind === "allow") {
      navigate({ to: "/", replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user]);

  const change = (field: keyof InstituteSetupForm, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const persistDraft = (nextStep = step) => {
    const saved = saveSetupDraft({ form, currentStep: nextStep, lastSavedAt: null });
    setDraftSavedAt(saved.lastSavedAt);
    notify(`Draft saved · Step ${nextStep} of ${TOTAL_SETUP_STEPS}`);
  };

  const handleSaveDraft = () => {
    persistDraft(step);
  };

  const handleNext = () => {
    const errs = validateSetupStep(step, form);
    if (hasSetupErrors(errs)) {
      setErrors(errs);
      return;
    }
    setErrors({});
    if (step < REVIEW_STEP) {
      const next = step + 1;
      setStep(next);
      persistDraft(next);
      scrollTop();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => s - 1);
      setErrors({});
      setConfirmError(null);
      scrollTop();
    }
  };

  const handleEditStep = (targetStep: number) => {
    setStep(targetStep);
    setErrors({});
    setConfirmError(null);
    scrollTop();
  };

  const handleConfirm = async () => {
    if (!confirmChecked) {
      setConfirmError("Please confirm that the information provided is accurate.");
      return;
    }
    const errs = validateSetupStep(REVIEW_STEP, form);
    if (hasSetupErrors(errs)) {
      setErrors(errs);
      const firstInvalid = [1, 2, 3].find((s) => hasSetupErrors(validateSetupStep(s, form)));
      if (firstInvalid) setStep(firstInvalid);
      return;
    }
    setConfirmError(null);
    setErrors({});
    setLoading(true);
    try {
      const otp = loadOtpPending();
      if (!otp?.emailVerified || !otp.mobileVerified) {
        setConfirmError("Verify email and mobile OTP before submitting.");
        setLoading(false);
        if (!otp?.emailVerified) navigate({ to: "/verify-email-otp", replace: true });
        else navigate({ to: "/verify-mobile-otp", replace: true });
        return;
      }
      await new Promise((r) => setTimeout(r, 600));
      const profile = buildInstituteProfileFromSetup(form, instituteProfile);
      saveInstituteProfile(profile);
      const submission = markRegistrationSubmitted(form);
      const logoThumb = form.logoPreview
        ? await compressInstituteLogoDataUrl(form.logoPreview, {
            maxEdge: 96,
            quality: 0.62,
            maxDataUrlChars: 5500,
          })
        : null;
      const application = submitInstituteRegistration({
        payload: {
          instituteName: form.instituteName,
          logoPreview: logoThumb || undefined,
          instituteType: form.instituteType,
          educationBoard: form.educationBoard,
          country: form.country,
          state: form.state,
          district: form.district,
          city: form.city,
          address: form.address,
          pincode: form.pincode,
          website: form.website,
          principalName: form.principalName,
          principalEmail: form.principalEmail,
          principalMobile: form.principalMobile,
          principalDesignation: form.principalDesignation,
          employeeId: form.employeeId,
        },
        emailVerified: true,
        mobileVerified: true,
      });
      saveOtpPending({
        email: form.principalEmail,
        mobile: form.principalMobile,
        emailVerified: true,
        mobileVerified: true,
      });
      setSuccessData({
        referenceId: application.referenceId || submission.referenceId,
        instituteName: form.instituteName.trim() || "Your institute",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessContinue = () => {
    navigate({ to: "/pending-verification", replace: true });
  };

  const stepTitle = step === REVIEW_STEP
    ? "Review & Submit"
    : (SETUP_STEP_META[step - 1]?.label ?? "Setup");

  if (successData) {
    return (
      <RegistrationSuccessScreen
        referenceId={successData.referenceId}
        instituteName={successData.instituteName}
        onContinue={handleSuccessContinue}
      />
    );
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen-dvh flex bg-background text-foreground">
      {/* ── Left brand panel ───────────────────────────── */}
      <aside className="hidden xl:flex xl:w-[36%] flex-col justify-between p-10 bg-gradient-to-br from-primary/[0.07] via-background to-chart-5/[0.05] border-r border-border relative overflow-hidden shrink-0">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-10">
            <div className="size-9 rounded-xl bg-primary flex items-center justify-center shadow-glow">
              <Sparkles className="size-4 text-primary-foreground" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight">LUMENX ADMIN</div>
              <div className="text-[10px] text-muted-foreground">Institute onboarding</div>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight leading-snug">
            Set up your<br />institute profile
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
            Complete your institute details to unlock certificates, documents,
            portals, and the full admin dashboard.
          </p>

          <div className="mt-8 space-y-3">
            {SETUP_STEP_META.map((s, i) => {
              const n      = i + 1;
              const done   = n < step;
              const active = n === step;
              return (
                <div
                  key={n}
                  className={[
                    "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
                    active
                      ? "border-primary/30 bg-primary/[0.04]"
                      : done
                        ? "border-emerald-500/20 bg-emerald-500/[0.03]"
                        : "border-border/50 bg-transparent opacity-60",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "size-6 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0",
                      active
                        ? "bg-primary border-primary text-primary-foreground"
                        : done
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "bg-muted border-border text-muted-foreground",
                    ].join(" ")}
                  >
                    {done ? <Check className="size-3" /> : n}
                  </div>
                  <div className="min-w-0">
                    <div
                      className={`text-xs font-medium ${
                        active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">{STEP_HINTS[i]}</div>
                  </div>
                  {active && <div className="ml-auto size-1.5 rounded-full bg-primary animate-pulse shrink-0" />}
                  {done && <Check className="ml-auto size-3.5 text-emerald-500 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 text-[10px] text-muted-foreground">
          &copy; {new Date().getFullYear()} LumenX Technologies
        </div>
      </aside>

      {/* ── Right: wizard ──────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <div className="lx-auth-top-bar flex items-center justify-between border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2 xl:hidden">
            <div className="size-7 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="size-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xs tracking-tight">LUMENX ADMIN</span>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-[11px] text-muted-foreground">
              Step {step} of {TOTAL_SETUP_STEPS}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 sm:px-8 py-8">
            <div className="mb-6">
              <h1 className="text-xl font-bold tracking-tight">{stepTitle}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {step === 1 && "Tell us about your institution"}
                {step === 2 && "Where is your institute located?"}
                {step === 3 && "Who manages this institute account?"}
                {step === REVIEW_STEP && "Check everything looks correct before you submit"}
              </p>
            </div>

            {draftSavedAt && (
              <div className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/30 px-3 py-2 text-[11px] text-emerald-700 dark:text-emerald-400">
                <Save className="size-3.5 shrink-0" />
                Last saved {new Date(draftSavedAt).toLocaleString()}
              </div>
            )}

            <AuthStepBar steps={SETUP_STEP_META} current={step} />

            {step === 1 && (
              <StepInstituteProfile form={form} errors={errors} onChange={change} />
            )}
            {step === 2 && (
              <StepLocation form={form} errors={errors} onChange={change} />
            )}
            {step === 3 && (
              <StepPrincipal form={form} errors={errors} onChange={change} />
            )}
            {step === REVIEW_STEP && (
              <StepReview
                form={form}
                onEdit={handleEditStep}
                confirmChecked={confirmChecked}
                onConfirmChange={(checked) => {
                  setConfirmChecked(checked);
                  if (checked) setConfirmError(null);
                }}
                confirmError={confirmError ?? undefined}
              />
            )}

            {/* ── Actions ─────────────────────────────────── */}
            <div className="mt-8 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 pt-6 border-t border-border/50">
              <div className="flex gap-2 sm:mr-auto">
                {step > 1 && (
                  <AuthButton type="button" variant="outline" fullWidth={false} onClick={handleBack}>
                    <ArrowLeft className="size-3.5" />
                    Back
                  </AuthButton>
                )}
                {step < REVIEW_STEP && (
                  <AuthButton type="button" variant="ghost" fullWidth={false} onClick={handleSaveDraft}>
                    <Save className="size-3.5" />
                    Save draft
                  </AuthButton>
                )}
              </div>

              {step < REVIEW_STEP ? (
                <AuthButton type="button" variant="primary" fullWidth={false} onClick={handleNext}>
                  Continue
                  <ArrowRight className="size-3.5" />
                </AuthButton>
              ) : (
                <AuthButton
                  type="button"
                  variant="primary"
                  fullWidth={false}
                  loading={loading}
                  onClick={handleConfirm}
                >
                  Confirm &amp; submit
                  <FileCheck className="size-3.5" />
                </AuthButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
