import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  Label,
} from "@lumenx/ui";
import { DEMO_CONNECT_OTP } from "@lumenx/auth";
import { toast } from "sonner";

type Step = "password" | "otp";

export function ChangePasswordDialog({
  open,
  onOpenChange,
  phone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string;
}) {
  const [step, setStep] = useState<Step>("password");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState(false);

  const reset = () => {
    setStep("password");
    setNewPassword("");
    setConfirmPassword("");
    setOtp("");
    setPending(false);
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const sendOtp = () => {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setStep("otp");
    toast.success(`OTP sent to ${phone}`, {
      description: `Demo code: ${DEMO_CONNECT_OTP}`,
    });
  };

  const verifyAndUpdate = async () => {
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit OTP");
      return;
    }
    if (otp !== DEMO_CONNECT_OTP) {
      toast.error(`Incorrect OTP (demo: ${DEMO_CONNECT_OTP})`);
      return;
    }
    setPending(true);
    await new Promise((r) => setTimeout(r, 400));
    toast.success("Password updated successfully");
    setPending(false);
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{step === "password" ? "Change password" : "Verify OTP"}</DialogTitle>
        </DialogHeader>

        {step === "password" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enter a new password, confirm it, then verify with OTP sent to your registered phone.
            </p>
            <div>
              <Label htmlFor="new-password" className="text-xs text-muted-foreground">
                New password
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="mt-1 rounded-xl"
                autoComplete="new-password"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="text-xs text-muted-foreground">
                Re-enter password
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="mt-1 rounded-xl"
                autoComplete="new-password"
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button variant="ghost" className="rounded-xl" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button className="rounded-xl" onClick={sendOtp}>
                Continue to OTP
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to {phone}.</p>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="size-11 rounded-xl" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Demo OTP: <span className="font-mono">{DEMO_CONNECT_OTP}</span>
            </p>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button variant="ghost" className="rounded-xl" onClick={() => setStep("password")}>
                Back
              </Button>
              <Button
                className="rounded-xl"
                disabled={pending || otp.length !== 6}
                onClick={() => void verifyAndUpdate()}
              >
                {pending ? "Updating…" : "Verify & update password"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
