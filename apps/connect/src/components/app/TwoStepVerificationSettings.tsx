/**
 * Two-step verification (Login PIN) — required after OTP at sign-in.
 * Independent from App Lock.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
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
  Switch,
} from "@lumenx/ui";
import { DEMO_CONNECT_OTP } from "@lumenx/auth";
import { useApp } from "@/lib/app-state";
import {
  disableLoginPin,
  enableLoginPin,
  hasLoginPin,
  isLoginPinEnabled,
  LOGIN_PIN_LENGTH,
  setLoginPin,
  subscribeLoginPin,
  verifyLoginPin,
  type PortalRole,
} from "@/lib/portal-auth-store";
import { toast } from "sonner";

function PinField({
  label,
  value,
  onChange,
  autoFocus,
  length = LOGIN_PIN_LENGTH,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  length?: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="relative">
        <Input
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={length}
          type={visible ? "text" : "password"}
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder={`${length}-digit PIN`}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
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

type CreateStep = "pin" | "confirm";
type ChangeStep = "current" | "otp" | "newPin" | "confirm";

export function TwoStepVerificationSettings() {
  const { user, role } = useApp();
  const phone = user?.phone ?? "";
  const portalRole = (role === "parent" || role === "student" || role === "teacher"
    ? role
    : null) as PortalRole | null;

  const snapshot = useSyncExternalStore(
    subscribeLoginPin,
    () => {
      if (!portalRole || !phone) return "off|none";
      return `${isLoginPinEnabled(phone, portalRole) ? "on" : "off"}|${hasLoginPin(phone, portalRole) ? "pin" : "none"}`;
    },
    () => "off|none",
  );
  const enabled = snapshot.startsWith("on");
  const hasPin = snapshot.endsWith("pin");

  const [createOpen, setCreateOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [createStep, setCreateStep] = useState<CreateStep>("pin");
  const [changeStep, setChangeStep] = useState<ChangeStep>("current");
  const [pinDraft, setPinDraft] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!createOpen) {
      setCreateStep("pin");
      setPinDraft("");
      setPinConfirm("");
    }
  }, [createOpen]);

  useEffect(() => {
    if (!changeOpen) {
      setChangeStep("current");
      setCurrentPin("");
      setPinDraft("");
      setPinConfirm("");
      setOtp("");
      setBusy(false);
    }
  }, [changeOpen]);

  if (!portalRole || !phone) return null;

  const onToggle = (next: boolean) => {
    if (!next) {
      disableLoginPin(phone, portalRole);
      toast.success("Two-step verification turned off. Your Login PIN is saved.");
      return;
    }
    if (hasLoginPin(phone, portalRole)) {
      const result = enableLoginPin(phone, portalRole);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Two-step verification enabled.");
      return;
    }
    setCreateOpen(true);
  };

  const saveCreate = () => {
    if (createStep === "pin") {
      if (pinDraft.length !== LOGIN_PIN_LENGTH) {
        toast.error(`Enter a ${LOGIN_PIN_LENGTH}-digit PIN.`);
        return;
      }
      setPinConfirm("");
      setCreateStep("confirm");
      return;
    }
    if (pinDraft !== pinConfirm) {
      toast.error("PINs do not match.");
      return;
    }
    const result = setLoginPin(phone, portalRole, pinDraft);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setCreateOpen(false);
    toast.success("Two-step verification enabled with your Login PIN.");
  };

  const advanceChange = () => {
    if (changeStep === "current") {
      if (!verifyLoginPin(phone, portalRole, currentPin)) {
        toast.error("Incorrect current Login PIN.");
        return;
      }
      setOtp("");
      setChangeStep("otp");
      toast.success(`OTP sent (demo: ${DEMO_CONNECT_OTP})`);
      return;
    }
    if (changeStep === "otp") {
      if (otp !== DEMO_CONNECT_OTP) {
        toast.error(`Incorrect OTP (demo: ${DEMO_CONNECT_OTP})`);
        return;
      }
      setPinDraft("");
      setPinConfirm("");
      setChangeStep("newPin");
      return;
    }
    if (changeStep === "newPin") {
      if (pinDraft.length !== LOGIN_PIN_LENGTH) {
        toast.error(`Enter a ${LOGIN_PIN_LENGTH}-digit PIN.`);
        return;
      }
      if (pinDraft === currentPin) {
        toast.error("New PIN must be different from your current PIN.");
        return;
      }
      setPinConfirm("");
      setChangeStep("confirm");
      return;
    }
    if (pinDraft !== pinConfirm) {
      toast.error("PINs do not match.");
      return;
    }
    setBusy(true);
    setTimeout(() => {
      const result = setLoginPin(phone, portalRole, pinDraft);
      setBusy(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setChangeOpen(false);
      toast.success("Login PIN updated.");
    }, 280);
  };

  return (
    <>
      <div className="settings-row flex min-w-0 items-start gap-3 py-3.5 first:pt-0 last:pb-0 sm:py-4">
        <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 pr-2">
          <div className="text-sm font-medium leading-snug">Two-step verification</div>
          <div className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            After OTP at login, enter a {LOGIN_PIN_LENGTH}-digit Login PIN to confirm it&apos;s you.
            Separate from App Lock.
          </div>
          {hasPin ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="mt-1 h-auto p-0 text-xs font-medium"
              onClick={() => setChangeOpen(true)}
            >
              Change Login PIN
            </Button>
          ) : null}
        </div>
        <div className="shrink-0 touch-manipulation pt-0.5">
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {createStep === "pin" ? "Create Login PIN" : "Confirm Login PIN"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This PIN is asked only at sign-in after OTP — not when you reopen the app.
          </p>
          {createStep === "pin" ? (
            <PinField label={`${LOGIN_PIN_LENGTH}-digit Login PIN`} value={pinDraft} onChange={setPinDraft} autoFocus />
          ) : (
            <PinField label="Confirm Login PIN" value={pinConfirm} onChange={setPinConfirm} autoFocus />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              className="rounded-xl"
              onClick={() => (createStep === "confirm" ? setCreateStep("pin") : setCreateOpen(false))}
            >
              {createStep === "confirm" ? "Back" : "Cancel"}
            </Button>
            <Button className="rounded-xl" onClick={saveCreate}>
              {createStep === "pin" ? "Continue" : "Enable"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Login PIN</DialogTitle>
          </DialogHeader>
          {changeStep === "current" && (
            <div className="space-y-4">
              <PinField label="Current Login PIN" value={currentPin} onChange={setCurrentPin} autoFocus />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" className="rounded-xl" onClick={() => setChangeOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="rounded-xl"
                  disabled={currentPin.length !== LOGIN_PIN_LENGTH}
                  onClick={advanceChange}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}
          {changeStep === "otp" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Enter the OTP sent to your mobile.</p>
              <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
                <InputOTPGroup className="justify-center w-full">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <p className="text-xs text-center text-muted-foreground">
                Demo OTP: <span className="font-mono">{DEMO_CONNECT_OTP}</span>
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" className="rounded-xl" onClick={() => setChangeStep("current")}>
                  Back
                </Button>
                <Button className="rounded-xl" disabled={otp.length !== 6} onClick={advanceChange}>
                  Verify OTP
                </Button>
              </div>
            </div>
          )}
          {changeStep === "newPin" && (
            <div className="space-y-4">
              <PinField label="New Login PIN" value={pinDraft} onChange={setPinDraft} autoFocus />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" className="rounded-xl" onClick={() => setChangeStep("otp")}>
                  Back
                </Button>
                <Button
                  className="rounded-xl"
                  disabled={pinDraft.length !== LOGIN_PIN_LENGTH}
                  onClick={advanceChange}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}
          {changeStep === "confirm" && (
            <div className="space-y-4">
              <PinField label="Confirm new Login PIN" value={pinConfirm} onChange={setPinConfirm} autoFocus />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" className="rounded-xl" onClick={() => setChangeStep("newPin")}>
                  Back
                </Button>
                <Button
                  className="rounded-xl"
                  disabled={busy || pinConfirm.length !== LOGIN_PIN_LENGTH}
                  onClick={advanceChange}
                >
                  {busy ? "Saving…" : "Save PIN"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
