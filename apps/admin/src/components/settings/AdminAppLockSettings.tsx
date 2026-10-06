/**
 * Personal settings → App lock (demo local PIN).
 * API mode uses staff login PIN — local unlock is not used.
 */
import { useState } from "react";
import { Button, Card, CardHeader, Field, TextInput } from "@lumenx/ui-admin";
import { useAuth } from "@/auth/AuthContext";
import { isDemoAuthMode } from "@/auth/auth-mode";
import {
  PIN_LENGTH,
  clearAppUnlock,
  getUserSecurityPin,
  saveUserPin,
  verifyUserPin,
} from "@/auth/app-lock-store";
import { useAdminToast } from "@/components/AdminActionToast";

export function AdminAppLockSettings() {
  const { user } = useAuth();
  const notify = useAdminToast();
  const demo = isDemoAuthMode();
  const userId = user?.id ?? "";
  const email = user?.email;
  const [pinTick, setPinTick] = useState(0);
  const hasPin = Boolean(pinTick >= 0 && userId && getUserSecurityPin(userId, email));

  const [mode, setMode] = useState<"idle" | "create" | "change">("idle");
  const [currentPin, setCurrentPin] = useState("");
  const [pinDraft, setPinDraft] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");

  const digitsOnly = (value: string) => value.replace(/\D/g, "").slice(0, PIN_LENGTH);

  const resetDrafts = () => {
    setMode("idle");
    setCurrentPin("");
    setPinDraft("");
    setPinConfirm("");
  };

  if (!demo) {
    return (
      <Card>
        <CardHeader
          title="App lock"
          hint="Session security uses your staff login PIN"
        />
        <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
          On signed-in Admin accounts, access is protected by your password and login PIN.
          A separate device unlock PIN is not used in API mode.
        </div>
      </Card>
    );
  }

  if (!userId) {
    return (
      <Card>
        <CardHeader title="App lock" hint="Sign in to manage your unlock PIN" />
      </Card>
    );
  }

  const saveNewPin = () => {
    if (!/^\d{6}$/.test(pinDraft)) {
      notify(`Enter a ${PIN_LENGTH}-digit PIN.`);
      return;
    }
    if (pinDraft !== pinConfirm) {
      notify("PINs do not match.");
      return;
    }
    saveUserPin(userId, pinDraft, email);
    setPinTick((n) => n + 1);
    resetDrafts();
    notify("App lock PIN saved on this device.");
  };

  const saveChangedPin = () => {
    if (!verifyUserPin(userId, currentPin, email)) {
      notify("Current PIN is incorrect.");
      return;
    }
    if (!/^\d{6}$/.test(pinDraft)) {
      notify(`New PIN must be ${PIN_LENGTH} digits.`);
      return;
    }
    if (pinDraft !== pinConfirm) {
      notify("New PINs do not match.");
      return;
    }
    saveUserPin(userId, pinDraft, email);
    setPinTick((n) => n + 1);
    resetDrafts();
    notify("App lock PIN updated.");
  };

  return (
    <Card>
      <CardHeader
        title="App lock"
        hint={`${PIN_LENGTH}-digit PIN to reopen Admin after it was locked · separate from login`}
      />
      <div className="px-5 pb-5 space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {hasPin
            ? "App lock is active on this device. You will need your PIN after a fresh launch."
            : "Set a PIN to protect Admin on this device after sign-in."}
        </p>

        {mode === "idle" ? (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => setMode(hasPin ? "change" : "create")}
            >
              {hasPin ? "Change PIN" : "Set PIN"}
            </Button>
            {hasPin ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  clearAppUnlock();
                  notify("Session locked. Enter PIN to continue.");
                }}
              >
                Lock now
              </Button>
            ) : null}
          </div>
        ) : null}

        {mode === "create" ? (
          <div className="rounded-xl border border-border bg-muted/15 p-4 space-y-3">
            <div className="text-sm font-medium">Create app lock PIN</div>
            <Field label={`${PIN_LENGTH}-digit PIN`}>
              <TextInput
                inputMode="numeric"
                autoComplete="off"
                type="password"
                value={pinDraft}
                onChange={(e) => setPinDraft(digitsOnly(e.target.value))}
                placeholder={`${PIN_LENGTH} digits`}
              />
            </Field>
            <Field label="Confirm PIN">
              <TextInput
                inputMode="numeric"
                autoComplete="off"
                type="password"
                value={pinConfirm}
                onChange={(e) => setPinConfirm(digitsOnly(e.target.value))}
                placeholder="Re-enter PIN"
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="primary" onClick={saveNewPin}>
                Save PIN
              </Button>
              <Button size="sm" variant="ghost" onClick={resetDrafts}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {mode === "change" ? (
          <div className="rounded-xl border border-border bg-muted/15 p-4 space-y-3">
            <div className="text-sm font-medium">Change PIN</div>
            <Field label="Current PIN">
              <TextInput
                inputMode="numeric"
                autoComplete="off"
                type="password"
                value={currentPin}
                onChange={(e) => setCurrentPin(digitsOnly(e.target.value))}
              />
            </Field>
            <Field label={`New PIN (${PIN_LENGTH} digits)`}>
              <TextInput
                inputMode="numeric"
                autoComplete="off"
                type="password"
                value={pinDraft}
                onChange={(e) => setPinDraft(digitsOnly(e.target.value))}
              />
            </Field>
            <Field label="Confirm new PIN">
              <TextInput
                inputMode="numeric"
                autoComplete="off"
                type="password"
                value={pinConfirm}
                onChange={(e) => setPinConfirm(digitsOnly(e.target.value))}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="primary" onClick={saveChangedPin}>
                Update PIN
              </Button>
              <Button size="sm" variant="ghost" onClick={resetDrafts}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
