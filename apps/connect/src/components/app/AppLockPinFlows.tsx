import { forwardRef, useEffect, useRef, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Lock } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@lumenx/ui";
import { DEMO_CONNECT_OTP, DEMO_CONNECT_PASSWORD } from "@lumenx/auth";
import type { Role } from "@lumenx/types";
import { appLockStore } from "@/lib/app-lock-store";
import { attemptStudentPassword } from "@/lib/student-auth-store";
import { toast } from "sonner";

type ForgotStep = "password" | "otp" | "newPin" | "confirmPin" | "verifyPin";
type ChangeStep = "oldPin" | "newPins" | "otp";

function PinField({
  label,
  value,
  onChange,
  autoFocus,
  placeholder = "6-digit PIN",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="relative">
        <Input
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          type={visible ? "text" : "password"}
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="h-12 rounded-xl pr-10 text-center tracking-[0.35em]"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-label={visible ? "Hide PIN" : "Show PIN"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

function PinFieldPair({
  pin,
  confirmPin,
  onPin,
  onConfirm,
  pinLabel = "New PIN",
  confirmLabel = "Re-enter PIN",
}: {
  pin: string;
  confirmPin: string;
  onPin: (v: string) => void;
  onConfirm: (v: string) => void;
  pinLabel?: string;
  confirmLabel?: string;
}) {
  return (
    <div className="space-y-3">
      <PinField label={pinLabel} value={pin} onChange={onPin} autoFocus />
      <PinField label={confirmLabel} value={confirmPin} onChange={onConfirm} />
    </div>
  );
}

const PasswordField = forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (v: string) => void;
    autoFocus?: boolean;
  }
>(function PasswordField({ value, onChange, autoFocus }, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Account password</label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          autoFocus={autoFocus}
          placeholder="Your login password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 rounded-xl pl-10 pr-10 text-base"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Demo: <span className="font-mono">{DEMO_CONNECT_PASSWORD}</span>
      </p>
    </div>
  );
});

function OtpBlock({
  otp,
  onChange,
  onVerify,
  loading,
  label = "Verify OTP",
}: {
  otp: string;
  onChange: (v: string) => void;
  onVerify: () => void;
  loading: boolean;
  label?: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter the 6-digit code sent to your registered mobile number.
      </p>
      <div className="flex justify-center">
        <InputOTP maxLength={6} value={otp} onChange={onChange} autoFocus>
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <InputOTPSlot key={i} index={i} className="size-11 rounded-xl" />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
      <p className="text-[11px] text-center text-muted-foreground">
        Demo OTP: <span className="font-mono">{DEMO_CONNECT_OTP}</span>
      </p>
      <Button
        className="w-full rounded-xl"
        disabled={loading || otp.length !== 6}
        onClick={onVerify}
      >
        {loading ? "Verifying…" : label}
      </Button>
    </div>
  );
}

function verifyDemoOtp(otp: string): boolean {
  return otp.trim() === DEMO_CONNECT_OTP;
}

function verifyAccountPassword(
  phone: string,
  instituteId: string | null,
  role: Role | null,
  password: string,
): boolean {
  if (role === "student" && instituteId) {
    const result = attemptStudentPassword(phone, instituteId, password);
    return result.ok;
  }
  return password === DEMO_CONNECT_PASSWORD;
}

function DialogActions({
  onBack,
  onNext,
  backLabel = "Back",
  nextLabel = "Continue",
  nextDisabled,
  loading,
}: {
  onBack?: () => void;
  onNext: () => void;
  backLabel?: string;
  nextLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      {onBack ? (
        <Button variant="ghost" className="rounded-xl" onClick={onBack}>
          {backLabel}
        </Button>
      ) : null}
      <Button className="rounded-xl" onClick={onNext} disabled={nextDisabled || loading}>
        {loading ? "Please wait…" : nextLabel}
      </Button>
    </div>
  );
}

/** Forgot PIN: password → OTP → new PIN → re-enter → enter PIN → unlock */
export function AppLockForgotPinFlow({
  active,
  onClose,
  onSuccess,
  phone,
  role,
  instituteId,
}: {
  active: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  phone: string;
  role: Role | null;
  instituteId: string | null;
}) {
  const [step, setStep] = useState<ForgotStep>("password");
  const [accountPassword, setAccountPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [verifyPin, setVerifyPin] = useState("");
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!active) {
      setStep("password");
      setAccountPassword("");
      setOtp("");
      setPin("");
      setConfirmPin("");
      setVerifyPin("");
      setLoading(false);
      return;
    }
    // Defer focus so the sheet paints above the lock screen before the keyboard opens.
    const t = window.setTimeout(() => passwordRef.current?.focus(), 120);
    return () => window.clearTimeout(t);
  }, [active]);

  if (!active) return null;

  const verifyPassword = () => {
    if (!accountPassword.trim()) return toast.error("Enter your account password");
    if (!verifyAccountPassword(phone, instituteId, role, accountPassword)) {
      return toast.error("Incorrect password");
    }
    setOtp("");
    setStep("otp");
    toast.success(`OTP sent (demo: ${DEMO_CONNECT_OTP})`);
  };

  const verifyOtp = () => {
    if (!verifyDemoOtp(otp)) return toast.error(`Incorrect OTP (demo: ${DEMO_CONNECT_OTP})`);
    setPin("");
    setConfirmPin("");
    setStep("newPin");
  };

  const continueNewPin = () => {
    if (!/^\d{6}$/.test(pin)) return toast.error("Enter a 6-digit PIN");
    setConfirmPin("");
    setStep("confirmPin");
  };

  const continueConfirmPin = () => {
    if (pin !== confirmPin) return toast.error("PINs do not match");
    setVerifyPin("");
    setStep("verifyPin");
  };

  const finishUnlock = () => {
    if (verifyPin !== pin) return toast.error("PIN does not match what you set");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      appLockStore.updatePin(pin);
      toast.success("App lock PIN reset — you're in");
      onClose();
      onSuccess?.();
    }, 280);
  };

  const stepTitle: Record<ForgotStep, string> = {
    password: "Forgot app lock PIN",
    otp: "Verify OTP",
    newPin: "New PIN",
    confirmPin: "Re-enter PIN",
    verifyPin: "Confirm PIN",
  };

  return (
    <div
      className="fixed inset-0 z-[310] flex flex-col bg-background text-foreground safe-area-pt"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-pin-title"
    >
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={() => (step === "password" ? onClose() : setStep(
            step === "otp" ? "password"
            : step === "newPin" ? "otp"
            : step === "confirmPin" ? "newPin"
            : "confirmPin",
          ))}
          className="inline-flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          aria-label="Go back"
        >
          <ArrowLeft className="size-4" />
        </button>
        <h2 id="forgot-pin-title" className="text-sm font-semibold">
          {stepTitle[step]}
        </h2>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain px-4 py-6">
        <div className="mx-auto w-full max-w-sm space-y-4">
          {step === "password" && (
            <>
              <p className="text-sm text-muted-foreground">
                Confirm your account password to reset your app lock PIN.
              </p>
              <PasswordField
                ref={passwordRef}
                value={accountPassword}
                onChange={setAccountPassword}
              />
              <DialogActions
                onBack={onClose}
                backLabel="Cancel"
                onNext={verifyPassword}
                nextDisabled={!accountPassword}
              />
            </>
          )}

          {step === "otp" && (
            <OtpBlock otp={otp} onChange={setOtp} onVerify={verifyOtp} loading={loading} label="Continue" />
          )}

          {step === "newPin" && (
            <>
              <PinField label="New PIN" value={pin} onChange={setPin} autoFocus />
              <DialogActions onNext={continueNewPin} nextDisabled={pin.length !== 6} />
            </>
          )}

          {step === "confirmPin" && (
            <>
              <PinField label="Re-enter PIN" value={confirmPin} onChange={setConfirmPin} autoFocus />
              <DialogActions onNext={continueConfirmPin} nextDisabled={confirmPin.length !== 6} />
            </>
          )}

          {step === "verifyPin" && (
            <>
              <p className="text-sm text-muted-foreground">Enter your new PIN to unlock the app.</p>
              <PinField label="Enter PIN" value={verifyPin} onChange={setVerifyPin} autoFocus />
              <DialogActions
                onNext={finishUnlock}
                nextLabel="Unlock"
                nextDisabled={verifyPin.length !== 6}
                loading={loading}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/** @deprecated Use AppLockForgotPinFlow on the lock screen (Dialog z-index sits below app lock). */
export function AppLockForgotPinDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  phone: string;
  role: Role | null;
  instituteId: string | null;
}) {
  return (
    <AppLockForgotPinFlow
      active={props.open}
      onClose={() => props.onOpenChange(false)}
      onSuccess={props.onSuccess}
      phone={props.phone}
      role={props.role}
      instituteId={props.instituteId}
    />
  );
}

/** Change PIN: old PIN → new + confirm (same screen) → OTP → unlock */
export function AppLockChangePinDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState<ChangeStep>("oldPin");
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep("oldPin");
      setOldPin("");
      setNewPin("");
      setConfirmPin("");
      setOtp("");
      setLoading(false);
    }
  }, [open]);

  const verifyOld = () => {
    if (!appLockStore.verifyPin(oldPin)) return toast.error("Incorrect current PIN");
    setNewPin("");
    setConfirmPin("");
    setStep("newPins");
  };

  const continueNewPins = () => {
    if (!/^\d{6}$/.test(newPin)) return toast.error("Enter a 6-digit PIN");
    if (newPin === oldPin) return toast.error("New PIN must be different from current PIN");
    if (newPin !== confirmPin) return toast.error("PINs do not match");
    setOtp("");
    setStep("otp");
    toast.success(`OTP sent (demo: ${DEMO_CONNECT_OTP})`);
  };

  const finish = () => {
    if (!verifyDemoOtp(otp)) return toast.error(`Incorrect OTP (demo: ${DEMO_CONNECT_OTP})`);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      appLockStore.updatePin(newPin);
      toast.success("App lock PIN changed — you're in");
      onOpenChange(false);
    }, 280);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change app lock PIN</DialogTitle>
        </DialogHeader>

        {step === "oldPin" && (
          <div className="space-y-4">
            <PinField label="Current PIN" value={oldPin} onChange={setOldPin} autoFocus />
            <DialogActions
              onBack={() => onOpenChange(false)}
              backLabel="Cancel"
              onNext={verifyOld}
              nextDisabled={oldPin.length !== 6}
            />
          </div>
        )}

        {step === "newPins" && (
          <div className="space-y-4">
            <PinFieldPair
              pin={newPin}
              confirmPin={confirmPin}
              onPin={setNewPin}
              onConfirm={setConfirmPin}
              pinLabel="New PIN"
              confirmLabel="Re-enter new PIN"
            />
            <DialogActions
              onBack={() => setStep("oldPin")}
              onNext={continueNewPins}
              nextDisabled={newPin.length !== 6 || confirmPin.length !== 6}
            />
          </div>
        )}

        {step === "otp" && (
          <OtpBlock otp={otp} onChange={setOtp} onVerify={finish} loading={loading} label="Confirm & unlock" />
        )}
      </DialogContent>
    </Dialog>
  );
}
