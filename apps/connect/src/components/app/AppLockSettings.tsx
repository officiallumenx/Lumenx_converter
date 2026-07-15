import { useState, useSyncExternalStore } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Switch } from "@lumenx/ui";
import { AppLockChangePinDialog } from "@/components/app/AppLockPinFlows";
import { appLockStore } from "@/lib/app-lock-store";
import { toast } from "sonner";

function PinInput({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
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
  );
}

export function AppLockSettings() {
  const enabled = useSyncExternalStore(appLockStore.subscribe, appLockStore.isEnabled, () => false);
  const hasPin = useSyncExternalStore(appLockStore.subscribe, appLockStore.hasPin, () => false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [pinDraft, setPinDraft] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");

  const onToggle = (next: boolean) => {
    if (!next) {
      appLockStore.disable();
      toast.success("App lock turned off. Your PIN is saved for next time.");
      return;
    }
    if (appLockStore.hasPin()) {
      appLockStore.enableWithExistingPin();
      toast.success("App lock enabled with your saved PIN.");
      return;
    }
    setPinDraft("");
    setPinConfirm("");
    setPinDialogOpen(true);
  };

  const savePin = () => {
    if (!/^\d{6}$/.test(pinDraft)) {
      toast.error("Enter a 6-digit PIN.");
      return;
    }
    if (pinDraft !== pinConfirm) {
      toast.error("PINs do not match.");
      return;
    }
    appLockStore.enableWithPin(pinDraft);
    setPinDialogOpen(false);
    setPinDraft("");
    setPinConfirm("");
    toast.success("App lock enabled. Your PIN is saved on this device.");
  };

  return (
    <>
      <div className="settings-row flex min-w-0 items-start gap-3 py-3.5 first:pt-0 last:pb-0 sm:py-4">
        <div className="min-w-0 flex-1 pr-2">
          <div className="text-sm font-medium leading-snug">App lock</div>
          <div className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            {hasPin
              ? "6-digit PIN required to open the app · same PIN when you turn lock back on"
              : "Set a 6-digit PIN to secure the app on this device"}
          </div>
          {hasPin ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="mt-1 h-auto p-0 text-xs font-medium"
              onClick={() => setChangeDialogOpen(true)}
            >
              Change PIN
            </Button>
          ) : null}
        </div>
        <div className="shrink-0 touch-manipulation pt-0.5">
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
      </div>

      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create app lock PIN</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Choose a 6-digit PIN. It stays on this device when you sign out or turn app lock off,
            so you can reuse it when you enable lock again.
          </p>
          <div className="space-y-3">
            <PinInput
              value={pinDraft}
              onChange={setPinDraft}
              placeholder="6-digit PIN"
              autoFocus
            />
            <PinInput value={pinConfirm} onChange={setPinConfirm} placeholder="Re-enter PIN" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" className="settings-primary-action rounded-xl" onClick={() => setPinDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="settings-primary-action rounded-xl" onClick={savePin}>
              Save PIN
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AppLockChangePinDialog open={changeDialogOpen} onOpenChange={setChangeDialogOpen} />
    </>
  );
}
