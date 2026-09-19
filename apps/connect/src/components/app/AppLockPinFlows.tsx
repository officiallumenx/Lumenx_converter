import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
} from "@lumenx/ui";
import type { Role } from "@lumenx/types";
import { appLockStore } from "@/lib/app-lock-store";
import { toast } from "sonner";

/** Current App Lock PIN → New PIN → Confirm */
type ChangeStep = "oldPin" | "newPin" | "confirmPin";

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

/** App Lock is device-local and cannot be recovered with account credentials. */
export function AppLockForgotPinFlow({
  active,
  onClose,
}: {
  active: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  phone: string;
  role: Role | null;
  instituteId: string | null;
}) {
  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-[310] flex flex-col bg-background text-foreground safe-area-pt"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-pin-title"
    >
      <header className="border-b border-border px-4 py-3">
        <h2 id="forgot-pin-title" className="text-sm font-semibold">
          Forgot app lock PIN
        </h2>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain px-4 py-6">
        <div className="mx-auto w-full max-w-sm space-y-4">
          <p className="text-sm text-muted-foreground">
            App Lock protects only this device. Your account Login PIN and mobile verification
            cannot unlock or reset it.
          </p>
          <p className="text-sm text-muted-foreground">
            Close Connect and clear this app&apos;s local data to remove the device lock, then sign
            in again. This also removes locally cached preferences.
          </p>
          <Button className="w-full rounded-xl" onClick={onClose}>
            Back
          </Button>
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

/** Change PIN: current App Lock PIN → new PIN → confirm */
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

  useEffect(() => {
    if (!open) {
      setStep("oldPin");
      setOldPin("");
      setNewPin("");
      setConfirmPin("");
    }
  }, [open]);

  const verifyOld = () => {
    if (!appLockStore.verifyPin(oldPin)) return toast.error("Incorrect current PIN");
    setNewPin("");
    setConfirmPin("");
    setStep("newPin");
  };

  const continueNewPin = () => {
    if (!/^\d{6}$/.test(newPin)) return toast.error("Enter a 6-digit PIN");
    if (newPin === oldPin) return toast.error("New PIN must be different from current PIN");
    setConfirmPin("");
    setStep("confirmPin");
  };

  const finish = () => {
    if (newPin !== confirmPin) return toast.error("PINs do not match");
    appLockStore.updatePin(newPin);
    toast.success("App lock PIN changed");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change app lock PIN</DialogTitle>
        </DialogHeader>

        {step === "oldPin" && (
          <div className="space-y-4">
            <PinField label="Current App Lock PIN" value={oldPin} onChange={setOldPin} autoFocus />
            <DialogActions
              onBack={() => onOpenChange(false)}
              backLabel="Cancel"
              onNext={verifyOld}
              nextDisabled={oldPin.length !== 6}
            />
          </div>
        )}

        {step === "newPin" && (
          <div className="space-y-4">
            <PinField label="New App Lock PIN" value={newPin} onChange={setNewPin} autoFocus />
            <DialogActions
              onBack={() => setStep("oldPin")}
              onNext={continueNewPin}
              nextDisabled={newPin.length !== 6}
            />
          </div>
        )}

        {step === "confirmPin" && (
          <div className="space-y-4">
            <PinField
              label="Confirm new App Lock PIN"
              value={confirmPin}
              onChange={setConfirmPin}
              autoFocus
            />
            <DialogActions
              onBack={() => setStep("newPin")}
              onNext={finish}
              nextDisabled={confirmPin.length !== 6}
              nextLabel="Save PIN"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
